/**
 * The round-trip gate kit on framework's SQL fixture DSL: the commands it writes,
 * the outcomes it reads (an unknown word read into a role among them), and the
 * baseline and snapshot it compares with.
 */
import { describe, expect, it } from 'vitest';
import { createSQLDSL, selectCommand, sqlDSLConfig } from '../../__test__/fixtures/sql-dsl';
import { createMultilingualDSL } from '../../api/create-dsl';
import {
  commandsFor,
  compare,
  countsOf,
  listingOf,
  readsWord,
  runRoundTrip,
  snapshotChanges,
  snapshotOf,
  type GateBaseline,
  type GateFixture,
} from './round-trip';

const fixture: GateFixture = {
  oracle: 'compile',
  values: { columns: ['name', 'email'], source: ['users'], condition: ['age'] },
};

const results = runRoundTrip('sql', createSQLDSL(), [selectCommand], fixture);

function baselineOf(listing: ReturnType<typeof listingOf>): GateBaseline {
  return {
    upstream: {},
    counts: { sql: countsOf(results) },
    roundTrip: { sql: listing.roundTrip },
    leftover: { sql: listing.leftover },
  };
}

describe('runRoundTrip', () => {
  it('writes each schema with its required roles, all its roles, and each further fixed word', () => {
    expect(commandsFor([selectCommand], fixture)).toEqual([
      '[select columns:name source:users]',
      '[select columns:email source:users]',
      '[select columns:name source:users condition:age]',
      '[select columns:email source:users condition:age]',
    ]);
  });

  it('reads every render back, in every language, and tries each with an unknown word after it', () => {
    expect(countsOf(results)).toEqual({
      roundTrip: { cases: 8, pass: 8, refused: 0, silent: 0 },
      // The `where` condition is greedy: it takes the unknown word as text, into the SQL (`pass`).
      leftover: { cases: 8, pass: 4, refused: 4, silent: 0 },
    });
    expect(results.find(r => r.kind === 'roundTrip' && r.lang === 'es')).toMatchObject({
      text: 'seleccionar name de users',
      read: 'select columns:expression=name source:expression=users',
    });
  });
});

describe('compare', () => {
  it('finds no drift against the listing of the same results', () => {
    expect(compare('sql', results, baselineOf(listingOf(results)))).toEqual({
      worse: [],
      better: [],
      stale: [],
    });
  });

  it('reports a case worse than listed, one better, and a listed case that is gone', () => {
    // Two leftover cases accepted that the baseline lists as refused.
    const accepted = '[select columns:name source:users]';
    const now = results.map(r =>
      r.kind === 'leftover' && r.source === accepted ? { ...r, outcome: 'silent' as const } : r
    );
    const listing = listingOf(results);
    const drift = compare('sql', now, {
      ...baselineOf(listing),
      roundTrip: {
        sql: {
          '[select columns:name source:users]': {
            es: { outcome: 'refused' },
          },
          '[gone]': { en: { outcome: 'silent' } },
        },
      },
    });
    expect(drift.worse.map(d => [d.kind, d.source, d.lang, d.listed, d.now])).toEqual([
      ['leftover', accepted, 'en', 'refused', 'silent'],
      ['leftover', accepted, 'es', 'refused', 'silent'],
    ]);
    expect(drift.better).toEqual([
      {
        kind: 'roundTrip',
        source: '[select columns:name source:users]',
        lang: 'es',
        listed: 'refused',
        now: 'pass',
      },
    ]);
    expect(drift.stale).toEqual([{ kind: 'roundTrip', source: '[gone]', lang: 'en' }]);
  });
});

describe('an unknown word read into a role', () => {
  const leftover = (rs: typeof results) =>
    rs
      .filter(r => r.kind === 'leftover' && r.source.includes('condition'))
      .map(r => [r.lang, r.outcome, r.why]);

  it('is read (`pass`) where it extends an open-text role and reaches the code', () => {
    expect(leftover(results)).toEqual([
      ['en', 'pass', undefined],
      ['es', 'pass', undefined],
      ['en', 'pass', undefined],
      ['es', 'pass', undefined],
    ]);
    expect(results.find(r => r.kind === 'leftover' && r.source.includes('condition'))?.read).toBe(
      'select columns:expression=name condition:expression="age zzqx" source:expression=users'
    );
  });

  it('is accepted (`silent`) where it does not reach the code', () => {
    const dropsCondition = createMultilingualDSL({
      ...sqlDSLConfig(),
      codeGenerator: { generate: () => 'SELECT name FROM users' },
    });
    const rs = runRoundTrip('sql', dropsCondition, [selectCommand], fixture);
    expect(leftover(rs)[0]).toEqual([
      'en',
      'silent',
      'accepted as select; the word does not reach the code',
    ]);
  });

  it('is refused where the input stops compiling, unless the command never compiles on its own', () => {
    const refusesTheWord = createMultilingualDSL({
      ...sqlDSLConfig(),
      codeGenerator: {
        generate: n => {
          const c = n.roles.get('condition') as { raw?: string } | undefined;
          if (c?.raw?.includes('zzqx')) throw new Error('not a condition');
          return 'SELECT';
        },
      },
    });
    const rs = runRoundTrip('sql', refusesTheWord, [selectCommand], fixture);
    expect(leftover(rs)[0]).toEqual(['en', 'refused', 'does not compile']);
    const alone = runRoundTrip('sql', refusesTheWord, [selectCommand], {
      ...fixture,
      englishDoesNotCompile: ['select'],
    });
    expect(leftover(alone)[0]).toEqual(['en', 'pass', undefined]);
  });

  const node = (action: string, roles: Record<string, string>) => ({
    action,
    roles: new Map(Object.entries(roles).map(([k, v]) => [k, { type: 'expression', raw: v }])),
  });

  it.each([
    ['extends one role', { condition: 'age' }, { condition: 'age zzqx' }, true],
    ['fills a role the text left empty', {}, { list: 'zzqx' }, true],
    [
      'moves a value to make room for it (`when clicks zzqx`)',
      { action: 'clicks' },
      { actor: 'clicks', action: 'zzqx' },
      false,
    ],
    ['replaces a value', { quantity: '2' }, { quantity: 'zzqx' }, false],
    ['is in two roles', {}, { a: 'zzqx', b: 'zzqx' }, false],
    ['is not read at all', { a: 'x' }, { a: 'x' }, false],
  ] as const)('a parse that %s is the text read with the word: %s', (_, was, now, want) => {
    expect(readsWord(node('when', was), node('when', now), 'zzqx')).toBe(want);
  });

  it('a parse as another command is not', () => {
    expect(readsWord(node('when', {}), node('given', { a: 'zzqx' }), 'zzqx')).toBe(false);
  });
});

describe('the parse snapshot', () => {
  it('shows a parse that moved', () => {
    const parses = snapshotOf(results);
    const source = '[select columns:name source:users]';
    const moved = {
      upstream: {},
      parses: { sql: { ...parses, [source]: { ...parses[source], es: 'select' } } },
    };
    expect(snapshotChanges('sql', results, moved)).toEqual([
      {
        source,
        lang: 'es',
        was: 'select',
        now: 'select columns:expression=name source:expression=users',
      },
    ]);
    expect(snapshotChanges('sql', results, { upstream: {}, parses: { sql: parses } })).toEqual([]);
  });
});
