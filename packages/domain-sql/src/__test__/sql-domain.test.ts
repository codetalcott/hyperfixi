/**
 * SQL Domain Tests
 *
 * Validates the multilingual SQL DSL across 4 languages (EN, ES, JA, AR)
 * covering SVO, SOV, and VSO word orders.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createSQLDSL } from '../index';
import type { MultilingualDSL } from '@lokascript/framework';

describe('SQL Domain', () => {
  let sql: MultilingualDSL;

  beforeAll(() => {
    sql = createSQLDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 4 languages', () => {
      const languages = sql.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toHaveLength(4);
    });

    it('should reject unsupported language', () => {
      expect(() => sql.parse('select name from users', 'fr')).toThrow();
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

    it('should parse SELECT with WHERE', () => {
      const node = sql.parse('select name from users where age > 18', 'en');
      expect(node.action).toBe('select');
      expect(node.roles.has('condition')).toBe(true);
    });

    it('should compile SELECT to SQL', () => {
      const result = sql.compile('select name from users', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT name FROM users');
    });

    it('should compile SELECT with WHERE to SQL', () => {
      const result = sql.compile('select name from users where age > 18', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
      expect(result.code).toContain('WHERE');
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
    });

    it('should parse DELETE', () => {
      const node = sql.parse('delete from users where id = 1', 'en');
      expect(node.action).toBe('delete');
      expect(node.roles.has('source')).toBe(true);
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

    it('should compile Spanish SELECT to SQL', () => {
      const result = sql.compile('seleccionar nombre de usuarios', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT nombre FROM usuarios');
    });

    it('should parse Spanish SELECT with WHERE', () => {
      const node = sql.parse('seleccionar nombre de usuarios donde edad > 18', 'es');
      expect(node.action).toBe('select');
      expect(node.roles.has('condition')).toBe(true);
    });

    it('should parse Spanish INSERT', () => {
      const node = sql.parse('insertar Alice en usuarios', 'es');
      expect(node.action).toBe('insert');
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

    it('should compile Japanese SELECT to SQL', () => {
      const result = sql.compile('users から name 選択', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    });

    it('should parse Japanese INSERT', () => {
      const node = sql.parse('users に Alice 挿入', 'ja');
      expect(node.action).toBe('insert');
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

    it('should compile Arabic SELECT to SQL', () => {
      const result = sql.compile('اختر name من users', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
    });

    it('should parse Arabic INSERT', () => {
      const node = sql.parse('أدخل Alice في users', 'ar');
      expect(node.action).toBe('insert');
    });

    it('should parse Arabic DELETE', () => {
      const node = sql.parse('احذف من users', 'ar');
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
  });
});
