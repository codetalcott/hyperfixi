/**
 * SQL Language Profiles
 *
 * Pattern-generation profiles for each supported language, built through the
 * framework↔semantic bridge: `@lokascript/semantic`'s language profiles
 * supply the grammar (word order, marker positions), the domain's
 * vocabularies (`../vocab`) supply the SQL verbs. Nothing per-language is
 * hand-authored here anymore.
 *
 * Note: Role markers are primarily specified via `markerOverride` on each
 * schema role (in schemas/index.ts). Profile-level roleMarkers only matter
 * when the default position (SOV=after, else=before) is wrong — see the
 * `condition`/`limit` overrides in the ja/ko/tr vocabularies.
 */

import { buildPatternProfile } from '@lokascript/framework';
import type { PatternGenLanguageProfile } from '@lokascript/framework';
import { SQL_LANGUAGES } from '../vocab';

function profileFor(code: string): PatternGenLanguageProfile {
  const { slice, vocab } = SQL_LANGUAGES[code];
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
