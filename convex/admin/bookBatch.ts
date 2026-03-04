/**
 * Admin batch operations for book pipeline.
 * Allows creating multiple book orders at once with pre-set chosenStyle (skipping user vote).
 */

import { action, internalMutation, query } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { assertAdmin } from '../lib/roles';
import { assertBulkLimit, auditLog } from '../lib/adminGuards';

// ── List all book orders (admin view) ────────────────────────

export const listOrders = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('bookOrders'),
      childName: v.string(),
      status: v.string(),
      currentAgent: v.union(v.string(), v.null()),
      error: v.union(v.string(), v.null()),
      chosenStyle: v.union(v.string(), v.null()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const orders = await ctx.db
      .query('bookOrders')
      .order('desc')
      .take(200);

    return orders.map((o) => ({
      _id: o._id,
      childName: o.childName,
      status: o.status,
      currentAgent: o.currentAgent ?? null,
      error: o.error ?? null,
      chosenStyle: o.chosenStyle ?? null,
      createdAt: o.createdAt,
    }));
  },
});

// ── Internal mutation to create a single batch order ─────────

const batchOrderProfileValidator = v.object({
  childName: v.string(),
  ageBracket: v.union(v.literal('3-5'), v.literal('6-8'), v.literal('9+')),
  gender: v.union(v.literal('boy'), v.literal('girl')),
  problemId: v.string(),
  problemDetail: v.optional(v.string()),
  favoriteToy: v.optional(v.string()),
  glasses: v.boolean(),
  hairColor: v.string(),
  hairStyle: v.string(),
  eyeColor: v.string(),
  skinTone: v.string(),
  outfit: v.string(),
  email: v.optional(v.string()),
  chosenStyle: v.optional(v.union(v.literal('A'), v.literal('B'))),
});

export const createBatchOrder = internalMutation({
  args: {
    clerkUserId: v.string(),
    profile: batchOrderProfileValidator,
  },
  returns: v.id('bookOrders'),
  handler: async (ctx, { clerkUserId, profile }) => {
    const orderId = await ctx.db.insert('bookOrders', {
      clerkUserId,
      childName: profile.childName,
      ageBracket: profile.ageBracket,
      gender: profile.gender,
      problemId: profile.problemId,
      problemDetail: profile.problemDetail,
      favoriteToy: profile.favoriteToy,
      glasses: profile.glasses,
      hairColor: profile.hairColor,
      hairStyle: profile.hairStyle,
      eyeColor: profile.eyeColor,
      skinTone: profile.skinTone,
      outfit: profile.outfit,
      email: profile.email,
      chosenStyle: profile.chosenStyle ?? 'A',
      status: 'intake',
      createdAt: Date.now(),
    });

    await auditLog(ctx, clerkUserId, 'bookBatch.create', orderId, {
      childName: profile.childName,
      chosenStyle: profile.chosenStyle ?? 'A',
    });

    return orderId;
  },
});

// ── Batch create action ──────────────────────────────────────

export const batchCreate = action({
  args: {
    orders: v.array(batchOrderProfileValidator),
  },
  returns: v.object({
    created: v.array(v.id('bookOrders')),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, { orders }) => {
    const { subject } = await assertAdmin(ctx);
    assertBulkLimit(orders, 'batch orders');

    const createdIds: Id<'bookOrders'>[] = [];
    const errors: string[] = [];

    for (let i = 0; i < orders.length; i++) {
      const profile = orders[i];
      try {
        const orderId = await ctx.runMutation(internal.admin.bookBatch.createBatchOrder, {
          clerkUserId: subject,
          profile,
        });
        createdIds.push(orderId);

        // Schedule A0 (intake) for this order
        await ctx.scheduler.runAfter(0, internal.bookAgents.intake, { orderId });
      } catch (err) {
        errors.push(`#${i} (${profile.childName}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { created: createdIds, errors };
  },
});
