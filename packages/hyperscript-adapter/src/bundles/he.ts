/** Self-contained: Hebrew (renders to English via custom renderer) */
import '@lokascript/semantic/languages/he';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['he'];
import { autoRegister } from './shared';
autoRegister();
