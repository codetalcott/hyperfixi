/**
 * A translated condition reads its `or`, `not` and `and` back as English.
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
