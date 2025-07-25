// packages/i18n/src/index.ts

export * from './types';
export * from './translator';
export * from './dictionaries';

// Re-export key utilities
export { detectLocale } from './utils/locale';
export { tokenize } from './utils/tokenizer';
export { validate } from './validators';

// Plugin exports
export { hyperscriptI18nVitePlugin } from './plugins/vite';
export { HyperscriptI18nWebpackPlugin } from './plugins/webpack';

// Create and export default translator instance
import { HyperscriptTranslator } from './translator';
export const defaultTranslator = new HyperscriptTranslator({ locale: 'en' });
