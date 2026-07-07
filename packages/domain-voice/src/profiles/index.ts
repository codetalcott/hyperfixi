/**
 * Voice/Accessibility Language Profiles
 *
 * Pattern-generation profiles for each supported language, built through the
 * framework↔semantic bridge: `@lokascript/semantic`'s language profiles supply
 * the grammar (word order, marker positions), the domain's vocabularies
 * (`../vocab`) supply the voice command verbs. Nothing per-language is
 * hand-authored here anymore.
 *
 * Role markers are specified via `markerOverride` on each schema role (in
 * schemas/index.ts). The vocab suppresses the slices' general-purpose
 * patient/destination markers (see vocab/shared.ts); no profile-level position
 * overrides are needed (all markers use the word-order default position).
 */

import { buildPatternProfile } from '@lokascript/framework';
import type { PatternGenLanguageProfile } from '@lokascript/framework';
import { VOICE_LANGUAGES } from '../vocab';

function profileFor(code: string): PatternGenLanguageProfile {
  const { slice, vocab } = VOICE_LANGUAGES[code];
  return buildPatternProfile(slice, vocab);
}

export const enProfile: PatternGenLanguageProfile = profileFor('en');
export const esProfile: PatternGenLanguageProfile = profileFor('es');
export const jaProfile: PatternGenLanguageProfile = profileFor('ja');
export const arProfile: PatternGenLanguageProfile = profileFor('ar');
export const koProfile: PatternGenLanguageProfile = profileFor('ko');
export const zhProfile: PatternGenLanguageProfile = profileFor('zh');
export const trProfile: PatternGenLanguageProfile = profileFor('tr');
export const frProfile: PatternGenLanguageProfile = profileFor('fr');
export const deProfile: PatternGenLanguageProfile = profileFor('de');
export const ptProfile: PatternGenLanguageProfile = profileFor('pt');
export const ruProfile: PatternGenLanguageProfile = profileFor('ru');

export const allProfiles = [
  enProfile,
  esProfile,
  jaProfile,
  arProfile,
  koProfile,
  zhProfile,
  trProfile,
  frProfile,
  deProfile,
  ptProfile,
  ruProfile,
];
