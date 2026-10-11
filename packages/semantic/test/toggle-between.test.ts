/**
 * `toggle … between` in each language's own words (M2, vocabulary sheet A6).
 * Upstream reads three forms: a pair of classes or attributes (`toggle between
 * .a and .b [on #x]`), and a list of values a variable or a style cycles
 * through (`toggle $x between 1, 2 and 3`, `toggle *display of me between
 * 'none' and 'flex'`). Semantic had no role for any of them: the pair's
 * `between` was read as the class toggled, and every list was kept as an
 * English clause, refused in ar, de, fr, he, ja and tr. toggle's `goal` role
 * holds the pair or the list, marked by the language's word for `between`.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, translate } from '../src/index';
import { toggleSchema } from '../src/generators/command-schemas';
import { tokenize } from '../src/tokenizers';
import { readsAsValueList } from '../src/parser/utils/value-extent';
import { dictionaries } from '../../i18n/src/dictionaries';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

const MARKERS = toggleSchema.roles.find(r => r.role === 'goal')!.markerOverride!;

type Node = {
  action?: string;
  roles?: Map<string, { type: string; value?: unknown; raw?: string }>;
  body?: Node[];
};

const toggleOf = (code: string, language = 'en'): Node => {
  const node = parse(code, language) as unknown as Node;
  return node.action === 'on' ? node.body![0]! : node;
};

const role = (node: Node, name: string): string | undefined => {
  const value = node.roles?.get(name);
  return value ? String(value.raw ?? value.value) : undefined;
};

const SHAPES = [
  'on click toggle between .foo and .bar',
  'on click toggle between .a and .b on #x',
  "on click toggle between [@data-state='active'] and [@data-state='inactive']",
  'on click toggle between @a and @b',
  'on click toggle between .a and .b for 2s',
  "on click toggle $mode between 'edit' and 'preview'",
  "on click toggle $state between 'a', 'b' and 'c'",
  "on click toggle *display of me between 'none' and 'flex'",
  "on click toggle *opacity of me between '0', '0.5' and '1'",
  "on click toggle *display of #x between 'none' and 'block'",
];

describe('English reads each form', () => {
  it('a pair is the goal, with no class toggled', () => {
    const node = toggleOf('on click toggle between .foo and .bar');
    expect(role(node, 'goal')).toBe('.foo and .bar');
    expect(role(node, 'patient')).toBeUndefined();
  });

  it('a pair on an element', () => {
    const node = toggleOf('on click toggle between .a and .b on #x');
    expect(role(node, 'goal')).toBe('.a and .b');
    expect(role(node, 'destination')).toBe('#x');
  });

  it('a list of values, whole', () => {
    const node = toggleOf("on click toggle $state between 'a', 'b' and 'c'");
    expect(role(node, 'patient')).toBe('$state');
    expect(role(node, 'goal')).toBe("'a', 'b' and 'c'");
  });

  it("a style with its element (the engine reads `#x's *display` as another form)", () => {
    const node = toggleOf("on click toggle *display of me between 'none' and 'flex'");
    expect(role(node, 'patient')).toBe('*display of me');
    expect(role(node, 'goal')).toBe("'none' and 'flex'");
  });

  it.each(SHAPES)('%s reads back as written', code => {
    expect(translate(code, 'en', 'en')).toBe(code);
  });
});

describe('every language writes its own word, and reads it back', () => {
  it.each(FOREIGN)('%s', language => {
    const word = MARKERS[language]!;
    for (const code of SHAPES) {
      const rendered = translate(code, 'en', language);
      expect(rendered, code).toContain(word);
      expect(rendered, code).not.toMatch(/\bbetween\b/);
      expect(translate(rendered, language, 'en'), `${code} → ${rendered}`).toBe(code);
    }
  });

  it('a verb-final language writes the pair before the verb (ja)', () => {
    expect(translate('on click toggle between .foo and .bar', 'en', 'ja')).toMatch(
      /\.foo そして \.barの間で 切り替え$/
    );
  });

  it("zh's word follows the pair it names", () => {
    expect(translate('on click toggle between .foo and .bar', 'en', 'zh')).toMatch(
      /切换 \.foo 和 \.bar 之间$/
    );
  });
});

// Policy 5: a translation writes only the dictionary's words.
describe('the words are the dictionaries’', () => {
  it.each(FOREIGN)('%s', language => {
    const modifiers = (dictionaries as Record<string, { modifiers?: Record<string, string> }>)[
      language
    ]?.modifiers;
    expect(MARKERS[language]).toBe(modifiers?.between);
  });
});

describe('the readers', () => {
  // Each read as two words before: ar ب + ين (with), he ב + ין (on), th ระห +
  // ว่าง (null), qu chawpi + pi; ja's dictionary word, 間に, reads 間 as `while`.
  it.each(['ar', 'he', 'th', 'qu', 'ja'])('%s reads its word whole', language => {
    const tokens = tokenize(`.a ${MARKERS[language]} .b`, language).tokens;
    expect(tokens.map(t => t.value)).toEqual(['.a', MARKERS[language], '.b']);
  });

  it('a class is never its command’s own marker word (ms `togol antara .a dan .b`)', () => {
    const node = toggleOf('apabila click togol antara .a dan .b', 'ms');
    expect(role(node, 'goal')).toBe('.a and .b');
    expect(role(node, 'patient')).toBeUndefined();
  });

  it('an attribute is an operand where the tokenizer reads it as a name (sw `@a na @b`)', () => {
    expect(role(toggleOf('unapo click badilisha kati @a na @b', 'sw'), 'goal')).toBe('@a and @b');
  });

  it('a style keeps its element where no between follows', () => {
    for (const language of ['ar', 'de', 'es', 'fr', 'he', 'ja', 'tr']) {
      const code = 'on click toggle *display of #x';
      expect(translate(translate(code, 'en', language), language, 'en'), language).toBe(code);
    }
  });

  it('a style is read from itself, not from a `the` before it', () => {
    const code = 'on click toggle the *display of #d2';
    expect(translate(code, 'en', 'en')).toBe('on click toggle *display of #d2');
    for (const language of ['bn', 'ja', 'zh']) {
      expect(translate(code, 'en', language), language).not.toMatch(/\bthe\b/);
    }
  });

  it('a list is items separated by commas, each one value', () => {
    expect(readsAsValueList("'a', 'b' and 'c'")).toBe(true);
    expect(readsAsValueList('f(1, 2) and [3, 4]')).toBe(true);
    expect(readsAsValueList("'a',")).toBe(false);
    expect(readsAsValueList("'a', 'b' 'c'")).toBe(false);
  });
});
