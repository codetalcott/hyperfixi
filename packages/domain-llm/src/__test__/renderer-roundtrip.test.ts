/**
 * renderLLM round-trip guardrail.
 *
 * For every command × language: parse the English example, render it to the
 * target language, then re-parse the rendered text. The rendered form must
 * compile AND re-parse to the *same roles* — a `compile().ok` check alone
 * would miss silent role swaps (e.g. patient/manner transposed).
 *
 * This is the regression guard for the SOV renderer bug — see
 * project-renderllm-sov-bug memory note.
 */

import { describe, it, expect } from 'vitest';
import type { SemanticNode } from '@lokascript/framework';
import { extractValue } from '@lokascript/framework';
import { createLLMDSL, renderLLM, describeCommands, LLM_LANGUAGE_CODES } from '../index.js';

function roleMap(node: SemanticNode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [role, value] of node.roles) out[role] = extractValue(value);
  return out;
}

describe('renderLLM round-trip (render → compile → re-parse)', () => {
  const llm = createLLMDSL();

  for (const cmd of describeCommands()) {
    const en = cmd.examples.en;
    const enNode = llm.parse(en, 'en');
    const enRoles = roleMap(enNode);

    for (const lang of LLM_LANGUAGE_CODES) {
      it(`${cmd.action} → ${lang}: rendered form re-parses to identical roles`, () => {
        const surface = renderLLM(enNode, lang);
        const result = llm.compile(surface, lang);
        expect(result.ok, `"${surface}" — ${JSON.stringify(result.errors)}`).toBe(true);

        const reparsed = llm.parse(surface, lang);
        expect(reparsed.action).toBe(cmd.action);
        expect(roleMap(reparsed)).toEqual(enRoles);
      });
    }
  }
});
