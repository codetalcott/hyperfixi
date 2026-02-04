/** Self-contained: Swahili (renders to English via custom renderer) */
import '@lokascript/semantic/languages/sw';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['sw'];
import { autoRegister } from './shared';
autoRegister();
