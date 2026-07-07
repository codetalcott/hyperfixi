/**
 * BDD vocabularies + their injected grammar slices.
 *
 * Each language pairs a domain-authored {@link DomainVocabulary} (the structural
 * step keywords — the ONLY per-language authoring here) with the language's
 * grammar profile from `@lokascript/semantic` (word order). The framework bridge
 * (`buildPatternProfile`) combines the two in `../profiles`.
 *
 * BDD's tokenizers are custom `BaseTokenizer` subclasses (not migrated); this
 * vocab feeds only the pattern profiles. BDD's action/state/assertion
 * vocabulary lives in the renderer + mappings tables, outside the bridge.
 */

import type { DomainVocabulary, GrammarProfileSlice } from '@lokascript/framework';

import { englishProfile as enSlice } from '@lokascript/semantic/languages/en';
import { spanishProfile as esSlice } from '@lokascript/semantic/languages/es';
import { japaneseProfile as jaSlice } from '@lokascript/semantic/languages/ja';
import { arabicProfile as arSlice } from '@lokascript/semantic/languages/ar';
import { koreanProfile as koSlice } from '@lokascript/semantic/languages/ko';
import { chineseProfile as zhSlice } from '@lokascript/semantic/languages/zh';
import { turkishProfile as trSlice } from '@lokascript/semantic/languages/tr';
import { frenchProfile as frSlice } from '@lokascript/semantic/languages/fr';

import { enVocabulary } from './en';
import { esVocabulary } from './es';
import { jaVocabulary } from './ja';
import { arVocabulary } from './ar';
import { koVocabulary } from './ko';
import { zhVocabulary } from './zh';
import { trVocabulary } from './tr';
import { frVocabulary } from './fr';

export { enVocabulary } from './en';
export { esVocabulary } from './es';
export { jaVocabulary } from './ja';
export { arVocabulary } from './ar';
export { koVocabulary } from './ko';
export { zhVocabulary } from './zh';
export { trVocabulary } from './tr';
export { frVocabulary } from './fr';

export interface BDDLanguageSource {
  readonly slice: GrammarProfileSlice;
  readonly vocab: DomainVocabulary;
}

/** Grammar slice + BDD vocabulary per supported language. */
export const BDD_LANGUAGES: Readonly<Record<string, BDDLanguageSource>> = {
  en: { slice: enSlice, vocab: enVocabulary },
  es: { slice: esSlice, vocab: esVocabulary },
  ja: { slice: jaSlice, vocab: jaVocabulary },
  ar: { slice: arSlice, vocab: arVocabulary },
  ko: { slice: koSlice, vocab: koVocabulary },
  zh: { slice: zhSlice, vocab: zhVocabulary },
  tr: { slice: trSlice, vocab: trVocabulary },
  fr: { slice: frSlice, vocab: frVocabulary },
};
