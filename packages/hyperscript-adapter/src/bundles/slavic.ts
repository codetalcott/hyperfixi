/** Self-contained: Slavic languages (ru, pl, uk) */
import '@lokascript/semantic/languages/ru';
import '@lokascript/semantic/languages/pl';
import '@lokascript/semantic/languages/uk';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['ru', 'pl', 'uk'];
import { autoRegister } from './shared';
autoRegister();
