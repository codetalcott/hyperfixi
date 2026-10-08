/**
 * A clause a command's pattern does not model is kept as written on the
 * command and written back as written (M1 phase 3, group 3): `add .foo to .bar
 * when it matches .doh` lost its `when` filter, and `toggle between .a and .b`
 * its pair. Each case was refused by the read-back before; none is a loss now.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, translate } from '../src/index';

const roundTrip = (code: string, language: string): string =>
  translate(translate(code, 'en', language), language, 'en');

const clauseOf = (code: string, language = 'en'): string | undefined => {
  const handler = parse(code, language) as unknown as {
    body: Array<{ verbatimClause?: string }>;
  };
  return handler.body[0]!.verbatimClause;
};

describe('a clause the pattern does not model is kept as written', () => {
  it.each([
    ['on click add .rey to .bar when it matches .doh', 'when it matches .doh'],
    ['on click add .foo to #d2 when asyncCheck()', 'when asyncCheck()'],
    ['on click add .foo .bar', '.bar'],
    ['on click toggle between .foo and .bar', '.foo and .bar'],
    ['on click take .foo from .div for #d3', 'for #d3'],
    ['on click render #tmpl into #target', 'into #target'],
    ['on click log me, my', ', my'],
  ])('%s', (code, clause) => {
    expect(clauseOf(code)).toBe(clause);
    expect(translate(code, 'en', 'en')).toBe(code);
  });

  it.each(['ja', 'ar', 'es', 'ko', 'de', 'zh', 'tr', 'pl'])('round-trips through %s', language => {
    for (const code of [
      'on click add .rey to .bar when it matches .doh',
      'on click take .foo from .div for #d3',
      'on click add .foo .bar',
      'on click log me, my',
    ]) {
      expect(roundTrip(code, language)).toBe(code);
    }
  });

  it('a run before the next command in a fused body is no clause of that command', () => {
    // es reads `al clic agregar …` as one fused pattern; `.b` comes before
    // `alternar` (toggle), so it is never toggle's.
    type Walked = {
      action?: string;
      verbatimClause?: string;
      body?: Walked[];
      statements?: Walked[];
    };
    const commands = (n: Walked): Walked[] => [
      n,
      ...[...(n.body ?? []), ...(n.statements ?? [])].flatMap(commands),
    ];
    const all = commands(parse('al clic agregar .a .b alternar .c', 'es') as unknown as Walked);
    const toggle = all.find(c => c.action === 'toggle');
    expect(toggle).toBeDefined();
    expect(toggle!.verbatimClause).toBeUndefined();
  });

  it('a comma clause stays glued to its command in every language', () => {
    expect(translate('on click log me, my', 'en', 'ja')).toMatch(/記録, my$/);
  });
});

describe('a tool that checks a script still sees the clause no role reads', () => {
  const clauses = (code: string): string[] =>
    (
      (parse(code, 'en') as { diagnostics?: Array<{ code?: string; message: string }> })
        .diagnostics ?? []
    )
      .filter(d => d.code === 'verbatim-clause')
      .map(d => d.message);

  it('the top node carries it, from any depth', () => {
    expect(clauses('on click add .foo .bar')).toEqual([
      'clause kept as written, read by no role: ".bar"',
    ]);
    expect(clauses('on click repeat 3 times add .foo .bar end')).toHaveLength(1);
    // A behavior's handler is parsed on its own, and its clause hoisted.
    expect(clauses('behavior B on click add .foo .bar end')).toHaveLength(1);
    expect(clauses('on click add .foo to .bar')).toEqual([]);
  });
});

describe('a group that reads its marker and binds nothing gives the marker back', () => {
  it.each([
    'on click take .foo from .div for #d3',
    'on click transition *width from 0px to 100px',
    'on click transition my *width from 0px to 100px over 2s',
  ])('%s', code => {
    expect(translate(code, 'en', 'en')).toBe(code);
  });

  it('a value the slot takes still binds', () => {
    const take = parse('on click take .foo from .div for me', 'en') as unknown as {
      body: Array<{ roles: Map<string, unknown>; verbatimClause?: string }>;
    };
    expect(take.body[0]!.roles.has('recipient')).toBe(true);
    expect(take.body[0]!.verbatimClause).toBeUndefined();
  });
});

describe('what is not a clause stays unread, and the translation is refused', () => {
  it.each([
    // A command the reader does not read is no clause of the one before it
    // (a `set` with nothing to set, which upstream does not read either).
    ['on click log 1 set to 5', /set to 5/],
    // Glued to the command, the run splits a value the pattern read part of.
    ["on click halt the event's bubbling", /bubbling/],
  ])('%s', (code, lost) => {
    expect(() => translate(code, 'en', 'en')).toThrow(lost);
  });

  it('an else word ends the branch, as no clause', () => {
    expect(
      translate(
        'on click increment :x if :x is 1 throw "bar" otherwise put "ok" into me end',
        'en',
        'en'
      )
    ).toBe('on click increment :x then if :x is 1 throw "bar" else put "ok" into me end');
  });

  it("what follows a block's head is its body", () => {
    const node = parse('on click repeat 3 times xyzzy end end', 'en') as unknown as {
      body: Array<{ verbatimClause?: string; body?: unknown[] }>;
    };
    expect(node.body[0]!.verbatimClause).toBeUndefined();
  });

  it('residue alone between two commands is dropped, as before', () => {
    expect(translate('on click set x to true and put 2 into #c', 'en', 'en')).toBe(
      'on click set x to true then put 2 into #c'
    );
  });

  it("a clause in the reading language's own words is that language unread", () => {
    // es `cuando` (when), es `mi` (my): never English kept as written.
    expect(() => translate('al clic alternar .foo cuando .bar', 'es', 'en')).toThrow(/cuando/);
    expect(() => translate('al clic registrar yo, mi', 'es', 'en')).toThrow(/mi/);
    expect(() => translate('クリック で .foo を 切り替え 私の', 'ja', 'en')).toThrow(/lose/);
  });
});
