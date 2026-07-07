/**
 * JSX Language Profiles
 *
 * Pattern-generation profiles for each supported language, built through the
 * framework↔semantic bridge: `@lokascript/semantic`'s language profiles supply
 * the grammar (word order, marker positions), the domain's vocabularies
 * (`../vocab`) supply the JSX verbs. Nothing per-language is hand-authored here
 * anymore.
 *
 * Role markers are specified via `markerOverride` on each schema role (in
 * schemas/index.ts). The vocab suppresses the slices' general-purpose
 * source/destination markers (see vocab/shared.ts); no profile-level position
 * overrides are needed (all markers use the word-order default position).
 */

import { buildPatternProfile } from '@lokascript/framework';
import type { PatternGenLanguageProfile } from '@lokascript/framework';
import { JSX_LANGUAGES } from '../vocab';

function profileFor(code: string): PatternGenLanguageProfile {
  const { slice, vocab } = JSX_LANGUAGES[code];
  return buildPatternProfile(slice, vocab);
}

export const englishProfile: PatternGenLanguageProfile = profileFor('en');
export const spanishProfile: PatternGenLanguageProfile = profileFor('es');
export const japaneseProfile: PatternGenLanguageProfile = profileFor('ja');
export const arabicProfile: PatternGenLanguageProfile = profileFor('ar');
export const koreanProfile: PatternGenLanguageProfile = profileFor('ko');
export const chineseProfile: PatternGenLanguageProfile = profileFor('zh');
export const turkishProfile: PatternGenLanguageProfile = profileFor('tr');
export const frenchProfile: PatternGenLanguageProfile = profileFor('fr');
export const germanProfile: PatternGenLanguageProfile = profileFor('de');
export const portugueseProfile: PatternGenLanguageProfile = profileFor('pt');
export const russianProfile: PatternGenLanguageProfile = profileFor('ru');

export const allProfiles = [
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
  germanProfile,
  portugueseProfile,
  russianProfile,
];
