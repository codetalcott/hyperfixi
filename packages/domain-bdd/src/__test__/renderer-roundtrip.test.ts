/**
 * renderBDD SOV round-trip guardrail.
 *
 * For every example × SOV language (ja/ko/tr): parse the English form, render
 * it to the target language, then compile the rendered text. The rendered form
 * must compile AND produce the *same generated code* as the English form.
 *
 * Comparing compiled output (not raw roles) is deliberate: the BDD parser keeps
 * language-specific keywords in role values (`tıkla` vs `click`), but the
 * generator normalizes them — so identical compiled code is the true test of a
 * faithful round-trip, and a `compile().ok` check alone would miss role swaps.
 *
 * Regression guard for the SOV renderer bug (Turkish `STATE_WORDS` copula order
 * and the cross-language class-assertion particle leak). See the
 * project-renderllm-sov-bug memory note.
 */

import { describe, it, expect } from 'vitest';
import { createBDDDSL, renderBDD } from '../index.js';

const SOV_LANGUAGES = ['ja', 'ko', 'tr'];

const EXAMPLES = [
  'given #button is visible',
  'given #panel is hidden',
  'when click on #button',
  'then #button has .active',
];

describe('renderBDD SOV round-trip (render → compile)', () => {
  const dsl = createBDDDSL();

  for (const en of EXAMPLES) {
    const enNode = dsl.parse(en, 'en');
    const enResult = dsl.compile(en, 'en');

    for (const lang of SOV_LANGUAGES) {
      it(`"${en}" → ${lang}: rendered form compiles to identical code`, () => {
        const surface = renderBDD(enNode, lang);
        const result = dsl.compile(surface, lang);
        expect(result.ok, `"${surface}" — ${JSON.stringify(result.errors)}`).toBe(true);
        expect(result.code).toBe(enResult.code);
      });
    }
  }
});
