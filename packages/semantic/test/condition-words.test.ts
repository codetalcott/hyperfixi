/**
 * A translated condition reads its `or`, `not` and `and` back as English, and
 * its copula and possessives.
 *
 * The renderer writes these words in the language (de `oder`, `nicht`), and
 * where the tokenizer reads the word back as a bare identifier the condition
 * kept it: `p oder q` compared p with a variable named `oder`. The expression
 * lexicon now carries each language's logical words that nothing else in its
 * dictionary spells the same way.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

type Node = {
  kind?: string;
  roles?: Map<string, { raw?: string }>;
  body?: Node[];
  statements?: Node[];
};

function condition(node: Node | null): string | undefined {
  if (!node) return undefined;
  if (node.kind === 'conditional') return node.roles?.get('condition')?.raw;
  for (const child of [...(node.body ?? []), ...(node.statements ?? [])]) {
    const found = condition(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

// Each group: English conditions, and the languages whose word for it read
// back as an identifier.
const GROUPS: Array<[string, string[], string[]]> = [
  ['or', ['r or q'], ['ar', 'de', 'fr', 'ms', 'pt', 'qu', 'ru', 'th', 'tl', 'uk']],
  ['not', ['not r', 'not r and p'], ['de', 'fr', 'id', 'ms', 'pt', 'ru', 'th', 'tl', 'uk']],
  ['is not', ['p is not q'], ['de', 'fr', 'id', 'ms', 'pt', 'ru', 'tl', 'uk']],
  ['and', ['p and q'], ['ar']],
  // ja `ではない` and ar `ليس` were split by their tokenizers (ja `で は ない`,
  // ar `ل يس`); and `is not empty` ended at the predicate where `not` is a plain
  // word (de `ist nicht leer`: `leer` is also the `empty` command).
  ['not, split by the tokenizer', ['not r'], ['ar', 'ja']],
  ['is not, split by the tokenizer', ['p is not q'], ['ja']],
  ['is not empty', ['p is not empty'], ['bn', 'de', 'fr', 'ja', 'pt', 'ru', 'tl', 'uk']],
  // ar هو (also `it`), hi है (also `has`) and th เป็น (also `as`) read as the
  // copula between two operands; hi है before a class is `has`, and hi नहीं
  // after the copula is `not` (elsewhere `no`).
  [
    'is, a word with another sense',
    ['p is q', 'q is greater than p', 'p is not q'],
    ['ar', 'hi', 'th'],
  ],
  ['has, the same word as is', ['#d1 has .x'], ['hi']],
  // ja `そして` and ko `그리고`, their word for `and`, were also then-words, so a
  // handler body split the condition at them.
  ['and, also a then-word', ['p is not q and q is 3'], ['ja', 'ko']],
  // hi `नहीं` after the `does` of `does not match` is `not`, as after the copula.
  ['does not, in hi', ['#d1 does not match .x', '#zz does not exist'], ['hi']],
  // Where the possessive marker sits between owner and property (ja
  // `#d1のtextContent`), the marker stayed in the condition.
  [
    'a possessive, owner first',
    [
      `#d1's textContent is "z"`,
      `#d1's textContent is #d2's textContent`,
      `#i1's value is not "v"`,
    ],
    ['bn', 'hi', 'ja', 'ko', 'tl', 'vi', 'zh'],
  ],
];

describe.each(GROUPS)('%s', (_word, conditions, languages) => {
  describe.each(conditions)('if %s', english => {
    const source = `on click if ${english} put "yes" into #out end`;

    it.each(languages)('%s', language => {
      const foreign = render(parse(source, 'en')!, language);
      expect(condition(parse(foreign, language) as Node), foreign).toBe(english);
      expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
    });
  });
});

// The pronoun sense of ar هو stays: it opens a clause or follows an operator
// (`"$" + هو`, whose `+` the ar tokenizer lexes as an identifier), never an
// operand. The corpus row `when-value-changes` renders exactly that.
describe('ar هو as `it`', () => {
  it.each(['on click put "$" + it into #out', 'on click put it into #out', 'on click set x to it'])(
    '%s',
    source => {
      const foreign = render(parse(source, 'en')!, 'ar');
      expect(render(parse(foreign, 'ar')!, 'en'), foreign).toBe(source);
    }
  );
});

// Between two commands, a hand-written ja `そして` or ko `그리고` still starts the
// next command, now that neither is a then-word.
describe('ja そして / ko 그리고 between two commands', () => {
  it.each([
    ['ja', 'クリック で .a を 切り替え そして .b を 追加'],
    ['ko', '클릭 할 때 .a 를 토글 그리고 .b 를 추가'],
  ])('%s', (language, source) => {
    expect(render(parse(source, language)!, 'en')).toBe('on click toggle .a then add .b');
  });
});
