/** Self-contained: Arabic (renders to English via custom renderer) */
import '@lokascript/semantic/languages/ar';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['ar'];
import { autoRegister } from './shared';
autoRegister();
