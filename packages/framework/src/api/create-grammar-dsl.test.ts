/**
 * createGrammarDSL (domains rethink Phase 4.7): the same config and DSL as
 * createMultilingualDSL, on the core. framework's SQL fixture reads, compiles
 * and translates as it does on the old factory, refuses what it does not read,
 * and renders through its own patterns where no renderer is configured.
 */
import { describe, expect, it } from 'vitest';
import { createGrammarDSL, createMultilingualDSL, UnreadInputError } from './create-dsl';
import { sqlDSLConfig, testQueries, expectedSQL } from '../__test__/fixtures/sql-dsl';
import type { SemanticNode } from '../core/types';

const core = createGrammarDSL(sqlDSLConfig());
const first = createMultilingualDSL(sqlDSLConfig());

const reading = (node: SemanticNode) =>
  [
    node.action,
    ...[...node.roles].map(
      ([role, v]) =>
        `${role}=${String((v as { value?: unknown; raw?: unknown }).value ?? (v as { raw?: unknown }).raw)}`
    ),
  ].join(' ');

describe('createGrammarDSL', () => {
  const queries = [
    ['en', testQueries.english.simple, expectedSQL.simple],
    ['en', testQueries.english.withWhere, expectedSQL.withWhere],
    ['es', testQueries.spanish.simple, 'SELECT nombre FROM usuarios'],
    ['es', testQueries.spanish.withWhere, 'SELECT nombre FROM usuarios WHERE edad > 18'],
  ] as const;

  it.each(queries)('reads and compiles %s `%s` as the old factory does', (lang, input, sql) => {
    expect(reading(core.parse(input, lang))).toBe(reading(first.parse(input, lang)));
    expect(core.compile(input, lang).code).toBe(sql);
  });

  it.each(queries)('translates %s `%s` as the old factory does', (lang, input) => {
    const to = lang === 'en' ? 'es' : 'en';
    expect(core.translate(input, lang, to)).toBe(first.translate(input, lang, to));
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
});
