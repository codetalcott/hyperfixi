/**
 * Dictionary Index
 *
 * Exports dictionaries for all supported languages.
 *
 * Strategy: Dictionaries are derived from semantic profiles where possible,
 * with fallbacks to manual definitions for categories not in profiles
 * (events, temporal, some values, attributes).
 *
 * The semantic package's language profiles are the single source of truth
 * for command/modifier/logical keyword translations.
 *
 * TRANSITION NOTE: Currently using full legacy overrides to preserve
 * backward compatibility. Once profiles and dictionaries are synchronized,
 * the legacy overrides can be reduced to only non-profile categories.
 */

import { Dictionary } from '../types';

// NOTE: Derivation infrastructure is ready but not yet active.
// The languageProfiles from @hyperfixi/semantic can be used with deriveFromProfile()
// once we're ready to transition away from legacy dictionaries.
// See ./derive.ts for the derivation utilities.

// Import legacy dictionaries for overrides
// These provide backward compatibility during the transition period
import { en as enLegacy } from './en';
import { es as esLegacy } from './es';
import { ko as koLegacy } from './ko';
import { zh as zhLegacy } from './zh';
import { fr as frLegacy } from './fr';
import { de as deLegacy } from './de';
import { ja as jaLegacy } from './ja';
import { ar as arLegacy } from './ar';
import { tr as trLegacy } from './tr';
import { id as idLegacy } from './id';
import { qu as quLegacy } from './qu';
import { sw as swLegacy } from './sw';
import { pt as ptLegacy } from './pt';
import { it as itLegacy } from './it';
import { vi as viLegacy } from './vi';

// =============================================================================
// Derived Dictionaries with Legacy Overrides
// =============================================================================

// For backward compatibility, we use full legacy overrides.
// This ensures no translation changes while establishing the derivation infrastructure.
// Future: Reduce overrides to only non-profile categories as profiles are synchronized.

/**
 * English dictionary - uses legacy values for full compatibility.
 */
export const en: Dictionary = enLegacy;

/**
 * Spanish dictionary - legacy overrides for compatibility.
 */
export const es: Dictionary = esLegacy;

/**
 * Japanese dictionary - legacy overrides for compatibility.
 */
export const ja: Dictionary = jaLegacy;

/**
 * Korean dictionary - legacy overrides for compatibility.
 */
export const ko: Dictionary = koLegacy;

/**
 * Chinese dictionary - legacy overrides for compatibility.
 */
export const zh: Dictionary = zhLegacy;

/**
 * French dictionary - legacy overrides for compatibility.
 */
export const fr: Dictionary = frLegacy;

/**
 * German dictionary - legacy overrides for compatibility.
 */
export const de: Dictionary = deLegacy;

/**
 * Arabic dictionary - legacy overrides for compatibility.
 */
export const ar: Dictionary = arLegacy;

/**
 * Turkish dictionary - legacy overrides for compatibility.
 */
export const tr: Dictionary = trLegacy;

/**
 * Indonesian dictionary - legacy overrides for compatibility.
 */
export const id: Dictionary = idLegacy;

/**
 * Portuguese dictionary - legacy overrides for compatibility.
 */
export const pt: Dictionary = ptLegacy;

/**
 * Quechua dictionary - legacy overrides for compatibility.
 */
export const qu: Dictionary = quLegacy;

/**
 * Swahili dictionary - legacy overrides for compatibility.
 */
export const sw: Dictionary = swLegacy;

/**
 * Italian dictionary - legacy overrides for compatibility.
 */
export const it: Dictionary = itLegacy;

/**
 * Vietnamese dictionary - legacy overrides for compatibility.
 */
export const vi: Dictionary = viLegacy;

// =============================================================================
// Dictionary Registry
// =============================================================================

/**
 * All available dictionaries indexed by locale code.
 */
export const dictionaries: Record<string, Dictionary> = {
  en,
  es,
  ko,
  zh,
  fr,
  de,
  ja,
  ar,
  tr,
  id,
  qu,
  sw,
  pt,
  it,
  vi,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all supported locale codes.
 */
export const supportedLocales = Object.keys(dictionaries);

/**
 * Check if a locale is supported.
 */
export const isLocaleSupported = (locale: string): boolean => {
  return locale in dictionaries;
};

/**
 * Get dictionary with fallback to another locale.
 */
export const getDictionary = (locale: string, fallback: string = 'en'): Dictionary | null => {
  return dictionaries[locale] || dictionaries[fallback] || null;
};

// =============================================================================
// Derivation Utilities (for future use)
// =============================================================================

/**
 * Re-export derivation utilities for external use.
 * These can be used to derive dictionaries from profiles when ready.
 */
export { deriveFromProfile, createEnglishDictionary, validateDictionary } from './derive';
