/**
 * Language Profiles
 *
 * Type re-exports and individual profile re-exports.
 * For tree-shaking, import specific profiles directly:
 *
 * @example
 * ```typescript
 * import { englishProfile } from './profiles/english';
 * ```
 *
 * For the full static manifest of all defined profiles (build-time tooling
 * use case), import `KNOWN_PROFILES` from `./known-profiles`.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

// Re-export types
export type {
  LanguageProfile,
  WordOrder,
  MarkingStrategy,
  RoleMarker,
  VerbConfig,
  VerbForm,
  PossessiveConfig,
  KeywordTranslation,
  TokenizationConfig,
} from './profiles/types';

// Re-export individual profiles
export { arabicProfile } from './profiles/arabic';
export { bengaliProfile } from './profiles/bengali';
export { chineseProfile } from './profiles/chinese';
export { englishProfile } from './profiles/english';
export { frenchProfile } from './profiles/french';
export { germanProfile } from './profiles/german';
export { hebrewProfile } from './profiles/he';
export { hindiProfile } from './profiles/hindi';
export { indonesianProfile } from './profiles/indonesian';
export { italianProfile } from './profiles/italian';
export { japaneseProfile } from './profiles/japanese';
export { koreanProfile } from './profiles/korean';
export { malayProfile } from './profiles/ms';
export { polishProfile } from './profiles/polish';
export { portugueseProfile } from './profiles/portuguese';
export { quechuaProfile } from './profiles/quechua';
export { russianProfile } from './profiles/russian';
export { spanishProfile } from './profiles/spanish';
export { swahiliProfile } from './profiles/swahili';
export { thaiProfile } from './profiles/thai';
export { tagalogProfile } from './profiles/tl';
export { turkishProfile } from './profiles/turkish';
export { ukrainianProfile } from './profiles/ukrainian';
export { vietnameseProfile } from './profiles/vietnamese';
