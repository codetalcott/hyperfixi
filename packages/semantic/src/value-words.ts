/**
 * The English words that are a value alone: the references a program reads
 * (`me`, `it`, `event`, `target`, `window`, …) and the literals (`true`,
 * `null`, `empty`, …). Written alone in parentheses one is still that value —
 * es `(objetivo)` is `(target)` — so the reader never fuses one into a name
 * (`registry.tokenize`), and a variable spelled like one in some language
 * collides with it there the way a pronoun does (`name-collisions.ts`): no
 * spelling tells the two apart.
 */
export const VALUE_WORDS: ReadonlySet<string> = new Set([
  'me',
  'my',
  'myself',
  'you',
  'your',
  'yourself',
  'it',
  'its',
  'result',
  'event',
  'target',
  'body',
  'detail',
  'window',
  'document',
  'true',
  'false',
  'null',
  'undefined',
  'empty',
]);
