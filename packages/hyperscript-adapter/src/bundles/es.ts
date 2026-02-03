/** Self-contained: Spanish (renders to English via custom renderer) */
import '@lokascript/semantic/languages/es';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['es'];
import { autoRegister } from './shared';
autoRegister();
