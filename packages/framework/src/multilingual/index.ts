/**
 * Multilingual support — the framework ↔ semantic bridge.
 *
 * Injection-based: domains import per-language grammar data (e.g. semantic's
 * `KNOWN_PROFILES`) and inject it into these builders; framework itself never
 * imports the semantic package. See `docs-internal/FRAMEWORK_SEMANTIC_BRIDGE_PLAN.md`.
 */

export type {
  GrammarProfileSlice,
  DomainVocabulary,
  DomainKeywordTranslation,
  DomainKeywordEntry,
  RoleMarkerSlice,
  TokenizationSlice,
  VerbSlice,
} from './types';

export {
  buildPatternProfile,
  buildDomainTokenizer,
  buildLanguageConfig,
  deriveRoleMarkers,
} from './builders';
export type { DomainTokenizerOptions, LanguageConfigMeta } from './builders';

// Re-export grammar types for language profiles (pre-bridge public surface)
export type { LanguageProfile, WordOrder, AdpositionType, MorphologyType } from '../grammar';
