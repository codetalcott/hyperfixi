/** Self-contained: Russian (renders to English via custom renderer) */
import '@lokascript/semantic/languages/ru';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['ru'];
import { autoRegister } from './shared';
autoRegister();
