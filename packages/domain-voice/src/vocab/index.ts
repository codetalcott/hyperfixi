/**
 * Voice vocabularies + their injected grammar slices.
 *
 * Each language pairs a domain-authored {@link DomainVocabulary} (voice verbs +
 * marker/direction/target words — the ONLY per-language authoring) with the
 * language's grammar profile from `@lokascript/semantic` (word order, markers,
 * particles, script). The framework bridge (`buildPatternProfile` /
 * `buildDomainTokenizer`) combines the two in `../profiles` and `../tokenizers`.
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
import { germanProfile as deSlice } from '@lokascript/semantic/languages/de';
import { portugueseProfile as ptSlice } from '@lokascript/semantic/languages/pt';
import { russianProfile as ruSlice } from '@lokascript/semantic/languages/ru';

import { enVocabulary } from './en';
import { esVocabulary } from './es';
import { jaVocabulary } from './ja';
import { arVocabulary } from './ar';
import { koVocabulary } from './ko';
import { zhVocabulary } from './zh';
import { trVocabulary } from './tr';
import { frVocabulary } from './fr';
import { deVocabulary } from './de';
import { ptVocabulary } from './pt';
import { ruVocabulary } from './ru';
import { withBehaviorVerbs } from './behavior-verbs';

export { enVocabulary } from './en';
export { esVocabulary } from './es';
export { jaVocabulary } from './ja';
export { arVocabulary } from './ar';
export { koVocabulary } from './ko';
export { zhVocabulary } from './zh';
export { trVocabulary } from './tr';
export { frVocabulary } from './fr';
export { deVocabulary } from './de';
export { ptVocabulary } from './pt';
export { ruVocabulary } from './ru';
export { SCHEMA_OWNED_MARKERS } from './shared';

export interface VoiceLanguageSource {
  readonly slice: GrammarProfileSlice;
  readonly vocab: DomainVocabulary;
}

/**
 * Grammar slice + voice vocabulary per supported language.
 *
 * Each vocab is augmented with the UI-behavior verbs (toggle/add/remove/show/
 * hide) sourced from its own grammar slice via {@link withBehaviorVerbs} — the
 * raw slice import is passed (it still carries `.keywords`, which the widened
 * `GrammarProfileSlice` type drops). Hand-authored voice verbs win on collision.
 */
export const VOICE_LANGUAGES: Readonly<Record<string, VoiceLanguageSource>> = {
  en: { slice: enSlice, vocab: withBehaviorVerbs(enSlice, enVocabulary) },
  es: { slice: esSlice, vocab: withBehaviorVerbs(esSlice, esVocabulary) },
  ja: { slice: jaSlice, vocab: withBehaviorVerbs(jaSlice, jaVocabulary) },
  ar: { slice: arSlice, vocab: withBehaviorVerbs(arSlice, arVocabulary) },
  ko: { slice: koSlice, vocab: withBehaviorVerbs(koSlice, koVocabulary) },
  zh: { slice: zhSlice, vocab: withBehaviorVerbs(zhSlice, zhVocabulary) },
  tr: { slice: trSlice, vocab: withBehaviorVerbs(trSlice, trVocabulary) },
  fr: { slice: frSlice, vocab: withBehaviorVerbs(frSlice, frVocabulary) },
  // Bridge-era languages (arc Phase 2 expansion) — one vocab file each.
  de: { slice: deSlice, vocab: withBehaviorVerbs(deSlice, deVocabulary) },
  pt: { slice: ptSlice, vocab: withBehaviorVerbs(ptSlice, ptVocabulary) },
  ru: { slice: ruSlice, vocab: withBehaviorVerbs(ruSlice, ruVocabulary) },
};
