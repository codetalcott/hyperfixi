/**
 * `start [a] view transition [using "<type>"]` — the head of upstream's view
 * transition block (viewTransitionSchema). The body follows it and the block
 * closes with the language's own `end`; the clause walker nests the body under
 * the head, as it nests a loop's.
 *
 * `view transition` is English in every language, as the `using view
 * transition` tail on swap and process is (USING_VIEW_MARKER_ALL_LANGS): the
 * name of a browser API (sheet C3). `start` is the language's own word (M2
 * sheet B6, grammar-words.ts), written last in a verb-final language (ja
 * `view transition 開始`), and English's `start [a] view transition` is read in
 * every language. Core builds the patterns for each registered language
 * (patterns/builders.ts), passing the words, and no language module carries a
 * copy: registered per language, they were inlined into every
 * `dist/languages/<lang>.js`, once per language in a regional bundle.
 */

import type { LanguagePattern } from '../types';

/** `start [a] view transition`: English's head. */
const HEAD: LanguagePattern['template']['tokens'] = [
  { type: 'literal', value: 'start' },
  { type: 'group', optional: true, tokens: [{ type: 'literal', value: 'a' }] },
  { type: 'literal', value: 'view' },
  { type: 'literal', value: 'transition' },
];

/** A language's own `start`: its words, and whether the verb comes last. */
export interface NativeStart {
  readonly words: readonly string[];
  readonly verbFinal: boolean;
}

/** The view-transition head, under this language's ids. */
export function getViewTransitionPatterns(
  language: string,
  native?: NativeStart
): LanguagePattern[] {
  // Two patterns per head, not one with an optional `[using {style}]`: an
  // optional role the input leaves out still weighs in the confidence model's
  // denominator, which scored the bare head 0.5, and the clause parser declines
  // a head that low (`start view transition end then log 1` put the log inside
  // the block). All sit above the `transition` command's patterns: in en and fr
  // `transition` is that command's keyword, which read the block's verb as its
  // patient. The language's own head is above English's, so it is the one
  // written.
  const head = (tokens: LanguagePattern['template']['tokens'], id: string, priority: number) => [
    {
      id: `${id}-using`,
      language,
      command: 'viewTransition' as const,
      priority: priority + 1,
      template: {
        format: 'start [a] view transition using {style}',
        tokens: [
          ...tokens,
          { type: 'literal' as const, value: 'using' },
          { type: 'role' as const, role: 'style' as const, expectedTypes: ['literal' as const] },
        ],
      },
      extraction: {
        style: { marker: 'using' },
      },
    },
    {
      id,
      language,
      command: 'viewTransition' as const,
      priority,
      template: {
        format: 'start [a] view transition',
        tokens,
      },
      extraction: {},
    },
  ];
  const id = `viewTransition-${language}`;
  if (!native) return head(HEAD, id, 110);
  const start = native.words.map(value => ({ type: 'literal' as const, value }));
  const view: LanguagePattern['template']['tokens'] = [
    { type: 'literal', value: 'view' },
    { type: 'literal', value: 'transition' },
  ];
  return [
    ...head(native.verbFinal ? [...view, ...start] : [...start, ...view], id, 110),
    ...head(HEAD, `${id}-en`, 108),
  ];
}
