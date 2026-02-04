/** Self-contained: Bengali (renders to English via custom renderer) */
import '@lokascript/semantic/languages/bn';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['bn'];
import { autoRegister } from './shared';
autoRegister();
