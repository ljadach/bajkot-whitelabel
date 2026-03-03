import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { getProfileByClerkUserId, getOrgManagerOrAdminMembership } from './lib/dbHelpers';
import { auditLog } from './lib/adminGuards';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ============================================
// Organization CRUD
// ============================================

// Get current user's organization
export const getCurrentOrganization = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('organizations'),
      name: v.string(),
      slug: v.string(),
      isOwner: v.boolean(),
      role: v.union(v.literal('admin'), v.literal('manager'), v.literal('member')),
      memberCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkUserId = identity.subject;

    // Get user profile to find organization
    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    if (!profile?.organizationId) return null;

    const org = await ctx.db.get(profile.organizationId);
    if (!org) return null;

    // Get member info
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) => q.eq('organizationId', org._id).eq('clerkUserId', clerkUserId))
      .first();

    // Count members
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org', (q) => q.eq('organizationId', org._id))
      .collect();

    return {
      _id: org._id,
      name: org.name,
      slug: org.slug,
      isOwner: org.ownerId === clerkUserId,
      role: membership?.role ?? 'member',
      memberCount: members.length,
    };
  },
});

// Create a new organization
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  returns: v.id('organizations'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(args.slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if slug is unique
    const existingSlug = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (existingSlug) {
      throw new Error('Organization slug already taken');
    }

    // Check if user already has an organization
    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    if (profile?.organizationId) {
      throw new Error('You are already a member of an organization');
    }

    // Create organization
    const orgId = await ctx.db.insert('organizations', {
      name: args.name,
      slug: args.slug,
      ownerId: clerkUserId,
      settings: {
        allowPublicJoin: false,
        maxMembers: 50,
      },
      createdAt: Date.now(),
    });

    // Add owner as admin member
    await ctx.db.insert('organizationMembers', {
      organizationId: orgId,
      clerkUserId,
      role: 'admin',
      joinedAt: Date.now(),
    });

    // Update user profile
    if (profile) {
      await ctx.db.patch(profile._id, { organizationId: orgId });
    }

    return orgId;
  },
});

// ============================================
// Member Management
// ============================================

// Get organization members
export const getOrganizationMembers = query({
  args: {
    organizationId: v.id('organizations'),
  },
  returns: v.array(
    v.object({
      _id: v.id('organizationMembers'),
      clerkUserId: v.string(),
      displayName: v.union(v.string(), v.null()),
      role: v.union(v.literal('admin'), v.literal('manager'), v.literal('member')),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify user is a member
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) => q.eq('organizationId', args.organizationId).eq('clerkUserId', identity.subject))
      .first();

    if (!membership) return [];

    // Get all members
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    return members.map((m) => ({
      _id: m._id,
      clerkUserId: m.clerkUserId,
      displayName: m.displayName ?? null,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  },
});

// Invite a member
export const inviteMember = mutation({
  args: {
    organizationId: v.id('organizations'),
    email: v.string(),
    role: v.union(v.literal('manager'), v.literal('member')),
  },
  returns: v.string(), // Returns invite token
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;

    // Verify user is admin or manager
    const membership = await getOrgManagerOrAdminMembership(ctx, args.organizationId, clerkUserId);
    if (!membership) {
      throw new Error('You do not have permission to invite members');
    }

    const normalizedEmail = normalizeEmail(args.email);

    // Check for existing invite
    const existingInvite = await ctx.db
      .query('organizationInvites')
      .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
      .first();

    if (existingInvite && existingInvite.status === 'pending') {
      throw new Error('An invite has already been sent to this email');
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert('organizationInvites', {
      organizationId: args.organizationId,
      email: normalizedEmail,
      role: args.role,
      inviteToken,
      invitedBy: clerkUserId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt,
    });

    return inviteToken;
  },
});

// Accept an invite
export const acceptInvite = mutation({
  args: {
    inviteToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;
    const identityEmail = identity.email ? normalizeEmail(identity.email) : null;
    if (!identityEmail) {
      throw new Error('Authenticated account does not have an email address');
    }

    // Find the invite
    const invite = await ctx.db
      .query('organizationInvites')
      .withIndex('by_token', (q) => q.eq('inviteToken', args.inviteToken))
      .first();

    if (!invite) {
      throw new Error('Invalid invite token');
    }

    if (invite.status !== 'pending') {
      throw new Error('This invite has already been used or expired');
    }

    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: 'expired' });
      throw new Error('This invite has expired');
    }

    const inviteEmail = normalizeEmail(invite.email);
    if (inviteEmail !== identityEmail) {
      await auditLog(ctx, clerkUserId, 'organization.invite.accept.rejected_email_mismatch', invite.organizationId, {
        inviteId: invite._id,
        inviteEmail,
        identityEmail,
      });
      throw new Error('This invite is for a different email address');
    }

    // Check if user already has an organization
    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    if (profile?.organizationId) {
      throw new Error('You are already a member of an organization');
    }

    // Add user to organization
    await ctx.db.insert('organizationMembers', {
      organizationId: invite.organizationId,
      clerkUserId,
      role: invite.role,
      joinedAt: Date.now(),
      invitedBy: invite.invitedBy,
    });

    // Update user profile
    if (profile) {
      await ctx.db.patch(profile._id, { organizationId: invite.organizationId });
    }

    // Mark invite as accepted
    await ctx.db.patch(invite._id, { status: 'accepted' });
    await auditLog(ctx, clerkUserId, 'organization.invite.accept.success', invite.organizationId, {
      inviteId: invite._id,
      inviteEmail,
      invitedBy: invite.invitedBy,
      role: invite.role,
    });

    return null;
  },
});

// Remove a member
export const removeMember = mutation({
  args: {
    memberId: v.id('organizationMembers'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;

    // Get the member to remove
    const memberToRemove = await ctx.db.get(args.memberId);
    if (!memberToRemove) throw new Error('Member not found');

    // Get the organization
    const org = await ctx.db.get(memberToRemove.organizationId);
    if (!org) throw new Error('Organization not found');

    // Verify permissions
    const currentMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) => q.eq('organizationId', org._id).eq('clerkUserId', clerkUserId))
      .first();

    // Only admins can remove, or members can leave
    const isSelf = memberToRemove.clerkUserId === clerkUserId;
    const isAdmin = currentMembership?.role === 'admin';

    if (!isSelf && !isAdmin) {
      throw new Error('You do not have permission to remove this member');
    }

    // Can't remove the owner
    if (memberToRemove.clerkUserId === org.ownerId && !isSelf) {
      throw new Error('Cannot remove the organization owner');
    }

    // Remove member
    await ctx.db.delete(args.memberId);

    // Update their profile
    const memberProfile = await getProfileByClerkUserId(ctx, memberToRemove.clerkUserId);

    if (memberProfile) {
      await ctx.db.patch(memberProfile._id, { organizationId: undefined });
    }

    return null;
  },
});

// Update member role
export const updateMemberRole = mutation({
  args: {
    memberId: v.id('organizationMembers'),
    role: v.union(v.literal('admin'), v.literal('manager'), v.literal('member')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;

    // Get the member
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error('Member not found');

    // Get the organization
    const org = await ctx.db.get(member.organizationId);
    if (!org) throw new Error('Organization not found');

    // Only owner can change roles
    if (org.ownerId !== clerkUserId) {
      throw new Error('Only the organization owner can change roles');
    }

    // Can't change owner's role
    if (member.clerkUserId === org.ownerId) {
      throw new Error("Cannot change the owner's role");
    }

    await ctx.db.patch(args.memberId, { role: args.role });

    return null;
  },
});

// ============================================
// Pending Invites
// ============================================

// Get pending invites for an organization
export const getPendingInvites = query({
  args: {
    organizationId: v.id('organizations'),
  },
  returns: v.array(
    v.object({
      _id: v.id('organizationInvites'),
      email: v.string(),
      role: v.union(v.literal('manager'), v.literal('member')),
      createdAt: v.number(),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify user is admin or manager
    const membership = await getOrgManagerOrAdminMembership(ctx, args.organizationId, identity.subject);
    if (!membership) return [];

    const invites = await ctx.db
      .query('organizationInvites')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    return invites
      .filter((i) => i.status === 'pending' && i.expiresAt > Date.now())
      .map((i) => ({
        _id: i._id,
        email: i.email,
        role: i.role,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
      }));
  },
});

// Cancel an invite
export const cancelInvite = mutation({
  args: {
    inviteId: v.id('organizationInvites'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error('Invite not found');

    // Verify permissions
    const membership = await getOrgManagerOrAdminMembership(ctx, invite.organizationId, identity.subject);
    if (!membership) {
      throw new Error('You do not have permission to cancel invites');
    }

    await ctx.db.delete(args.inviteId);

    return null;
  },
});
