// packages/i18n/src/index.ts

export * from './types';
export * from './translator';
export * from './dictionaries';

// Parser integration for multilingual hyperscript
export * from './parser';

// Re-export key utilities
export { detectLocale, getBrowserLocales, isRTL } from './utils/locale';
export { tokenize } from './utils/tokenizer';
export { validate } from './validators';

// Plugin exports
export { hyperscriptI18nVitePlugin } from './plugins/vite';
export { HyperscriptI18nWebpackPlugin } from './plugins/webpack';

// SSR integration
export {
  SSRLocaleManager,
  createExpressI18nMiddleware,
  withI18n,
} from './ssr-integration';
export type { SSRLocaleContext, SSRLocaleOptions } from './ssr-integration';

// Pluralization
export {
  pluralRules,
  getPlural,
  PluralAwareTranslator,
  pluralTimeExpressions,
} from './pluralization';
export type { PluralRule, PluralForms } from './pluralization';

// Formatting
export {
  NumberFormatter,
  DateFormatter,
  LocaleFormatter,
  getFormatter,
  formatForLocale,
} from './formatting';
export type {
  NumberFormatOptions,
  DateFormatOptions,
  RelativeTimeFormatOptions,
} from './formatting';

// Runtime i18n
export {
  RuntimeI18nManager,
  initializeI18n,
  getI18n,
  runtimeI18n,
} from './runtime';
export type { RuntimeI18nOptions } from './runtime';

// Create and export default translator instance
import { HyperscriptTranslator } from './translator';
export const defaultTranslator = new HyperscriptTranslator({ locale: 'en' });

// Create and export default runtime instance for browser usage
import { RuntimeI18nManager } from './runtime';
export const defaultRuntime = new RuntimeI18nManager({ locale: 'en' });

// Enhanced I18n Implementation (following enhanced pattern)
export {
  TypedI18nContextImplementation,
  createI18nContext,
  createEnhancedI18n,
  enhancedI18nImplementation,
  EnhancedI18nInputSchema,
  EnhancedI18nOutputSchema
} from './enhanced-i18n';
export type { EnhancedI18nInput, EnhancedI18nOutput } from './enhanced-i18n';
