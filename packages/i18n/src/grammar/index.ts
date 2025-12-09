/**
 * Grammar Module
 *
 * Provides a generalized grammar transformation system for
 * multilingual hyperscript support.
 *
 * Key Concepts:
 * 1. Semantic Roles - Universal meaning components (action, patient, destination)
 * 2. Language Profiles - Typological features (word order, adposition type)
 * 3. Grammar Rules - Pattern matching and transformation
 *
 * The system works by:
 * 1. Parsing input into semantic roles
 * 2. Translating individual words via dictionary
 * 3. Reordering roles according to target language grammar
 * 4. Inserting appropriate grammatical markers
 */

// Types
export * from './types';

// Language profiles
export {
  profiles,
  getProfile,
  getSupportedLocales,
  englishProfile,
  japaneseProfile,
  koreanProfile,
  chineseProfile,
  arabicProfile,
  turkishProfile,
  spanishProfile,
  germanProfile,
  frenchProfile,
  portugueseProfile,
  indonesianProfile,
  quechuaProfile,
  swahiliProfile,
} from './profiles';

// Direct language-pair translation
export {
  directMappings,
  hasDirectMapping,
  getDirectMapping,
  translateWordDirect,
  getSupportedDirectPairs,
} from './direct-mappings';

// Transformer
export {
  GrammarTransformer,
  parseStatement,
  toLocale,
  toEnglish,
  translate,
  examples,
} from './transformer';
