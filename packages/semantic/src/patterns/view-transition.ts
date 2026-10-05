/**
 * `start [a] view transition [using "<type>"]` — the head of upstream's view
 * transition block (viewTransitionSchema). The body follows it and the block
 * closes with the language's own `end`; the clause walker nests the body under
 * the head, as it nests a loop's.
 *
 * The same English words in every language, as the `using view transition`
 * tail on swap and process is (USING_VIEW_MARKER_ALL_LANGS): a phrase for a
 * browser API, which no profile translates. So each language registers the
 * same pattern under its own id (`patterns/handcrafted/<lang>.ts`).
 */

import type { LanguagePattern } from '../types';
import { handcrafted } from './handcrafted';

/** `start [a] view transition`: the words every head starts with. */
const HEAD: LanguagePattern['template']['tokens'] = [
  { type: 'literal', value: 'start' },
  { type: 'group', optional: true, tokens: [{ type: 'literal', value: 'a' }] },
  { type: 'literal', value: 'view' },
  { type: 'literal', value: 'transition' },
];

function viewTransitionPatterns(language: string): () => LanguagePattern[] {
  // Two patterns, not one with an optional `[using {style}]`: an optional role
  // the input leaves out still weighs in the confidence model's denominator,
  // which scored the bare head 0.5, and the clause parser declines a head that
  // low (`start view transition end then log 1` put the log inside the block).
  // Both sit above the `transition` command's patterns: in en and fr
  // `transition` is that command's keyword, which read the block's verb as
  // its patient.
  return () => [
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

export const getViewTransitionPatternsAr = viewTransitionPatterns('ar');
export const getViewTransitionPatternsBn = viewTransitionPatterns('bn');
export const getViewTransitionPatternsDe = viewTransitionPatterns('de');
export const getViewTransitionPatternsEn = viewTransitionPatterns('en');
export const getViewTransitionPatternsEs = viewTransitionPatterns('es');
export const getViewTransitionPatternsFr = viewTransitionPatterns('fr');
export const getViewTransitionPatternsHe = viewTransitionPatterns('he');
export const getViewTransitionPatternsHi = viewTransitionPatterns('hi');
export const getViewTransitionPatternsId = viewTransitionPatterns('id');
export const getViewTransitionPatternsIt = viewTransitionPatterns('it');
export const getViewTransitionPatternsJa = viewTransitionPatterns('ja');
export const getViewTransitionPatternsKo = viewTransitionPatterns('ko');
export const getViewTransitionPatternsMs = viewTransitionPatterns('ms');
export const getViewTransitionPatternsPl = viewTransitionPatterns('pl');
export const getViewTransitionPatternsPt = viewTransitionPatterns('pt');
export const getViewTransitionPatternsQu = viewTransitionPatterns('qu');
export const getViewTransitionPatternsRu = viewTransitionPatterns('ru');
export const getViewTransitionPatternsSw = viewTransitionPatterns('sw');
export const getViewTransitionPatternsTh = viewTransitionPatterns('th');
export const getViewTransitionPatternsTl = viewTransitionPatterns('tl');
export const getViewTransitionPatternsTr = viewTransitionPatterns('tr');
export const getViewTransitionPatternsUk = viewTransitionPatterns('uk');
export const getViewTransitionPatternsVi = viewTransitionPatterns('vi');
export const getViewTransitionPatternsZh = viewTransitionPatterns('zh');

/** The view-transition head for a language, as its module registered it. */
export function getViewTransitionPatternsForLanguage(language: string): LanguagePattern[] {
  return handcrafted('viewTransition', language) ?? [];
}
