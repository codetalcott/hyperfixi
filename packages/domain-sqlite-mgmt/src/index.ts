/**
 * @lokascript/domain-sqlite-mgmt — Multilingual SQLite Management DSL
 *
 * A domain DSL for SQLite database management operations built on
 * @lokascript/framework. Covers schema (DDL), indexing, views, pragmas,
 * administration, and transactions in 8 languages across SVO/SOV/VSO
 * word orders.
 *
 * @example
 * ```typescript
 * import { createSQLiteMgmtDSL } from '@lokascript/domain-sqlite-mgmt';
 *
 * const mgmt = createSQLiteMgmtDSL();
 *
 * // English (SVO)
 * mgmt.compile('create table users with id integer, name text', 'en');
 * // → { ok: true, code: 'CREATE TABLE users (id integer, name text)' }
 *
 * // Japanese (SOV)
 * mgmt.compile('users テーブル削除', 'ja');
 * // → { ok: true, code: 'DROP TABLE IF EXISTS users' }
 *
 * // Spanish (SVO)
 * mgmt.compile('crear tabla usuarios con id entero, nombre texto', 'es');
 *
 * // Arabic (VSO)
 * mgmt.compile('أنشئ جدول users مع id integer', 'ar');
 *
 * // Pragma operations
 * mgmt.compile('set journal_mode to wal', 'en');
 * // → { ok: true, code: 'PRAGMA journal_mode = wal' }
 *
 * // Admin
 * mgmt.compile('vacuum', 'en');
 * // → { ok: true, code: 'VACUUM' }
 *
 * // Transactions
 * mgmt.compile('begin', 'en');
 * // → { ok: true, code: 'BEGIN TRANSACTION' }
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import { allSchemas } from './schemas';
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
  EnglishMgmtTokenizer,
  SpanishMgmtTokenizer,
  JapaneseMgmtTokenizer,
  ArabicMgmtTokenizer,
  KoreanMgmtTokenizer,
  ChineseMgmtTokenizer,
  TurkishMgmtTokenizer,
  FrenchMgmtTokenizer,
} from './tokenizers';
import { sqliteMgmtCodeGenerator } from './generators/sqlite-generator';

/**
 * Create a multilingual SQLite management DSL instance with all 8 supported languages.
 */
export function createSQLiteMgmtDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'SQLite-Mgmt',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: EnglishMgmtTokenizer,
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: SpanishMgmtTokenizer,
        patternProfile: spanishProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: JapaneseMgmtTokenizer,
        patternProfile: japaneseProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: ArabicMgmtTokenizer,
        patternProfile: arabicProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: KoreanMgmtTokenizer,
        patternProfile: koreanProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: ChineseMgmtTokenizer,
        patternProfile: chineseProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: TurkishMgmtTokenizer,
        patternProfile: turkishProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: FrenchMgmtTokenizer,
        patternProfile: frenchProfile,
      },
    ],
    codeGenerator: sqliteMgmtCodeGenerator,
  });
}

// Re-export schemas for consumers who want to extend
export {
  createTableSchema,
  dropTableSchema,
  addColumnSchema,
  renameTableSchema,
} from './schemas/schema-ops';
export { createIndexSchema, dropIndexSchema } from './schemas/index-ops';
export { createViewSchema, dropViewSchema } from './schemas/view-ops';
export { pragmaGetSchema, pragmaSetSchema } from './schemas/pragma-ops';
export { vacuumSchema, analyzeSchema, attachSchema, detachSchema } from './schemas/admin-ops';
export { beginSchema, commitSchema, rollbackSchema } from './schemas/transaction-ops';
export { allSchemas } from './schemas';

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

export { sqliteMgmtCodeGenerator } from './generators/sqlite-generator';
export { renderSQLiteMgmt } from './generators/sqlite-renderer';

export {
  EnglishMgmtTokenizer,
  SpanishMgmtTokenizer,
  JapaneseMgmtTokenizer,
  ArabicMgmtTokenizer,
  KoreanMgmtTokenizer,
  ChineseMgmtTokenizer,
  TurkishMgmtTokenizer,
  FrenchMgmtTokenizer,
} from './tokenizers';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const sqliteMgmtScanConfig = {
  attributes: ['data-sqlite', '_sqlite'] as const,
  scriptTypes: ['text/sqlite-mgmt-dsl'] as const,
  defaultLanguage: 'en',
};
