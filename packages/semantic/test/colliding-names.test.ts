/**
 * A variable spelled like a language's structure word reads back as the
 * variable (the value matrix's colliding names, PR 76). A translation writes a
 * variable verbatim, so the reader has to tell it from the word by where it
 * stands:
 *
 * - a particle that ends its clause is the value (PR 64's rule, which reads a
 *   particle before the pattern's next token, extended past its last): es
 *   `incrementar a entonces` (increment a), `establecer x a a` (set x to a);
 * - a structure keyword alone where the value must stand, before the pattern's
 *   next token or the clause's end, is the variable: a role marker (tr `na`,
 *   ms `ke`, de `zu`), a control word (es `si` "if", pl `az` "until", de
 *   `wo` "where") or the copula (es `es`, sw `ni`, tl `ay`). Not a command
 *   verb (es `ir`), which is also what a dropped command leaves;
 * - a conjunction that is a whole condition joins nothing: es `si y`.
 *
 * And the names PR 76's matrix still counted after that (PR 84):
 *
 * - a lone structure word, command verb or particle joined as a whole value is
 *   its surface: `if al` (tr `al` is `get`), `if na`;
 * - a copula that is a condition's first word has no operand before it: es
 *   `si es poner …` (if es put …); an `if` word that is its first word opens
 *   no nested block: es `si si poner …`;
 * - a command verb alone in a slot, before the pattern's next marker or the
 *   clause's end, is a variable (es `poner ir en #out`), except in a command
 *   that takes a body or names an event; after its own marker (`por ir`) or
 *   right before the pattern's own verb (tr `i i al artır`) a verb is an
 *   amount, not the next command;
 * - a particle right after its own slot's marker, before an unmarked role, is
 *   the value: pl `ustaw do o 5` (set o to 5);
 * - de `a`/`an` before the pattern's next marker is a variable, not an article
 *   (`erhöhe a um 1`), and sw `si` (`not`) before a marker and its value is a
 *   variable too (`weka si kwa #out`).
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

type Position = 'put' | 'set' | 'if' | 'increment' | 'assign' | 'count';

const TEMPLATES: Record<Position, (name: string) => string> = {
  put: n => `on click put ${n} into #out`,
  set: n => `on click set x to ${n} then put x into #out`,
  if: n => `on click if ${n} put "Y" into #out else put "N" into #out end`,
  increment: n => `on click set i to 1 then increment i by ${n} then put i into #out`,
  assign: n => `on click set ${n} to 5 then put ${n} into #out`,
  count: n => `on click increment ${n} then put ${n} into #out`,
};

// The languages each name reads back in, per position: the value matrix's
// pairs this change fixed, on the direct path. The matrix counts the rest.
const FIXED: Record<Position, Record<string, readonly string[]>> = {
  put: {
    ay: ['tl'],
    az: ['pl'],
    de: ['fr'],
    es: ['es'],
    ke: ['ms'],
    na: ['tr'],
    ne: ['tr'],
    ni: ['sw', 'tr'],
    nu: ['tr'],
    sa: ['tl'],
    se: ['it', 'pt'],
    si: ['es', 'fr'],
    wo: ['de'],
    yi: ['tr'],
    yu: ['tr'],
    zu: ['de'],
  },
  set: {
    a: ['es', 'it', 'pt'],
    ai: ['it'],
    al: ['es', 'it'],
    ao: ['pt'],
    ay: ['tl'],
    az: ['pl'],
    da: ['it'],
    de: ['es', 'fr', 'pt'],
    di: ['id', 'it'],
    do: ['pl', 'pt'],
    em: ['pt'],
    en: ['es'],
    es: ['es'],
    ke: ['id', 'ms'],
    ku: ['pl'],
    na: ['pl', 'pt', 'sw', 'tr'],
    ne: ['tr'],
    ni: ['sw', 'tr'],
    nu: ['tr'],
    o: ['pl'],
    od: ['pl'],
    po: ['pl'],
    sa: ['tl'],
    se: ['it', 'pt'],
    si: ['es', 'fr', 'sw'],
    su: ['it'],
    u: ['pl'],
    w: ['pl'],
    we: ['pl'],
    wo: ['de'],
    yi: ['tr'],
    yu: ['tr'],
    z: ['pl'],
    za: ['pl'],
    ze: ['pl'],
    zu: ['de'],
  },
  if: {
    au: ['sw'],
    e: ['it', 'pt'],
    et: ['fr'],
    o: ['es', 'it', 'tl'],
    ve: ['tr'],
    y: ['es'],
  },
  increment: {
    a: ['es', 'it', 'pt'],
    ai: ['it'],
    al: ['es', 'it'],
    ao: ['pt'],
    ay: ['tl'],
    az: ['pl'],
    da: ['it'],
    de: ['es', 'fr', 'pt'],
    di: ['id', 'it'],
    do: ['pl', 'pt'],
    em: ['pt'],
    en: ['es'],
    es: ['es'],
    ke: ['id', 'ms'],
    ku: ['pl'],
    na: ['pl', 'pt', 'sw', 'tr'],
    ne: ['tr'],
    ni: ['sw', 'tr'],
    nu: ['tr'],
    o: ['pl'],
    od: ['pl'],
    po: ['pl'],
    sa: ['tl'],
    si: ['sw'],
    su: ['it'],
    u: ['pl'],
    w: ['pl'],
    we: ['pl'],
    wo: ['de'],
    yi: ['tr'],
    yu: ['tr'],
    z: ['pl'],
    za: ['pl'],
    ze: ['pl'],
    zu: ['de'],
  },
  assign: {
    ay: ['tl'],
    az: ['pl'],
    de: ['fr'],
    es: ['es'],
    ke: ['ms'],
    na: ['tr'],
    ne: ['tr'],
    ni: ['sw', 'tr'],
    nu: ['tr'],
    sa: ['tl'],
    se: ['it', 'pt'],
    si: ['es', 'fr'],
    wo: ['de'],
    yi: ['tr'],
    yu: ['tr'],
    zu: ['de'],
  },
  count: {
    a: ['es', 'it', 'pt'],
    ai: ['it'],
    al: ['es', 'it'],
    ao: ['pt'],
    ay: ['tl'],
    az: ['pl'],
    da: ['it'],
    de: ['es', 'fr', 'pt'],
    di: ['id', 'it'],
    do: ['pl', 'pt'],
    em: ['pt'],
    en: ['es'],
    es: ['es'],
    ke: ['id', 'ms'],
    ku: ['pl'],
    na: ['pl', 'pt', 'sw', 'tr'],
    ne: ['tr'],
    ni: ['sw', 'tr'],
    nu: ['tr'],
    o: ['pl'],
    od: ['pl'],
    po: ['pl'],
    sa: ['tl'],
    se: ['it', 'pt'],
    si: ['es', 'fr'],
    su: ['it'],
    u: ['pl'],
    w: ['pl'],
    we: ['pl'],
    wo: ['de'],
    yi: ['tr'],
    yu: ['tr'],
    z: ['pl'],
    za: ['pl'],
    ze: ['pl'],
    zu: ['de'],
  },
};

// The pairs PR 84 fixed, on the direct path (the matrix's `if` has a `then`,
// which the template above leaves out; both are read here).
const FIXED_84: Record<Position | 'if-then', Record<string, readonly string[]>> = {
  put: { ac: ['tr'], al: ['tr'], ir: ['es', 'pt'], si: ['sw'], va: ['fr'], ve: ['es'] },
  set: { ac: ['tr'], al: ['tr'], ir: ['es', 'pt'], va: ['fr'], ve: ['es'] },
  if: {},
  'if-then': {
    al: ['tr'],
    ay: ['tl'],
    az: ['pl'],
    de: ['fr'],
    es: ['es'],
    ir: ['es', 'pt'],
    ke: ['ms'],
    na: ['tr'],
    ne: ['tr'],
    ni: ['sw', 'tr'],
    nu: ['tr'],
    sa: ['tl'],
    se: ['it', 'pt'],
    si: ['es', 'fr', 'sw'],
    va: ['fr'],
    ve: ['es'],
    wo: ['de'],
    yi: ['tr'],
    yu: ['tr'],
    zu: ['de'],
  },
  increment: {
    ac: ['tr'],
    al: ['tr'],
    ir: ['es', 'pt'],
    se: ['it', 'pt'],
    si: ['es', 'fr'],
    va: ['fr'],
    ve: ['es'],
  },
  assign: {
    a: ['it'],
    ac: ['tr'],
    ai: ['it'],
    al: ['it', 'tr'],
    da: ['it'],
    ir: ['es', 'pt'],
    ku: ['pl'],
    na: ['pl'],
    o: ['pl'],
    od: ['pl'],
    po: ['pl'],
    si: ['sw'],
    su: ['it'],
    u: ['pl'],
    va: ['fr'],
    ve: ['es'],
    w: ['pl'],
    we: ['pl'],
    z: ['pl'],
    za: ['pl'],
    ze: ['pl'],
  },
  count: {
    a: ['de'],
    ac: ['tr'],
    al: ['tr'],
    an: ['de'],
    ir: ['es', 'pt'],
    si: ['sw'],
    va: ['fr'],
    ve: ['es'],
  },
};
FIXED_84.if = FIXED_84['if-then'];

const TEMPLATES_84: Record<Position | 'if-then', (name: string) => string> = {
  ...TEMPLATES,
  'if-then': n => `on click if ${n} then put "Y" into #out else put "N" into #out end`,
};

describe.each(Object.keys(TEMPLATES_84) as (Position | 'if-then')[])('%s (PR 84)', position => {
  const rows = Object.entries(FIXED_84[position]).flatMap(([name, languages]) =>
    languages.map(language => [name, language] as [string, string])
  );
  it.each(rows)('%s (%s)', (name, language) => {
    const source = TEMPLATES_84[position](name);
    const foreign = render(parse(source, 'en')!, language);
    const back = parse(foreign, language);
    expect(back ? render(back, 'en') : `(no parse: ${foreign})`, foreign).toBe(
      render(parse(source, 'en')!, 'en')
    );
  });
});

// What the readings above must leave alone.
describe('a structure word that is structure', () => {
  it.each([
    // A verb with more after it begins the next command (a stored zh row).
    [
      'zh',
      '当 keydown[key=="s"] 从 窗口 如果 event.ctrlKey 停止 把 调用 saveDocument() 结束',
      'on keydown[key=="s"] from window if event.ctrlKey halt then call saveDocument() end',
    ],
    // A two-word marker's second word is not the value (id `ke dalam`).
    ['id', 'ketika klik taruh obj.v ke dalam #out', 'on click put obj.v into #out'],
    ['id', 'ketika klik taruh 2 + 2 ke dalam #out', 'on click put 2 + 2 into #out'],
  ])('%s: %s', (language, source, english) => {
    expect(render(parse(source, language)!, 'en')).toBe(english);
  });

  // An event name may be a verb's (`init`), and a leading `not`/`no` keeps
  // its operand.
  it.each([
    'on load trigger init',
    'on click if not flag then put 1 into #out end',
    'on click if no .w then put 1 into #out end',
    'on click put empty into #out',
  ])('%s, through every language', source => {
    const english = render(parse(source, 'en')!, 'en');
    for (const language of FOREIGN) {
      const foreign = render(parse(source, 'en')!, language);
      expect(render(parse(foreign, language)!, 'en'), `${language}: ${foreign}`).toBe(english);
    }
  });
});

describe.each(Object.keys(TEMPLATES) as Position[])('%s', position => {
  const rows = Object.entries(FIXED[position]).flatMap(([name, languages]) =>
    languages.map(language => [name, language] as [string, string])
  );
  it.each(rows)('%s (%s)', (name, language) => {
    const source = TEMPLATES[position](name);
    const foreign = render(parse(source, 'en')!, language);
    const back = parse(foreign, language);
    expect(back ? render(back, 'en') : `(no parse: ${foreign})`, foreign).toBe(
      render(parse(source, 'en')!, 'en')
    );
  });
});
