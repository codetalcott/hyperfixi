/**
 * SQLite Management Domain Tests
 *
 * Validates the multilingual SQLite management DSL across 8 languages
 * (EN, ES, JA, AR, KO, ZH, TR, FR) covering SVO, SOV, and VSO word orders,
 * with compilation assertions, role verification, renderer round-trips,
 * and edge cases across all 6 command categories.
 *
 * NOTE: Compound commands use hyphenated keywords for Latin/Arabic scripts
 * (e.g., 'create-table') and concatenated characters for CJK scripts
 * (e.g., 'テーブル作成'). This is a framework constraint: keywords must
 * be single tokens.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createSQLiteMgmtDSL, renderSQLiteMgmt } from '../index';
import { sqliteMgmtCodeGenerator } from '../generators/sqlite-generator';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

describe('SQLite Management Domain', () => {
  let mgmt: MultilingualDSL;

  beforeAll(() => {
    mgmt = createSQLiteMgmtDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 8 languages', () => {
      const languages = mgmt.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toContain('ko');
      expect(languages).toContain('zh');
      expect(languages).toContain('tr');
      expect(languages).toContain('fr');
      expect(languages).toHaveLength(8);
    });

    it('should reject unsupported language', () => {
      expect(() => mgmt.parse('create-table users with id integer', 'de')).toThrow();
    });
  });

  // ===========================================================================
  // English (SVO) — Schema Operations
  // ===========================================================================

  describe('English (SVO) — Schema', () => {
    it('should parse CREATE TABLE', () => {
      const node = mgmt.parse('create-table users with id integer', 'en');
      expect(node.action).toBe('create-table');
      expect(node.roles.has('table')).toBe(true);
      expect(node.roles.has('columns')).toBe(true);
    });

    it('should extract CREATE TABLE role values', () => {
      const node = mgmt.parse('create-table users with id integer', 'en');
      expect(extractRoleValue(node, 'table')).toBe('users');
    });

    it('should compile CREATE TABLE to SQL', () => {
      const result = mgmt.compile('create-table users with id integer', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('CREATE TABLE');
      expect(result.code).toContain('users');
    });

    it('should parse DROP TABLE', () => {
      const node = mgmt.parse('drop-table users', 'en');
      expect(node.action).toBe('drop-table');
      expect(node.roles.has('table')).toBe(true);
    });

    it('should compile DROP TABLE to SQL', () => {
      const result = mgmt.compile('drop-table users', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('DROP TABLE');
      expect(result.code).toContain('users');
    });

    it('should parse ADD COLUMN', () => {
      const node = mgmt.parse('add-column email to users', 'en');
      expect(node.action).toBe('add-column');
      expect(node.roles.has('column')).toBe(true);
      expect(node.roles.has('table')).toBe(true);
    });

    it('should compile ADD COLUMN to SQL', () => {
      const result = mgmt.compile('add-column email to users', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('ALTER TABLE');
      expect(result.code).toContain('ADD COLUMN');
    });

    it('should parse RENAME TABLE', () => {
      const node = mgmt.parse('rename-table users to accounts', 'en');
      expect(node.action).toBe('rename-table');
      expect(node.roles.has('table')).toBe(true);
      expect(node.roles.has('new-name')).toBe(true);
    });

    it('should compile RENAME TABLE to SQL', () => {
      const result = mgmt.compile('rename-table users to accounts', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('ALTER TABLE');
      expect(result.code).toContain('RENAME TO');
    });

    it('should validate correct schema command', () => {
      const result = mgmt.validate('create-table users with id integer', 'en');
      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // English — Index Operations
  // ===========================================================================

  describe('English — Index', () => {
    it('should parse CREATE INDEX', () => {
      const node = mgmt.parse('create-index on users column email', 'en');
      expect(node.action).toBe('create-index');
      expect(node.roles.has('table')).toBe(true);
      expect(node.roles.has('column')).toBe(true);
    });

    it('should compile CREATE INDEX to SQL', () => {
      const result = mgmt.compile('create-index on users column email', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('CREATE INDEX');
      expect(result.code).toContain('ON');
    });

    it('should parse DROP INDEX', () => {
      const node = mgmt.parse('drop-index idx_users_email', 'en');
      expect(node.action).toBe('drop-index');
      expect(node.roles.has('index')).toBe(true);
    });

    it('should compile DROP INDEX to SQL', () => {
      const result = mgmt.compile('drop-index idx_users_email', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('DROP INDEX');
    });
  });

  // ===========================================================================
  // English — View Operations
  // ===========================================================================

  describe('English — View', () => {
    it('should parse CREATE VIEW', () => {
      const node = mgmt.parse('create-view active_users as select_all', 'en');
      expect(node.action).toBe('create-view');
      expect(node.roles.has('view')).toBe(true);
      expect(node.roles.has('query')).toBe(true);
    });

    it('should compile CREATE VIEW to SQL', () => {
      const result = mgmt.compile('create-view active_users as select_all', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('CREATE VIEW');
    });

    it('should parse DROP VIEW', () => {
      const node = mgmt.parse('drop-view active_users', 'en');
      expect(node.action).toBe('drop-view');
      expect(node.roles.has('view')).toBe(true);
    });

    it('should compile DROP VIEW to SQL', () => {
      const result = mgmt.compile('drop-view active_users', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('DROP VIEW');
    });
  });

  // ===========================================================================
  // English — Pragma Operations
  // ===========================================================================

  describe('English — Pragma', () => {
    it('should parse PRAGMA GET', () => {
      const node = mgmt.parse('get journal_mode', 'en');
      expect(node.action).toBe('pragma-get');
      expect(node.roles.has('pragma')).toBe(true);
    });

    it('should compile PRAGMA GET to SQL', () => {
      const result = mgmt.compile('get journal_mode', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('PRAGMA');
      expect(result.code).toContain('journal_mode');
    });

    it('should parse PRAGMA GET with target', () => {
      const node = mgmt.parse('get table_info for users', 'en');
      expect(node.action).toBe('pragma-get');
      expect(node.roles.has('pragma')).toBe(true);
      expect(node.roles.has('target')).toBe(true);
    });

    it('should compile PRAGMA GET with target', () => {
      const result = mgmt.compile('get table_info for users', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('PRAGMA');
      expect(result.code).toContain('table_info');
    });

    it('should parse PRAGMA SET', () => {
      const node = mgmt.parse('set journal_mode to wal', 'en');
      expect(node.action).toBe('pragma-set');
      expect(node.roles.has('pragma')).toBe(true);
      expect(node.roles.has('value')).toBe(true);
    });

    it('should compile PRAGMA SET to SQL', () => {
      const result = mgmt.compile('set journal_mode to wal', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('PRAGMA');
      expect(result.code).toContain('journal_mode');
      expect(result.code).toContain('=');
      expect(result.code).toContain('wal');
    });
  });

  // ===========================================================================
  // English — Admin Operations
  // ===========================================================================

  describe('English — Admin', () => {
    it('should parse VACUUM', () => {
      const node = mgmt.parse('vacuum', 'en');
      expect(node.action).toBe('vacuum');
    });

    it('should compile VACUUM to SQL', () => {
      const result = mgmt.compile('vacuum', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('VACUUM');
    });

    it('should parse ANALYZE', () => {
      const node = mgmt.parse('analyze users', 'en');
      expect(node.action).toBe('analyze');
      expect(node.roles.has('target')).toBe(true);
    });

    it('should compile ANALYZE to SQL', () => {
      const result = mgmt.compile('analyze users', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('ANALYZE');
    });

    it('should parse ATTACH', () => {
      const node = mgmt.parse('attach backupdb as backup', 'en');
      expect(node.action).toBe('attach');
      expect(node.roles.has('path')).toBe(true);
      expect(node.roles.has('alias')).toBe(true);
    });

    it('should compile ATTACH to SQL', () => {
      const result = mgmt.compile('attach backupdb as backup', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('ATTACH DATABASE');
    });

    it('should parse DETACH', () => {
      const node = mgmt.parse('detach backup', 'en');
      expect(node.action).toBe('detach');
      expect(node.roles.has('alias')).toBe(true);
    });

    it('should compile DETACH to SQL', () => {
      const result = mgmt.compile('detach backup', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('DETACH DATABASE');
    });
  });

  // ===========================================================================
  // English — Transaction Operations
  // ===========================================================================

  describe('English — Transaction', () => {
    it('should parse BEGIN', () => {
      const node = mgmt.parse('begin', 'en');
      expect(node.action).toBe('begin');
    });

    it('should compile BEGIN to SQL', () => {
      const result = mgmt.compile('begin', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('BEGIN TRANSACTION');
    });

    it('should parse BEGIN with mode', () => {
      const node = mgmt.parse('begin exclusive', 'en');
      expect(node.action).toBe('begin');
    });

    it('should parse COMMIT', () => {
      const node = mgmt.parse('commit', 'en');
      expect(node.action).toBe('commit');
    });

    it('should compile COMMIT to SQL', () => {
      const result = mgmt.compile('commit', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('COMMIT');
    });

    it('should parse ROLLBACK', () => {
      const node = mgmt.parse('rollback', 'en');
      expect(node.action).toBe('rollback');
    });

    it('should compile ROLLBACK to SQL', () => {
      const result = mgmt.compile('rollback', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('ROLLBACK');
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('should parse Spanish CREATE TABLE', () => {
      const node = mgmt.parse('crear-tabla usuarios con id entero', 'es');
      expect(node.action).toBe('create-table');
      expect(node.roles.has('table')).toBe(true);
      expect(node.roles.has('columns')).toBe(true);
    });

    it('should compile Spanish CREATE TABLE to SQL', () => {
      const result = mgmt.compile('crear-tabla usuarios con id entero', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('CREATE TABLE');
    });

    it('should parse Spanish DROP TABLE', () => {
      const node = mgmt.parse('eliminar-tabla usuarios', 'es');
      expect(node.action).toBe('drop-table');
    });

    it('should parse Spanish VACUUM', () => {
      const node = mgmt.parse('vaciar', 'es');
      expect(node.action).toBe('vacuum');
    });

    it('should parse Spanish BEGIN', () => {
      const node = mgmt.parse('iniciar', 'es');
      expect(node.action).toBe('begin');
    });

    it('should parse Spanish COMMIT', () => {
      const node = mgmt.parse('confirmar', 'es');
      expect(node.action).toBe('commit');
    });

    it('should parse Spanish ROLLBACK', () => {
      const node = mgmt.parse('revertir', 'es');
      expect(node.action).toBe('rollback');
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('should parse Japanese DROP TABLE (SOV: object before verb)', () => {
      const node = mgmt.parse('users テーブル削除', 'ja');
      expect(node.action).toBe('drop-table');
      expect(node.roles.has('table')).toBe(true);
    });

    it('should compile Japanese DROP TABLE to SQL', () => {
      const result = mgmt.compile('users テーブル削除', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('DROP TABLE');
    });

    it('should parse Japanese VACUUM', () => {
      const node = mgmt.parse('バキューム', 'ja');
      expect(node.action).toBe('vacuum');
    });

    it('should compile Japanese VACUUM to SQL', () => {
      const result = mgmt.compile('バキューム', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('VACUUM');
    });

    it('should parse Japanese BEGIN', () => {
      const node = mgmt.parse('開始', 'ja');
      expect(node.action).toBe('begin');
    });

    it('should parse Japanese COMMIT', () => {
      const node = mgmt.parse('コミット', 'ja');
      expect(node.action).toBe('commit');
    });

    it('should parse Japanese ROLLBACK', () => {
      const node = mgmt.parse('ロールバック', 'ja');
      expect(node.action).toBe('rollback');
    });
  });

  // ===========================================================================
  // Arabic (VSO)
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('should parse Arabic CREATE TABLE (VSO: verb first)', () => {
      const node = mgmt.parse('أنشئ-جدول users مع id', 'ar');
      expect(node.action).toBe('create-table');
      expect(node.roles.has('table')).toBe(true);
    });

    it('should compile Arabic CREATE TABLE to SQL', () => {
      const result = mgmt.compile('أنشئ-جدول users مع id', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('CREATE TABLE');
    });

    it('should parse Arabic DROP TABLE', () => {
      const node = mgmt.parse('احذف-جدول users', 'ar');
      expect(node.action).toBe('drop-table');
    });

    it('should parse Arabic VACUUM', () => {
      const node = mgmt.parse('فرّغ', 'ar');
      expect(node.action).toBe('vacuum');
    });

    it('should parse Arabic BEGIN', () => {
      const node = mgmt.parse('ابدأ', 'ar');
      expect(node.action).toBe('begin');
    });

    it('should parse Arabic COMMIT', () => {
      const node = mgmt.parse('أكّد', 'ar');
      expect(node.action).toBe('commit');
    });
  });

  // ===========================================================================
  // Korean (SOV)
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('should parse Korean DROP TABLE', () => {
      const node = mgmt.parse('users 테이블삭제', 'ko');
      expect(node.action).toBe('drop-table');
      expect(node.roles.has('table')).toBe(true);
    });

    it('should compile Korean DROP TABLE to SQL', () => {
      const result = mgmt.compile('users 테이블삭제', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('DROP TABLE');
    });

    it('should parse Korean VACUUM', () => {
      const node = mgmt.parse('정리', 'ko');
      expect(node.action).toBe('vacuum');
    });

    it('should parse Korean BEGIN', () => {
      const node = mgmt.parse('시작', 'ko');
      expect(node.action).toBe('begin');
    });

    it('should parse Korean COMMIT', () => {
      const node = mgmt.parse('커밋', 'ko');
      expect(node.action).toBe('commit');
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('should parse Chinese CREATE TABLE', () => {
      const node = mgmt.parse('创建表 users 包含 id', 'zh');
      expect(node.action).toBe('create-table');
      expect(node.roles.has('table')).toBe(true);
    });

    it('should compile Chinese CREATE TABLE to SQL', () => {
      const result = mgmt.compile('创建表 users 包含 id', 'zh');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('CREATE TABLE');
    });

    it('should parse Chinese VACUUM', () => {
      const node = mgmt.parse('清理', 'zh');
      expect(node.action).toBe('vacuum');
    });

    it('should parse Chinese BEGIN', () => {
      const node = mgmt.parse('开始', 'zh');
      expect(node.action).toBe('begin');
    });

    it('should parse Chinese COMMIT', () => {
      const node = mgmt.parse('提交', 'zh');
      expect(node.action).toBe('commit');
    });
  });

  // ===========================================================================
  // Turkish (SOV)
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('should parse Turkish DROP TABLE', () => {
      const node = mgmt.parse('users tablo-kaldır', 'tr');
      expect(node.action).toBe('drop-table');
      expect(node.roles.has('table')).toBe(true);
    });

    it('should compile Turkish DROP TABLE to SQL', () => {
      const result = mgmt.compile('users tablo-kaldır', 'tr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('DROP TABLE');
    });

    it('should parse Turkish VACUUM', () => {
      const node = mgmt.parse('sıkıştır', 'tr');
      expect(node.action).toBe('vacuum');
    });

    it('should parse Turkish BEGIN', () => {
      const node = mgmt.parse('başla', 'tr');
      expect(node.action).toBe('begin');
    });

    it('should parse Turkish COMMIT', () => {
      const node = mgmt.parse('onayla', 'tr');
      expect(node.action).toBe('commit');
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('should parse French CREATE TABLE', () => {
      const node = mgmt.parse('créer-table users avec id', 'fr');
      expect(node.action).toBe('create-table');
      expect(node.roles.has('table')).toBe(true);
    });

    it('should compile French CREATE TABLE to SQL', () => {
      const result = mgmt.compile('créer-table users avec id', 'fr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('CREATE TABLE');
    });

    it('should parse French DROP TABLE', () => {
      const node = mgmt.parse('supprimer-table users', 'fr');
      expect(node.action).toBe('drop-table');
    });

    it('should parse French VACUUM', () => {
      const node = mgmt.parse('nettoyer', 'fr');
      expect(node.action).toBe('vacuum');
    });

    it('should parse French BEGIN', () => {
      const node = mgmt.parse('commencer', 'fr');
      expect(node.action).toBe('begin');
    });

    it('should parse French COMMIT', () => {
      const node = mgmt.parse('valider', 'fr');
      expect(node.action).toBe('commit');
    });
  });

  // ===========================================================================
  // Cross-Language Semantic Equivalence
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('should parse DROP TABLE across all 8 languages to same action', () => {
      const nodes = [
        mgmt.parse('drop-table users', 'en'),
        mgmt.parse('eliminar-tabla usuarios', 'es'),
        mgmt.parse('users テーブル削除', 'ja'),
        mgmt.parse('احذف-جدول users', 'ar'),
        mgmt.parse('users 테이블삭제', 'ko'),
        mgmt.parse('删除表 users', 'zh'),
        mgmt.parse('users tablo-kaldır', 'tr'),
        mgmt.parse('supprimer-table users', 'fr'),
      ];
      for (const node of nodes) {
        expect(node.action).toBe('drop-table');
        expect(node.roles.has('table')).toBe(true);
      }
    });

    it('should parse VACUUM across all 8 languages', () => {
      const nodes = [
        mgmt.parse('vacuum', 'en'),
        mgmt.parse('vaciar', 'es'),
        mgmt.parse('バキューム', 'ja'),
        mgmt.parse('فرّغ', 'ar'),
        mgmt.parse('정리', 'ko'),
        mgmt.parse('清理', 'zh'),
        mgmt.parse('sıkıştır', 'tr'),
        mgmt.parse('nettoyer', 'fr'),
      ];
      for (const node of nodes) {
        expect(node.action).toBe('vacuum');
      }
    });

    it('should compile VACUUM from all 8 languages to same SQL', () => {
      const results = [
        mgmt.compile('vacuum', 'en'),
        mgmt.compile('vaciar', 'es'),
        mgmt.compile('バキューム', 'ja'),
        mgmt.compile('فرّغ', 'ar'),
        mgmt.compile('정리', 'ko'),
        mgmt.compile('清理', 'zh'),
        mgmt.compile('sıkıştır', 'tr'),
        mgmt.compile('nettoyer', 'fr'),
      ];
      for (const result of results) {
        expect(result.ok).toBe(true);
        expect(result.code).toBe('VACUUM');
      }
    });

    it('should compile BEGIN from all 8 languages', () => {
      const results = [
        mgmt.compile('begin', 'en'),
        mgmt.compile('iniciar', 'es'),
        mgmt.compile('開始', 'ja'),
        mgmt.compile('ابدأ', 'ar'),
        mgmt.compile('시작', 'ko'),
        mgmt.compile('开始', 'zh'),
        mgmt.compile('başla', 'tr'),
        mgmt.compile('commencer', 'fr'),
      ];
      for (const result of results) {
        expect(result.ok).toBe(true);
        expect(result.code).toBe('BEGIN TRANSACTION');
      }
    });

    it('should compile COMMIT from all 8 languages', () => {
      const results = [
        mgmt.compile('commit', 'en'),
        mgmt.compile('confirmar', 'es'),
        mgmt.compile('コミット', 'ja'),
        mgmt.compile('أكّد', 'ar'),
        mgmt.compile('커밋', 'ko'),
        mgmt.compile('提交', 'zh'),
        mgmt.compile('onayla', 'tr'),
        mgmt.compile('valider', 'fr'),
      ];
      for (const result of results) {
        expect(result.ok).toBe(true);
        expect(result.code).toBe('COMMIT');
      }
    });

    it('should compile ROLLBACK from all 8 languages', () => {
      const results = [
        mgmt.compile('rollback', 'en'),
        mgmt.compile('revertir', 'es'),
        mgmt.compile('ロールバック', 'ja'),
        mgmt.compile('تراجع', 'ar'),
        mgmt.compile('롤백', 'ko'),
        mgmt.compile('回滚', 'zh'),
        mgmt.compile('geri-al', 'tr'),
        mgmt.compile('annuler', 'fr'),
      ];
      for (const result of results) {
        expect(result.ok).toBe(true);
        expect(result.code).toBe('ROLLBACK');
      }
    });

    it('should compile DROP TABLE from all 8 languages', () => {
      const results = [
        mgmt.compile('drop-table users', 'en'),
        mgmt.compile('eliminar-tabla usuarios', 'es'),
        mgmt.compile('users テーブル削除', 'ja'),
        mgmt.compile('احذف-جدول users', 'ar'),
        mgmt.compile('users 테이블삭제', 'ko'),
        mgmt.compile('删除表 users', 'zh'),
        mgmt.compile('users tablo-kaldır', 'tr'),
        mgmt.compile('supprimer-table users', 'fr'),
      ];
      for (const result of results) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('DROP TABLE');
      }
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle empty input', () => {
      expect(() => mgmt.parse('', 'en')).toThrow();
    });

    it('should handle whitespace-only input', () => {
      expect(() => mgmt.parse('   ', 'en')).toThrow();
    });

    it('should provide error info for unrecognized input', () => {
      const result = mgmt.validate('xyzzy foobar', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate across all supported languages', () => {
      for (const lang of ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr']) {
        const result = mgmt.validate('xyzzy foobar baz', lang);
        expect(result.valid).toBe(false);
      }
    });
  });
});

// =============================================================================
// Natural Language Renderer
// =============================================================================

describe('SQLite Mgmt Renderer', () => {
  let mgmt: MultilingualDSL;

  beforeAll(() => {
    mgmt = createSQLiteMgmtDSL();
  });

  describe('English Rendering', () => {
    it('should render CREATE TABLE to English', () => {
      const node = mgmt.parse('create-table users with id', 'en');
      const rendered = renderSQLiteMgmt(node, 'en');
      expect(rendered).toContain('create-table');
      expect(rendered).toContain('users');
      expect(rendered).toContain('with');
    });

    it('should render DROP TABLE to English', () => {
      const node = mgmt.parse('drop-table users', 'en');
      const rendered = renderSQLiteMgmt(node, 'en');
      expect(rendered).toContain('drop-table');
      expect(rendered).toContain('users');
    });

    it('should render VACUUM to English', () => {
      const node = mgmt.parse('vacuum', 'en');
      const rendered = renderSQLiteMgmt(node, 'en');
      expect(rendered).toContain('vacuum');
    });

    it('should render BEGIN to English', () => {
      const node = mgmt.parse('begin', 'en');
      const rendered = renderSQLiteMgmt(node, 'en');
      expect(rendered).toContain('begin');
    });

    it('should render COMMIT to English', () => {
      const node = mgmt.parse('commit', 'en');
      const rendered = renderSQLiteMgmt(node, 'en');
      expect(rendered).toContain('commit');
    });
  });

  describe('Cross-Language Rendering', () => {
    it('should render DROP TABLE to Japanese (SOV word order)', () => {
      const node = mgmt.parse('drop-table users', 'en');
      const rendered = renderSQLiteMgmt(node, 'ja');
      expect(rendered).toContain('テーブル削除');
    });

    it('should render DROP TABLE to Spanish', () => {
      const node = mgmt.parse('drop-table users', 'en');
      const rendered = renderSQLiteMgmt(node, 'es');
      expect(rendered).toContain('eliminar-tabla');
    });

    it('should render DROP TABLE to Arabic', () => {
      const node = mgmt.parse('drop-table users', 'en');
      const rendered = renderSQLiteMgmt(node, 'ar');
      expect(rendered).toContain('احذف-جدول');
    });

    it('should render VACUUM to Korean', () => {
      const node = mgmt.parse('vacuum', 'en');
      const rendered = renderSQLiteMgmt(node, 'ko');
      expect(rendered).toContain('정리');
    });

    it('should render VACUUM to Chinese', () => {
      const node = mgmt.parse('vacuum', 'en');
      const rendered = renderSQLiteMgmt(node, 'zh');
      expect(rendered).toContain('清理');
    });

    it('should render BEGIN to Turkish', () => {
      const node = mgmt.parse('begin', 'en');
      const rendered = renderSQLiteMgmt(node, 'tr');
      expect(rendered).toContain('başla');
    });

    it('should render COMMIT to French', () => {
      const node = mgmt.parse('commit', 'en');
      const rendered = renderSQLiteMgmt(node, 'fr');
      expect(rendered).toContain('valider');
    });
  });
});

// =============================================================================
// Code Generator Direct Tests
// =============================================================================

describe('SQLite Mgmt Code Generator', () => {
  it('should handle unknown action gracefully', () => {
    const fakeNode: any = {
      action: 'truncate',
      roles: new Map(),
    };
    expect(() => sqliteMgmtCodeGenerator.generate(fakeNode)).toThrow(
      'Unknown SQLite management command: truncate'
    );
  });

  it('should use default values for CREATE TABLE with missing roles', () => {
    const node: any = {
      action: 'create-table',
      roles: new Map(),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('CREATE TABLE my_table (id INTEGER PRIMARY KEY)');
  });

  it('should use default values for DROP TABLE', () => {
    const node: any = {
      action: 'drop-table',
      roles: new Map(),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('DROP TABLE IF EXISTS my_table');
  });

  it('should generate VACUUM without target', () => {
    const node: any = {
      action: 'vacuum',
      roles: new Map(),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('VACUUM');
  });

  it('should generate VACUUM with target', () => {
    const node: any = {
      action: 'vacuum',
      roles: new Map([['target', { value: 'main' }]]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('VACUUM main');
  });

  it('should generate BEGIN TRANSACTION', () => {
    const node: any = {
      action: 'begin',
      roles: new Map(),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('BEGIN TRANSACTION');
  });

  it('should generate BEGIN EXCLUSIVE TRANSACTION', () => {
    const node: any = {
      action: 'begin',
      roles: new Map([['mode', { value: 'exclusive' }]]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('BEGIN EXCLUSIVE TRANSACTION');
  });

  it('should generate COMMIT', () => {
    const node: any = {
      action: 'commit',
      roles: new Map(),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('COMMIT');
  });

  it('should generate ROLLBACK', () => {
    const node: any = {
      action: 'rollback',
      roles: new Map(),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('ROLLBACK');
  });

  it('should generate ROLLBACK TO SAVEPOINT', () => {
    const node: any = {
      action: 'rollback',
      roles: new Map([['savepoint', { value: 'sp1' }]]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('ROLLBACK TO SAVEPOINT sp1');
  });

  it('should generate PRAGMA SET', () => {
    const node: any = {
      action: 'pragma-set',
      roles: new Map([
        ['pragma', { value: 'journal_mode' }],
        ['value', { value: 'wal' }],
      ]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('PRAGMA journal_mode = wal');
  });

  it('should generate PRAGMA GET', () => {
    const node: any = {
      action: 'pragma-get',
      roles: new Map([['pragma', { value: 'journal_mode' }]]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('PRAGMA journal_mode');
  });

  it('should generate PRAGMA GET with target', () => {
    const node: any = {
      action: 'pragma-get',
      roles: new Map([
        ['pragma', { value: 'table_info' }],
        ['target', { value: 'users' }],
      ]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('PRAGMA table_info(users)');
  });

  it('should generate CREATE INDEX', () => {
    const node: any = {
      action: 'create-index',
      roles: new Map([
        ['table', { value: 'users' }],
        ['column', { value: 'email' }],
      ]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('CREATE INDEX idx_users_email ON users (email)');
  });

  it('should generate DROP INDEX', () => {
    const node: any = {
      action: 'drop-index',
      roles: new Map([['index', { value: 'idx_users_email' }]]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('DROP INDEX IF EXISTS idx_users_email');
  });

  it('should generate ALTER TABLE ADD COLUMN', () => {
    const node: any = {
      action: 'add-column',
      roles: new Map([
        ['table', { value: 'users' }],
        ['column', { value: 'email TEXT' }],
      ]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('ALTER TABLE users ADD COLUMN email TEXT');
  });

  it('should generate ALTER TABLE RENAME TO', () => {
    const node: any = {
      action: 'rename-table',
      roles: new Map([
        ['table', { value: 'users' }],
        ['new-name', { value: 'accounts' }],
      ]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('ALTER TABLE users RENAME TO accounts');
  });

  it('should generate ATTACH DATABASE', () => {
    const node: any = {
      action: 'attach',
      roles: new Map([
        ['path', { value: 'backup.db' }],
        ['alias', { value: 'backup' }],
      ]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe("ATTACH DATABASE 'backup.db' AS backup");
  });

  it('should generate DETACH DATABASE', () => {
    const node: any = {
      action: 'detach',
      roles: new Map([['alias', { value: 'backup' }]]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('DETACH DATABASE backup');
  });

  it('should generate CREATE VIEW', () => {
    const node: any = {
      action: 'create-view',
      roles: new Map([
        ['view', { value: 'active_users' }],
        ['query', { value: 'SELECT * FROM users WHERE active = 1' }],
      ]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('CREATE VIEW active_users AS SELECT * FROM users WHERE active = 1');
  });

  it('should generate DROP VIEW', () => {
    const node: any = {
      action: 'drop-view',
      roles: new Map([['view', { value: 'active_users' }]]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('DROP VIEW IF EXISTS active_users');
  });

  it('should generate ANALYZE with target', () => {
    const node: any = {
      action: 'analyze',
      roles: new Map([['target', { value: 'users' }]]),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('ANALYZE users');
  });

  it('should generate ANALYZE without target', () => {
    const node: any = {
      action: 'analyze',
      roles: new Map(),
    };
    const code = sqliteMgmtCodeGenerator.generate(node);
    expect(code).toBe('ANALYZE');
  });
});
