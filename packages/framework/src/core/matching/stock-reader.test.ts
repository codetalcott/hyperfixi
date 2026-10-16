/**
 * The stock value reader on the matcher's skeleton (domains rethink Phase 4.7):
 * each kind of value it reads, a greedy slot's stop markers, the guard against a
 * marker read as a value, and the skip of an optional slot.
 */
import { describe, expect, it } from 'vitest';
import { MatchSkeleton } from './match-skeleton';
import { createStockReader, greedyStopMarkers, readGreedy } from './stock-reader';
import { stockConfidenceModel } from './stock-confidence';
import { TokenStreamImpl } from '../tokenization/token-utils';
import type { LanguagePattern, LanguageToken, PatternToken, TokenKind } from '../types';

function stream(...tokens: Array<[string, TokenKind] | [string, TokenKind, string]>) {
  let offset = 0;
  const out: LanguageToken[] = tokens.map(([value, kind, normalized]) => {
    const token: LanguageToken = {
      value,
      kind,
      position: { start: offset, end: offset + value.length },
      ...(normalized ? { normalized } : {}),
    };
    offset += value.length + 1;
    return token;
  });
  return new TokenStreamImpl(out, 'en');
}

const lit = (value: string, ...alternatives: string[]): PatternToken =>
  alternatives.length ? { type: 'literal', value, alternatives } : { type: 'literal', value };
const slot = (
  role: string,
  extra: { optional?: boolean; greedy?: boolean; expectedTypes?: string[] } = {}
): PatternToken => ({ type: 'role', role, ...extra }) as PatternToken;
const group = (...tokens: PatternToken[]): PatternToken => ({
  type: 'group',
  optional: true,
  tokens,
});

function pattern(tokens: PatternToken[], language = 'en'): LanguagePattern {
  return {
    id: 'p',
    language,
    command: 'go',
    priority: 100,
    template: { format: 'p', tokens },
    extraction: {},
  };
}

const matcher = () => new MatchSkeleton(createStockReader(), stockConfidenceModel);
const read = (p: LanguagePattern, ...tokens: Parameters<typeof stream>) => {
  const result = matcher().matchPattern(stream(...tokens), p);
  return result && Object.fromEntries(result.captured);
};

describe('one value per slot', () => {
  const go = pattern([lit('go'), slot('x')]);
  it.each([
    ['#box', 'selector', { type: 'selector', value: '#box' }],
    ['"hello there"', 'literal', { type: 'literal', value: 'hello there', dataType: 'string' }],
    ['42', 'literal', { type: 'literal', value: 42, dataType: 'number' }],
    ['true', 'literal', { type: 'literal', value: true, dataType: 'boolean' }],
    ['300ms', 'literal', { type: 'literal', value: '300ms', dataType: 'duration' }],
    ['/api/users', 'url', { type: 'literal', value: '/api/users', dataType: 'string' }],
    ['users', 'identifier', { type: 'expression', raw: 'users' }],
  ] as const)('reads %s', (value, kind, want) => {
    expect(read(go, ['go', 'keyword'], [value, kind])).toEqual({ x: want });
  });

  it('skips an English article before a selector', () => {
    expect(read(go, ['go', 'keyword'], ['the', 'identifier'], ['#box', 'selector'])).toEqual({
      x: { type: 'selector', value: '#box' },
    });
  });

  it('refuses a value of a type the slot does not take, unless the slot is optional', () => {
    const selectorOnly = pattern([lit('go'), slot('x', { expectedTypes: ['selector'] })]);
    expect(read(selectorOnly, ['go', 'keyword'], ['users', 'identifier'])).toBeNull();
    const optional = pattern([
      lit('go'),
      slot('x', { expectedTypes: ['selector'], optional: true }),
    ]);
    expect(read(optional, ['go', 'keyword'], ['users', 'identifier'])).toEqual({});
  });
});

describe('a greedy slot', () => {
  it('reads to the next marker the pattern owes', () => {
    const select = pattern([
      lit('select'),
      slot('columns', { greedy: true }),
      lit('from'),
      slot('source'),
    ]);
    expect(
      read(
        select,
        ['select', 'keyword'],
        ['name', 'identifier'],
        [',', 'punctuation'],
        ['email', 'identifier'],
        ['from', 'keyword'],
        ['users', 'identifier']
      )
    ).toEqual({
      columns: { type: 'expression', raw: 'name , email' },
      source: { type: 'expression', raw: 'users' },
    });
  });

  it('reads to the end when nothing is owed, and is refused when it reads nothing', () => {
    const where = pattern([lit('where'), slot('condition', { greedy: true })]);
    expect(
      read(where, ['where', 'keyword'], ['age', 'identifier'], ['>', 'operator'], ['18', 'literal'])
    ).toEqual({ condition: { type: 'expression', raw: 'age > 18' } });
    expect(read(where, ['where', 'keyword'])).toBeNull();
  });

  it('stops past an optional group at the required literal after it, by value or normalized form', () => {
    const rest: PatternToken[] = [group(lit('where'), slot('c')), lit('選択', 'select')];
    expect([...greedyStopMarkers(rest)]).toEqual(['where', '選択', 'select']);
    const tokens = stream(['users', 'identifier'], ['SELECT', 'keyword', 'select']);
    expect(readGreedy(tokens, greedyStopMarkers(rest))).toEqual({
      type: 'expression',
      raw: 'users',
    });
    expect(tokens.position()).toBe(1);
  });
});

describe('the marker guard and the optional skip', () => {
  it('a required slot does not read the marker the pattern wants next', () => {
    // SOV `{patient} を 実行` given `を 実行`: the patient is missing, not `を`.
    const sov = pattern([slot('patient'), lit('を'), lit('実行')], 'ja');
    expect(read(sov, ['を', 'particle'], ['実行', 'keyword'])).toBeNull();
  });

  it('an optional slot is skipped for the literal the pattern wants next, when the rest then reads to the end', () => {
    const p = pattern([lit('go'), group(slot('x', { optional: true })), lit('now')]);
    expect(read(p, ['go', 'keyword'], ['now', 'keyword'])).toEqual({});
    expect(read(p, ['go', 'keyword'], ['#a', 'selector'], ['now', 'keyword'])).toEqual({
      x: { type: 'selector', value: '#a' },
    });
  });
});

describe('a required slot takes back the optional slot before it', () => {
  it('when the optional slot took its value (behaviorspec `when clicks`)', () => {
    const when = pattern([lit('when'), group(slot('actor', { optional: true })), slot('action')]);
    expect(read(when, ['when', 'keyword'], ['clicks', 'identifier'])).toEqual({
      action: { type: 'expression', raw: 'clicks' },
    });
    expect(
      read(when, ['when', 'keyword'], ['user', 'identifier'], ['clicks', 'identifier'])
    ).toEqual({
      actor: { type: 'expression', raw: 'user' },
      action: { type: 'expression', raw: 'clicks' },
    });
  });

  it('when it stands at its own marker (flow `orders として 取得変数`)', () => {
    const capture = pattern(
      [
        group(slot('patient', { optional: true })),
        slot('destination'),
        lit('として'),
        lit('取得変数'),
      ],
      'ja'
    );
    expect(
      read(capture, ['orders', 'identifier'], ['として', 'particle'], ['取得変数', 'keyword'])
    ).toEqual({ destination: { type: 'expression', raw: 'orders' } });
  });

  it('not when something was read between them', () => {
    const p = pattern([group(slot('a', { optional: true })), lit('to'), slot('b')]);
    expect(read(p, ['x', 'identifier'], ['to', 'keyword'])).toBeNull();
  });
});
