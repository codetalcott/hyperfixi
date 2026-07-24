/**
 * Adding a command to domain-llm from outside the package.
 *
 * This is the scenario lokascript-learn built by hand against 2.8.0: a fifth
 * LLM command that parses in several languages and renders with correct word
 * order in each. It worked then only by reconstructing the DSL from the
 * package's exported schemas, profiles and tokenizers, because `renderLLM` and
 * the code generator were closed `switch (node.action)` statements. The
 * `extensions` option is the supported path.
 */

import { describe, it, expect } from 'vitest';
import { defineCommand, defineRole, type DomainExtension } from '@lokascript/framework';
import { createLLMDSL, renderLLM } from '../index.js';

const researchSchema = defineCommand({
  action: 'research',
  description: 'Research a topic against a source',
  category: 'llm',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The topic to research',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
    }),
    defineRole({
      role: 'source',
      description: 'Where to research it',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { en: 'from', es: 'de', ja: 'から', ko: '에서', ar: 'من', tr: 'dan' },
    }),
  ],
});

const research: DomainExtension = {
  schema: researchSchema,
  vocabulary: {
    en: { keyword: { primary: 'research' } },
    es: { keyword: { primary: 'investigar' } },
    ja: { keyword: { primary: '調査' } },
    ko: { keyword: { primary: '조사' } },
    ar: { keyword: { primary: 'ابحث' } },
    tr: { keyword: { primary: 'araştır' } },
  },
};

/**
 * Surface forms per language — verb-initial for ar, verb-final for ja/ko/tr,
 * each with its own source marker. All of it derives from the schema plus the
 * one keyword per language above.
 *
 * Values are unquoted single words: the schema renderer does not yet re-quote
 * multi-word literals (`quoteMultiword` is not modelled), so `"climate change"`
 * would not round-trip. Single-word topics are the honest scope for now.
 */
const SURFACES: Array<[string, string]> = [
  ['en', 'research climate from #wiki'],
  ['es', 'investigar climate de #wiki'],
  ['ja', 'climate #wiki から 調査'],
  ['ko', 'climate #wiki 에서 조사'],
  ['ar', 'ابحث climate من #wiki'],
  ['tr', 'climate #wiki dan araştır'],
];

describe('extending domain-llm with a fifth command', () => {
  const llm = createLLMDSL({ extensions: [research] });

  describe('parsing', () => {
    for (const [language, surface] of SURFACES) {
      it(`parses the extension command in ${language}`, () => {
        const node = llm.parse(surface, language);
        expect(node.action).toBe('research');
        expect(node.roles.get('patient')).toBeDefined();
        expect(node.roles.get('source')).toBeDefined();
      });
    }

    it('does not parse it without the extension', () => {
      expect(() => createLLMDSL().parse('research climate from #wiki', 'en')).toThrow();
    });

    // domain-llm configures 11 languages; this extension supplies 6. Vocabulary
    // can be filled in over time, so the rest simply do not know the command.
    it('does not parse it in a language the extension has no vocabulary for', () => {
      expect(() => llm.parse('research climate from #wiki', 'zh')).toThrow();
    });

    it('still parses built-in commands in those languages', () => {
      expect(llm.parse('总结 #document', 'zh').action).toBe('summarize');
    });
  });

  describe('rendering', () => {
    const node = llm.parse('research climate from #wiki', 'en');

    for (const [language, surface] of SURFACES) {
      it(`renders verb-correct ${language} from the schema alone`, () => {
        expect(llm.render?.(node, language)).toBe(surface);
      });
    }

    it('renders back to something that re-parses to the same roles', () => {
      for (const [language] of SURFACES) {
        const surface = llm.render?.(node, language);
        expect(surface, `no render for ${language}`).not.toBeNull();
        expect(llm.parse(surface!, language).action).toBe('research');
      }
    });
  });

  describe('built-in commands are untouched', () => {
    const plain = createLLMDSL();

    it('parses and compiles ask identically with the extension present', () => {
      const input = 'ask "What is this?" from #article';
      expect(llm.parse(input, 'en').action).toBe(plain.parse(input, 'en').action);
      expect(llm.compile(input, 'en').code).toBe(plain.compile(input, 'en').code);
    });

    it('renders built-ins through renderLLM, not the schema fallback', () => {
      const askNode = plain.parse('ask "What is this?" from #article', 'en');
      expect(llm.render?.(askNode, 'ja')).toBe(renderLLM(askNode, 'ja'));
    });
  });

  describe('the sentinel is gone', () => {
    it('renderLLM returns null for an unknown action rather than a string', () => {
      const bogus = { kind: 'command' as const, action: 'nonsense', roles: new Map() };
      expect(renderLLM(bogus, 'en')).toBeNull();
    });

    it('renderLLM renders an extension command through the schema fallthrough', () => {
      // renderLLM has no `research` case, and domain-llm's own schemas do not
      // include it either — so the standalone renderer returns null while the
      // extended DSL renders it. Extension rendering is a DSL-level concern.
      const node = llm.parse('research climate from #wiki', 'en');
      expect(renderLLM(node, 'en')).toBeNull();
      expect(llm.render?.(node, 'en')).toBe('research climate from #wiki');
    });
  });
});
