/**
 * Semantic Bridge
 *
 * Connects the patterns-reference database to the semantic registry,
 * enabling runtime pattern matching using database-backed patterns.
 *
 * @example
 * ```typescript
 * import { initializeSemanticIntegration } from '@hyperfixi/patterns-reference';
 *
 * // Initialize integration with semantic parser
 * await initializeSemanticIntegration();
 *
 * // Now the semantic parser can access patterns from the database
 * import { parse } from '@hyperfixi/semantic';
 * const result = parse('toggle .active', 'en');
 * ```
 *
 * @module @hyperfixi/patterns-reference/semantic-bridge
 */

import {
  createPatternsProvider,
  type DatabasePatternsProvider,
} from './registry/patterns-provider';
import type { ConnectionOptions } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for semantic integration initialization.
 */
export interface SemanticIntegrationOptions extends ConnectionOptions {
  /** Whether to register as the default provider */
  registerAsDefault?: boolean;
  /** Custom provider instance to use */
  provider?: DatabasePatternsProvider;
}

/**
 * Result of initialization.
 */
export interface IntegrationResult {
  success: boolean;
  provider: DatabasePatternsProvider;
  registeredWith: 'semantic' | 'standalone';
  error?: string;
}

// =============================================================================
// Bridge State
// =============================================================================

let bridgeInitialized = false;
let bridgeProvider: DatabasePatternsProvider | null = null;

// =============================================================================
// Integration Functions
// =============================================================================

/**
 * Initialize semantic integration.
 *
 * This registers the patterns-reference database as an external pattern source
 * with the @hyperfixi/semantic registry, enabling runtime pattern matching.
 *
 * @param options - Integration options
 * @returns Integration result
 *
 * @example
 * ```typescript
 * const result = await initializeSemanticIntegration();
 * if (result.success) {
 *   console.log('Patterns available in semantic parser');
 * }
 * ```
 */
export async function initializeSemanticIntegration(
  options?: SemanticIntegrationOptions
): Promise<IntegrationResult> {
  // Create or use provided provider
  const provider = options?.provider || createPatternsProvider(options);
  bridgeProvider = provider;

  try {
    // Try to register with @hyperfixi/semantic
    // Use 'any' to avoid type errors with dynamic imports
    const semantic = (await import('@hyperfixi/semantic')) as any;

    if (typeof semantic.registerPatternsSource === 'function') {
      semantic.registerPatternsSource(provider);
      bridgeInitialized = true;

      return {
        success: true,
        provider,
        registeredWith: 'semantic',
      };
    } else {
      // Semantic package doesn't have registerPatternsSource yet
      console.warn(
        '[SemanticBridge] @hyperfixi/semantic does not export registerPatternsSource. ' +
          'Running in standalone mode.'
      );

      return {
        success: true,
        provider,
        registeredWith: 'standalone',
      };
    }
  } catch (error) {
    // @hyperfixi/semantic not available
    console.warn(
      '[SemanticBridge] @hyperfixi/semantic not available:',
      error instanceof Error ? error.message : String(error)
    );

    return {
      success: true,
      provider,
      registeredWith: 'standalone',
      error: '@hyperfixi/semantic not available',
    };
  }
}

/**
 * Check if semantic integration is initialized.
 */
export function isSemanticIntegrationInitialized(): boolean {
  return bridgeInitialized;
}

/**
 * Get the bridge provider instance.
 */
export function getBridgeProvider(): DatabasePatternsProvider | null {
  return bridgeProvider;
}

/**
 * Uninitialize semantic integration.
 * Useful for testing or cleanup.
 */
export async function uninitializeSemanticIntegration(): Promise<void> {
  if (!bridgeProvider) {
    return;
  }

  try {
    const semantic = (await import('@hyperfixi/semantic')) as any;

    if (typeof semantic.unregisterPatternsSource === 'function') {
      semantic.unregisterPatternsSource(bridgeProvider.id);
    }
  } catch {
    // Ignore errors during cleanup
  }

  bridgeProvider.clearCache();
  bridgeProvider = null;
  bridgeInitialized = false;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Query patterns from the database for a specific language.
 * Works regardless of whether semantic integration is initialized.
 *
 * @param language - Language code
 * @returns Array of pattern entries
 */
export async function queryPatterns(language: string) {
  const provider = bridgeProvider || createPatternsProvider();
  return provider.getPatternsForLanguage(language);
}

/**
 * Query patterns from the database for a specific command.
 *
 * @param command - Command name (e.g., 'toggle', 'add')
 * @param language - Optional language filter
 * @returns Array of pattern entries
 */
export async function queryPatternsForCommand(command: string, language?: string) {
  const provider = bridgeProvider || createPatternsProvider();
  return provider.getPatternsForCommand(command, language);
}

/**
 * Get supported languages from the database.
 *
 * @returns Array of language codes
 */
export async function getSupportedLanguages(): Promise<string[]> {
  const provider = bridgeProvider || createPatternsProvider();
  return provider.getSupportedLanguages();
}
