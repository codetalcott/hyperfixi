/** Self-contained: Ukrainian (renders to English via custom renderer) */
import '@lokascript/semantic/languages/uk';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['uk'];
import { autoRegister } from './shared';
autoRegister();
