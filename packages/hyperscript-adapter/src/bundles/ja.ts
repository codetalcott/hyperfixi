/** Self-contained: Japanese (renders to English via custom renderer) */
import '@lokascript/semantic/languages/ja';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['ja'];
import { autoRegister } from './shared';
autoRegister();
