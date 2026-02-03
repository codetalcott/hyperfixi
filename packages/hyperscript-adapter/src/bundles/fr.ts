/** Self-contained: French (renders to English via custom renderer) */
import '@lokascript/semantic/languages/fr';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['fr'];
import { autoRegister } from './shared';
autoRegister();
