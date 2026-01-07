/**
 * Language Profiles Index
 *
 * Re-exports all profile types and individual profiles.
 * For tree-shaking, import specific profiles directly:
 *   import { englishProfile } from './profiles/english';
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

// Types
export type {
  LanguageProfile,
  WordOrder,
  MarkingStrategy,
  RoleMarker,
  VerbConfig,
  PossessiveConfig,
  KeywordTranslation,
  TokenizationConfig,
} from './types';

// Individual profiles - import individually for tree-shaking
export { arabicProfile } from './arabic';
export { bengaliProfile } from './bengali';
export { chineseProfile } from './chinese';
export { englishProfile } from './english';
export { frenchProfile } from './french';
export { germanProfile } from './german';
export { hindiProfile } from './hindi';
export { indonesianProfile } from './indonesian';
export { italianProfile } from './italian';
export { japaneseProfile } from './japanese';
export { koreanProfile } from './korean';
export { malayProfile } from './ms';
export { polishProfile } from './polish';
export { portugueseProfile } from './portuguese';
export { quechuaProfile } from './quechua';
export { russianProfile } from './russian';
export { spanishProfile } from './spanish';
export { swahiliProfile } from './swahili';
export { thaiProfile } from './thai';
export { turkishProfile } from './turkish';
export { ukrainianProfile } from './ukrainian';
export { vietnameseProfile } from './vietnamese';
export { tagalogProfile } from './tl';
