/**
 * Todo Tokenizers
 *
 * Language-specific tokenizers, built through the framework↔semantic bridge:
 * `buildDomainTokenizer` derives direction, script handling (diacritic-safe
 * Latin identifiers, case sensitivity), particle keywords, and the
 * keyword-normalization profile from `@lokascript/semantic`'s language profile;
 * the domain's vocabulary (`../vocab`) supplies the todo verbs and marker words.
 *
 * `includeOperators: false` matches the pre-bridge tokenizers (todo input has
 * no operator tokens). Case-insensitivity is script-derived by the bridge
 * (latin → true, CJK/Arabic/Hangul → false), matching the old per-language
 * settings.
 */

import { buildDomainTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer } from '@lokascript/framework';
import { TODO_LANGUAGES } from '../vocab';

function tokenizerFor(code: string): LanguageTokenizer {
  const { slice, vocab } = TODO_LANGUAGES[code];
  return buildDomainTokenizer(slice, vocab, { includeOperators: false });
}

export const EnglishTodoTokenizer: LanguageTokenizer = tokenizerFor('en');
export const SpanishTodoTokenizer: LanguageTokenizer = tokenizerFor('es');
export const JapaneseTodoTokenizer: LanguageTokenizer = tokenizerFor('ja');
export const ArabicTodoTokenizer: LanguageTokenizer = tokenizerFor('ar');
export const KoreanTodoTokenizer: LanguageTokenizer = tokenizerFor('ko');
export const ChineseTodoTokenizer: LanguageTokenizer = tokenizerFor('zh');
export const TurkishTodoTokenizer: LanguageTokenizer = tokenizerFor('tr');
export const FrenchTodoTokenizer: LanguageTokenizer = tokenizerFor('fr');
