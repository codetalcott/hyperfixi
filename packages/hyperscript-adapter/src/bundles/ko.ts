/** Self-contained: Korean (renders to English via custom renderer) */
import '@lokascript/semantic/languages/ko';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['ko'];
import { autoRegister } from './shared';
autoRegister();
