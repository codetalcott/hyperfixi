/**
 * Every language's grammar, one module each (`@lokascript/framework/languages/<code>`).
 * Import the module you need: this barrel is for tooling and tests.
 */

export type {
  WordOrder,
  MarkingStrategy,
  ScriptType,
  RoleMarker,
  VerbConfig,
  VerbForm,
  TokenizationConfig,
  PossessiveGrammar,
  AttachedMarkers,
  GrammarProfile,
} from './types';

export { arabicGrammar } from './ar';
export { bengaliGrammar } from './bn';
export { germanGrammar } from './de';
export { englishGrammar } from './en';
export { spanishGrammar } from './es';
export { frenchGrammar } from './fr';
export { hebrewGrammar } from './he';
export { hindiGrammar } from './hi';
export { indonesianGrammar } from './id';
export { italianGrammar } from './it';
export { japaneseGrammar } from './ja';
export { koreanGrammar } from './ko';
export { malayGrammar } from './ms';
export { polishGrammar } from './pl';
export { portugueseGrammar } from './pt';
export { quechuaGrammar } from './qu';
export { russianGrammar } from './ru';
export { swahiliGrammar } from './sw';
export { thaiGrammar } from './th';
export { tagalogGrammar } from './tl';
export { turkishGrammar } from './tr';
export { ukrainianGrammar } from './uk';
export { vietnameseGrammar } from './vi';
export { chineseGrammar } from './zh';
