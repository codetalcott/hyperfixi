/** Self-contained: Turkish (renders to English via custom renderer) */
import '@lokascript/semantic/languages/tr';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['tr'];
import { autoRegister } from './shared';
autoRegister();
