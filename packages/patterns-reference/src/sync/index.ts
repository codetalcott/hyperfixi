/**
 * Sync Module
 *
 * Re-exports sync operations that were migrated from packages/semantic/scripts/.
 * These are typically run via CLI scripts rather than imported directly.
 */

// Note: The actual sync implementations remain in packages/semantic/scripts/
// for now, as they are Bun-specific and need direct database access.
// This module provides type-safe wrappers that can be used programmatically.

import type {
  SyncOptions,
  SyncResult,
  ValidationOptions,
  ValidationResult,
  DiscoveryResult,
} from '../types';

export type { SyncOptions, SyncResult, ValidationOptions, ValidationResult, DiscoveryResult };

/**
 * Sync translations from code_examples to pattern_translations.
 *
 * This is a placeholder - the actual implementation is in
 * packages/semantic/scripts/sync-lsp-translations.ts
 */
export async function syncTranslations(_options: SyncOptions = {}): Promise<SyncResult> {
  throw new Error(
    'syncTranslations should be run via: bun run packages/semantic/scripts/sync-lsp-translations.ts'
  );
}

/**
 * Validate all translations in the database.
 *
 * This is a placeholder - the actual implementation is in
 * packages/semantic/scripts/validate-translations.ts
 */
export async function validateAllTranslations(
  _options: ValidationOptions = {}
): Promise<ValidationResult> {
  throw new Error(
    'validateAllTranslations should be run via: bun run packages/semantic/scripts/validate-translations.ts'
  );
}

/**
 * Discover and analyze patterns in the database.
 *
 * This is a placeholder - the actual implementation is in
 * packages/semantic/scripts/pattern-discovery.ts
 */
export async function discoverPatterns(_verbose: boolean = false): Promise<DiscoveryResult> {
  throw new Error(
    'discoverPatterns should be run via: bun run packages/semantic/scripts/pattern-discovery.ts'
  );
}

/**
 * Seed LLM examples from verified translations.
 *
 * This is a placeholder - the actual implementation is in
 * packages/semantic/scripts/seed-llm-examples.ts
 */
export async function seedLLMExamples(_dryRun: boolean = false): Promise<{ count: number }> {
  throw new Error(
    'seedLLMExamples should be run via: bun run packages/semantic/scripts/seed-llm-examples.ts'
  );
}
