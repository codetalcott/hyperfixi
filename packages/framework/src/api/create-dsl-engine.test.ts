/**
 * `engine: 'core'` (domains rethink Phase 4.7): the same config and DSL as the
 * classic engine, read by the core. framework's SQL fixture reads, compiles and
 * translates as it does on the classic engine, refuses what it does not read,
 * and renders through its own patterns where no renderer is configured.
 */
import { describe, expect, it, vi } from 'vitest';
import { createMultilingualDSL, UnreadInputError, type DSLConfig } from './create-dsl';
import { sqlDSLConfig, testQueries, expectedSQL } from '../__test__/fixtures/sql-dsl';
import type { SemanticNode } from '../core/types';
import { generatePattern } from '../generation/pattern-generator';
import { createSchemaPatternGenerator } from '../generation/schema-patterns';

// Pass-through spies. On the SQL fixture the two engines read, compile and render alike, so
// these are what show which engine a DSL was built on.
vi.mock('../generation/pattern-generator', async importOriginal => {
  const actual = await importOriginal<typeof import('../generation/pattern-generator')>();
  return { ...actual, generatePattern: vi.fn(actual.generatePattern) };
});
vi.mock('../generation/schema-patterns', async importOriginal => {
  const actual = await importOriginal<typeof import('../generation/schema-patterns')>();
  return { ...actual, createSchemaPatternGenerator: vi.fn(actual.createSchemaPatternGenerator) };
});

const core = createMultilingualDSL({ ...sqlDSLConfig(), engine: 'core' });
const classic = createMultilingualDSL(sqlDSLConfig());

const reading = (node: SemanticNode) =>
  [
    node.action,
    ...[...node.roles].map(
      ([role, v]) =>
        `${role}=${String((v as { value?: unknown; raw?: unknown }).value ?? (v as { raw?: unknown }).raw)}`
    ),
  ].join(' ');

describe("createMultilingualDSL with engine: 'core'", () => {
  const queries = [
    ['en', testQueries.english.simple, expectedSQL.simple],
    ['en', testQueries.english.withWhere, expectedSQL.withWhere],
    ['es', testQueries.spanish.simple, 'SELECT nombre FROM usuarios'],
    ['es', testQueries.spanish.withWhere, 'SELECT nombre FROM usuarios WHERE edad > 18'],
  ] as const;

  it.each(queries)('reads and compiles %s `%s` as the classic engine does', (lang, input, sql) => {
    expect(reading(core.parse(input, lang))).toBe(reading(classic.parse(input, lang)));
    expect(core.compile(input, lang).code).toBe(sql);
  });

  it.each(queries)('translates %s `%s` as the classic engine does', (lang, input) => {
    const to = lang === 'en' ? 'es' : 'en';
    expect(core.translate(input, lang, to)).toBe(classic.translate(input, lang, to));
  });

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
    ['core', { engine: 'core' }],
    ['classic', { engine: 'classic' }],
    ['classic', {}],
  ] as const)('builds on the %s engine with %o', (expected, option) => {
    vi.mocked(generatePattern).mockClear();
    vi.mocked(createSchemaPatternGenerator).mockClear();
    createMultilingualDSL({ ...sqlDSLConfig(), ...option }).parse(testQueries.english.simple, 'en');
    expect(vi.mocked(createSchemaPatternGenerator).mock.calls.length > 0).toBe(expected === 'core');
    expect(vi.mocked(generatePattern).mock.calls.length > 0).toBe(expected === 'classic');
  });

  it('throws on an engine it does not know, rather than reading with the classic one', () => {
    const misspelled = { ...sqlDSLConfig(), engine: 'cor' } as unknown as DSLConfig;
    expect(() => createMultilingualDSL(misspelled)).toThrow('Unknown DSL engine "cor"');
  });
});
