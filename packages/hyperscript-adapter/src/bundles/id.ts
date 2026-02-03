/** Self-contained: Indonesian (renders to English via custom renderer) */
import '@lokascript/semantic/languages/id';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['id'];
import { autoRegister } from './shared';
autoRegister();
