/** Self-contained: Southeast Asian languages (id, ms, tl, th, vi) */
import '@lokascript/semantic/languages/id';
import '@lokascript/semantic/languages/ms';
import '@lokascript/semantic/languages/tl';
import '@lokascript/semantic/languages/th';
import '@lokascript/semantic/languages/vi';
export { plugin, preprocess, resolveLanguage } from './shared';
export const supportedLanguages = ['id', 'ms', 'tl', 'th', 'vi'];
import { autoRegister } from './shared';
autoRegister();
