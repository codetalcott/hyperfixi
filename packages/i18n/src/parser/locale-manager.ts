// packages/i18n/src/parser/locale-manager.ts

import type { KeywordProvider } from './types';
import { createEnglishProvider } from './create-provider';

/**
 * LocaleManager - Centralized locale configuration for hyperscript parsing.
 *
 * Provides utilities for:
 * - Setting/getting the default locale
 * - Creating locale-aware parsers
 * - Runtime locale switching
 *
 * @example
 * ```typescript
 * import { LocaleManager } from '@hyperfixi/i18n/parser';
 * import { esKeywords, frKeywords } from '@hyperfixi/i18n/parser';
 *
 * // Register available locales
 * LocaleManager.register('es', esKeywords);
 * LocaleManager.register('fr', frKeywords);
 *
 * // Set default locale
 * LocaleManager.setDefault('es');
 *
 * // Get keyword provider for parsing
 * const provider = LocaleManager.get(); // Returns esKeywords
 * const frProvider = LocaleManager.get('fr'); // Returns frKeywords
 *
 * // Use with parser
 * const parser = new Parser({ keywords: LocaleManager.get() });
 * ```
 */
export class LocaleManager {
  private static providers = new Map<string, KeywordProvider>();
  private static defaultLocale: string = 'en';
  private static englishProvider: KeywordProvider = createEnglishProvider();

  /**
   * Register a locale provider.
   *
   * @param locale - The locale code (e.g., 'es', 'ja', 'fr')
   * @param provider - The KeywordProvider for this locale
   */
  static register(locale: string, provider: KeywordProvider): void {
    LocaleManager.providers.set(locale.toLowerCase(), provider);
  }

  /**
   * Unregister a locale provider.
   *
   * @param locale - The locale code to remove
   */
  static unregister(locale: string): void {
    LocaleManager.providers.delete(locale.toLowerCase());
  }

  /**
   * Set the default locale.
   *
   * @param locale - The locale code to use as default
   * @throws Error if the locale is not registered
   */
  static setDefault(locale: string): void {
    const normalizedLocale = locale.toLowerCase();
    if (normalizedLocale !== 'en' && !LocaleManager.providers.has(normalizedLocale)) {
      throw new Error(
        `Locale '${locale}' is not registered. ` +
          `Available locales: ${LocaleManager.getAvailable().join(', ')}`
      );
    }
    LocaleManager.defaultLocale = normalizedLocale;
  }

  /**
   * Get the current default locale.
   *
   * @returns The default locale code
   */
  static getDefault(): string {
    return LocaleManager.defaultLocale;
  }

  /**
   * Get a keyword provider for a locale.
   *
   * @param locale - The locale code (optional, defaults to the default locale)
   * @returns The KeywordProvider for the locale
   * @throws Error if the locale is not registered
   */
  static get(locale?: string): KeywordProvider {
    const targetLocale = (locale || LocaleManager.defaultLocale).toLowerCase();

    // English is always available
    if (targetLocale === 'en') {
      return LocaleManager.englishProvider;
    }

    const provider = LocaleManager.providers.get(targetLocale);
    if (!provider) {
      throw new Error(
        `Locale '${targetLocale}' is not registered. ` +
          `Available locales: ${LocaleManager.getAvailable().join(', ')}`
      );
    }

    return provider;
  }

  /**
   * Check if a locale is registered.
   *
   * @param locale - The locale code to check
   * @returns True if the locale is available
   */
  static has(locale: string): boolean {
    const normalizedLocale = locale.toLowerCase();
    return normalizedLocale === 'en' || LocaleManager.providers.has(normalizedLocale);
  }

  /**
   * Get all available locale codes.
   *
   * @returns Array of locale codes
   */
  static getAvailable(): string[] {
    return ['en', ...Array.from(LocaleManager.providers.keys())];
  }

  /**
   * Reset the LocaleManager to its initial state.
   * Useful for testing.
   */
  static reset(): void {
    LocaleManager.providers.clear();
    LocaleManager.defaultLocale = 'en';
  }

  /**
   * Register all built-in locales at once.
   *
   * @example
   * ```typescript
   * import { LocaleManager } from '@hyperfixi/i18n/parser';
   * import { esKeywords, jaKeywords, frKeywords, deKeywords, arKeywords } from '@hyperfixi/i18n/parser';
   *
   * LocaleManager.registerAll({
   *   es: esKeywords,
   *   ja: jaKeywords,
   *   fr: frKeywords,
   *   de: deKeywords,
   *   ar: arKeywords,
   * });
   * ```
   */
  static registerAll(providers: Record<string, KeywordProvider>): void {
    for (const [locale, provider] of Object.entries(providers)) {
      LocaleManager.register(locale, provider);
    }
  }
}

/**
 * Quick utility to detect the browser's preferred locale and return
 * a matching provider, falling back to English.
 *
 * @returns The KeywordProvider for the browser's locale or English
 *
 * @example
 * ```typescript
 * import { detectBrowserLocale } from '@hyperfixi/i18n/parser';
 * import { Parser } from '@hyperfixi/core';
 *
 * // Auto-detect and use browser locale
 * const parser = new Parser({ keywords: detectBrowserLocale() });
 * ```
 */
export function detectBrowserLocale(): KeywordProvider {
  if (typeof navigator === 'undefined') {
    return LocaleManager.get('en');
  }

  // Get browser languages in order of preference
  const languages = navigator.languages || [navigator.language];

  for (const lang of languages) {
    // Extract the base language code (e.g., 'es-MX' -> 'es')
    const baseLocale = lang.split('-')[0].toLowerCase();

    if (LocaleManager.has(baseLocale)) {
      return LocaleManager.get(baseLocale);
    }
  }

  // Fallback to English
  return LocaleManager.get('en');
}
