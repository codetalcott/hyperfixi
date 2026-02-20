/**
 * @lokascript/domain-sql — Multilingual SQL DSL
 *
 * A proof-of-generality SQL domain built on @lokascript/framework.
 * Parses SQL queries written in 8 languages, demonstrating that the
 * framework supports SVO, SOV, and VSO word orders.
 *
 * @example
 * ```typescript
 * import { createSQLDSL } from '@lokascript/domain-sql';
 *
 * const sql = createSQLDSL();
 *
 * // English (SVO)
 * sql.compile('select name from users', 'en');
 * // → { ok: true, code: 'SELECT name FROM users' }
 *
 * // Spanish (SVO)
 * sql.compile('seleccionar nombre de usuarios', 'es');
 * // → { ok: true, code: 'SELECT nombre FROM usuarios' }
 *
 * // Japanese (SOV)
 * sql.compile('users から name 選択', 'ja');
 * // → { ok: true, code: 'SELECT name FROM users' }
 *
 * // Arabic (VSO)
 * sql.compile('اختر name من users', 'ar');
 * // → { ok: true, code: 'SELECT name FROM users' }
 *
 * // Korean (SOV)
 * sql.compile('users 에서 name 선택', 'ko');
 *
 * // Chinese (SVO)
 * sql.compile('查询 name 从 users', 'zh');
 *
 * // Turkish (SOV)
 * sql.compile('users den name seç', 'tr');
 *
 * // French (SVO)
 * sql.compile('sélectionner name de users', 'fr');
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import { allSchemas, selectSchema, insertSchema, updateSchema, deleteSchema } from './schemas';
import {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
} from './profiles';
import {
  EnglishSQLTokenizer,
  SpanishSQLTokenizer,
  JapaneseSQLTokenizer,
  ArabicSQLTokenizer,
  KoreanSQLTokenizer,
  ChineseSQLTokenizer,
  TurkishSQLTokenizer,
  FrenchSQLTokenizer,
} from './tokenizers';
import { sqlCodeGenerator } from './generators/sql-generator';

/**
 * Create a multilingual SQL DSL instance with all 8 supported languages.
 */
export function createSQLDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'SQL',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: EnglishSQLTokenizer,
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: SpanishSQLTokenizer,
        patternProfile: spanishProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: JapaneseSQLTokenizer,
        patternProfile: japaneseProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: ArabicSQLTokenizer,
        patternProfile: arabicProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: KoreanSQLTokenizer,
        patternProfile: koreanProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: ChineseSQLTokenizer,
        patternProfile: chineseProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: TurkishSQLTokenizer,
        patternProfile: turkishProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: FrenchSQLTokenizer,
        patternProfile: frenchProfile,
      },
    ],
    codeGenerator: sqlCodeGenerator,
  });
}

// Re-export schemas for consumers who want to extend
export { allSchemas, selectSchema, insertSchema, updateSchema, deleteSchema };
export {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
} from './profiles';
export { sqlCodeGenerator } from './generators/sql-generator';
export { renderSQL } from './generators/sql-renderer';
export {
  EnglishSQLTokenizer,
  SpanishSQLTokenizer,
  JapaneseSQLTokenizer,
  ArabicSQLTokenizer,
  KoreanSQLTokenizer,
  ChineseSQLTokenizer,
  TurkishSQLTokenizer,
  FrenchSQLTokenizer,
} from './tokenizers';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const sqlScanConfig = {
  attributes: ['data-sql', '_sql'] as const,
  scriptTypes: ['text/sql-dsl'] as const,
  defaultLanguage: 'en',
};
