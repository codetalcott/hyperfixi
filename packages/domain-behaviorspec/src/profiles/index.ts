/**
 * BehaviorSpec Language Profiles
 *
 * Pattern-generation profiles for each supported language, built through the
 * framework↔semantic bridge: `@lokascript/semantic`'s language profiles supply
 * the grammar (word order), the domain's vocabularies (`../vocab`) supply the
 * structural keywords. Nothing per-language is hand-authored here anymore.
 *
 * BehaviorSpec's `when.destination` role reuses the semantic `destination` role
 * name, so the vocab suppresses the slice's general-purpose marker for it (see
 * vocab/shared.ts); no other role collides. Role markers are specified via
 * `markerOverride` on each schema role (in schemas/index.ts).
 */

import { buildPatternProfile } from '@lokascript/framework';
import type { PatternGenLanguageProfile } from '@lokascript/framework';
import { BEHAVIORSPEC_LANGUAGES } from '../vocab';

function profileFor(code: string): PatternGenLanguageProfile {
  const { slice, vocab } = BEHAVIORSPEC_LANGUAGES[code];
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
  frenchProfile,
  turkishProfile,
];
