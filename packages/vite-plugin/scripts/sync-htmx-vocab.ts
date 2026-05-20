/**
 * Regenerate `packages/vite-plugin/src/htmx-localized-attrs.ts` from
 * the canonical vocab files at `packages/core/vocab/htmx/*.js`.
 *
 * The scanner uses these maps at build time to route projects authored
 * in non-English languages to the correct bundle. Whenever the vocab
 * regenerates (via `npm run generate:htmx-vocab --prefix packages/core`),
 * re-run this script to keep the vite-plugin's static set in sync.
 *
 * Usage:
 *   npx tsx packages/vite-plugin/scripts/sync-htmx-vocab.ts
 *   npm run sync-htmx-vocab --prefix packages/vite-plugin
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VOCAB_DIR = resolve(__dirname, '../../core/vocab/htmx');
const OUTPUT_FILE = resolve(__dirname, '../src/htmx-localized-attrs.ts');

interface LiveEntry {
  suffix: string;
  lang: string;
}

function extractLiveEntries(): LiveEntry[] {
  const entries: LiveEntry[] = [];
  const files = readdirSync(VOCAB_DIR)
    .filter(f => f.endsWith('.js') && f !== 'en.js')
    .sort();
  for (const file of files) {
    const lang = file.replace('.js', '');
    const source = readFileSync(resolve(VOCAB_DIR, file), 'utf-8');
    const m = source.match(/"hx-([^"]+)":\s*"hx-live"/);
    if (m) entries.push({ suffix: m[1], lang });
  }
  return entries;
}

function renderFile(entries: LiveEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.lang.localeCompare(b.lang));
  const setLines = sorted.map(e => `  '${e.suffix}', // ${e.lang}`).join('\n');

  return `/**
 * Localized htmx-compat attribute name maps for the scanner.
 *
 * The vocab generator at \`packages/core/scripts/gen-htmx-vocab.mjs\`
 * emits per-language vocab modules under \`packages/core/vocab/htmx/\`.
 * Those modules drive the runtime orchestrator. The scanner needs the
 * same information at build time so it can route projects authored in
 * non-English languages to the correct bundle.
 *
 * Re-sync this file whenever the vocab regenerates:
 *
 *   npm run sync-htmx-vocab --prefix packages/vite-plugin
 *
 * Drift detection happens via a unit test that re-derives the maps from
 * \`packages/core/vocab/htmx/*.js\` and compares against this file's
 * contents.
 */

/**
 * Localized names that mean \`hx-live\` (htmx v4 reactive expression).
 * Used to set \`needsHxLive\` + \`needsReactivity\` for non-English authors.
 *
 * Auto-derived from \`packages/core/vocab/htmx/*.js\`. Re-sync if vocab
 * changes (see file-level comment).
 */
export const HX_LIVE_LOCALIZED: ReadonlySet<string> = new Set([
  // Each entry is the suffix after the \`hx-\` prefix.
${setLines}
]);

/**
 * Build a single regex that matches any localized form of \`hx-live\`.
 * Anchored on word boundary + attribute-assignment to avoid matching
 * inside JS strings or partial words.
 */
export function buildLocalizedHxLivePattern(): RegExp {
  const suffixes = [...HX_LIVE_LOCALIZED]
    .map(s => s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'))
    .join('|');
  // Unicode mode required for Hebrew/Arabic/CJK character classes.
  return new RegExp(\`\\\\bhx-(?:\${suffixes})\\\\s*=\\\\s*["']\`, 'u');
}

/**
 * Any \`sse-*\` attribute (English or localized) triggers needsSSE.
 * The htmx-compat layer scopes SSE features to attributes inside the
 * \`sse-\` namespace, so namespace-only matching is correct.
 */
export const SSE_NS_PATTERN = /\\bsse-[\\w\\-\\p{L}]+\\s*=\\s*["']/u;

/** Any \`ws-*\` attribute triggers needsWS — see SSE_NS_PATTERN. */
export const WS_NS_PATTERN = /\\bws-[\\w\\-\\p{L}]+\\s*=\\s*["']/u;
`;
}

function main(): void {
  const entries = extractLiveEntries();
  if (entries.length === 0) {
    console.error(`[sync-htmx-vocab] No hx-live entries found under ${VOCAB_DIR}`);
    console.error('  Did you run `npm run generate:htmx-vocab --prefix packages/core` first?');
    process.exit(1);
  }
  const content = renderFile(entries);
  writeFileSync(OUTPUT_FILE, content, 'utf-8');
  console.log(`[sync-htmx-vocab] Wrote ${entries.length} hx-live entries to`);
  console.log(`  ${OUTPUT_FILE.replace(process.cwd() + '/', '')}`);
  for (const e of entries) {
    console.log(`  ${e.lang}: hx-${e.suffix}`);
  }
}

main();
