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
  malayProfile,
  quechuaProfile,
  swahiliProfile,
  bengaliProfile,
  italianProfile,
  russianProfile,
  ukrainianProfile,
  vietnameseProfile,
  hindiProfile,
  tagalogProfile,
  thaiProfile,
  polishProfile,
  hebrewProfile,
} from './profiles';

// Direct language-pair translation
export {
  directMappings,
  hasDirectMapping,
  getDirectMapping,
  translateWordDirect,
  getSupportedDirectPairs,
} from './direct-mappings';

// Transformer — RETIRED 2026-08-28.
//
// `transformer.ts` (2,747 lines) exported `GrammarTransformer`, `parseStatement`,
// `toLocale`, `toEnglish`, `translate` and `examples`. Every consumer has moved to
// @lokascript/semantic, which is what the 3,657-row corpus is written by and what
// every runtime surface in this repo already called: `@hyperscript-tools/i18n`
// (#999), the vite-plugin's generated bundle (#997), and the classic-i18n browser
// bundle, which dropped the four helpers rather than pay +173 KB gzipped to keep
// them (#998).
//
// The rest of this directory STAYS and is not part of that retirement: `profiles/`
// is imported by i18n's own `runtime.ts` and re-exported to the classic-i18n
// bundle; `types.ts` backs `constants.ts` and the role helpers above;
// `direct-mappings.ts` is part of the browser API (`types-browser/i18n-api.ts`
// declares it). This was never "delete the grammar directory".
