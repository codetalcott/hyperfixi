/**
 * Language Profiles Index
 *
 * Re-exports all profile types and individual profiles.
 * For tree-shaking, import specific profiles directly:
 *   import { englishProfile } from './profiles/english';
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
export { englishProfile } from './english';
export { japaneseProfile } from './japanese';
export { arabicProfile } from './arabic';
export { spanishProfile } from './spanish';
export { koreanProfile } from './korean';
export { chineseProfile } from './chinese';
export { turkishProfile } from './turkish';
export { portugueseProfile } from './portuguese';
export { frenchProfile } from './french';
export { germanProfile } from './german';
export { indonesianProfile } from './indonesian';
export { quechuaProfile } from './quechua';
export { swahiliProfile } from './swahili';
export { italianProfile } from './italian';
export { vietnameseProfile } from './vietnamese';
