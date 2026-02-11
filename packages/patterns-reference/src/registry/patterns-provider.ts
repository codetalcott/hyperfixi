/**
 * Patterns Provider
 *
 * Provides patterns from the patterns-reference database to the semantic registry.
 * This enables runtime pattern matching using database-backed patterns.
 *
 * @module @hyperfixi/patterns-reference/registry
 */

import { getDatabase } from '../database/connection';
import type { Pattern, Translation, ConnectionOptions } from '../types';
import { getPatternsByCommand, getAllPatterns } from '../api/patterns';
import { getTranslationsByLanguage, getVerifiedTranslations } from '../api/translations';

// =============================================================================
// Types
// =============================================================================

/**
 * Pattern source interface for external pattern providers.
 */
export interface PatternsSource {
  /** Unique identifier for the source */
  id: string;
  /** Human-readable name */
  name: string;
  /** Get patterns for a specific language */
  getPatternsForLanguage(language: string): Promise<PatternEntry[]>;
  /** Get patterns for a specific command */
  getPatternsForCommand(command: string, language?: string): Promise<PatternEntry[]>;
  /** Check if source has patterns for a language */
  hasPatterns(language: string): Promise<boolean>;
  /** Get all supported languages */
  getSupportedLanguages(): Promise<string[]>;
}

/**
 * Pattern entry from the database.
 */
export interface PatternEntry {
  /** Pattern ID */
  id: string;
  /** The hyperscript code */
  code: string;
  /** Primary command (toggle, add, remove, etc.) */
  command: string | null;
  /** Language code */
  language: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether the pattern has been verified to parse correctly */
  verified: boolean;
  /** Pattern title/description */
  title?: string;
  /** Pattern category */
  category?: string;
}

// =============================================================================
// Patterns Provider Implementation
// =============================================================================

/**
 * Database-backed patterns provider.
 */
export class DatabasePatternsProvider implements PatternsSource {
  public readonly id = 'patterns-reference-db';
  public readonly name = 'Patterns Reference Database';

  private options: ConnectionOptions;
  private languageCache: Map<string, PatternEntry[]> = new Map();
  private supportedLanguagesCache: string[] | null = null;

  constructor(options?: ConnectionOptions) {
    this.options = options || {};
  }

  /**
   * Get patterns for a specific language.
   */
  async getPatternsForLanguage(language: string): Promise<PatternEntry[]> {
    // Check cache
    const cached = this.languageCache.get(language);
    if (cached) {
      return cached;
    }

    try {
      // Get verified translations for this language
      const translations = await getVerifiedTranslations(language, 1000, this.options);

      const patterns: PatternEntry[] = translations.map(t => ({
        id: t.codeExampleId,
        code: t.hyperscript,
        command: this.extractCommand(t.hyperscript),
        language: t.language,
        confidence: t.confidence,
        verified: t.verifiedParses,
      }));

      this.languageCache.set(language, patterns);
      return patterns;
    } catch (error) {
      console.warn(
        `[PatternsProvider] Failed to get patterns for ${language}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get patterns for a specific command.
   */
  async getPatternsForCommand(command: string, language?: string): Promise<PatternEntry[]> {
    try {
      const patterns = await getPatternsByCommand(command, this.options);

      const entries: PatternEntry[] = patterns.map(p => ({
        id: p.id,
        code: p.rawCode,
        command: p.primaryCommand,
        language: language || 'en',
        confidence: 1.0,
        verified: true,
        title: p.title,
        category: p.category || undefined,
      }));

      return entries;
    } catch (error) {
      console.warn(
        `[PatternsProvider] Failed to get patterns for command ${command}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Check if source has patterns for a language.
   */
  async hasPatterns(language: string): Promise<boolean> {
    const patterns = await this.getPatternsForLanguage(language);
    return patterns.length > 0;
  }

  /**
   * Get all supported languages.
   */
  async getSupportedLanguages(): Promise<string[]> {
    if (this.supportedLanguagesCache) {
      return this.supportedLanguagesCache;
    }

    try {
      const db = getDatabase({ ...this.options, readonly: true });
      const result = db
        .prepare(
          `
        SELECT DISTINCT language FROM pattern_translations
        WHERE verified_parses = 1
      `
        )
        .all() as { language: string }[];

      this.supportedLanguagesCache = result.map(r => r.language);
      return this.supportedLanguagesCache;
    } catch (error) {
      console.warn(
        '[PatternsProvider] Failed to get supported languages:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Clear the pattern cache.
   */
  clearCache(): void {
    this.languageCache.clear();
    this.supportedLanguagesCache = null;
  }

  /**
   * Extract primary command from hyperscript code.
   */
  private extractCommand(code: string): string | null {
    const match = code.match(/^(?:on\s+\w+\s+)?(\w+)/i);
    if (match) {
      const keyword = match[1].toLowerCase();
      const commands = [
        'toggle',
        'add',
        'remove',
        'put',
        'set',
        'show',
        'hide',
        'wait',
        'log',
        'send',
        'fetch',
        'call',
        'trigger',
        'transition',
        'increment',
        'decrement',
      ];
      if (commands.includes(keyword)) {
        return keyword;
      }
    }
    return null;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

let defaultProvider: DatabasePatternsProvider | null = null;

/**
 * Get the default patterns provider instance.
 */
export function getDefaultProvider(options?: ConnectionOptions): DatabasePatternsProvider {
  if (!defaultProvider) {
    defaultProvider = new DatabasePatternsProvider(options);
  }
  return defaultProvider;
}

/**
 * Create a new patterns provider instance.
 */
export function createPatternsProvider(options?: ConnectionOptions): DatabasePatternsProvider {
  return new DatabasePatternsProvider(options);
}

/**
 * Reset the default provider (for testing).
 */
export function resetDefaultProvider(): void {
  if (defaultProvider) {
    defaultProvider.clearCache();
    defaultProvider = null;
  }
}
