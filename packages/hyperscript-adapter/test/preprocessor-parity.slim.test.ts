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
import {
  setPatternGenerator,
  generatePatternsForLanguage,
  type LanguageProfile,
} from '@lokascript/semantic/core';
import { preprocessToEnglish } from '../src/slim-preprocessor';
import { PARITY_CORPUS, loadFixture } from './parity-harness';

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
