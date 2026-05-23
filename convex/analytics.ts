import { internalMutation, query } from './_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from './lib/roles';

// Conservative crawler/preview heuristic. UA is attacker-controlled, so this
// is only a filter for noise in the admin view — never a security check.
//
// UA matches: regular crawlers, Google's ad-render bots (DisplayAds-WebRender,
// AdWords-Express), generic CMS scanners, and the local smoke-test agent.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|fetch|http\b|wget|curl|monitor|uptime|headless|adwords|googleads|cms-checker|smoke-test/i;

// Path-based bot detection — catches WordPress / .env / .git / adminer
// probes that all set perfectly normal Chrome / Firefox / iPhone UAs and
// would otherwise pollute the "human" view. These paths have no legitimate
// reason to be hit on this site.
const SCANNER_PATH_PATTERN =
  /^\/(?:wp-admin|wp-login|wp-content|wp-includes|wordpress|blog\/wp-|wp\/wp-|old\/wp-|\.env|\.git\b|\.aws\b|adminer|phpmyadmin|app\/\.env|backend\/\.env)/i;

export const recordPageView = internalMutation({
  args: {
    timestamp: v.number(),
    ip: v.string(),
    country: v.optional(v.string()),
    userAgent: v.string(),
    path: v.string(),
    referer: v.optional(v.string()),
    acceptLanguage: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    accessTokenHash: v.optional(v.string()),
  },
  returns: v.id('pageViews'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('pageViews', {
      ...args,
      isBot: BOT_PATTERN.test(args.userAgent) || SCANNER_PATH_PATTERN.test(args.path),
    });
  },
});

// Manual retention. Operator runs:
//   npx convex run analytics:purgeOld '{"olderThanMs": 2592000000}'   # 30 days
export const purgeOld = internalMutation({
  args: { olderThanMs: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    const rows = await ctx.db
      .query('pageViews')
      .withIndex('by_timestamp', (q) => q.lt('timestamp', cutoff))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return rows.length;
  },
});

export const recentViews = query({
  args: {
    limit: v.optional(v.number()),
    pathPrefix: v.optional(v.string()),
    excludeBots: v.optional(v.boolean()),
    sinceMs: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('pageViews'),
      _creationTime: v.number(),
      timestamp: v.number(),
      ip: v.string(),
      country: v.optional(v.string()),
      userAgent: v.string(),
      path: v.string(),
      referer: v.optional(v.string()),
      acceptLanguage: v.optional(v.string()),
      clerkUserId: v.optional(v.string()),
      accessTokenHash: v.optional(v.string()),
      isBot: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const limit = Math.min(args.limit ?? 200, 1000);
    const excludeBots = args.excludeBots ?? true;
    const sinceMs = args.sinceMs;

    // by_timestamp gives newest first; small windows scan a few hundred rows.
    const rows = await ctx.db
      .query('pageViews')
      .withIndex('by_timestamp')
      .order('desc')
      .take(limit * 3);

    const filtered = rows.filter((r) => {
      if (excludeBots && r.isBot) return false;
      if (sinceMs && r.timestamp < sinceMs) return false;
      if (args.pathPrefix && !r.path.startsWith(args.pathPrefix)) return false;
      return true;
    });

    return filtered.slice(0, limit);
  },
});

export const summary = query({
  args: {
    sinceMs: v.number(),
    excludeBots: v.optional(v.boolean()),
    pathPrefix: v.optional(v.string()),
  },
  returns: v.object({
    totalViews: v.number(),
    uniqueIps: v.number(),
    topPaths: v.array(v.object({ path: v.string(), count: v.number() })),
    topCountries: v.array(v.object({ country: v.string(), count: v.number() })),
  }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const excludeBots = args.excludeBots ?? true;

    const rows = await ctx.db
      .query('pageViews')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', args.sinceMs))
      .collect();

    // Mirror the filter applied to `recentViews` so the summary cards and the
    // detail table describe the same slice of traffic — otherwise the UI
    // shows e.g. "Total views 558" alongside a table filtered to /problem/*
    // and the two numbers disagree on what they're counting.
    const filtered = rows.filter((r) => {
      if (excludeBots && r.isBot) return false;
      if (args.pathPrefix && !r.path.startsWith(args.pathPrefix)) return false;
      return true;
    });

    const ips = new Set<string>();
    const pathCount = new Map<string, number>();
    const countryCount = new Map<string, number>();
    for (const r of filtered) {
      ips.add(r.ip);
      pathCount.set(r.path, (pathCount.get(r.path) ?? 0) + 1);
      const c = r.country ?? '??';
      countryCount.set(c, (countryCount.get(c) ?? 0) + 1);
    }

    const sortDesc = <K extends string>(m: Map<string, number>, key: K) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([k, count]) => ({ [key]: k, count }) as { [P in K]: string } & { count: number });

    return {
      totalViews: filtered.length,
      uniqueIps: ips.size,
      topPaths: sortDesc(pathCount, 'path'),
      topCountries: sortDesc(countryCount, 'country'),
    };
  },
});
