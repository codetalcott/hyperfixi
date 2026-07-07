/**
 * Bridge-era languages (arc Phase 2 expansion): German, Portuguese, Russian.
 *
 * Each language was added with ONE vocab file (LLM verbs + marker words) —
 * grammar comes from @lokascript/semantic's profiles through the framework
 * bridge. Mirrors the per-language blocks in llm-domain.test.ts, plus
 * cross-language byte-identity of the compiled LLMPromptSpec. (renderLLM
 * round-trips for these languages are covered by renderer-roundtrip.test.ts,
 * which iterates LLM_LANGUAGE_CODES.)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import { createLLMDSL } from '../index.js';

let llm: MultilingualDSL;

beforeAll(() => {
  llm = createLLMDSL();
});

describe('LLM Domain — bridge-era languages', () => {
  it('supports 11 languages', () => {
    const languages = llm.getSupportedLanguages();
    expect(languages).toHaveLength(11);
    for (const code of ['de', 'pt', 'ru']) {
      expect(languages).toContain(code);
    }
  });

  describe('German (SVO)', () => {
    it('parses ask with question and context', () => {
      const node = llm.parse('fragen "What is this?" aus #article', 'de');
      expect(node.action).toBe('ask');
      expect(extractRoleValue(node, 'patient')).toBe('What is this?');
      expect(extractRoleValue(node, 'source')).toBe('#article');
    });

    it('parses summarize with format', () => {
      const node = llm.parse('zusammenfassen #document als bullets', 'de');
      expect(node.action).toBe('summarize');
      expect(extractRoleValue(node, 'patient')).toBe('#document');
      expect(extractRoleValue(node, 'manner')).toBe('bullets');
    });

    it('parses translate from/to', () => {
      const node = llm.parse('übersetzen #text aus english nach japanese', 'de');
      expect(node.action).toBe('translate');
      expect(extractRoleValue(node, 'source')).toBe('english');
      expect(extractRoleValue(node, 'destination')).toBe('japanese');
    });
  });

  describe('Portuguese (SVO)', () => {
    it('parses ask with question and context', () => {
      const node = llm.parse('perguntar "What is this?" de #article', 'pt');
      expect(node.action).toBe('ask');
      expect(extractRoleValue(node, 'patient')).toBe('What is this?');
      expect(extractRoleValue(node, 'source')).toBe('#article');
    });

    it('parses analyze as type', () => {
      const node = llm.parse('analisar #review como sentiment', 'pt');
      expect(node.action).toBe('analyze');
      expect(extractRoleValue(node, 'patient')).toBe('#review');
      expect(extractRoleValue(node, 'manner')).toBe('sentiment');
    });

    it('parses translate from/to', () => {
      const node = llm.parse('traduzir #text de english para japanese', 'pt');
      expect(node.action).toBe('translate');
      expect(extractRoleValue(node, 'source')).toBe('english');
      expect(extractRoleValue(node, 'destination')).toBe('japanese');
    });
  });

  describe('Russian (SVO)', () => {
    it('parses ask with question and context', () => {
      const node = llm.parse('спросить "What is this?" из #article', 'ru');
      expect(node.action).toBe('ask');
      expect(extractRoleValue(node, 'patient')).toBe('What is this?');
      expect(extractRoleValue(node, 'source')).toBe('#article');
    });

    it('parses summarize with length', () => {
      const node = llm.parse('суммировать #document в 3', 'ru');
      expect(node.action).toBe('summarize');
      expect(extractRoleValue(node, 'patient')).toBe('#document');
      expect(extractRoleValue(node, 'quantity')).toBe('3');
    });

    it('parses translate from/to', () => {
      const node = llm.parse('перевести #text из english на japanese', 'ru');
      expect(node.action).toBe('translate');
      expect(extractRoleValue(node, 'source')).toBe('english');
      expect(extractRoleValue(node, 'destination')).toBe('japanese');
    });
  });

  // ===========================================================================
  // Cross-language byte-identity: every language's form of a command compiles
  // to the same LLMPromptSpec JSON as its English equivalent.
  // ===========================================================================

  describe('Cross-language compile parity', () => {
    const cases: Array<[string, string, string]> = [
      // [lang, native, english-equivalent]
      ['de', 'fragen "What is this?" aus #article', 'ask "What is this?" from #article'],
      ['pt', 'perguntar "What is this?" de #article', 'ask "What is this?" from #article'],
      ['ru', 'спросить "What is this?" из #article', 'ask "What is this?" from #article'],
      [
        'de',
        'übersetzen #text aus english nach japanese',
        'translate #text from english to japanese',
      ],
      ['pt', 'traduzir #text de english para japanese', 'translate #text from english to japanese'],
      ['ru', 'перевести #text из english на japanese', 'translate #text from english to japanese'],
    ];

    it.each(cases)('[%s] "%s" compiles like its English form', (lang, native, english) => {
      const localized = llm.compile(native, lang);
      const reference = llm.compile(english, 'en');
      expect(localized.ok).toBe(true);
      expect(reference.ok).toBe(true);
      expect(localized.code).toBe(reference.code);
    });
  });
});
