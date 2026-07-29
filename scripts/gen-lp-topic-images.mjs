/**
 * Generates the per-topic illustration shown next to "Bajkoterapia jest
 * bezpieczna" on every /problem/<slug> page.
 *
 * Every image reuses the composition of the original shared asset
 * (public/lp/spread.webp): an open storybook on a wooden table, the left page
 * painted with a scene from that topic, the right page blank. Only the scene
 * changes — so 39 pages stay visually one family.
 *
 * Usage:  GOOGLE_GENERATIVE_AI_API_KEY=... node scripts/gen-lp-topic-images.mjs [slug...]
 * Writes PNGs to scripts/.out/<slug>.png (conversion to webp is done by the caller).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'scripts', '.out');
const MODEL = 'gemini-2.5-flash-image';
const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const MIN_INTERVAL_MS = 2_000;

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
  process.exit(1);
}

const scenes = JSON.parse(readFileSync(join(ROOT, 'scripts', 'lp-topic-scenes.json'), 'utf8'));

/** Framing copied from the asset this replaces, so the set stays consistent. */
function buildPrompt(scene) {
  return [
    'A soft dreamy watercolour illustration, in the style of a classic printed picture book for young children.',
    'The composition: an open hardcover storybook lying flat on a warm honey-toned wooden table, seen slightly from above, against a plain cream painted background.',
    `The LEFT page of the book is painted with this scene: ${scene}`,
    'The RIGHT page is blank cream paper with a delicate golden-olive leafy decorative border and nothing inside it.',
    'Gentle pastel palette, soft feathered edges where paint meets paper, visible paper grain, luminous warm light, calm and safe and tender mood, hand-painted children\'s book art.',
    'ABSOLUTELY NO TEXT, no letters, no words, no writing, no numbers, no signage, no captions anywhere in the image. The book pages carry only painting and the decorative border.',
    'No photorealism, no 3D render, no harsh black outlines.',
  ].join(' ');
}

async function generate(slug, scene) {
  const prompt = buildPrompt(scene);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      });
      if (res.status === 429) {
        const wait = 30_000 * (attempt + 1);
        console.warn(`[${slug}] rate limited, waiting ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) {
        console.warn(`[${slug}] HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 4_000));
        continue;
      }
      const json = await res.json();
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) {
        console.warn(`[${slug}] no image in response (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, 4_000));
        continue;
      }
      writeFileSync(join(OUT, `${slug}.png`), Buffer.from(part.inlineData.data, 'base64'));
      return true;
    } catch (err) {
      console.warn(`[${slug}] ${err.message} (attempt ${attempt + 1})`);
      await new Promise((r) => setTimeout(r, 4_000));
    }
  }
  return false;
}

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const slugs = (only.length ? only : Object.keys(scenes)).filter((s) => scenes[s]);
const failed = [];
let done = 0;

for (const slug of slugs) {
  if (existsSync(join(OUT, `${slug}.png`)) && !only.length) {
    console.log(`[${slug}] already present, skipping`);
    done++;
    continue;
  }
  const ok = await generate(slug, scenes[slug]);
  if (ok) {
    done++;
    console.log(`[${slug}] ok (${done}/${slugs.length})`);
  } else {
    failed.push(slug);
    console.error(`[${slug}] FAILED`);
  }
  await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
}

console.log(`\nDone: ${done}/${slugs.length}`);
if (failed.length) console.log(`Failed: ${failed.join(', ')}`);
