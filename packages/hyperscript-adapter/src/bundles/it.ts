/** Self-contained: Italian (renders to English via custom renderer) */
import '@lokascript/semantic/languages/it';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['it'];
import { autoRegister } from './shared';
autoRegister();
