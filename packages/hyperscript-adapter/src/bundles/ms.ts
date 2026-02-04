/** Self-contained: Malay (renders to English via custom renderer) */
import '@lokascript/semantic/languages/ms';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['ms'];
import { autoRegister } from './shared';
autoRegister();
