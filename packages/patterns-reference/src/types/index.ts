/**
 * Patterns Reference Type Definitions
 */

// =============================================================================
// Pattern Types
// =============================================================================

/**
 * A pattern from the database (code_examples table).
 */
export interface Pattern {
  id: string;
  title: string;
  description: string | null;
  rawCode: string;
  category: string | null;
  primaryCommand: string | null;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
}

/**
 * Pattern with computed complexity classification.
 */
export interface ClassifiedPattern extends Pattern {
  complexity: ComplexityLevel;
  lineCount: number;
  commands: string[];
}

export type ComplexityLevel =
  | 'simple-command'
  | 'simple-event'
  | 'chained-command'
  | 'multi-line-event'
  | 'behavior-install'
  | 'behavior-def'
  | 'def-function'
  | 'complex';

// =============================================================================
// Translation Types
// =============================================================================

export type WordOrder = 'SVO' | 'SOV' | 'VSO' | 'V2';
export type TranslationMethod = 'auto-generated' | 'hand-crafted' | 'verified';

/**
 * Pattern priority levels for translation selection.
 * When multiple translations exist, higher priority wins.
 *
 * - hand-crafted: Manually written by a native speaker (highest priority)
 * - verified: Auto-generated but verified by human review
 * - auto-generated: Machine-generated without human verification (lowest priority)
 */
export type PatternPriority = 'hand-crafted' | 'verified' | 'auto-generated';

/**
 * A translation of a pattern to a specific language.
 */
export interface Translation {
  id: number;
  codeExampleId: string;
  language: string;
  hyperscript: string;
  wordOrder: WordOrder;
  translationMethod: TranslationMethod;
  confidence: number;
  verifiedParses: boolean;
  verifiedExecutes: boolean;
  roleAlignmentScore: number | null; // Semantic role alignment with English (0-1)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Compute priority from translation properties.
 * hand-crafted > verified > auto-generated
 */
export function getTranslationPriority(translation: Translation): PatternPriority {
  if (translation.translationMethod === 'hand-crafted') {
    return 'hand-crafted';
  }
  if (translation.verifiedParses && translation.verifiedExecutes) {
    return 'verified';
  }
  return 'auto-generated';
}

/**
 * Translation with computed priority.
 */
export interface TranslationWithPriority extends Translation {
  priority: PatternPriority;
}

/**
 * Result of translation verification.
 */
export interface VerificationResult {
  translation: Translation;
  parseSuccess: boolean;
  executeSuccess: boolean;
  errorMessage: string | null;
  confidence: number;
  testedAt: Date;
}

/**
 * Test result for a pattern in a specific language.
 */
export interface PatternTestResult {
  id: number;
  patternId: string;
  language: string;
  testType: 'parse' | 'execute' | 'round-trip';
  success: boolean;
  errorMessage: string | null;
  testDate: Date;
}

/**
 * Result of round-trip verification (EN → Lang → Parse → Compare).
 */
export interface RoundTripResult {
  patternId: string;
  language: string;
  englishHyperscript: string;
  translatedHyperscript: string;
  englishAction: string;
  translatedAction: string;
  rolesMatch: boolean;
  missingRoles: string[];
  extraRoles: string[];
  success: boolean;
  errorMessage: string | null;
}

// =============================================================================
// LLM Types
// =============================================================================

/**
 * An LLM example (prompt/completion pair).
 */
export interface LLMExample {
  id: number;
  patternId: string;
  language: string;
  prompt: string;
  completion: string;
  qualityScore: number;
  usageCount: number;
  createdAt: Date;
}

// =============================================================================
// Semantic Role Types
// =============================================================================

// SemanticRole is imported from @hyperfixi/semantic
// See packages/semantic/src/types/grammar-types.ts for the canonical definition
import type { SemanticRole } from '@hyperfixi/semantic';
export type { SemanticRole };

/**
 * Role type classification.
 */
export type RoleType = 'selector' | 'literal' | 'reference' | 'expression' | 'keyword';

/**
 * A semantic role extracted from a pattern.
 */
export interface PatternRole {
  id: number;
  codeExampleId: string;
  commandIndex: number;
  role: SemanticRole;
  roleValue: string | null;
  roleType: RoleType | null;
  required: boolean;
}

/**
 * Result of role alignment validation for translations.
 */
export interface RoleAlignmentResult {
  translationId: number;
  patternId: string;
  language: string;
  alignmentScore: number;
  matchedRoles: SemanticRole[];
  missingRoles: SemanticRole[];
  extraRoles: SemanticRole[];
}

// =============================================================================
// API Types
// =============================================================================

export interface SearchOptions {
  language?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
  offset?: number;
}

export interface TestOptions {
  language?: string;
  browsers?: string[];
  runtimeVersion?: string;
}

export interface PatternStats {
  totalPatterns: number;
  totalTranslations: number;
  byLanguage: Record<string, { count: number; verifiedCount: number }>;
  byCategory: Record<string, number>;
  avgConfidence: number;
}

// =============================================================================
// Sync Types
// =============================================================================

export interface SyncOptions {
  dryRun?: boolean;
  verbose?: boolean;
  limit?: number;
  languages?: string[];
}

export interface SyncResult {
  totalExamples: number;
  successfulExamples: number;
  skippedExamples: number;
  totalTranslations: number;
  byLanguage: Record<string, number>;
}

export interface ValidationOptions {
  verbose?: boolean;
  languages?: string[];
}

export interface ValidationResult {
  total: number;
  passed: number;
  failed: number;
  byLanguage: Record<string, { passed: number; failed: number }>;
  failures: Array<{ language: string; hyperscript: string; error: string }>;
}

export interface DiscoveryResult {
  totalExamples: number;
  byComplexity: Record<ComplexityLevel, number>;
  parseable: number;
  notParseable: number;
  commandCoverage: Record<string, { total: number; parseable: number }>;
  gaps: string[];
}

// =============================================================================
// Language Documentation Types (from hyperscript-lsp)
// =============================================================================

/**
 * A hyperscript command definition.
 */
export interface Command {
  id: string;
  name: string;
  description: string | null;
  syntax: string | null;
  purpose: string | null;
  implicitTarget: string | null;
  implicitResultTarget: string | null;
  isBlocking: boolean;
  hasBody: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A hyperscript expression definition.
 */
export interface Expression {
  id: string;
  name: string;
  description: string | null;
  category: string;
  evaluatesToType: string | null;
  precedence: number | null;
  associativity: string | null;
  operators: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * An operator for an expression.
 */
export interface ExpressionOperator {
  id: string;
  expressionId: string;
  operator: string;
}

/**
 * A hyperscript keyword definition.
 */
export interface Keyword {
  id: string;
  name: string;
  description: string | null;
  contextOfUse: string | null;
  isOptional: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A hyperscript feature (top-level construct like on, init, behavior).
 */
export interface Feature {
  id: string;
  name: string;
  description: string | null;
  syntax: string | null;
  trigger: string | null;
  structureDescription: string | null;
  scopeImpact: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A special symbol (me, it, my, you, your).
 */
export interface SpecialSymbol {
  id: string;
  name: string;
  symbol: string;
  symbolType: string;
  description: string | null;
  typicalValue: string | null;
  scopeImplications: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Element type for searching across language elements.
 */
export type LanguageElementType =
  | 'command'
  | 'expression'
  | 'keyword'
  | 'feature'
  | 'special_symbol';

/**
 * A language element (union of all documentation types).
 */
export type LanguageElement =
  | { type: 'command'; element: Command }
  | { type: 'expression'; element: Expression }
  | { type: 'keyword'; element: Keyword }
  | { type: 'feature'; element: Feature }
  | { type: 'special_symbol'; element: SpecialSymbol };

/**
 * Statistics for language documentation.
 */
export interface LanguageDocsStats {
  commands: number;
  expressions: number;
  keywords: number;
  features: number;
  specialSymbols: number;
  expressionOperators: number;
}

// =============================================================================
// Connection Types
// =============================================================================

export interface ConnectionOptions {
  dbPath?: string;
  readonly?: boolean;
}

// =============================================================================
// Main API Interface
// =============================================================================

/**
 * Main API interface for the Patterns Reference system.
 */
export interface PatternsReference {
  // Query patterns
  getPatternById(id: string): Promise<Pattern | null>;
  getPatternsByCategory(category: string): Promise<Pattern[]>;
  getPatternsByCommand(command: string): Promise<Pattern[]>;
  searchPatterns(query: string, options?: SearchOptions): Promise<Pattern[]>;

  // Translations
  getTranslation(patternId: string, language: string): Promise<Translation | null>;
  getAllTranslations(patternId: string): Promise<Translation[]>;
  verifyTranslation(translation: Translation): Promise<VerificationResult>;

  // LLM support
  getLLMExamples(prompt: string, language?: string, limit?: number): Promise<LLMExample[]>;

  // Statistics
  getStats(): Promise<PatternStats>;

  // Connection
  close(): void;
}
