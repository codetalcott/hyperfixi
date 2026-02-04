/** Self-contained: South Asian languages (hi, bn) */
import '@lokascript/semantic/languages/hi';
import '@lokascript/semantic/languages/bn';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['hi', 'bn'];
import { autoRegister } from './shared';
autoRegister();
