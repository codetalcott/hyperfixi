/** Self-contained: Tagalog (renders to English via custom renderer) */
import '@lokascript/semantic/languages/tl';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['tl'];
import { autoRegister } from './shared';
autoRegister();
