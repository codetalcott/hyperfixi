// packages/i18n/src/dictionaries/index.ts

import { Dictionary } from '../types';
import { en } from './en';
import { es } from './es';
import { ko } from './ko';
import { zh } from './zh';
import { fr } from './fr';
import { de } from './de';
import { ja } from './ja';
import { ar } from './ar';
import { tr } from './tr';
import { id } from './id';
import { qu } from './qu';
import { sw } from './sw';
import { pt } from './pt';

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
};

// Export individual dictionaries for direct import
export { en } from './en';
export { es } from './es';
export { ko } from './ko';
export { zh } from './zh';
export { fr } from './fr';
export { de } from './de';
export { ja } from './ja';
export { ar } from './ar';
export { tr } from './tr';
export { id } from './id';
export { qu } from './qu';
export { sw } from './sw';
export { pt } from './pt';

// Helper to get all supported locales
export const supportedLocales = Object.keys(dictionaries);

// Helper to check if a locale is supported
export const isLocaleSupported = (locale: string): boolean => {
  return locale in dictionaries;
};

// Helper to get dictionary with fallback
export const getDictionary = (locale: string, fallback: string = 'en'): Dictionary | null => {
  return dictionaries[locale] || dictionaries[fallback] || null;
};
