/**
 * Tests for MultilingualDSLImpl explicit syntax support.
 *
 * Verifies that createMultilingualDSL() returns a DSL that accepts
 * explicit bracket syntax [command role:value ...] as input, in addition
 * to natural language.
 */

import { describe, it, expect } from 'vitest';
import {
  createMultilingualDSL,
  defineCommand,
  defineRole,
  BaseTokenizer,
  getDefaultExtractors,
  type SemanticNode,
} from '../index';

// =============================================================================
// Test Helpers
// =============================================================================

const selectSchema = defineCommand({
  action: 'select',
  description: 'Select data',
  category: 'query',
  primaryRole: 'columns',
  roles: [
    defineRole({
      role: 'columns',
      description: 'Columns to select',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
    }),
    defineRole({
      role: 'source',
      description: 'Table to select from',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      markerOverride: { en: 'from', es: 'de' },
    }),
  ],
});

const insertSchema = defineCommand({
  action: 'insert',
  description: 'Insert data',
  category: 'mutation',
  primaryRole: 'values',
  roles: [
    defineRole({
      role: 'values',
      description: 'Values to insert',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
    }),
    defineRole({
      role: 'destination',
      description: 'Target table',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      markerOverride: { en: 'into' },
    }),
  ],
});

class EnglishTestTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getDefaultExtractors());
  }

  classifyToken(token: string): 'keyword' | 'identifier' | 'literal' | 'operator' {
    const keywords = ['select', 'insert', 'from', 'into'];
    if (keywords.includes(token.toLowerCase())) return 'keyword';
    return 'identifier';
  }
}

const englishProfile = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  wordOrder: 'SVO' as const,
  direction: 'ltr' as const,
  caseMarking: 'preposition' as const,
  keywords: {
    select: { primary: 'select', aliases: [] },
    insert: { primary: 'insert', aliases: [] },
    from: { primary: 'from', aliases: [] },
    into: { primary: 'into', aliases: [] },
  },
  roleMarkers: {},
};

class SpanishTestTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getDefaultExtractors());
  }

  classifyToken(token: string): 'keyword' | 'identifier' | 'literal' | 'operator' {
    const keywords = ['seleccionar', 'insertar', 'de', 'en'];
    if (keywords.includes(token.toLowerCase())) return 'keyword';
    return 'identifier';
  }
}

const spanishProfile = {
  code: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  wordOrder: 'SVO' as const,
  direction: 'ltr' as const,
  caseMarking: 'preposition' as const,
  keywords: {
    select: { primary: 'seleccionar', aliases: [] },
    insert: { primary: 'insertar', aliases: [] },
    from: { primary: 'de', aliases: [] },
    into: { primary: 'en', aliases: [] },
  },
  roleMarkers: {},
};

/** Two languages, NO grammarProfile on either — the nine-domains shape. */
function createBilingualTestDSL() {
  return createMultilingualDSL({
    name: 'TestSQL-bilingual',
    schemas: [selectSchema, insertSchema],
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: new EnglishTestTokenizer(),
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: new SpanishTestTokenizer(),
        patternProfile: spanishProfile,
      },
    ],
  });
}

function createTestDSL() {
  return createMultilingualDSL({
    name: 'TestSQL',
    schemas: [selectSchema, insertSchema],
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: new EnglishTestTokenizer(),
        patternProfile: englishProfile,
      },
    ],
    codeGenerator: {
      generate(node: SemanticNode): string {
        const action = node.action.toUpperCase();
        const roles: string[] = [];
        for (const [role, value] of node.roles) {
          const v =
            value && 'value' in value
              ? value.value
              : value && 'raw' in value
                ? value.raw
                : String(value);
          roles.push(`${role}=${v}`);
        }
        return `${action} ${roles.join(' ')}`;
      },
    },
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('MultilingualDSL: Explicit Syntax Support', () => {
  // ---------------------------------------------------------------------------
  // parseWithConfidence
  // ---------------------------------------------------------------------------

  describe('parseWithConfidence', () => {
    it('parses explicit bracket syntax with confidence 1.0', () => {
      const dsl = createTestDSL();
      const result = dsl.parseWithConfidence('[select columns:name source:users]', 'en');

      expect(result.confidence).toBe(1.0);
      expect(result.node.action).toBe('select');
      expect(result.node.kind).toBe('command');
    });

    it('extracts roles from explicit syntax', () => {
      const dsl = createTestDSL();
      const result = dsl.parseWithConfidence('[select columns:name source:users]', 'en');

      const columns = result.node.roles.get('columns');
      const source = result.node.roles.get('source');
      expect(columns).toBeDefined();
      expect(source).toBeDefined();
      expect(columns && 'value' in columns ? columns.value : undefined).toBe('name');
      expect(source && 'value' in source ? source.value : undefined).toBe('users');
    });

    it('throws for explicit syntax with unknown action', () => {
      const dsl = createTestDSL();
      expect(() => {
        dsl.parseWithConfidence('[deploy destination:production]', 'en');
      }).toThrow('No schema for action "deploy"');
    });

    it('validates roles against schema', () => {
      const dsl = createTestDSL();
      expect(() => {
        dsl.parseWithConfidence('[select columns:name bogus:value]', 'en');
      }).toThrow('Unknown role "bogus"');
    });

    it('validates required roles', () => {
      const dsl = createTestDSL();
      expect(() => {
        dsl.parseWithConfidence('[select columns:name]', 'en');
      }).toThrow('Missing required role "source"');
    });

    it('works with any language parameter for explicit syntax', () => {
      const dsl = createTestDSL();
      // Explicit syntax is language-agnostic — language param is ignored
      const result = dsl.parseWithConfidence('[select columns:name source:users]', 'ja');
      expect(result.confidence).toBe(1.0);
      expect(result.node.action).toBe('select');
    });
  });

  // ---------------------------------------------------------------------------
  // parse
  // ---------------------------------------------------------------------------

  describe('parse', () => {
    it('parses explicit syntax and returns SemanticNode', () => {
      const dsl = createTestDSL();
      const node = dsl.parse('[insert values:data destination:users]', 'en');

      expect(node.action).toBe('insert');
      expect(node.roles.has('values')).toBe(true);
      expect(node.roles.has('destination')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // compile
  // ---------------------------------------------------------------------------

  describe('compile', () => {
    it('compiles explicit syntax through code generator', () => {
      const dsl = createTestDSL();
      const result = dsl.compile('[select columns:name source:users]', 'en');

      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('columns=name');
      expect(result.code).toContain('source=users');
    });

    it('returns metadata with parser=explicit and confidence=1.0', () => {
      const dsl = createTestDSL();
      const result = dsl.compile('[select columns:name source:users]', 'en');

      expect(result.metadata?.confidence).toBe(1.0);
    });

    it('returns error for explicit syntax with unknown action', () => {
      const dsl = createTestDSL();
      const result = dsl.compile('[deploy destination:production]', 'en');

      expect(result.ok).toBe(false);
      expect(result.errors?.[0]).toContain('No schema for action "deploy"');
    });
  });

  // ---------------------------------------------------------------------------
  // validate
  // ---------------------------------------------------------------------------

  describe('validate', () => {
    it('validates correct explicit syntax', () => {
      const dsl = createTestDSL();
      const result = dsl.validate('[select columns:name source:users]', 'en');

      expect(result.valid).toBe(true);
      expect(result.node?.action).toBe('select');
    });

    it('returns invalid for explicit syntax with unknown action', () => {
      const dsl = createTestDSL();
      const result = dsl.validate('[deploy destination:production]', 'en');

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('No schema for action "deploy"');
    });

    it('returns invalid for explicit syntax with bad roles', () => {
      const dsl = createTestDSL();
      const result = dsl.validate('[select columns:name bogus:value]', 'en');

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('Unknown role "bogus"');
    });
  });

  // ---------------------------------------------------------------------------
  // translate
  // ---------------------------------------------------------------------------

  describe('translate (parse→render)', () => {
    it('returns explicit syntax unchanged', () => {
      const dsl = createTestDSL();
      const result = dsl.translate('[select columns:name source:users]', 'en', 'ja');
      expect(result).toBe('[select columns:name source:users]');
    });

    it('translates between configured languages with NO grammar profiles (the nine-domains shape)', () => {
      const dsl = createBilingualTestDSL();
      const result = dsl.translate('select name from users', 'en', 'es');
      expect(result).toContain('seleccionar');
      expect(result).toContain('name');
      expect(result).toContain('users');
      // The rendered Spanish is real DSL surface — it re-parses.
      expect(dsl.validate(result, 'es').valid).toBe(true);
    });

    it('round-trips to the source language through the schema renderer', () => {
      const dsl = createTestDSL();
      const result = dsl.translate('select name from users', 'en', 'en');
      expect(result.toLowerCase()).toContain('select');
      expect(result).toContain('name');
      expect(result).toContain('users');
      expect(dsl.validate(result, 'en').valid).toBe(true);
    });

    // No renderer coverage for 'ja' (not a configured language) and no
    // grammarProfile for the transformer fallback: the error must name the
    // field to set rather than leaving the caller with "No profile found".
    it('throws an error naming grammarProfile when render cannot cover the target', () => {
      const dsl = createTestDSL();
      expect(() => dsl.translate('select name from users', 'en', 'ja')).toThrow(/grammarProfile/);
      expect(() => dsl.translate('select name from users', 'en', 'ja')).toThrow(
        /parse\/validate\/compile do not need it/
      );
    });

    it('propagates the parse error for unparseable input when no fallback exists', () => {
      const dsl = createTestDSL();
      expect(() => dsl.translate('gibberish matching nothing', 'en', 'en')).toThrow(
        /No pattern matched/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Natural language regression
  // ---------------------------------------------------------------------------

  describe('natural language (regression)', () => {
    it('still parses natural language input', () => {
      const dsl = createTestDSL();
      const result = dsl.parseWithConfidence('select name from users', 'en');

      expect(result.node.action).toBe('select');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('still compiles natural language input', () => {
      const dsl = createTestDSL();
      const result = dsl.compile('select name from users', 'en');

      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
    });
  });
});
