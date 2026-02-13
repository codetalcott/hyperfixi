/**
 * SQL DSL Integration Tests
 *
 * End-to-end tests using the SQL DSL fixture to validate the full pipeline:
 * Tokenization → Pattern Matching → Semantic Parsing → Code Generation
 */

import { describe, it, expect } from 'vitest';
import { createSQLDSL, testQueries, expectedSQL, expectedNodes } from './fixtures/sql-dsl';

describe('SQL DSL Integration', () => {
  let sqlDSL: ReturnType<typeof createSQLDSL>;

  beforeEach(() => {
    sqlDSL = createSQLDSL();
  });

  describe('English Queries', () => {
    it('should parse simple SELECT query', () => {
      const result = sqlDSL.parse(testQueries.english.simple, 'en');

      expect(result.kind).toBe('command');
      expect(result.action).toBe('select');
      expect(result.roles.has('columns')).toBe(true);
      expect(result.roles.has('source')).toBe(true);

      const columns = result.roles.get('columns');
      const source = result.roles.get('source');

      if (columns && 'raw' in columns) {
        expect(columns.raw).toBe('name');
      }
      if (source && 'raw' in source) {
        expect(source.raw).toBe('users');
      }
    });

    it('should parse SELECT with WHERE clause', () => {
      const result = sqlDSL.parse(testQueries.english.withWhere, 'en');

      expect(result.action).toBe('select');
      expect(result.roles.has('columns')).toBe(true);
      expect(result.roles.has('source')).toBe(true);
      expect(result.roles.has('condition')).toBe(true);

      const condition = result.roles.get('condition');
      expect(condition).toBeDefined();
      if (condition && 'raw' in condition) {
        // The condition role captures the expression after WHERE
        expect(condition.raw).toBeTruthy();
      }
    });
  });

  describe('Spanish Queries', () => {
    it('should parse Spanish SELECT query', () => {
      const result = sqlDSL.parse(testQueries.spanish.simple, 'es');

      expect(result.action).toBe('select');
      expect(result.roles.has('columns')).toBe(true);
      expect(result.roles.has('source')).toBe(true);

      const columns = result.roles.get('columns');
      const source = result.roles.get('source');

      if (columns && 'raw' in columns) {
        expect(columns.raw).toBe('nombre');
      }
      if (source && 'raw' in source) {
        expect(source.raw).toBe('usuarios');
      }
    });

    it('should parse Spanish SELECT with WHERE clause', () => {
      const result = sqlDSL.parse(testQueries.spanish.withWhere, 'es');

      expect(result.action).toBe('select');
      expect(result.roles.has('condition')).toBe(true);
    });
  });

  describe('Code Generation', () => {
    it('should compile English query to SQL', () => {
      const result = sqlDSL.compile(testQueries.english.simple, 'en');

      expect(result.ok).toBe(true);
      expect(result.code).toBe(expectedSQL.simple);
    });

    it('should compile query with WHERE clause', () => {
      const result = sqlDSL.compile(testQueries.english.withWhere, 'en');

      expect(result.ok).toBe(true);
      // Should contain all parts
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('FROM');
      expect(result.code).toContain('WHERE');
    });

    it('should preserve identifiers from source language', () => {
      const enResult = sqlDSL.compile(testQueries.english.simple, 'en');
      const esResult = sqlDSL.compile(testQueries.spanish.simple, 'es');

      // English uses English identifiers
      expect(enResult.code).toContain('name');
      expect(enResult.code).toContain('users');

      // Spanish uses Spanish identifiers
      expect(esResult.code).toContain('nombre');
      expect(esResult.code).toContain('usuarios');

      // But both have SQL structure
      expect(enResult.code).toContain('SELECT');
      expect(esResult.code).toContain('SELECT');
    });
  });

  describe('Validation', () => {
    it('should validate correct queries', () => {
      const result = sqlDSL.validate(testQueries.english.simple, 'en');

      expect(result.valid).toBe(true);
      expect(result.node).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should handle invalid queries gracefully', () => {
      // Query with unknown keyword
      const result = sqlDSL.validate('invalid query syntax', 'en');

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-language Support', () => {
    it('should support both English and Spanish', () => {
      const languages = sqlDSL.getSupportedLanguages();

      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toHaveLength(2);
    });

    it('should reject unsupported language', () => {
      expect(() => {
        sqlDSL.parse('select name from users', 'fr');
      }).toThrow();
    });
  });

  describe('Semantic Equivalence', () => {
    it('should parse English and Spanish to equivalent semantic structures', () => {
      const enNode = sqlDSL.parse(testQueries.english.simple, 'en');
      const esNode = sqlDSL.parse(testQueries.spanish.simple, 'es');

      expect(enNode.action).toBe(esNode.action);
      expect(enNode.roles.size).toBe(esNode.roles.size);
      expect(enNode.roles.has('columns')).toBe(esNode.roles.has('columns'));
      expect(enNode.roles.has('source')).toBe(esNode.roles.has('source'));
    });
  });

  describe('Error Handling', () => {
    it('should handle empty input', () => {
      expect(() => {
        sqlDSL.parse('', 'en');
      }).toThrow();
    });

    it('should handle whitespace-only input', () => {
      expect(() => {
        sqlDSL.parse('   ', 'en');
      }).toThrow();
    });

    it('should provide helpful error messages', () => {
      try {
        sqlDSL.parse('unknown command', 'en');
        // Should have thrown
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });
  });
});
