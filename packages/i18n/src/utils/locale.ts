// packages/i18n/src/utils/locale.ts

import { dictionaries } from '../dictionaries';
import { DICTIONARY_CATEGORIES } from '../types';

export interface LocaleInfo {
  code: string;
  language: string;
  region?: string;
  script?: string;
}

/**
 * Parse a locale string into its components
 * Examples: 'en-US', 'zh-Hans-CN', 'es-419'
 */
export function parseLocale(locale: string): LocaleInfo {
  const parts = locale.split('-');
  const info: LocaleInfo = {
    code: locale,
    language: parts[0].toLowerCase()
  };

  if (parts.length > 1) {
    // Check if second part is a script (4 letters, first capitalized)
    if (parts[1].length === 4 && /^[A-Z][a-z]{3}$/.test(parts[1])) {
      info.script = parts[1];
      if (parts[2]) {
        info.region = parts[2].toUpperCase();
      }
    } else {
      info.region = parts[1].toUpperCase();
    }
  }

  return info;
}

/**
 * Detect the language of hyperscript text
 */
export function detectLocale(text: string, supportedLocales: string[]): string {
  const scores = new Map<string, number>();

  // Initialize scores
  supportedLocales.forEach(locale => scores.set(locale, 0));

  // Count keyword matches for each locale using type-safe iteration
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    if (!supportedLocales.includes(locale)) continue;

    let score = 0;

    // Check all categories
    for (const category of DICTIONARY_CATEGORIES) {
      const translations = dictionary[category];
      for (const keyword of Object.values(translations)) {
        // Skip empty or single-character keywords (too ambiguous for detection)
        if (!keyword || keyword.length < 2) continue;

        // Use word boundary matching for accuracy
        const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
    }

    scores.set(locale, score);
  }

  // Find locale with highest score
  let maxScore = 0;
  let detectedLocale = 'en'; // Default to English

  scores.forEach((score, locale) => {
    if (score > maxScore) {
      maxScore = score;
      detectedLocale = locale;
    }
  });

  return detectedLocale;
}

/**
 * Get the best matching locale from available locales
 */
export function getBestMatchingLocale(
  requestedLocale: string,
  availableLocales: string[]
): string | null {
  // Exact match
  if (availableLocales.includes(requestedLocale)) {
    return requestedLocale;
  }

  const requested = parseLocale(requestedLocale);

  // Try language-only match
  const languageMatch = availableLocales.find(locale => {
    const available = parseLocale(locale);
    return available.language === requested.language;
  });

  if (languageMatch) {
    return languageMatch;
  }

  // Try language-script match
  if (requested.script) {
    const scriptMatch = availableLocales.find(locale => {
      const available = parseLocale(locale);
      return available.language === requested.language && 
             available.script === requested.script;
    });

    if (scriptMatch) {
      return scriptMatch;
    }
  }

  return null;
}

/**
 * Get user's preferred locales from browser
 */
export function getBrowserLocales(): string[] {
  if (typeof window === 'undefined') {
    return ['en'];
  }

  const locales: string[] = [];

  // Modern browser API
  if (navigator.languages && navigator.languages.length > 0) {
    locales.push(...navigator.languages);
  }

  // Fallback to single language
  if (navigator.language) {
    locales.push(navigator.language);
  }

  // Legacy IE
  if ((navigator as any).userLanguage) {
    locales.push((navigator as any).userLanguage);
  }

  // Remove duplicates and return
  return [...new Set(locales)];
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format a locale for display
 */
export function formatLocaleName(locale: string): string {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Español',
    ko: '한국어',
    zh: '中文',
    'zh-TW': '繁體中文',
    ja: '日本語',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
    hi: 'हिन्दी',
    ar: 'العربية'
  };

  return names[locale] || locale;
}

/**
 * Check if a locale uses RTL writing
 */
export function isRTL(locale: string): boolean {
  const rtlLocales = ['ar', 'he', 'fa', 'ur', 'yi', 'ji', 'ku', 'dv'];
  const info = parseLocale(locale);
  return rtlLocales.includes(info.language);
}
