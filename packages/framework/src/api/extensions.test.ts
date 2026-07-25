/**
 * DomainExtension: adding a command to a DSL from outside its package.
 *
 * Every domain used to render through a hardcoded `switch (node.action)` and
 * generate through another, so a downstream consumer could not add a command
 * without editing the package. This is the supported path: a schema plus one
 * vocabulary entry per language.
 *
 * The command exercised here ("research") is the one lokascript-learn built by
 * hand against 2.8.0 to prove the underlying pieces worked.
 */

import { describe, it, expect } from 'vitest';
import {
  createMultilingualDSL,
  createSimpleTokenizer,
  defineCommand,
  defineRole,
  type DomainExtension,
  type ExtractionResult,
  type LanguageTokenizer,
  type SemanticNode,
  type ValueExtractor,
} from '../index';

/**
 * Keeps `#id` / `.class` a single token, as every real domain tokenizer does.
 * Without it the `#` splits off and an SOV source role followed by a particle
 * never matches.
 */
class CSSSelectorExtractor implements ValueExtractor {
  readonly name = 'css-selector';

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    if (char !== '#' && char !== '.') return false;
    return /[a-zA-Z_-]/.test(input[position + 1] ?? '');
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position + 1;
    while (end < input.length && /[a-zA-Z0-9_-]/.test(input[end])) end++;
    if (end === position + 1) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

// =============================================================================
// A three-word-order toy DSL
// =============================================================================

const askSchema = defineCommand({
  action: 'ask',
  description: 'Ask a question',
  category: 'llm',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The question',
      required: true,
      expectedTypes: ['expression'],
    }),
    defineRole({
      role: 'source',
      description: 'Where to look',
      required: true,
      expectedTypes: ['expression'],
      markerOverride: { en: 'from', ja: 'から', ar: 'من' },
    }),
  ],
});

const researchSchema = defineCommand({
  action: 'research',
  description: 'Research a topic',
  category: 'llm',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The topic',
      required: true,
      expectedTypes: ['expression'],
    }),
    defineRole({
      role: 'source',
      description: 'Where to look',
      required: true,
      expectedTypes: ['expression'],
      markerOverride: { en: 'from', ja: 'から', ar: 'من' },
    }),
  ],
});

const PROFILES = {
  en: {
    code: 'en',
    wordOrder: 'SVO' as const,
    keywords: { ask: { primary: 'ask' } },
    roleMarkers: {},
  },
  ja: {
    code: 'ja',
    wordOrder: 'SOV' as const,
    keywords: { ask: { primary: '聞く' } },
    roleMarkers: {},
  },
  ar: {
    code: 'ar',
    wordOrder: 'VSO' as const,
    keywords: { ask: { primary: 'اسأل' } },
    roleMarkers: {},
  },
};

const research: DomainExtension = {
  schema: researchSchema,
  vocabulary: {
    en: { keyword: { primary: 'research' } },
    ja: { keyword: { primary: '調査' } },
    ar: { keyword: { primary: 'ابحث' } },
  },
};

function tokenizerFor(code: 'en' | 'ja' | 'ar'): LanguageTokenizer {
  return createSimpleTokenizer({
    language: code,
    // Both the built-in and the extension vocabulary: a tokenizer is configured
    // once, so it must already know the words an extension may introduce.
    keywords: [
      ...Object.values(PROFILES[code].keywords).map(k => k.primary),
      'research',
      '調査',
      'ابحث',
      'from',
      'から',
      'من',
    ],
    caseInsensitive: code === 'en',
    customExtractors: [new CSSSelectorExtractor()],
  });
}

function createToyDSL(options: { extensions?: readonly DomainExtension[] } = {}) {
  return createMultilingualDSL({
    name: 'Toy',
    schemas: [askSchema],
    languages: (['en', 'ja', 'ar'] as const).map(code => ({
      code,
      name: code,
      nativeName: code,
      tokenizer: tokenizerFor(code),
      patternProfile: PROFILES[code],
    })),
    codeGenerator: {
      generate: (node: SemanticNode) => `BASE:${node.action}`,
    },
    ...(options.extensions && { extensions: options.extensions }),
  });
}

function makeNode(action: string, roles: Record<string, string>): SemanticNode {
  const rolesMap = new Map<string, { type: 'expression'; raw: string }>();
  for (const [k, v] of Object.entries(roles)) rolesMap.set(k, { type: 'expression', raw: v });
  return { kind: 'command', action, roles: rolesMap };
}

// =============================================================================
// Tests
// =============================================================================

describe('DomainExtension', () => {
  describe('parsing', () => {
    it('parses the extension command in an SVO language', () => {
      const dsl = createToyDSL({ extensions: [research] });
      const node = dsl.parse('research "climate" from #wiki', 'en');
      expect(node.action).toBe('research');
      expect(node.roles.get('patient')).toBeDefined();
      expect(node.roles.get('source')).toBeDefined();
    });

    it('parses the extension command in an SOV language', () => {
      const dsl = createToyDSL({ extensions: [research] });
      const node = dsl.parse('"climate" #wiki から 調査', 'ja');
      expect(node.action).toBe('research');
    });

    it('parses the extension command in a VSO language', () => {
      const dsl = createToyDSL({ extensions: [research] });
      const node = dsl.parse('ابحث "climate" من #wiki', 'ar');
      expect(node.action).toBe('research');
    });

    it('does not parse the extension command without the extension', () => {
      const dsl = createToyDSL();
      expect(() => dsl.parse('research "climate" from #wiki', 'en')).toThrow(/No pattern matched/);
    });

    it('reports the extension action as supported by explicit syntax', () => {
      const dsl = createToyDSL({ extensions: [research] });
      const node = dsl.parse('[research patient:climate source:#wiki]', 'en');
      expect(node.action).toBe('research');
    });
  });

  describe('rendering', () => {
    const dsl = createToyDSL({ extensions: [research] });
    const node = makeNode('research', { patient: '"climate"', source: '#wiki' });

    it('renders SVO from the schema alone', () => {
      expect(dsl.render?.(node, 'en')).toBe('research "climate" from #wiki');
    });

    it('renders verb-final for SOV', () => {
      expect(dsl.render?.(node, 'ja')).toBe('"climate" #wiki から 調査');
    });

    it('renders verb-initial for VSO', () => {
      expect(dsl.render?.(node, 'ar')).toBe('ابحث "climate" من #wiki');
    });

    it('prefers an extension-supplied renderer', () => {
      const custom = createToyDSL({
        extensions: [{ ...research, render: () => 'CUSTOM' }],
      });
      expect(custom.render?.(node, 'en')).toBe('CUSTOM');
    });

    it('returns null for an action with neither renderer nor schema', () => {
      expect(dsl.render?.(makeNode('nonsense', {}), 'en')).toBeNull();
    });

    it('prefers the domain renderer over the schema fallback for built-ins', () => {
      const withDomainRenderer = createMultilingualDSL({
        name: 'Toy',
        schemas: [askSchema],
        languages: [
          {
            code: 'en',
            name: 'en',
            nativeName: 'en',
            tokenizer: tokenizerFor('en'),
            patternProfile: PROFILES.en,
          },
        ],
        renderer: node => (node.action === 'ask' ? 'DOMAIN RENDERED' : null),
        extensions: [{ ...research, vocabulary: { en: research.vocabulary.en } }],
      });

      expect(withDomainRenderer.render?.(makeNode('ask', { patient: 'q' }), 'en')).toBe(
        'DOMAIN RENDERED'
      );
      // …while the extension still falls through to the schema renderer
      expect(withDomainRenderer.render?.(node, 'en')).toBe('research "climate" from #wiki');
    });
  });

  describe('compilation', () => {
    it('uses the extension generator for the extension action', () => {
      const dsl = createToyDSL({
        extensions: [{ ...research, generate: node => `EXT:${node.action}` }],
      });
      const result = dsl.compile('research "climate" from #wiki', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('EXT:research');
    });

    it('leaves the base generator handling built-in actions', () => {
      const dsl = createToyDSL({
        extensions: [{ ...research, generate: node => `EXT:${node.action}` }],
      });
      const result = dsl.compile('ask "q" from #wiki', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('BASE:ask');
    });

    it('falls back to the base generator when the extension supplies none', () => {
      const dsl = createToyDSL({ extensions: [research] });
      const result = dsl.compile('research "climate" from #wiki', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('BASE:research');
    });
  });

  describe('built-in commands are unaffected', () => {
    it('parses and compiles identically with and without extensions', () => {
      const plain = createToyDSL();
      const extended = createToyDSL({ extensions: [research] });

      for (const [input, language] of [
        ['ask "q" from #wiki', 'en'],
        ['"q" #wiki から 聞く', 'ja'],
        ['اسأل "q" من #wiki', 'ar'],
      ] as const) {
        expect(extended.parse(input, language).action).toBe(plain.parse(input, language).action);
        expect(extended.compile(input, language).code).toBe(plain.compile(input, language).code);
      }
    });
  });

  describe('configuration errors', () => {
    it('rejects an extension whose action collides with a built-in', () => {
      const collision: DomainExtension = {
        schema: defineCommand({
          action: 'ask',
          roles: [defineRole({ role: 'patient', required: true, expectedTypes: ['expression'] })],
        }),
        vocabulary: { en: { keyword: { primary: 'inquire' } } },
      };
      expect(() => createToyDSL({ extensions: [collision] })).toThrow(/collides/);
    });

    it('rejects vocabulary for a language the DSL does not configure', () => {
      const unknownLanguage: DomainExtension = {
        ...research,
        vocabulary: { ...research.vocabulary, xx: { keyword: { primary: 'x' } } },
      };
      expect(() => createToyDSL({ extensions: [unknownLanguage] })).toThrow(/not configured/);
    });
  });
});
