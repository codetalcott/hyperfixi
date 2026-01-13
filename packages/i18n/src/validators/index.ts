// packages/i18n/src/validators/index.ts

import {
  Dictionary,
  DICTIONARY_CATEGORIES,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';
import { RequiredCategories, RequiredKeys } from './schema';

export function validate(dictionary: Dictionary, locale: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const coverage = {
    total: 0,
    translated: 0,
    missing: [] as string[],
  };

  // Check required categories
  for (const category of RequiredCategories) {
    if (!(category in dictionary)) {
      errors.push({
        type: 'missing',
        key: category,
        message: `Missing required category: ${category}`,
      });
    }
  }

  // Check required keys in each category
  for (const [category, requiredKeys] of Object.entries(RequiredKeys)) {
    const categoryDict = dictionary[category as keyof Dictionary];

    if (!categoryDict) continue;

    for (const key of requiredKeys) {
      coverage.total++;

      if (!(key in categoryDict)) {
        errors.push({
          type: 'missing',
          key: `${category}.${key}`,
          message: `Missing required key: ${key} in category ${category}`,
        });
        coverage.missing.push(`${category}.${key}`);
      } else if (!categoryDict[key] || categoryDict[key].trim() === '') {
        errors.push({
          type: 'invalid',
          key: `${category}.${key}`,
          message: `Empty translation for key: ${key} in category ${category}`,
        });
      } else {
        coverage.translated++;
      }
    }
  }

  // Check for duplicates using type-safe category iteration
  const seen = new Map<string, string>();

  for (const category of DICTIONARY_CATEGORIES) {
    const translations = dictionary[category];
    if (!translations) continue;

    for (const [key, value] of Object.entries(translations)) {
      if (seen.has(value)) {
        warnings.push({
          type: 'inconsistent',
          key: `${category}.${key}`,
          message: `Duplicate translation "${value}" also used for ${seen.get(value)}`,
        });
      } else {
        seen.set(value, `${category}.${key}`);
      }
    }
  }

  // Language-specific validations
  validateLocaleSpecific(dictionary, locale, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    coverage,
  };
}

function validateLocaleSpecific(
  dictionary: Dictionary,
  locale: string,
  _errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Spanish-specific validations
  if (locale === 'es') {
    // Check for gender consistency
    if (dictionary.values?.true === 'verdadero' && dictionary.values?.false === 'falso') {
      // Both masculine, good
    } else if (dictionary.values?.true === 'verdadera' && dictionary.values?.false === 'falsa') {
      // Both feminine, good
    } else if (dictionary.values?.true && dictionary.values?.false) {
      warnings.push({
        type: 'inconsistent',
        key: 'values.true/false',
        message: 'Gender inconsistency between true/false translations',
      });
    }
  }

  // Korean-specific validations
  if (locale === 'ko') {
    // Check for consistent honorific levels
    const formalEndings = ['습니다', '세요'];
    const informalEndings = ['다', '어', '아'];

    let formalCount = 0;
    let informalCount = 0;

    for (const category of DICTIONARY_CATEGORIES) {
      const translations = dictionary[category];
      if (!translations) continue;
      for (const value of Object.values(translations)) {
        if (formalEndings.some(ending => value.endsWith(ending))) {
          formalCount++;
        }
        if (informalEndings.some(ending => value.endsWith(ending))) {
          informalCount++;
        }
      }
    }

    if (formalCount > 0 && informalCount > 0) {
      warnings.push({
        type: 'inconsistent',
        key: 'global',
        message: 'Mixed formal and informal speech levels',
      });
    }
  }

  // Chinese-specific validations
  if (locale === 'zh' || locale === 'zh-TW') {
    // Check for simplified vs traditional consistency
    const simplified = ['设', '获', '显', '发'];
    const traditional = ['設', '獲', '顯', '發'];

    let hasSimplified = false;
    let hasTraditional = false;

    for (const category of DICTIONARY_CATEGORIES) {
      const translations = dictionary[category];
      if (!translations) continue;
      for (const value of Object.values(translations)) {
        if (simplified.some(char => value.includes(char))) {
          hasSimplified = true;
        }
        if (traditional.some(char => value.includes(char))) {
          hasTraditional = true;
        }
      }
    }

    if (hasSimplified && hasTraditional) {
      warnings.push({
        type: 'inconsistent',
        key: 'global',
        message: 'Mixed simplified and traditional Chinese characters',
      });
    }
  }
}
