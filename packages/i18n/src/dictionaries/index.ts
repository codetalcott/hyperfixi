// packages/i18n/src/dictionaries/index.ts

import { Dictionary } from '../types';
import { es } from './es';
import { ko } from './ko';
import { zh } from './zh';

export const dictionaries: Record<string, Dictionary> = {
  es,
  ko,
  zh,
};

// Export individual dictionaries for direct import
export { es } from './es';
export { ko } from './ko';
export { zh } from './zh';

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
