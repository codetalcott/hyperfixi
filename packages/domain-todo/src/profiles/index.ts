/**
 * Todo Language Profiles
 *
 * Pattern-generation profiles for each supported language, built through the
 * framework↔semantic bridge: `@lokascript/semantic`'s language profiles supply
 * the grammar (word order, marker positions), the domain's vocabularies
 * (`../vocab`) supply the todo verbs. Nothing per-language is hand-authored
 * here anymore.
 *
 * Note: Role markers are specified via `markerOverride` on each schema role
 * (in schemas/index.ts). Todo's roles (`item`, `list`) don't collide with any
 * semantic role, so the slices' role markers never leak into generation —
 * profile-level roleMarkers stay empty by construction.
 */

import { buildPatternProfile } from '@lokascript/framework';
import type { PatternGenLanguageProfile } from '@lokascript/framework';
import { TODO_LANGUAGES } from '../vocab';

function profileFor(code: string): PatternGenLanguageProfile {
  const { slice, vocab } = TODO_LANGUAGES[code];
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

export const allProfiles = [
  enProfile,
  esProfile,
  jaProfile,
  arProfile,
  koProfile,
  zhProfile,
  trProfile,
  frProfile,
];
