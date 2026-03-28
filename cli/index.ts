#!/usr/bin/env npx tsx
/**
 * bajkot CLI — pipeline testing tool.
 *
 * Usage: npx tsx cli/index.ts <command> [options]
 * Alias: npm run cli -- <command> [options]
 *
 * Wraps `npx convex run` to call internal Convex functions (no auth needed).
 * Requires `npx convex dev` running in another terminal.
 */

import { Command } from 'commander';
import { execSync, execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

// ── Helpers ─────────────────────────────────────────────────

function convexRun(fn: string, args?: Record<string, unknown>): string {
  // Use execFileSync to avoid shell escaping issues with complex JSON content
  const cmdArgs = ['convex', 'run', fn];
  if (args) cmdArgs.push(JSON.stringify(args));
  try {
    return execFileSync('npx', cmdArgs, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err: any) {
    const stderr = err.stderr?.toString() || '';
    const match = stderr.match(/Error: (.+)/);
    console.error(`\x1b[31m✗ ${match?.[1] || stderr.trim() || err.message}\x1b[0m`);
    process.exit(1);
  }
}

function parseResult(raw: string): any {
  // npx convex run outputs multiline JSON — try parsing the whole thing first
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through
  }

  // If raw output has log lines before JSON, find where JSON starts
  const jsonStart = trimmed.search(/^[\[{"]/m);
  if (jsonStart > 0) {
    try {
      return JSON.parse(trimmed.slice(jsonStart));
    } catch {
      // Fall through
    }
  }

  // Last resort: return as string (e.g. plain ID)
  return trimmed.replace(/^"|"$/g, '');
}

function fmt(date: number): string {
  return new Date(date).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '\x1b[32m', // green
  failed: '\x1b[31m', // red
  paused: '\x1b[33m', // yellow
};

function colorStatus(status: string): string {
  const color = STATUS_COLORS[status] || '\x1b[36m'; // cyan default
  return `${color}${status}\x1b[0m`;
}

// ── Program ─────────────────────────────────────────────────

const program = new Command();
program
  .name('bajkot')
  .description('Bajkot pipeline CLI — test & debug tool')
  .version('1.0.0');

// ── order ───────────────────────────────────────────────────

program
  .command('order')
  .description('Create a new book order and start the pipeline')
  .requiredOption('-n, --name <name>', 'Child name')
  .option('-a, --age <bracket>', 'Age bracket: 3-5, 6-8, 9+', '6-8')
  .option('-g, --gender <gender>', 'Gender: boy, girl', 'girl')
  .option('-p, --problem <id>', 'Problem ID (from catalog)', 'fear_of_dark')
  .option('--detail <text>', 'Problem detail (free text)')
  .option('--toy <name>', 'Favorite toy')
  .option('--glasses', 'Child wears glasses', false)
  .option('--hair-color <key>', 'Hair color key', 'braz')
  .option('--hair-style <key>', 'Hair style key', 'srednie_proste')
  .option('--eye-color <key>', 'Eye color key', 'brazowe')
  .option('--skin-tone <key>', 'Skin tone key', 'jasna')
  .option('--outfit <key>', 'Outfit key', 'bluza_dinozaur')
  .option('-s, --style <A|B>', 'Pre-select style (skip vote)', 'A')
  .option('--no-skip-qa', 'Run full QA reviews (slower)')
  .option('-w, --watch', 'Watch pipeline progress after creating')
  .action(async (opts) => {
    console.log(`\x1b[36m⟳ Creating order for "${opts.name}"...\x1b[0m`);

    const raw = convexRun('cli:createOrder', {
      childName: opts.name,
      ageBracket: opts.age,
      gender: opts.gender,
      problemId: opts.problem,
      problemDetail: opts.detail,
      favoriteToy: opts.toy,
      glasses: opts.glasses,
      hairColor: opts.hairColor,
      hairStyle: opts.hairStyle,
      eyeColor: opts.eyeColor,
      skinTone: opts.skinTone,
      outfit: opts.outfit,
      chosenStyle: opts.style,
      skipQaReviews: opts.skipQa !== false,
    });

    const orderId = parseResult(raw);
    console.log(`\x1b[32m✓ Order created: ${orderId}\x1b[0m`);

    // Start pipeline
    console.log(`\x1b[36m⟳ Starting pipeline...\x1b[0m`);
    convexRun('cli:startPipeline', { orderId });
    console.log(`\x1b[32m✓ Pipeline started\x1b[0m`);

    if (opts.watch) {
      await watchOrder(orderId);
    }
  });

// ── status ──────────────────────────────────────────────────

program
  .command('status')
  .description('Show pipeline queue and stats')
  .option('-l, --limit <n>', 'Number of orders to show', '20')
  .option('-s, --filter-status <status>', 'Filter by status')
  .action((opts) => {
    // Stats
    const statsRaw = convexRun('cli:getPipelineStats');
    const stats = parseResult(statsRaw);

    console.log('\x1b[1m── Pipeline Stats ──\x1b[0m');
    console.log(
      `Total: ${stats.total}  ` +
        `\x1b[32mCompleted: ${stats.completed}\x1b[0m  ` +
        `\x1b[31mFailed: ${stats.failed}\x1b[0m  ` +
        `\x1b[36mIn progress: ${stats.inProgress}\x1b[0m  ` +
        `Success rate: ${stats.successRate}%` +
        (stats.avgTimeMs ? `  Avg time: ${fmtDuration(stats.avgTimeMs)}` : ''),
    );

    if (stats.byStatus && Object.keys(stats.byStatus).length > 0) {
      console.log(
        `By status: ${Object.entries(stats.byStatus)
          .map(([k, v]) => `${k}:${v}`)
          .join('  ')}`,
      );
    }

    // Orders list
    const args: Record<string, unknown> = { limit: parseInt(opts.limit) };
    if (opts.filterStatus) args.status = opts.filterStatus;

    const raw = convexRun('cli:listOrders', args);
    const orders = parseResult(raw);

    if (!Array.isArray(orders) || orders.length === 0) {
      console.log('\nNo orders found.');
      return;
    }

    console.log(`\n\x1b[1m── Orders (${orders.length}) ──\x1b[0m`);
    console.log(
      `${'ID'.padEnd(20)} ${'Name'.padEnd(15)} ${'Status'.padEnd(20)} ${'Agent'.padEnd(6)} ${'LLM#'.padEnd(5)} Created`,
    );
    console.log('─'.repeat(90));

    for (const o of orders) {
      const id = (o._id as string).slice(-12);
      const agent = o.currentAgent ?? '—';
      const err = o.error ? ` \x1b[31m(${o.error.slice(0, 40)})\x1b[0m` : '';
      console.log(
        `${id.padEnd(20)} ${o.childName.padEnd(15)} ${colorStatus(o.status).padEnd(29)} ${agent.padEnd(6)} ${String(o.llmCallCount).padEnd(5)} ${fmt(o.createdAt)}${err}`,
      );
    }
  });

// ── detail ──────────────────────────────────────────────────

program
  .command('detail')
  .description('Show full order detail with artifacts')
  .argument('<orderId>', 'Order ID')
  .option('--artifacts', 'Show raw JSON artifacts')
  .action((orderId, opts) => {
    const raw = convexRun('cli:getOrderDetail', { orderId });
    const o = parseResult(raw);

    if (!o) {
      console.error('\x1b[31m✗ Order not found\x1b[0m');
      process.exit(1);
    }

    console.log(`\x1b[1m── Order: ${o.childName} ──\x1b[0m`);
    console.log(`ID:       ${o._id}`);
    console.log(`Status:   ${colorStatus(o.status)}`);
    console.log(`Agent:    ${o.currentAgent ?? '—'}`);
    console.log(`Problem:  ${o.problemId}`);
    console.log(`Profile:  ${o.gender}, ${o.ageBracket}, style ${o.chosenStyle ?? '?'}`);
    console.log(`QA skip:  ${o.skipQaReviews}`);
    console.log(`LLM calls: ${o.llmCallCount}, retries: ${o.retryCount}`);
    if (o.error) console.log(`\x1b[31mError:    ${o.error}\x1b[0m`);
    console.log(`Created:  ${fmt(o.createdAt)}`);
    if (o.completedAt) console.log(`Done:     ${fmt(o.completedAt)} (${fmtDuration(o.completedAt - o.createdAt)})`);

    // Artifacts presence
    const artifacts = [
      'orderData',
      'characterProfile',
      'storyBlueprint',
      'storyDraft',
      'psychReview',
      'illustrationPlan',
      'visualQa',
      'finalQa',
    ];
    console.log(`\n\x1b[1mArtifacts:\x1b[0m`);
    for (const name of artifacts) {
      const has = !!o[name];
      const marker = has ? '\x1b[32m✓\x1b[0m' : '\x1b[90m·\x1b[0m';
      const size = has ? ` (${Math.round(o[name].length / 1024)}KB)` : '';
      console.log(`  ${marker} ${name}${size}`);
    }

    // Illustrations
    if (o.illustrationUrls?.length > 0) {
      console.log(`\n\x1b[1mIllustrations (${o.illustrationUrls.length}):\x1b[0m`);
      for (const ill of o.illustrationUrls) {
        console.log(`  ${ill.illustrationId}: ${ill.url?.slice(0, 60)}...`);
      }
    }

    // PDF
    if (o.pdfUrl) {
      console.log(`\n\x1b[32mPDF: ${o.pdfUrl}\x1b[0m`);
    }

    // Raw artifacts
    if (opts.artifacts) {
      console.log(`\n\x1b[1m── Raw Artifacts ──\x1b[0m`);
      for (const name of artifacts) {
        if (o[name]) {
          console.log(`\n\x1b[33m${name}:\x1b[0m`);
          try {
            console.log(JSON.stringify(JSON.parse(o[name]), null, 2));
          } catch {
            console.log(o[name]);
          }
        }
      }
    }
  });

// ── events ──────────────────────────────────────────────────

program
  .command('events')
  .description('Show pipeline event timeline for an order')
  .argument('<orderId>', 'Order ID')
  .action((orderId) => {
    const raw = convexRun('cli:getOrderEvents', { orderId });
    const events = parseResult(raw);

    if (!Array.isArray(events) || events.length === 0) {
      console.log('No events found.');
      return;
    }

    console.log(`\x1b[1m── Pipeline Events (${events.length}) ──\x1b[0m\n`);

    const eventColors: Record<string, string> = {
      start: '\x1b[36m',
      complete: '\x1b[32m',
      error: '\x1b[31m',
      retry: '\x1b[33m',
      info: '\x1b[90m',
    };

    let prevTimestamp = 0;
    for (const e of events) {
      const color = eventColors[e.event] || '';
      const delta = prevTimestamp ? ` (+${fmtDuration(e.timestamp - prevTimestamp)})` : '';
      console.log(`${color}${fmt(e.timestamp)} [${e.agent}] ${e.event}: ${e.narrative}\x1b[0m${delta}`);
      if (e.details) {
        console.log(`  \x1b[90m${e.details.slice(0, 200)}\x1b[0m`);
      }
      prevTimestamp = e.timestamp;
    }
  });

// ── logs ────────────────────────────────────────────────────

program
  .command('logs')
  .description('Show LLM call logs')
  .option('-u, --user <clerkUserId>', 'Clerk user ID', 'cli-user')
  .option('-l, --limit <n>', 'Number of logs', '20')
  .option('--full', 'Show full prompts and responses')
  .option('--users', 'List users who have LLM logs')
  .action((opts) => {
    if (opts.users) {
      const raw = convexRun('cli:getLlmLogUsers');
      const users = parseResult(raw);
      if (!Array.isArray(users) || users.length === 0) {
        console.log('No LLM log users found.');
        return;
      }
      console.log(`\x1b[1m── LLM Log Users (${users.length}) ──\x1b[0m\n`);
      for (const u of users) {
        console.log(`  ${u.clerkUserId}  logs:${u.count}  last:${fmt(u.lastActivity)}`);
      }
      return;
    }

    const raw = convexRun('cli:getLlmLogs', {
      clerkUserId: opts.user,
      limit: parseInt(opts.limit),
    });
    const logs = parseResult(raw);

    if (!Array.isArray(logs) || logs.length === 0) {
      console.log('No LLM logs found.');
      return;
    }

    console.log(`\x1b[1m── LLM Logs (${logs.length}) ──\x1b[0m\n`);

    for (const log of logs) {
      const duration = log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '?';
      const status = log.error ? `\x1b[31mERR\x1b[0m` : `\x1b[32mOK\x1b[0m`;
      console.log(
        `${fmt(log.timestamp)} [${status}] ${log.action} (${log.model}) ${duration}`,
      );

      if (opts.full) {
        console.log(`  \x1b[90mSystem: ${log.systemPrompt.slice(0, 200)}...\x1b[0m`);
        console.log(`  \x1b[36mUser: ${log.userPrompt.slice(0, 300)}...\x1b[0m`);
        if (log.response) {
          console.log(`  \x1b[32mResponse: ${log.response.slice(0, 300)}...\x1b[0m`);
        }
        if (log.error) {
          console.log(`  \x1b[31mError: ${log.error}\x1b[0m`);
        }
        console.log('');
      }
    }
  });

// ── download ────────────────────────────────────────────────

program
  .command('download')
  .description('Get PDF download URL for a completed order')
  .argument('<orderId>', 'Order ID')
  .option('-o, --open', 'Open URL in browser')
  .action((orderId, opts) => {
    const raw = convexRun('cli:getDownloadUrl', { orderId });
    const url = parseResult(raw);

    if (!url) {
      console.error('\x1b[31m✗ No PDF available (order not completed?)\x1b[0m');
      process.exit(1);
    }

    console.log(`\x1b[32m${url}\x1b[0m`);

    if (opts.open) {
      execSync(`open "${url}"`);
    }
  });

// ── watch ───────────────────────────────────────────────────

program
  .command('watch')
  .description('Watch order progress in real-time (polls every 5s)')
  .argument('<orderId>', 'Order ID')
  .action(async (orderId) => {
    await watchOrder(orderId);
  });

async function watchOrder(orderId: string) {
  const TERMINAL_STATUSES = new Set(['completed', 'failed', 'paused', 'style_vote']);
  let lastStatus = '';
  let lastAgent = '';

  console.log(`\x1b[36m⟳ Watching order ${orderId.slice(-12)}...\x1b[0m\n`);

  while (true) {
    const raw = convexRun('cli:getOrderDetail', { orderId });
    const o = parseResult(raw);

    if (!o) {
      console.error('\x1b[31m✗ Order not found\x1b[0m');
      break;
    }

    const agent = o.currentAgent ?? '—';
    if (o.status !== lastStatus || agent !== lastAgent) {
      console.log(`${fmt(Date.now())} ${colorStatus(o.status)} [${agent}] llm:${o.llmCallCount}`);
      lastStatus = o.status;
      lastAgent = agent;
    }

    if (TERMINAL_STATUSES.has(o.status)) {
      if (o.status === 'completed') {
        console.log(`\n\x1b[32m✓ Order completed in ${fmtDuration(o.completedAt - o.createdAt)}\x1b[0m`);
        if (o.pdfUrl) console.log(`PDF: ${o.pdfUrl}`);
      } else if (o.status === 'failed') {
        console.log(`\n\x1b[31m✗ Order failed: ${o.error}\x1b[0m`);
      } else if (o.status === 'style_vote') {
        console.log(`\n\x1b[33m⏸ Waiting for style vote (auto-resolves in 15min)\x1b[0m`);
      }
      break;
    }

    await new Promise((r) => setTimeout(r, 5000));
  }
}

// ── presets ──────────────────────────────────────────────────

program
  .command('presets')
  .description('Show available problem IDs and appearance keys')
  .action(() => {
    console.log(`\x1b[1m── Problem IDs ──\x1b[0m`);
    const problems = [
      'fear_of_dark', 'fear_of_doctor', 'fear_of_separation', 'fear_of_monsters',
      'tantrums', 'jealousy_sibling', 'low_self_esteem',
      'shyness', 'sharing_difficulty', 'bullying',
      'picky_eating', 'potty_training', 'screen_addiction',
      'new_sibling', 'moving_house',
    ];
    for (const p of problems) console.log(`  ${p}`);

    console.log(`\n\x1b[1m── Hair Colors ──\x1b[0m`);
    for (const k of ['blond', 'jasny_braz', 'braz', 'ciemny_braz', 'czarny', 'rudy']) console.log(`  ${k}`);

    console.log(`\n\x1b[1m── Hair Styles ──\x1b[0m`);
    for (const k of ['krotkie_proste', 'krotkie_falowane', 'srednie_proste', 'srednie_falowane', 'dlugie_proste', 'dlugie_krecone', 'koki', 'kucyk']) console.log(`  ${k}`);

    console.log(`\n\x1b[1m── Eye Colors ──\x1b[0m`);
    for (const k of ['niebieskie', 'zielone', 'brazowe', 'piwne', 'szare']) console.log(`  ${k}`);

    console.log(`\n\x1b[1m── Skin Tones ──\x1b[0m`);
    for (const k of ['jasna', 'srednia', 'ciemna', 'smietankowa']) console.log(`  ${k}`);

    console.log(`\n\x1b[1m── Outfits ──\x1b[0m`);
    for (const k of [
      'bluza_dinozaur', 'bluza_jednorozec', 'bluza_rakieta', 'bluza_kwiaty',
      'koszulka_serce', 'koszulka_auto', 'pizama_gwiazdy', 'pizama_misie',
      'sukienka_motyle', 'ogrodniczki',
    ]) console.log(`  ${k}`);

    console.log(`\n\x1b[1m── Age Brackets ──\x1b[0m`);
    for (const k of ['3-5', '6-8', '9+']) console.log(`  ${k}`);

    console.log(`\n\x1b[1m── Genders ──\x1b[0m`);
    for (const k of ['boy', 'girl']) console.log(`  ${k}`);
  });

// ── prompts ────────────────────────────────────────────────

const promptsCmd = program
  .command('prompts')
  .description('Manage pipeline prompts (list, get, set, seed)');

promptsCmd
  .command('list')
  .description('List all pipeline prompts and their DB status')
  .action(() => {
    const raw = convexRun('cli:listPrompts');
    const prompts = parseResult(raw);

    if (!Array.isArray(prompts) || prompts.length === 0) {
      console.log('No prompts found.');
      return;
    }

    console.log(`\x1b[1m── Pipeline Prompts (${prompts.length}) ──\x1b[0m\n`);
    console.log(
      `${'Key'.padEnd(25)} ${'Agent'.padEnd(25)} ${'Source'.padEnd(16)} ${'Size'.padEnd(8)} ${'Vers'.padEnd(5)}`,
    );
    console.log('─'.repeat(85));

    for (const p of prompts) {
      const source = p.inDb
        ? p.modified
          ? '\x1b[33mdb (modified)\x1b[0m'
          : '\x1b[32mdb (seeded)\x1b[0m'
        : '\x1b[90mfallback\x1b[0m';
      const size = p.contentLength > 0 ? `${Math.round(p.contentLength / 1024)}KB` : '—';
      console.log(
        `${p.key.padEnd(25)} ${p.agent.padEnd(25)} ${source.padEnd(27)} ${size.padEnd(8)} ${String(p.versions).padEnd(5)}`,
      );
    }
  });

promptsCmd
  .command('get')
  .description('Get full prompt content by key')
  .argument('<key>', 'Prompt key (e.g. bookStoryWriter)')
  .option('--json', 'Output as JSON')
  .action((key, opts) => {
    const raw = convexRun('cli:getPromptContent', { key });
    const result = parseResult(raw);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\x1b[1m── ${result.agent} (${result.key}) ──\x1b[0m`);
      console.log(`Source: ${result.source}`);
      if (result.updatedAt) console.log(`Updated: ${fmt(result.updatedAt)}`);
      console.log('');
      if (result.content) {
        console.log(result.content);
      } else {
        console.log('\x1b[90m(no content in DB — using fallback)\x1b[0m');
      }
    }
  });

promptsCmd
  .command('set')
  .description('Update prompt content from file or stdin')
  .argument('<key>', 'Prompt key (e.g. bookStoryWriter)')
  .option('-f, --file <path>', 'Read content from file')
  .option('-m, --message <note>', 'Change note', 'CLI update')
  .action((key, opts) => {
    let content: string;

    if (opts.file) {
      if (!existsSync(opts.file)) {
        console.error(`\x1b[31m✗ File not found: ${opts.file}\x1b[0m`);
        process.exit(1);
      }
      content = readFileSync(opts.file, 'utf-8');
    } else {
      // Read from stdin
      content = readFileSync(0, 'utf-8');
    }

    if (!content.trim()) {
      console.error('\x1b[31m✗ Empty content\x1b[0m');
      process.exit(1);
    }

    console.log(`\x1b[36m⟳ Updating ${key} (${content.length} chars)...\x1b[0m`);
    const raw = convexRun('cli:setPromptContent', {
      key,
      content,
      changeNote: opts.message,
    });
    const result = parseResult(raw);
    console.log(`\x1b[32m✓ ${key} updated (${result.contentLength} chars)\x1b[0m`);
  });

promptsCmd
  .command('seed')
  .description('Seed DB with fallback prompts (idempotent)')
  .action(() => {
    console.log('\x1b[36m⟳ Seeding prompts from fallbacks...\x1b[0m');
    const raw = convexRun('admin/bookPrompts:seedPrompts');
    const count = parseResult(raw);
    console.log(`\x1b[32m✓ Seeded ${count} new prompts\x1b[0m`);
  });

// ── Run ─────────────────────────────────────────────────────

program.parse();
