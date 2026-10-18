/**
 * The core engine (domains rethink Phase 4.7), the only engine since 5.0. framework's SQL fixture
 * reads, compiles and translates as the classic engine did (its readings and translations below
 * were taken from the classic engine on 4.8), refuses what it does not read, and renders through
 * its own patterns where no renderer is configured. A role with a word list reads only its words.
 */
import { describe, expect, it, vi } from 'vitest';
import { createMultilingualDSL, UnreadInputError, type DSLConfig } from './create-dsl';
import { defineCommand, defineRole } from '../schema';
import { BaseTokenizer, getDefaultExtractors } from '../index';
import { sqlDSLConfig, testQueries, expectedSQL } from '../__test__/fixtures/sql-dsl';
import type { SemanticNode } from '../core/types';
import { createSchemaPatternGenerator } from '../generation/schema-patterns';

// A pass-through spy: what shows a DSL was built on the core.
vi.mock('../generation/schema-patterns', async importOriginal => {
  const actual = await importOriginal<typeof import('../generation/schema-patterns')>();
  return { ...actual, createSchemaPatternGenerator: vi.fn(actual.createSchemaPatternGenerator) };
});

const core = createMultilingualDSL(sqlDSLConfig());

const reading = (node: SemanticNode) =>
  [
    node.action,
    ...[...node.roles].map(
      ([role, v]) =>
        `${role}=${String((v as { value?: unknown; raw?: unknown }).value ?? (v as { raw?: unknown }).raw)}`
    ),
  ].join(' ');

describe('createMultilingualDSL on the core engine', () => {
  // [language, input, SQL, reading, translation] — the reading and translation the classic engine gave.
  const queries = [
    [
      'en',
      testQueries.english.simple,
      expectedSQL.simple,
      'select columns=name source=users',
      'seleccionar name de users',
    ],
    [
      'en',
      testQueries.english.withWhere,
      expectedSQL.withWhere,
      'select columns=name source=users condition=age > 18',
      'seleccionar name de users donde age > 18',
    ],
    [
      'es',
      testQueries.spanish.simple,
      'SELECT nombre FROM usuarios',
      'select columns=nombre source=usuarios',
      'select nombre from usuarios',
    ],
    [
      'es',
      testQueries.spanish.withWhere,
      'SELECT nombre FROM usuarios WHERE edad > 18',
      'select columns=nombre source=usuarios condition=edad > 18',
      'select nombre from usuarios where edad > 18',
    ],
  ] as const;

  it.each(queries)(
    'reads and compiles %s `%s` as the classic engine did',
    (lang, input, sql, read) => {
      expect(reading(core.parse(input, lang))).toBe(read);
      expect(core.compile(input, lang).code).toBe(sql);
    }
  );

  it.each(queries)(
    'translates %s `%s` as the classic engine did',
    (lang, input, _sql, _read, translated) => {
      const to = lang === 'en' ? 'es' : 'en';
      expect(core.translate(input, lang, to)).toBe(translated);
    }
  );

  it('refuses input it does not read', () => {
    expect(() => core.parse('select name from users banana', 'en')).toThrow(UnreadInputError);
    expect(core.validate('select name from users banana', 'en')).toMatchObject({
      valid: false,
      errorCode: 'unread-input',
    });
  });

  it('renders through its patterns, in each language, what it reads back', () => {
    const node = core.parse(testQueries.english.withWhere, 'en');
    expect(core.render?.(node, 'en')).toBe('select name from users where age > 18');
    expect(core.render?.(node, 'es')).toBe('seleccionar name de users donde age > 18');
    expect(reading(core.parse(core.render!(node, 'es')!, 'es'))).toBe(reading(node));
  });

  it.each([
    ['no engine option', {}],
    ["engine: 'core'", { engine: 'core' }],
  ] as const)('builds on the core with %s', (_label, option) => {
    vi.mocked(createSchemaPatternGenerator).mockClear();
    createMultilingualDSL({ ...sqlDSLConfig(), ...option }).parse(testQueries.english.simple, 'en');
    expect(vi.mocked(createSchemaPatternGenerator).mock.calls.length).toBeGreaterThan(0);
  });

  it("refuses engine: 'classic', removed in 5.0, and says what replaced it", () => {
    const classic = { ...sqlDSLConfig(), engine: 'classic' } as unknown as DSLConfig;
    expect(() => createMultilingualDSL(classic)).toThrow(/removed in @lokascript\/framework 5\.0/);
  });

  it('throws on an engine it does not know, rather than reading with the default', () => {
    const misspelled = { ...sqlDSLConfig(), engine: 'cor' } as unknown as DSLConfig;
    expect(() => createMultilingualDSL(misspelled)).toThrow('Unknown DSL engine "cor"');
  });
});

describe('a role with a word list, on the core', () => {
  class WordTokenizer extends BaseTokenizer {
    readonly language = 'en';
    readonly direction = 'ltr' as const;
    constructor() {
      super();
      this.registerExtractors(getDefaultExtractors());
    }
    classifyToken(token: string): 'keyword' | 'identifier' {
      return token.toLowerCase() === 'when' ? 'keyword' : 'identifier';
    }
  }
  // behaviorspec's `when [actor] action`: both are bare words.
  const when = defineCommand({
    action: 'when',
    primaryRole: 'action',
    roles: [
      defineRole({ role: 'actor', required: false, expectedTypes: ['expression'], svoPosition: 2 }),
      defineRole({
        role: 'action',
        required: true,
        expectedTypes: ['expression'],
        svoPosition: 1,
        words: { '*': ['clicks', 'types'] },
      }),
    ],
  });
  const dsl = createMultilingualDSL({
    name: 'when',
    schemas: [when],
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: new WordTokenizer(),
        patternProfile: {
          code: 'en',
          wordOrder: 'SVO',
          keywords: { when: { primary: 'when' } },
          roleMarkers: {},
        },
      },
    ],
    engine: 'core',
  });

  it('reads a listed word, with or without the optional role before it', () => {
    expect(reading(dsl.parse('when clicks', 'en'))).toBe('when action=clicks');
    expect(reading(dsl.parse('when user clicks', 'en'))).toBe('when actor=user action=clicks');
  });

  it('refuses a word it does not list, rather than reading the listed word as the role before it', () => {
    // Without the list: actor `clicks`, action `zzqx`.
    expect(() => dsl.parse('when clicks zzqx', 'en')).toThrow(UnreadInputError);
    // A listed word is not part of a longer value, so the refusal does not say to quote it.
    expect(() => dsl.parse('when clicks zzqx', 'en')).toThrow(/leaving "zzqx" unread$/);
    expect(() => dsl.parse('when user frobs', 'en')).toThrow();
  });
});
