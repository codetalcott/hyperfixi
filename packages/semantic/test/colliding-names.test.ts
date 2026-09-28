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
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

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
