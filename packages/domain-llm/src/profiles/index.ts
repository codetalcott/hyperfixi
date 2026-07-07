/**
 * LLM Language Profiles
 *
 * Pattern-generation profiles for each supported language, built through the
 * framework↔semantic bridge: `@lokascript/semantic`'s language profiles supply
 * the grammar (word order, marker positions), the domain's vocabularies
 * (`../vocab`) supply the LLM verbs. Nothing per-language is hand-authored here
 * anymore.
 *
 * Role markers are specified via `markerOverride` on each schema role (in
 * schemas/index.ts). The vocab suppresses the slices' general-purpose
 * source/destination/patient markers (see vocab/shared.ts); profile-level
 * roleMarkers only carry position overrides where the SOV default is wrong
 * (ja manner/quantity → 'before').
 */

import { buildPatternProfile } from '@lokascript/framework';
import type { PatternGenLanguageProfile } from '@lokascript/framework';
import { LLM_LANGUAGES } from '../vocab';

function profileFor(code: string): PatternGenLanguageProfile {
  const { slice, vocab } = LLM_LANGUAGES[code];
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

export const allProfiles = [
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
];
