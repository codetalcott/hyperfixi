/** Self-contained: English-only (renders to English via custom renderer) */
import '@lokascript/semantic/languages/en';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['en'];
import { autoRegister } from './shared';
autoRegister();
