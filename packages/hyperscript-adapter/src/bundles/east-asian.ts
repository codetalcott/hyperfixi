/** Self-contained: East Asian languages (ja, ko, zh) */
import '@lokascript/semantic/languages/ja';
import '@lokascript/semantic/languages/ko';
import '@lokascript/semantic/languages/zh';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['ja', 'ko', 'zh'];
import { autoRegister } from './shared';
autoRegister();
