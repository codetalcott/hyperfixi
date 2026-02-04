/** Self-contained: Polish (renders to English via custom renderer) */
import '@lokascript/semantic/languages/pl';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['pl'];
import { autoRegister } from './shared';
autoRegister();
