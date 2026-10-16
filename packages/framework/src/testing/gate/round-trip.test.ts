/**
 * The round-trip gate kit on framework's SQL fixture DSL: the commands it writes,
 * the outcomes it reads, and the baseline and snapshot it compares with.
 */
import { describe, expect, it } from 'vitest';
import { createSQLDSL, selectCommand } from '../../__test__/fixtures/sql-dsl';
import {
  commandsFor,
  compare,
  countsOf,
  listingOf,
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
      // The `where` condition is greedy: it takes the unknown word as text (an open-text role).
      leftover: { cases: 8, pass: 0, refused: 4, silent: 4 },
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
    const listing = listingOf(results);
    const accepted = Object.keys(listing.leftover)[0]!;
    const better = { ...listing.leftover };
    delete better[accepted];
    const drift = compare('sql', results, {
      ...baselineOf({ roundTrip: listing.roundTrip, leftover: better }),
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
