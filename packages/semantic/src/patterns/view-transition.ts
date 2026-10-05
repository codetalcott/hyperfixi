/**
 * `start [a] view transition [using "<type>"]` — the head of upstream's view
 * transition block (viewTransitionSchema). The body follows it and the block
 * closes with the language's own `end`; the clause walker nests the body under
 * the head, as it nests a loop's.
 *
 * The same English words in every language, as the `using view transition`
 * tail on swap and process is (USING_VIEW_MARKER_ALL_LANGS): a phrase for a
 * browser API, which no profile translates. So core builds it for each
 * registered language (patterns/builders.ts) and no language module carries a
 * copy: registered per language, it was inlined into every
 * `dist/languages/<lang>.js`, once per language in a regional bundle.
 */

import type { LanguagePattern } from '../types';

/** `start [a] view transition`: the words every head starts with. */
const HEAD: LanguagePattern['template']['tokens'] = [
  { type: 'literal', value: 'start' },
  { type: 'group', optional: true, tokens: [{ type: 'literal', value: 'a' }] },
  { type: 'literal', value: 'view' },
  { type: 'literal', value: 'transition' },
];

/** The view-transition head, under this language's ids. */
export function getViewTransitionPatterns(language: string): LanguagePattern[] {
  // Two patterns, not one with an optional `[using {style}]`: an optional role
  // the input leaves out still weighs in the confidence model's denominator,
  // which scored the bare head 0.5, and the clause parser declines a head that
  // low (`start view transition end then log 1` put the log inside the block).
  // Both sit above the `transition` command's patterns: in en and fr
  // `transition` is that command's keyword, which read the block's verb as
  // its patient.
  return [
    {
      id: `viewTransition-${language}-using`,
      language,
      command: 'viewTransition',
      priority: 111,
      template: {
        format: 'start [a] view transition using {style}',
        tokens: [
          ...HEAD,
          { type: 'literal', value: 'using' },
          { type: 'role', role: 'style', expectedTypes: ['literal'] },
        ],
      },
      extraction: {
        style: { marker: 'using' },
      },
    },
    {
      id: `viewTransition-${language}`,
      language,
      command: 'viewTransition',
      priority: 110,
      template: {
        format: 'start [a] view transition',
        tokens: HEAD,
      },
      extraction: {},
    },
  ];
}
