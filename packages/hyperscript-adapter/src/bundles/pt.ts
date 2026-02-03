/** Self-contained: Portuguese (renders to English via custom renderer) */
import '@lokascript/semantic/languages/pt';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['pt'];
import { autoRegister } from './shared';
autoRegister();
