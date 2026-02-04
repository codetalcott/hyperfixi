/** Self-contained: Quechua (renders to English via custom renderer) */
import '@lokascript/semantic/languages/qu';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['qu'];
import { autoRegister } from './shared';
autoRegister();
