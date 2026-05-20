/**
 * Drift test: verify the static HX_LIVE_LOCALIZED set matches what the
 * vocab generator emits into packages/core/vocab/htmx/*.js.
 *
 * If this fails, run:
 *   npm run sync-htmx-vocab --prefix packages/vite-plugin
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { HX_LIVE_LOCALIZED } from './htmx-localized-attrs';

const VOCAB_DIR = resolve(__dirname, '../../core/vocab/htmx');

/**
 * Extract the localized suffix that each priority language uses for
 * `hx-live` by scanning the vocab .js files.
 */
function extractLiveSuffixes(): Set<string> {
  const out = new Set<string>();
  const files = readdirSync(VOCAB_DIR).filter(f => f.endsWith('.js') && f !== 'en.js');
  for (const file of files) {
    const source = readFileSync(resolve(VOCAB_DIR, file), 'utf-8');
    // Match `"hx-<localized>": "hx-live"` (skip the canonical line in en.js — already excluded).
    const m = source.match(/"hx-([^"]+)":\s*"hx-live"/);
    if (m) out.add(m[1]);
  }
  return out;
}

describe('htmx-localized-attrs drift detection', () => {
  it('HX_LIVE_LOCALIZED matches the live-suffix set extracted from vocab .js files', () => {
    const fromVocab = extractLiveSuffixes();
    const fromStatic = new Set(HX_LIVE_LOCALIZED);
    // Diff in both directions for an actionable error message.
    const missing = [...fromVocab].filter(s => !fromStatic.has(s));
    const extra = [...fromStatic].filter(s => !fromVocab.has(s));
    expect(
      { missing, extra },
      'Run `npm run sync-htmx-vocab --prefix packages/vite-plugin` to update.'
    ).toEqual({ missing: [], extra: [] });
  });
});
