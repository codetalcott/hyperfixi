/**
 * Patterns Reference Type Definitions
 */

import type { ActionType, SemanticRole } from '@hyperfixi/semantic';

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
  createdAt: Date;
  updatedAt: Date;
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
