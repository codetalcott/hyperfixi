/**
 * Dictionary Index
 *
 * Exports dictionaries for all supported languages.
 * Each dictionary maps English canonical keywords to locale-specific translations
 * across 8 categories: commands, modifiers, events, logical, temporal, values,
 * attributes, and expressions.
 *
 * Derivation utilities (deriveFromProfile, createEnglishDictionary) are available
 * for generating dictionaries from semantic language profiles. See ./derive.ts.
 */

import { Dictionary } from '../types';

// Import per-language dictionaries
import { en as enDict } from './en';
import { es as esDict } from './es';
import { ko as koDict } from './ko';
import { zh as zhDict } from './zh';
import { fr as frDict } from './fr';
import { de as deDict } from './de';
import { ja as jaDict } from './ja';
import { ar as arDict } from './ar';
import { tr as trDict } from './tr';
import { id as idDict } from './id';
import { qu as quDict } from './qu';
import { sw as swDict } from './sw';
import { pt as ptDict } from './pt';
import { it as itDict } from './it';
import { vi as viDict } from './vi';
import { pl as plDict } from './pl';
import { russianDictionary as ruDict } from './ru';
import { ukrainianDictionary as ukDict } from './uk';
import { hindiDictionary as hiDict } from './hi';
import { bengaliDictionary as bnDict } from './bn';
import { thaiDictionary as thDict } from './th';
import { malayDictionary as msDict } from './ms';
import { tagalogDictionary as tlDict } from './tl';
import { he as heDict } from './he';

// =============================================================================
// Dictionary Exports
// =============================================================================

/** English dictionary */
export const en: Dictionary = enDict;
/** Spanish dictionary */
export const es: Dictionary = esDict;
/** Japanese dictionary */
export const ja: Dictionary = jaDict;
/** Korean dictionary */
export const ko: Dictionary = koDict;
/** Chinese dictionary */
export const zh: Dictionary = zhDict;
/** French dictionary */
export const fr: Dictionary = frDict;
/** German dictionary */
export const de: Dictionary = deDict;
/** Arabic dictionary */
export const ar: Dictionary = arDict;
/** Turkish dictionary */
export const tr: Dictionary = trDict;
/** Indonesian dictionary */
export const id: Dictionary = idDict;
/** Portuguese dictionary */
export const pt: Dictionary = ptDict;
/** Quechua dictionary */
export const qu: Dictionary = quDict;
/** Swahili dictionary */
export const sw: Dictionary = swDict;
/** Italian dictionary */
export const it: Dictionary = itDict;
/** Vietnamese dictionary */
export const vi: Dictionary = viDict;
/** Polish dictionary */
export const pl: Dictionary = plDict;
/** Russian dictionary */
export const ru: Dictionary = ruDict;
/** Ukrainian dictionary */
export const uk: Dictionary = ukDict;
/** Hindi dictionary */
export const hi: Dictionary = hiDict;
/** Bengali dictionary */
export const bn: Dictionary = bnDict;
/** Thai dictionary */
export const th: Dictionary = thDict;
/** Malay dictionary */
export const ms: Dictionary = msDict;
/** Tagalog dictionary */
export const tl: Dictionary = tlDict;
/** Hebrew dictionary */
export const he: Dictionary = heDict;

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
  pl,
  ru,
  uk,
  hi,
  bn,
  th,
  ms,
  tl,
  he,
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
// Derivation Utilities
// =============================================================================

/**
 * Re-export derivation utilities for generating dictionaries from semantic profiles.
 */
export { deriveFromProfile, createEnglishDictionary, validateDictionary } from './derive';
