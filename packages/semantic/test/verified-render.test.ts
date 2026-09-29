/**
 * The verified render (`explicit/verified-render.ts`, PR 103): a variable
 * spelled like a structure word of the target language is written in
 * parentheses, `(ist)`, exactly where the plain render would be read back as
 * something else, and the reader fuses `(ist)` into one name
 * (`registry.tokenize`).
 *
 * The value-reading rules (`parser/value-reading.ts`) tell most such names
 * from the word by where they stand, and there the render is unchanged: every
 * tr and pl loop over `i` stays `i`. Where the rules cannot — de `ist` (is)
 * and `bei` (at), fr `est` (is), es `si` (if) inside an expression — the
 * plain render lost the variable, and the parenthesized one keeps it. (de
 * `auf`, `von`, `aus` and fr `sur` needed it too, until PR 104 read a role
 * marker in an expression as a variable.)
 */
import { describe, it, expect } from 'vitest';
import { parse, render, semanticRenderer, tokenize } from '../src/index';
import { parenthesizeCollidingNames } from '../src/name-collisions';

/** The English `code` reads back as, a name alone in parentheses aside. */
function readBack(code: string, language: string): string {
  return render(parse(code, language)!, 'en').replace(/(^|[^\w)\]])\((\w+)\)/g, '$1$2');
}

describe('a render the reader already reads is unchanged', () => {
  it.each([
    ['on click set i to 0 then repeat while i < 3 increment i end then put i into #out', 'pl'],
    ['on click set i to 0 then repeat while i < 3 increment i end then put i into #out', 'tr'],
    ['on click put a + b into #out', 'es'],
    ['on click put a + b into #out', 'tr'],
    ['on click set si to 2 then put si into #out', 'es'],
    ['on click set w to 5 then put w into #out', 'pl'],
    ['on click set ir to 1 then increment ir then put ir into #out', 'pt'],
  ])('%s (%s)', (source, language) => {
    const node = parse(source, 'en')!;
    const code = render(node, language);
    expect(code).toBe(semanticRenderer.render(node, language));
    expect(code).not.toMatch(/\(\w+\)/);
    expect(readBack(code, language), code).toBe(source);
  });
});

describe('a variable the plain render loses is written in parentheses', () => {
  const TEMPLATES = [
    (n: string) => `on click set ${n} to 2 then put ${n} + 1 into #out`,
    (n: string) => `on click set ${n} to 2 then if ${n} is 2 then put "Y" into #out end`,
    (n: string) =>
      `on click set ${n} to 0 then repeat while ${n} < 3 increment ${n} end then put ${n} into #out`,
  ];
  it.each([
    ['de', 'ist'],
    ['de', 'bei'],
    ['fr', 'est'],
    ['es', 'si'],
    ['pt', 'ir'],
    ['tr', 'al'],
  ])('%s `%s`', (language, name) => {
    let parenthesized = 0;
    for (const template of TEMPLATES) {
      const node = parse(template(name), 'en')!;
      const english = render(node, 'en');
      const plain = semanticRenderer.render(node, language);
      const code = render(node, language);
      // It reads back, and differs from the plain render only where that one
      // does not (PR 104's role-marker reading reads `setzen auf + 1` plain).
      expect(readBack(code, language), code).toBe(english);
      if (readBack(plain, language) === english) expect(code).toBe(plain);
      else {
        expect(code).toContain(`(${name})`);
        parenthesized++;
      }
    }
    expect(
      parenthesized,
      `${language} ${name}: some template needs the parentheses`
    ).toBeGreaterThan(0);
  });

  it('an `of` owner: es `length of (si)`', () => {
    const source = 'on click put length of si into #out';
    const code = render(parse(source, 'en')!, 'es');
    expect(code).toBe('al clic poner length of (si) en #out');
    expect(readBack(code, 'es')).toBe(source);
  });

  it('de `ist` in the second `set` of a chain', () => {
    // de read that `set` as a handler (`auf ist` as `on ist`) until PR 110; now
    // it reads, and `ist + 3` needs its parentheses as it does anywhere.
    const source = 'on click set ist to 2 then set x to ist + 3 then put x into #out';
    const code = render(parse(source, 'en')!, 'de');
    expect(code).toBe(
      'wenn klick setze (ist) auf 2 dann setze x auf (ist) + 3 dann setzen x in #out'
    );
    expect(readBack(code, 'de')).toBe(source);
  });

  it('es `si` inside an expression', () => {
    const source = 'on click set x to si + 1 then put x into #out';
    const code = render(parse(source, 'en')!, 'es');
    expect(code).toBe('al clic establecer x a (si) + 1 entonces poner x en #out');
    expect(readBack(code, 'es')).toBe(source);
  });
});

describe('the reader fuses a name alone in parentheses', () => {
  const values = (code: string, language: string): string[] =>
    tokenize(code, language).tokens.map(token => token.value);

  it('reads `(si)` as one name, and a hand-written one as the variable', () => {
    expect(values('(si) + 1', 'es')).toEqual(['(si)', '+', '1']);
    expect(readBack('al clic establecer x a (si) + 1 entonces poner x en #out', 'es')).toBe(
      'on click set x to si + 1 then put x into #out'
    );
  });

  it('a reference or literal in parentheses is still the value (VALUE_WORDS)', () => {
    // es `objetivo` is `target`: fused, `(target)` would read as a variable.
    for (const [source, language] of [
      ['on click put (target) into #out', 'es'],
      ['on click put (window) into #out', 'de'],
      ['on click put (true) into #out', 'ja'],
    ] as const) {
      const code = render(parse(source, 'en')!, language);
      expect(render(parse(code, language)!, 'en'), code).toBe(source);
    }
  });

  it('a structure word the tokenizer leaves an identifier: de `(um)`, es `(a)`', () => {
    expect(values('(um) + 1', 'de')).toEqual(['(um)', '+', '1']);
    expect(values('(a) + b', 'es')).toEqual(['(a)', '+', 'b']);
  });

  it('a plain name in parentheses stays three tokens, as every reader expects', () => {
    expect(values('(x) + 1', 'es')).toEqual(['(', 'x', ')', '+', '1']);
    expect(readBack('al clic poner length of (x) en #out', 'es')).toBe(
      'on click put length of ( x ) into #out'
    );
  });

  it('not a call, a value word, a spaced group, or English', () => {
    expect(values('f(si)', 'es')).not.toContain('(si)');
    expect(values('(yo)', 'es')).not.toContain('(yo)');
    expect(values('( si )', 'es')).not.toContain('(si)');
    expect(values('(if)', 'en')).not.toContain('(if)');
  });
});

describe('qu: a name the reader splits, or a sense rule does not count (PR 111)', () => {
  const values = (code: string): string[] => tokenize(code, 'qu').tokens.map(t => t.value);

  it('fuses a word the tokenizer splits inside the parentheses: `(userData)`', () => {
    expect(values('(userData) ta')).toEqual(['(userData)', 'ta']);
    // Hand-written, the attached marker still reads as one (`triggerElta`).
    expect(values('triggerElta')).toEqual(['triggerEl', 'ta']);
  });

  it('only pieces that touch: `(user Data)` is two words', () => {
    expect(values('(user Data) ta')).not.toContain('(userData)');
  });

  it('fuses a particle whose role name is a value word: `(pi)` (the event marker)', () => {
    expect(values('mana (pi)')).toEqual(['mana', '(pi)']);
  });

  it.each([
    ['on click put userData into #out', '(userData)'],
    ['on click set userData to 2 then put userData + 1 into #out', '(userData)'],
    ['on click if not pa then put "Y" into #out else put "N" into #out end', '(pa)'],
    ['on click if not pi then put "Y" into #out else put "N" into #out end', '(pi)'],
  ])('%s', (source, spelled) => {
    const code = render(parse(source, 'en')!, 'qu');
    expect(code).toContain(spelled);
    expect(readBack(code, 'qu'), code).toBe(render(parse(source, 'en')!, 'en'));
  });
});

describe('parenthesizeCollidingNames: the variables of an English expression', () => {
  it.each([
    ['si + 1', '(si) + 1'],
    // A property, a method or a conversion's type is not a variable.
    ['obj.si + si', 'obj.si + (si)'],
    ["obj's si", "obj's si"],
    // English vocabulary is not a name: `me` is es `yo`, rendered by the lexicon.
    ['me + si', 'me + (si)'],
    // Already in parentheses.
    ['(si) + 1', '(si) + 1'],
  ])('es: %s', (raw, expected) => {
    expect(parenthesizeCollidingNames(raw, 'es')).toBe(expected);
  });
});
