/**
 * LLM Prompt Generation Types
 *
 * Types for auto-generating LLM system prompts from CommandSchema[].
 * The prompt generator reads domain schemas and produces markdown
 * instructions that teach LLMs to output valid LSE bracket syntax
 * and/or LLM-simplified JSON.
 */

import type { CommandSchema } from '../schema/command-schema';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for generating an LLM system prompt from domain schemas.
 */
export interface PromptGeneratorConfig {
  /** Domain identifier (e.g., 'flow', 'sql', 'bdd') */
  readonly domain: string;

  /** Human-readable domain description */
  readonly description: string;

  /** Command schemas to document */
  readonly schemas: readonly CommandSchema[];

  /** What output format to teach the LLM. Default: 'both' */
  readonly outputFormat?: 'explicit' | 'json' | 'both';

  /** Number of examples to generate per command. Default: 2 */
  readonly examplesPerCommand?: number;

  /** Approximate token budget for truncation. Default: no limit */
  readonly maxTokens?: number;
}

// =============================================================================
// Output
// =============================================================================

/**
 * Section of a generated prompt, for partial inclusion.
 */
export interface PromptSection {
  /** Section identifier */
  readonly id: string;

  /** Human-readable title */
  readonly title: string;

  /** Markdown content */
  readonly content: string;

  /** Approximate token count (chars / 4 heuristic) */
  readonly approximateTokens: number;
}

/**
 * A complete generated system prompt with metadata.
 */
export interface GeneratedPrompt {
  /** Full system prompt as markdown */
  readonly text: string;

  /** Individual sections for partial inclusion */
  readonly sections: PromptSection[];

  /** Metadata about the generated prompt */
  readonly metadata: PromptMetadata;
}

/**
 * Metadata about a generated prompt.
 */
export interface PromptMetadata {
  /** Domain the prompt was generated for */
  readonly domain: string;

  /** Number of commands documented */
  readonly commandCount: number;

  /** Total number of roles across all commands */
  readonly roleCount: number;

  /** Approximate token count (chars / 4 heuristic) */
  readonly approximateTokens: number;
}
