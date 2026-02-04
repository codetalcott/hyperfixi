/** Self-contained: Thai (renders to English via custom renderer) */
import '@lokascript/semantic/languages/th';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['th'];
import { autoRegister } from './shared';
autoRegister();
