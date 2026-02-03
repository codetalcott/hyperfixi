/** Self-contained: German (renders to English via custom renderer) */
import '@lokascript/semantic/languages/de';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['de'];
import { autoRegister } from './shared';
autoRegister();
