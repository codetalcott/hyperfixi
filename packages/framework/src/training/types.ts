/**
 * Training Data Types
 *
 * Types for generating (natural_language, LSE) training pairs from
 * domain schemas. Used for fine-tuning or few-shot prompting LLMs
 * to output valid LokaScript Explicit Syntax.
 */

import type { SemanticJSON } from '../ir/types';

// =============================================================================
// Training Pairs
// =============================================================================

/**
 * A single training pair: natural language ↔ explicit syntax.
 */
export interface TrainingPair {
  /** Unique identifier for deduplication */
  readonly id: string;

  /** Natural language form (e.g., "fetch /api/users as json into #list") */
  readonly natural: string;

  /** Language code (e.g., "en") */
  readonly language: string;

  /** LSE bracket syntax (e.g., "[fetch source:/api/users style:json destination:#list]") */
  readonly explicit: string;

  /** LLM-simplified JSON wire format */
  readonly json: SemanticJSON;

  /** Domain this pair belongs to */
  readonly domain: string;

  /** Command action */
  readonly action: string;

  /** How this pair was generated */
  readonly source: 'synthetic' | 'test' | 'compilation';

  /** Parse confidence (if from real parsing) */
  readonly confidence?: number;

  /** Quality score 0-1 for filtering */
  readonly quality: number;
}

// =============================================================================
// Synthesis Configuration
// =============================================================================

/**
 * Configuration for training data synthesis.
 */
export interface SynthesisConfig {
  /** Domain identifier */
  readonly domain: string;

  /** Maximum pairs per command */
  readonly maxPairsPerCommand?: number;

  /** Minimum quality threshold (0-1). Default: 0.5 */
  readonly minQuality?: number;

  /** Whether to shuffle role order for some examples. Default: true */
  readonly shuffleRoles?: boolean;

  /** Language codes to generate for. Default: ['en'] */
  readonly languages?: readonly string[];
}

/**
 * Result of training data synthesis.
 */
export interface SynthesisResult {
  /** Generated training pairs */
  readonly pairs: readonly TrainingPair[];

  /** Metadata about the synthesis */
  readonly metadata: SynthesisMetadata;
}

/**
 * Metadata about a synthesis run.
 */
export interface SynthesisMetadata {
  /** Domain the data was synthesized for */
  readonly domain: string;

  /** Number of command schemas processed */
  readonly commandCount: number;

  /** Total pairs generated */
  readonly pairCount: number;

  /** Pairs per source type */
  readonly bySource: Record<string, number>;

  /** Languages included */
  readonly languages: readonly string[];
}
