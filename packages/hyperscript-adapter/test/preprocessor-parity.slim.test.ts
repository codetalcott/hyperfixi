/**
 * Slim-path half of the preprocessor parity ratchet.
 *
 * See preprocessor-parity.full.test.ts for the design rationale (absolute
 * snapshot pins; two files so the two paths' registry wiring never shares
 * a module graph). This file must NEVER import `@lokascript/semantic` (the
 * full package) — only `/core` and `/languages/*`, the same chain a
 * per-language bundle entry uses. The full package's import side effect
 * wires the rich handcrafted-pattern builder, which would mask the slim
 * path's real (schema-only) behavior.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setPatternGenerator,
  generatePatternsForLanguage,
  type LanguageProfile,
} from '@lokascript/semantic/core';
import { preprocessToEnglish } from '../src/slim-preprocessor';
import { PARITY_CORPUS, KNOWN_DIVERGENCES, loadFixture } from './parity-harness';

// Side-effect language registrations, same as per-language bundle entries.
// Keep in sync with SLIM_LANGS in parity-harness.ts.
import '@lokascript/semantic/languages/es';
import '@lokascript/semantic/languages/ja';
import '@lokascript/semantic/languages/ko';
import '@lokascript/semantic/languages/zh';
import '@lokascript/semantic/languages/fr';
import '@lokascript/semantic/languages/ar';

const fixture = loadFixture();

beforeAll(() => {
  // Same wiring as src/bundles/shared.ts.
  setPatternGenerator((profile: LanguageProfile) => generatePatternsForLanguage(profile));
});

describe('preprocessor parity — slim path', () => {
  it.each(fixture.map((row, i) => [row.lang, row.input, i] as const))(
    '[%s] %s — slim path matches its snapshot',
    (_lang, _input, i) => {
      const row = fixture[i];
      expect(preprocessToEnglish(row.input, row.lang, PARITY_CORPUS[i].config ?? {})).toBe(
        row.slim
      );
    }
  );
});

/**
 * SAFETY PIN for the one remaining divergence (the es `repeat` row): its
 * slim output must stay engine-INVALID until the repeat surface is fixed
 * whole. Today the schema-generated event pattern drops `3 times` — a bare
 * `repeat` is FOREVER — and only the output's invalidity makes that safe:
 * the host-validate gate (#900) rejects it and the author's original text
 * stays. A partial repair that makes this render valid while still
 * dropping the quantity (measured: mirroring semantic's string-content
 * `to me` exception alone does exactly that) would commit an infinite
 * loop. If this test reddens, do NOT relax it — fix quantity capture, the
 * repeat SYNTAX render, and the me-suppression exception together, then
 * retire the divergence row and this pin in that change.
 */
describe('remaining divergence stays behind the host-validate gate', () => {
  it('es repeat row: slim output is rejected by the real engine (safe fallback)', () => {
    const vendor = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        'browser',
        'vendor',
        '_hyperscript-0.9.93.min.js'
      ),
      'utf8'
    );
    new Function(vendor).call(globalThis);
    const hs = (globalThis as { _hyperscript?: { parse(s: string): { errors?: unknown[] } } })
      ._hyperscript;
    if (!hs?.parse) throw new Error('vendored _hyperscript did not expose parse()');

    const [lang, input] = KNOWN_DIVERGENCES[0];
    const slimOut = preprocessToEnglish(input, lang, {});
    expect(slimOut).not.toBe(input); // the slim path DOES commit a translation…
    let errors: unknown[];
    try {
      errors = hs.parse(slimOut)?.errors ?? [];
    } catch (e) {
      errors = [e];
    }
    expect(errors.length).toBeGreaterThan(0); // …and the engine rejects it → F8 falls back
  });
});
