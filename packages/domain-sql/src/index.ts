/**
 * @lokascript/domain-sql — Multilingual SQL DSL
 *
 * A proof-of-generality SQL domain built on @lokascript/framework.
 * Parses SQL queries written in English, Spanish, Japanese, or Arabic,
 * demonstrating that the framework supports SVO, SOV, and VSO word orders.
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
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import { allSchemas, selectSchema, insertSchema, updateSchema, deleteSchema } from './schemas';
import { englishProfile, spanishProfile, japaneseProfile, arabicProfile } from './profiles';
import {
  EnglishSQLTokenizer,
  SpanishSQLTokenizer,
  JapaneseSQLTokenizer,
  ArabicSQLTokenizer,
} from './tokenizers';
import { sqlCodeGenerator } from './generators/sql-generator';

/**
 * Create a multilingual SQL DSL instance with all 4 supported languages.
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
    ],
    codeGenerator: sqlCodeGenerator,
  });
}

// Re-export schemas for consumers who want to extend
export { allSchemas, selectSchema, insertSchema, updateSchema, deleteSchema };
export { englishProfile, spanishProfile, japaneseProfile, arabicProfile } from './profiles';
export { sqlCodeGenerator } from './generators/sql-generator';
export {
  EnglishSQLTokenizer,
  SpanishSQLTokenizer,
  JapaneseSQLTokenizer,
  ArabicSQLTokenizer,
} from './tokenizers';
