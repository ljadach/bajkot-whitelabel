#!/usr/bin/env node

/**
 * Transforms markdown content from aitutoro-content-pipeline/output/ to JSON
 * for the i18n system. Reads final.md files and generates product-*.json files.
 *
 * Usage: node scripts/transform-content-to-json.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIPELINE_DIR = path.resolve(__dirname, '../../aitutoro-content-pipeline/output');
const LOCALES_DIR = path.resolve(__dirname, '../src/locales/en');

const TOOLS = [
  'chatgpt',
  'claude',
  'gemini',
  'copilot',
  'midjourney',
  'dalle',
  'grok',
  'notebooklm',
  'perplexity',
];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/);
  if (!match) return { meta: {}, markdown: content };

  const frontmatter = match[1];
  const markdown = match[2];

  // Simple YAML parsing for the fields we need
  const meta = {};
  const lines = frontmatter.split('\n');
  let currentKey = null;

  for (const line of lines) {
    const keyMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (keyMatch) {
      const [, key, value] = keyMatch;
      // Remove quotes from values
      meta[key] = value.replace(/^["']|["']$/g, '').trim();
      currentKey = key;
    }
  }

  return { meta, markdown };
}

function extractSections(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let currentSection = null;
  let heroBody = '';
  let inHero = true;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      inHero = false;
      if (currentSection) sections.push(currentSection);

      const title = line.slice(3).trim();
      // Skip "Agent Confidence" and "Frequently asked questions" sections
      if (title === 'Agent Confidence' || title === 'Frequently asked questions') {
        currentSection = null;
        continue;
      }

      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      currentSection = { id, title, body: '' };
    } else if (currentSection) {
      currentSection.body += line + '\n';
    } else if (inHero) {
      heroBody += line + '\n';
    }
  }
  if (currentSection && currentSection.title !== 'Agent Confidence') {
    sections.push(currentSection);
  }

  // Trim section bodies
  sections.forEach((s) => {
    s.body = s.body.trim();
  });

  return { heroBody: heroBody.trim(), sections };
}

function extractQuickAnswer(heroBody) {
  // The hero body is the intro paragraphs after the H1 title
  const lines = heroBody.split('\n');

  // Skip the H1 line
  const filtered = lines.filter((l) => !l.startsWith('# '));
  const text = filtered.join('\n').trim();

  // Split into first paragraph (intro) and rest (quick answer)
  const paragraphs = text.split('\n\n');
  const intro = paragraphs[0] || '';
  const quickAnswer = paragraphs.slice(1).join('\n\n') || '';

  return { intro, quickAnswer };
}

function transformProduct(tool) {
  const filePath = path.join(PIPELINE_DIR, tool, 'final.md');
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP: ${filePath} not found`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const { meta, markdown } = parseFrontmatter(content);
  const { heroBody, sections } = extractSections(markdown);
  const { intro, quickAnswer } = extractQuickAnswer(heroBody);

  // Extract H1 title
  const h1Match = markdown.match(/^# (.+)$/m);
  const heroTitle = h1Match ? h1Match[1].trim() : meta.title || tool;

  const json = {
    meta: {
      title: meta.title || heroTitle,
      description: meta.meta_description || '',
    },
    hero: {
      title: heroTitle,
      intro: intro || '',
    },
    lastUpdated: 'February 2026',
    quickAnswer: {
      body: quickAnswer || intro || '',
    },
    sections,
    related: [],
  };

  const outPath = path.join(LOCALES_DIR, `product-${tool}.json`);
  fs.writeFileSync(outPath, JSON.stringify(json, null, 2) + '\n');
  console.log(`  OK: ${outPath} (${sections.length} sections)`);
}

console.log('Transforming product content to JSON...');
console.log(`Pipeline dir: ${PIPELINE_DIR}`);
console.log(`Output dir: ${LOCALES_DIR}\n`);

for (const tool of TOOLS) {
  console.log(`Processing ${tool}...`);
  transformProduct(tool);
}

console.log('\nDone! Review generated files and add "related" links manually.');
