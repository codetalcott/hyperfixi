/** Self-contained: Hindi (renders to English via custom renderer) */
import '@lokascript/semantic/languages/hi';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['hi'];
import { autoRegister } from './shared';
autoRegister();
