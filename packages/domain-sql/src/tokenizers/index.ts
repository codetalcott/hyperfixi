/**
 * SQL Tokenizers
 *
 * Language-specific tokenizers, built through the framework↔semantic bridge:
 * `buildDomainTokenizer` derives direction, script handling (diacritic-safe
 * Latin identifiers, case sensitivity), particle keywords, and the
 * keyword-normalization profile from `@lokascript/semantic`'s language
 * profile; the domain's vocabulary (`../vocab`) supplies the SQL verbs and
 * connectives.
 *
 * Note: the bridge normalizes grammatical markers to *role names* via its
 * keyword profile (where the old hand-authored tokenizers normalized them to
 * English SQL keywords, e.g. `から` → `from`). Pattern matching compares
 * token values, so parsing is unaffected.
 */

import { buildDomainTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer } from '@lokascript/framework';
import { SQL_LANGUAGES } from '../vocab';

function tokenizerFor(code: string): LanguageTokenizer {
  const { slice, vocab } = SQL_LANGUAGES[code];
  return buildDomainTokenizer(slice, vocab);
}

export const EnglishSQLTokenizer: LanguageTokenizer = tokenizerFor('en');
export const SpanishSQLTokenizer: LanguageTokenizer = tokenizerFor('es');
export const JapaneseSQLTokenizer: LanguageTokenizer = tokenizerFor('ja');
export const ArabicSQLTokenizer: LanguageTokenizer = tokenizerFor('ar');
export const KoreanSQLTokenizer: LanguageTokenizer = tokenizerFor('ko');
export const ChineseSQLTokenizer: LanguageTokenizer = tokenizerFor('zh');
export const TurkishSQLTokenizer: LanguageTokenizer = tokenizerFor('tr');
export const FrenchSQLTokenizer: LanguageTokenizer = tokenizerFor('fr');
export const GermanSQLTokenizer: LanguageTokenizer = tokenizerFor('de');
export const PortugueseSQLTokenizer: LanguageTokenizer = tokenizerFor('pt');
export const RussianSQLTokenizer: LanguageTokenizer = tokenizerFor('ru');
