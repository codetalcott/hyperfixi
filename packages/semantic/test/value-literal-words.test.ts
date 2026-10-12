/**
 * The value words each lexicon writes (`undefined`, `null`, `true`, `false`)
 * read back as the English literal. ms wrote `tidak_ditakrifkan` and pl
 * `niezdefiniowane` for `undefined` and neither reader knew the word, so
 * `:obj.b is undefined` read back as a variable named so: the command-shape
 * gate listed eight lanes as silent (M2 row 7).
 */
import { describe, it, expect } from 'vitest';
import { getRegisteredLexicons, getLexicon, tokenize, translate } from '../src/index';

const LITERALS = ['undefined', 'null', 'true', 'false'] as const;

describe("a lexicon's value words read back as the English literal", () => {
  const codes = getRegisteredLexicons().filter(code => code !== 'en');
  it.each(codes.flatMap(code => LITERALS.map(word => [code, word] as const)))(
    '%s %s',
    (code, word) => {
      const entry = getLexicon(code)?.values?.[word];
      const native = typeof entry === 'string' ? entry : entry?.primary;
      if (!native || native === word) return;
      const tokens = tokenize(native, code).tokens;
      expect(tokens.map(t => `${t.value}:${t.kind}=${t.normalized ?? t.value}`)).toEqual([
        `${native}:keyword=${word}`,
      ]);
    }
  );

  it.each(['ms', 'pl'])('%s: `if x is undefined` round-trips', code => {
    const source = 'on click if x is undefined put 1 into #out end';
    const written = translate(source, 'en', code);
    expect(written).toContain(code === 'ms' ? 'tidak_ditakrifkan' : 'niezdefiniowane');
    expect(translate(written, code, 'en')).toBe(source);
  });
});
