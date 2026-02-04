/** Self-contained: Vietnamese (renders to English via custom renderer) */
import '@lokascript/semantic/languages/vi';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['vi'];
import { autoRegister } from './shared';
autoRegister();
