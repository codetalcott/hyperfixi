/**
 * A language profile is its language's grammar (`@lokascript/framework/languages/<code>`)
 * with hyperscript's vocabulary over it.
 *
 * Lives outside `./profiles/` because that directory is auto-scanned by
 * `scripts/generate-indexes.ts` (see `./known-profiles.ts`).
 */

import type { GrammarProfile, PossessiveGrammar } from '@lokascript/framework/languages';
import type { LanguageProfile, PossessiveConfig } from './profiles/types';

/** What a profile adds to its grammar. A grammar field here is a type error: it is framework's. */
export type ProfileVocabulary = Omit<LanguageProfile, keyof GrammarProfile> & {
  readonly possessive?: Omit<PossessiveConfig, keyof PossessiveGrammar>;
};

/**
 * The profile for `grammar`. Call it as `/* @__PURE__ *\/ withGrammar(…)`: a bundler
 * must assume an object spread can run a getter, so a profile written as
 * `{ ...grammar, … }` stayed in every bundle that imported `KNOWN_PROFILES`'s
 * module, read or not; a pure call with plain arguments drops.
 */
export function withGrammar(
  grammar: GrammarProfile,
  vocabulary: ProfileVocabulary
): LanguageProfile {
  const { possessive, ...rest } = vocabulary;
  return {
    ...grammar,
    ...rest,
    ...((grammar.possessive || possessive) && {
      possessive: { ...grammar.possessive, ...possessive } as PossessiveConfig,
    }),
  };
}
