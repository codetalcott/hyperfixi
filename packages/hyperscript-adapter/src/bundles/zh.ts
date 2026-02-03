/** Self-contained: Chinese (renders to English via custom renderer) */
import '@lokascript/semantic/languages/zh';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['zh'];
import { autoRegister } from './shared';
autoRegister();
