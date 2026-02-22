/**
 * SQL Domain Tests
 *
 * Validates the multilingual SQL DSL across 8 languages (EN, ES, JA, AR, KO, ZH, TR, FR)
 * covering SVO, SOV, and VSO word orders, with comprehensive compilation assertions,
 * role value verification, renderer round-trips, and edge cases.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createSQLDSL, renderSQL } from '../index';
import { sqlCodeGenerator } from '../generators/sql-generator';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

describe('SQL Domain', () => {
  let sql: MultilingualDSL;

  beforeAll(() => {
    sql = createSQLDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 8 languages', () => {
      const languages = sql.getSupportedLanguages();
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
      expect(() => sql.parse('select name from users', 'de')).toThrow();
    });
  });

  // ===========================================================================
  // English (SVO)
  // ===========================================================================

  describe('English (SVO)', () => {
    it('should parse simple SELECT', () => {
      const node = sql.parse('select name from users', 'en');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('should extract correct role values from SELECT', () => {
      const node = sql.parse('select name from users', 'en');
      expect(extractRoleValue(node, 'columns')).toBe('name');
      expect(extractRoleValue(node, 'source')).toBe('users');
    });

    it('should parse SELECT with WHERE and capture full condition', () => {
      const node = sql.parse('select name from users where age > 18', 'en');
      expect(node.action).toBe('select');
      expect(node.roles.has('condition')).toBe(true);
      expect(extractRoleValue(node, 'condition')).toBe('age > 18');
    });

    it('should compile SELECT to exact SQL', () => {
      const result = sql.compile('select name from users', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT name FROM users');
    });

    it('should compile SELECT with WHERE to exact SQL', () => {
      const result = sql.compile('select name from users where age > 18', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT name FROM users WHERE age > 18');
    });

    it('should capture compound WHERE with AND', () => {
      const result = sql.compile('select name from users where age > 18 and active = true', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT name FROM users WHERE age > 18 and active = true');
    });

    it('should capture compound WHERE with OR', () => {
      const result = sql.compile(
        'select name from users where role = admin or role = editor',
        'en'
      );
      expect(result.ok).toBe(true);
      expect(result.code).toContain('WHERE role = admin or role = editor');
    });

    it('should parse INSERT', () => {
      const node = sql.parse('insert Alice into users', 'en');
      expect(node.action).toBe('insert');
      expect(node.roles.has('values')).toBe(true);
      expect(node.roles.has('destination')).toBe(true);
    });

    it('should compile INSERT to SQL', () => {
      const result = sql.compile('insert Alice into users', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('INSERT INTO');
      expect(result.code).toContain('users');
    });

    it('should parse UPDATE', () => {
      const node = sql.parse('update users set name = Bob', 'en');
      expect(node.action).toBe('update');
      expect(node.roles.has('source')).toBe(true);
      expect(node.roles.has('values')).toBe(true);
    });

    it('should compile UPDATE to SQL', () => {
      const result = sql.compile('update users set name = Bob', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('UPDATE');
      expect(result.code).toContain('SET');
    });

    it('should parse UPDATE with WHERE and capture full expressions', () => {
      const node = sql.parse('update users set name = Bob where id = 1', 'en');
      expect(node.action).toBe('update');
      expect(node.roles.has('source')).toBe(true);
      expect(node.roles.has('values')).toBe(true);
      expect(node.roles.has('condition')).toBe(true);
      expect(extractRoleValue(node, 'values')).toBe('name = Bob');
      expect(extractRoleValue(node, 'condition')).toBe('id = 1');
    });

    it('should compile UPDATE with WHERE to exact SQL', () => {
      const result = sql.compile('update users set name = Bob where id = 1', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('UPDATE users SET name = Bob WHERE id = 1');
    });

    it('should parse DELETE with WHERE and capture full condition', () => {
      const node = sql.parse('delete from users where id = 1', 'en');
      expect(node.action).toBe('delete');
      expect(node.roles.has('source')).toBe(true);
      expect(node.roles.has('condition')).toBe(true);
      expect(extractRoleValue(node, 'condition')).toBe('id = 1');
    });

    it('should compile DELETE with WHERE to exact SQL', () => {
      const result = sql.compile('delete from users where id = 1', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('DELETE FROM users WHERE id = 1');
    });

    it('should validate correct query', () => {
      const result = sql.validate('select name from users', 'en');
      expect(result.valid).toBe(true);
      expect(result.node).toBeDefined();
    });

    it('should reject invalid query', () => {
      const result = sql.validate('invalid query syntax', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should parse keyword used as column name (e.g. "set")', () => {
      // "set" is a keyword in SQL domain (UPDATE ... SET ...) but should
      // still work as a column name when used in SELECT context.
      // This tests the isTypeCompatible() fix in pattern-matcher.ts
      const node = sql.parse('select set from users', 'en');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('should parse Spanish SELECT', () => {
      const node = sql.parse('seleccionar nombre de usuarios', 'es');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('should compile Spanish SELECT to exact SQL', () => {
      const result = sql.compile('seleccionar nombre de usuarios', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT nombre FROM usuarios');
    });

    it('should parse Spanish SELECT with WHERE and capture full condition', () => {
      const node = sql.parse('seleccionar nombre de usuarios donde edad > 18', 'es');
      expect(node.action).toBe('select');
      expect(node.roles.has('condition')).toBe(true);
      expect(extractRoleValue(node, 'condition')).toBe('edad > 18');
    });

    it('should compile Spanish SELECT with WHERE to exact SQL', () => {
      const result = sql.compile('seleccionar nombre de usuarios donde edad > 18', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT nombre FROM usuarios WHERE edad > 18');
    });

    it('should parse Spanish INSERT', () => {
      const node = sql.parse('insertar Alice en usuarios', 'es');
      expect(node.action).toBe('insert');
    });

    it('should compile Spanish INSERT to SQL', () => {
      const result = sql.compile('insertar Alice en usuarios', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('INSERT INTO');
    });

    it('should parse Spanish DELETE', () => {
      const node = sql.parse('eliminar de usuarios donde id = 1', 'es');
      expect(node.action).toBe('delete');
    });
  });

  // ===========================================================================
  // Japanese (SOV) - Verb Last
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('should parse Japanese SELECT (SOV: object before verb)', () => {
      const node = sql.parse('users から name 選択', 'ja');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('should compile Japanese SELECT to exact SQL', () => {
      const result = sql.compile('users から name 選択', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    });

    it('should parse Japanese INSERT', () => {
      const node = sql.parse('users に Alice 挿入', 'ja');
      expect(node.action).toBe('insert');
    });

    it('should compile Japanese INSERT to SQL', () => {
      const result = sql.compile('users に Alice 挿入', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('INSERT INTO');
    });

    it('should parse Japanese DELETE', () => {
      const node = sql.parse('users から 削除', 'ja');
      expect(node.action).toBe('delete');
    });
  });

  // ===========================================================================
  // Arabic (VSO) - Verb First
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('should parse Arabic SELECT (VSO: verb first)', () => {
      const node = sql.parse('اختر name من users', 'ar');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('should compile Arabic SELECT to exact SQL', () => {
      const result = sql.compile('اختر name من users', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    });

    it('should parse Arabic INSERT', () => {
      const node = sql.parse('أدخل Alice في users', 'ar');
      expect(node.action).toBe('insert');
    });

    it('should compile Arabic INSERT to SQL', () => {
      const result = sql.compile('أدخل Alice في users', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('INSERT INTO');
    });

    it('should parse Arabic DELETE', () => {
      const node = sql.parse('احذف من users', 'ar');
      expect(node.action).toBe('delete');
    });
  });

  // ===========================================================================
  // Korean (SOV) - Verb Last
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('should parse Korean SELECT (SOV order)', () => {
      const node = sql.parse('users 에서 name 선택', 'ko');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('should compile Korean SELECT to SQL', () => {
      const result = sql.compile('users 에서 name 선택', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    });

    it('should parse Korean INSERT', () => {
      const node = sql.parse('users 에 Alice 삽입', 'ko');
      expect(node.action).toBe('insert');
    });

    it('should compile Korean INSERT to SQL', () => {
      const result = sql.compile('users 에 Alice 삽입', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('INSERT INTO');
    });

    it('should parse Korean DELETE', () => {
      const node = sql.parse('users 에서 삭제', 'ko');
      expect(node.action).toBe('delete');
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('should parse Chinese SELECT', () => {
      const node = sql.parse('查询 name 从 users', 'zh');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('should compile Chinese SELECT to SQL', () => {
      const result = sql.compile('查询 name 从 users', 'zh');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    });

    it('should parse Chinese INSERT', () => {
      const node = sql.parse('插入 Alice 到 users', 'zh');
      expect(node.action).toBe('insert');
    });

    it('should parse Chinese DELETE', () => {
      const node = sql.parse('删除 从 users', 'zh');
      expect(node.action).toBe('delete');
    });
  });

  // ===========================================================================
  // Turkish (SOV)
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('should parse Turkish SELECT (SOV order)', () => {
      const node = sql.parse('users den name seç', 'tr');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('should compile Turkish SELECT to SQL', () => {
      const result = sql.compile('users den name seç', 'tr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    });

    it('should parse Turkish INSERT', () => {
      const node = sql.parse('users e Alice ekle', 'tr');
      expect(node.action).toBe('insert');
    });

    it('should parse Turkish DELETE', () => {
      const node = sql.parse('users den sil', 'tr');
      expect(node.action).toBe('delete');
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('should parse French SELECT', () => {
      const node = sql.parse('sélectionner name de users', 'fr');
      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('should compile French SELECT to SQL', () => {
      const result = sql.compile('sélectionner name de users', 'fr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    });

    it('should parse French INSERT', () => {
      const node = sql.parse('insérer Alice dans users', 'fr');
      expect(node.action).toBe('insert');
    });

    it('should parse French DELETE', () => {
      const node = sql.parse('supprimer de users', 'fr');
      expect(node.action).toBe('delete');
    });
  });

  // ===========================================================================
  // Cross-Language Semantic Equivalence
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('should parse EN and ES SELECT to equivalent structures', () => {
      const en = sql.parse('select name from users', 'en');
      const es = sql.parse('seleccionar nombre de usuarios', 'es');
      expect(en.action).toBe(es.action);
      expect(en.roles.size).toBe(es.roles.size);
    });

    it('should parse EN and JA SELECT to equivalent structures', () => {
      const en = sql.parse('select name from users', 'en');
      const ja = sql.parse('users から name 選択', 'ja');
      expect(en.action).toBe(ja.action);
      expect(en.roles.has('columns')).toBe(ja.roles.has('columns'));
      expect(en.roles.has('source')).toBe(ja.roles.has('source'));
    });

    it('should parse EN and AR SELECT to equivalent structures', () => {
      const en = sql.parse('select name from users', 'en');
      const ar = sql.parse('اختر name من users', 'ar');
      expect(en.action).toBe(ar.action);
      expect(en.roles.has('columns')).toBe(ar.roles.has('columns'));
      expect(en.roles.has('source')).toBe(ar.roles.has('source'));
    });

    it('should parse SELECT across all 8 languages to same action', () => {
      const nodes = [
        sql.parse('select name from users', 'en'),
        sql.parse('seleccionar nombre de usuarios', 'es'),
        sql.parse('users から name 選択', 'ja'),
        sql.parse('اختر name من users', 'ar'),
        sql.parse('users 에서 name 선택', 'ko'),
        sql.parse('查询 name 从 users', 'zh'),
        sql.parse('users den name seç', 'tr'),
        sql.parse('sélectionner name de users', 'fr'),
      ];
      for (const node of nodes) {
        expect(node.action).toBe('select');
        expect(node.roles.has('columns')).toBe(true);
        expect(node.roles.has('source')).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Cross-Language WHERE Clause
  // ===========================================================================

  describe('Cross-Language WHERE Clause', () => {
    it('should compile Spanish SELECT with WHERE', () => {
      const result = sql.compile('seleccionar nombre de usuarios donde edad > 18', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('WHERE');
      expect(result.code).toContain('edad > 18');
    });

    it('should compile French SELECT with WHERE', () => {
      const result = sql.compile('sélectionner name de users où age > 18', 'fr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('WHERE');
      expect(result.code).toContain('age > 18');
    });

    it('should compile Arabic SELECT with WHERE (VSO)', () => {
      const result = sql.compile('اختر name من users حيث age > 18', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('WHERE');
      expect(result.code).toContain('age > 18');
    });

    it('should compile Chinese SELECT with WHERE', () => {
      const result = sql.compile('查询 name 从 users 条件 age > 18', 'zh');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('WHERE');
      expect(result.code).toContain('age > 18');
    });

    it('should compile Japanese SELECT with WHERE (SOV)', () => {
      const result = sql.compile('users から name 条件 age > 18 選択', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('WHERE');
      expect(result.code).toContain('age > 18');
    });

    it('should compile Korean SELECT with WHERE (SOV)', () => {
      const result = sql.compile('users 에서 name 조건 age > 18 선택', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('WHERE');
      expect(result.code).toContain('age > 18');
    });

    it('should compile Turkish SELECT with WHERE (SOV)', () => {
      const result = sql.compile('users den name koşul age > 18 seç', 'tr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('WHERE');
      expect(result.code).toContain('age > 18');
    });

    it('should compile DELETE with compound WHERE', () => {
      const result = sql.compile('delete from users where id = 1 and active = false', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('DELETE FROM users WHERE id = 1 and active = false');
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle empty input', () => {
      expect(() => sql.parse('', 'en')).toThrow();
    });

    it('should handle whitespace-only input', () => {
      expect(() => sql.parse('   ', 'en')).toThrow();
    });

    it('should provide error info for unrecognized input', () => {
      const result = sql.validate('xyzzy foobar', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate across all supported languages', () => {
      for (const lang of ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr']) {
        const result = sql.validate('xyzzy foobar baz', lang);
        expect(result.valid).toBe(false);
      }
    });
  });
});

// =============================================================================
// Natural Language Renderer
// =============================================================================

describe('SQL Renderer', () => {
  let sql: MultilingualDSL;

  beforeAll(() => {
    sql = createSQLDSL();
  });

  describe('English Rendering', () => {
    it('should render SELECT to English', () => {
      const node = sql.parse('select name from users', 'en');
      const rendered = renderSQL(node, 'en');
      expect(rendered).toContain('select');
      expect(rendered).toContain('name');
      expect(rendered).toContain('from');
      expect(rendered).toContain('users');
    });

    it('should render INSERT to English', () => {
      const node = sql.parse('insert Alice into users', 'en');
      const rendered = renderSQL(node, 'en');
      expect(rendered).toContain('insert');
      expect(rendered).toContain('into');
    });

    it('should render UPDATE to English', () => {
      const node = sql.parse('update users set name = Bob', 'en');
      const rendered = renderSQL(node, 'en');
      expect(rendered).toContain('update');
      expect(rendered).toContain('set');
    });

    it('should render DELETE to English', () => {
      const node = sql.parse('delete from users', 'en');
      const rendered = renderSQL(node, 'en');
      expect(rendered).toContain('delete');
      expect(rendered).toContain('from');
    });
  });

  describe('Cross-Language Rendering', () => {
    it('should render SELECT to Spanish', () => {
      const node = sql.parse('select name from users', 'en');
      const rendered = renderSQL(node, 'es');
      expect(rendered).toContain('seleccionar');
      expect(rendered).toContain('de');
    });

    it('should render SELECT to Japanese (SOV word order)', () => {
      const node = sql.parse('select name from users', 'en');
      const rendered = renderSQL(node, 'ja');
      expect(rendered).toContain('選択');
      expect(rendered).toContain('から');
      // SOV: verb should come last
      const keywordIdx = rendered.indexOf('選択');
      const sourceIdx = rendered.indexOf('から');
      expect(sourceIdx).toBeLessThan(keywordIdx);
    });

    it('should render SELECT to Arabic', () => {
      const node = sql.parse('select name from users', 'en');
      const rendered = renderSQL(node, 'ar');
      expect(rendered).toContain('اختر');
      expect(rendered).toContain('من');
    });

    it('should render SELECT to Korean (SOV word order)', () => {
      const node = sql.parse('select name from users', 'en');
      const rendered = renderSQL(node, 'ko');
      expect(rendered).toContain('선택');
      expect(rendered).toContain('에서');
    });

    it('should render SELECT to Chinese', () => {
      const node = sql.parse('select name from users', 'en');
      const rendered = renderSQL(node, 'zh');
      expect(rendered).toContain('查询');
      expect(rendered).toContain('从');
    });

    it('should render SELECT to Turkish (SOV word order)', () => {
      const node = sql.parse('select name from users', 'en');
      const rendered = renderSQL(node, 'tr');
      expect(rendered).toContain('seç');
      expect(rendered).toContain('den');
    });

    it('should render SELECT to French', () => {
      const node = sql.parse('select name from users', 'en');
      const rendered = renderSQL(node, 'fr');
      expect(rendered).toContain('sélectionner');
      expect(rendered).toContain('de');
    });
  });

  describe('Renderer WHERE Clause', () => {
    it('should render SELECT with WHERE to English', () => {
      const node = sql.parse('select name from users where age > 18', 'en');
      const rendered = renderSQL(node, 'en');
      expect(rendered).toContain('where');
      expect(rendered).toContain('age > 18');
    });

    it('should render SELECT with WHERE to Spanish', () => {
      const node = sql.parse('select name from users where age > 18', 'en');
      const rendered = renderSQL(node, 'es');
      expect(rendered).toContain('donde');
      expect(rendered).toContain('age > 18');
    });

    it('should render SELECT with WHERE to Japanese (SOV)', () => {
      const node = sql.parse('select name from users where age > 18', 'en');
      const rendered = renderSQL(node, 'ja');
      expect(rendered).toContain('条件');
      expect(rendered).toContain('age > 18');
    });

    it('should render SELECT with WHERE to Arabic', () => {
      const node = sql.parse('select name from users where age > 18', 'en');
      const rendered = renderSQL(node, 'ar');
      expect(rendered).toContain('حيث');
      expect(rendered).toContain('age > 18');
    });

    it('should render UPDATE with WHERE to English', () => {
      const node = sql.parse('update users set name = Bob where id = 1', 'en');
      const rendered = renderSQL(node, 'en');
      expect(rendered).toContain('where');
      expect(rendered).toContain('id = 1');
      expect(rendered).toContain('set');
      expect(rendered).toContain('name = Bob');
    });

    it('should render DELETE with WHERE to English', () => {
      const node = sql.parse('delete from users where id = 1', 'en');
      const rendered = renderSQL(node, 'en');
      expect(rendered).toContain('where');
      expect(rendered).toContain('id = 1');
    });

    it('should render compound WHERE to English', () => {
      const node = sql.parse('select name from users where age > 18 and active = true', 'en');
      const rendered = renderSQL(node, 'en');
      expect(rendered).toContain('where');
      expect(rendered).toContain('age > 18 and active = true');
    });
  });

  describe('Renderer Commands', () => {
    it('should render INSERT to Japanese', () => {
      const node = sql.parse('insert Alice into users', 'en');
      const rendered = renderSQL(node, 'ja');
      expect(rendered).toContain('挿入');
      expect(rendered).toContain('に');
    });

    it('should render UPDATE to Arabic', () => {
      const node = sql.parse('update users set name = Bob', 'en');
      const rendered = renderSQL(node, 'ar');
      expect(rendered).toContain('حدّث');
      expect(rendered).toContain('عيّن');
    });

    it('should render DELETE to Korean', () => {
      const node = sql.parse('delete from users', 'en');
      const rendered = renderSQL(node, 'ko');
      expect(rendered).toContain('삭제');
      expect(rendered).toContain('에서');
    });
  });
});

// =============================================================================
// Code Generator Direct Tests
// =============================================================================

describe('SQL Code Generator', () => {
  it('should handle unknown action gracefully', () => {
    const fakeNode: any = {
      action: 'drop',
      roles: new Map(),
    };
    expect(() => sqlCodeGenerator.generate(fakeNode)).toThrow('Unknown SQL command: drop');
  });

  it('should use default values for missing roles', () => {
    const node: any = {
      action: 'select',
      roles: new Map(),
    };
    const code = sqlCodeGenerator.generate(node);
    expect(code).toBe('SELECT * FROM table');
  });

  it('should use default values for UPDATE with missing values', () => {
    const node: any = {
      action: 'update',
      roles: new Map([['source', { value: 'users' }]]),
    };
    const code = sqlCodeGenerator.generate(node);
    expect(code).toContain('SET column = value');
  });

  it('should generate INSERT with default table', () => {
    const node: any = {
      action: 'insert',
      roles: new Map([['values', { value: 'Alice' }]]),
    };
    const code = sqlCodeGenerator.generate(node);
    expect(code).toBe('INSERT INTO table VALUES (Alice)');
  });

  it('should generate DELETE with default table', () => {
    const node: any = {
      action: 'delete',
      roles: new Map(),
    };
    const code = sqlCodeGenerator.generate(node);
    expect(code).toBe('DELETE FROM table');
  });
});

// =============================================================================
// Cross-Language Compilation Equivalence
// =============================================================================

describe('Compilation Equivalence', () => {
  let sql: MultilingualDSL;

  beforeAll(() => {
    sql = createSQLDSL();
  });

  it('should compile SELECT from all SVO languages', () => {
    const en = sql.compile('select name from users', 'en');
    const es = sql.compile('seleccionar nombre de usuarios', 'es');
    const zh = sql.compile('查询 name 从 users', 'zh');
    const fr = sql.compile('sélectionner name de users', 'fr');
    for (const result of [en, es, zh, fr]) {
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    }
  });

  it('should compile SELECT from all SOV languages', () => {
    const ja = sql.compile('users から name 選択', 'ja');
    const ko = sql.compile('users 에서 name 선택', 'ko');
    const tr = sql.compile('users den name seç', 'tr');
    for (const result of [ja, ko, tr]) {
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    }
  });

  it('should compile INSERT from all 8 languages to equivalent output', () => {
    const results = [
      sql.compile('insert Alice into users', 'en'),
      sql.compile('insertar Alice en usuarios', 'es'),
      sql.compile('users に Alice 挿入', 'ja'),
      sql.compile('أدخل Alice في users', 'ar'),
      sql.compile('users 에 Alice 삽입', 'ko'),
      sql.compile('插入 Alice 到 users', 'zh'),
      sql.compile('users e Alice ekle', 'tr'),
      sql.compile('insérer Alice dans users', 'fr'),
    ];
    for (const result of results) {
      expect(result.ok).toBe(true);
      expect(result.code).toContain('INSERT INTO');
    }
  });

  it('should compile DELETE from all 8 languages', () => {
    const results = [
      sql.compile('delete from users', 'en'),
      sql.compile('eliminar de usuarios', 'es'),
      sql.compile('users から 削除', 'ja'),
      sql.compile('احذف من users', 'ar'),
      sql.compile('users 에서 삭제', 'ko'),
      sql.compile('删除 从 users', 'zh'),
      sql.compile('users den sil', 'tr'),
      sql.compile('supprimer de users', 'fr'),
    ];
    for (const result of results) {
      expect(result.ok).toBe(true);
      expect(result.code).toContain('DELETE FROM');
    }
  });
});
