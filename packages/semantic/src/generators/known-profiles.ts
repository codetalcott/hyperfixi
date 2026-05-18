/**
 * Static manifest of all defined language profiles.
 *
 * Non-deprecated successor to the `languageProfiles` Record in
 * `./language-profiles.ts`. Use this for build-time tooling
 * (grammar generation, translation sync, documentation extraction)
 * that needs to iterate every defined profile, regardless of runtime
 * registration state.
 *
 * For runtime checks (is this language currently loaded?) use the registry:
 * `getRegisteredLanguages()`, `tryGetProfile()`, `isLanguageRegistered()`.
 *
 * Lives outside `./profiles/` because that directory is auto-scanned by
 * `scripts/generate-indexes.ts`; placing a non-language manifest there
 * would be misinterpreted as a new language module.
 */

import type { LanguageProfile } from './profiles/types';
import { arabicProfile } from './profiles/arabic';
import { bengaliProfile } from './profiles/bengali';
import { chineseProfile } from './profiles/chinese';
import { englishProfile } from './profiles/english';
import { frenchProfile } from './profiles/french';
import { germanProfile } from './profiles/german';
import { hebrewProfile } from './profiles/he';
import { hindiProfile } from './profiles/hindi';
import { indonesianProfile } from './profiles/indonesian';
import { italianProfile } from './profiles/italian';
import { japaneseProfile } from './profiles/japanese';
import { koreanProfile } from './profiles/korean';
import { malayProfile } from './profiles/ms';
import { polishProfile } from './profiles/polish';
import { portugueseProfile } from './profiles/portuguese';
import { quechuaProfile } from './profiles/quechua';
import { russianProfile } from './profiles/russian';
import { spanishProfile } from './profiles/spanish';
import { spanishMexicoProfile } from './profiles/spanishMexico';
import { swahiliProfile } from './profiles/swahili';
import { thaiProfile } from './profiles/thai';
import { tagalogProfile } from './profiles/tl';
import { turkishProfile } from './profiles/turkish';
import { ukrainianProfile } from './profiles/ukrainian';
import { vietnameseProfile } from './profiles/vietnamese';

export const KNOWN_PROFILES: Readonly<Record<string, LanguageProfile>> = Object.freeze({
  ar: arabicProfile,
  bn: bengaliProfile,
  de: germanProfile,
  en: englishProfile,
  es: spanishProfile,
  'es-MX': spanishMexicoProfile,
  fr: frenchProfile,
  he: hebrewProfile,
  hi: hindiProfile,
  id: indonesianProfile,
  it: italianProfile,
  ja: japaneseProfile,
  ko: koreanProfile,
  ms: malayProfile,
  pl: polishProfile,
  pt: portugueseProfile,
  qu: quechuaProfile,
  ru: russianProfile,
  sw: swahiliProfile,
  th: thaiProfile,
  tl: tagalogProfile,
  tr: turkishProfile,
  uk: ukrainianProfile,
  vi: vietnameseProfile,
  zh: chineseProfile,
});
