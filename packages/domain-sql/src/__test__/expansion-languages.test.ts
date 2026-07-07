/**
 * Bridge-era languages (arc Phase 1 expansion): German, Portuguese, Russian.
 *
 * Each language was added with ONE vocab file (SQL verbs + connectives) —
 * grammar comes from @lokascript/semantic's profiles through the framework
 * bridge. Mirrors the per-language blocks in sql-domain.test.ts, plus
 * parse → SemanticNode → renderSQL round-trips.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import { createSQLDSL, renderSQL } from '../index';

let sql: MultilingualDSL;

beforeAll(() => {
  sql = createSQLDSL();
});

describe('SQL Domain — bridge-era languages', () => {
  it('supports 11 languages', () => {
    const languages = sql.getSupportedLanguages();
    expect(languages).toHaveLength(11);
    for (const code of ['de', 'pt', 'ru']) {
      expect(languages).toContain(code);
    }
  });

  describe('German (SVO)', () => {
    it('should parse German SELECT', () => {
      const node = sql.parse('auswählen name von users', 'de');
      expect(node.action).toBe('select');
      expect(extractRoleValue(node, 'columns')).toBe('name');
      expect(extractRoleValue(node, 'source')).toBe('users');
    });

    it('should compile German SELECT to exact SQL', () => {
      const result = sql.compile('auswählen name von users', 'de');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT name FROM users');
    });

    it('should compile German SELECT with WHERE to exact SQL', () => {
      const result = sql.compile('auswählen name von users wo age > 18', 'de');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT name FROM users WHERE age > 18');
    });

    it('should parse German INSERT', () => {
      const node = sql.parse('einfügen Alice in users', 'de');
      expect(node.action).toBe('insert');
      expect(extractRoleValue(node, 'values')).toBe('Alice');
      expect(extractRoleValue(node, 'destination')).toBe('users');
    });

    it('should compile German UPDATE to SQL', () => {
      const result = sql.compile('aktualisieren users setzen active = true wo id = 5', 'de');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('UPDATE users SET active = true WHERE id = 5');
    });

    it('should parse German DELETE', () => {
      const node = sql.parse('löschen von users wo inactive = true', 'de');
      expect(node.action).toBe('delete');
      expect(extractRoleValue(node, 'source')).toBe('users');
    });

    it('natural alias: hinzufügen is einfügen', () => {
      const formal = sql.compile('einfügen Alice in users', 'de');
      const natural = sql.compile('hinzufügen Alice in users', 'de');
      expect(formal.ok).toBe(true);
      expect(natural.ok).toBe(true);
      expect(natural.code).toBe(formal.code);
    });

    it('natural: holen compiles to SELECT *', () => {
      const result = sql.compile('holen users wo age > 18 limit 10', 'de');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT * FROM users WHERE age > 18 LIMIT 10');
    });
  });

  describe('Portuguese (SVO)', () => {
    it('should parse Portuguese SELECT', () => {
      const node = sql.parse('selecionar nome de usuarios', 'pt');
      expect(node.action).toBe('select');
      expect(extractRoleValue(node, 'columns')).toBe('nome');
      expect(extractRoleValue(node, 'source')).toBe('usuarios');
    });

    it('should compile Portuguese SELECT to exact SQL', () => {
      const result = sql.compile('selecionar nome de usuarios', 'pt');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT nome FROM usuarios');
    });

    it('should compile Portuguese SELECT with WHERE to exact SQL', () => {
      const result = sql.compile('selecionar nome de usuarios onde age > 18', 'pt');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT nome FROM usuarios WHERE age > 18');
    });

    it('should parse Portuguese INSERT', () => {
      const node = sql.parse('inserir Alice em usuarios', 'pt');
      expect(node.action).toBe('insert');
      expect(extractRoleValue(node, 'values')).toBe('Alice');
      expect(extractRoleValue(node, 'destination')).toBe('usuarios');
    });

    it('should compile Portuguese UPDATE to SQL', () => {
      const result = sql.compile('atualizar usuarios definir active = true onde id = 5', 'pt');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('UPDATE usuarios SET active = true WHERE id = 5');
    });

    it('should parse Portuguese DELETE', () => {
      const node = sql.parse('excluir de usuarios onde inactive = true', 'pt');
      expect(node.action).toBe('delete');
      expect(extractRoleValue(node, 'source')).toBe('usuarios');
    });

    it('natural aliases: adicionar/remover map to insert/delete', () => {
      const insertFormal = sql.compile('inserir Alice em usuarios', 'pt');
      const insertNatural = sql.compile('adicionar Alice em usuarios', 'pt');
      expect(insertNatural.code).toBe(insertFormal.code);

      const deleteFormal = sql.compile('excluir de usuarios onde inactive = true', 'pt');
      const deleteNatural = sql.compile('remover de usuarios onde inactive = true', 'pt');
      expect(deleteNatural.code).toBe(deleteFormal.code);
    });

    it('natural: obter compiles to SELECT *', () => {
      const result = sql.compile('obter usuarios onde age > 18 limite 10', 'pt');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT * FROM usuarios WHERE age > 18 LIMIT 10');
    });
  });

  describe('Russian (SVO)', () => {
    it('should parse Russian SELECT', () => {
      const node = sql.parse('выбрать name из users', 'ru');
      expect(node.action).toBe('select');
      expect(extractRoleValue(node, 'columns')).toBe('name');
      expect(extractRoleValue(node, 'source')).toBe('users');
    });

    it('should compile Russian SELECT to exact SQL', () => {
      const result = sql.compile('выбрать name из users', 'ru');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT name FROM users');
    });

    it('should compile Russian SELECT with WHERE to exact SQL', () => {
      const result = sql.compile('выбрать name из users где age > 18', 'ru');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT name FROM users WHERE age > 18');
    });

    it('should parse Russian INSERT', () => {
      const node = sql.parse('вставить Alice в users', 'ru');
      expect(node.action).toBe('insert');
      expect(extractRoleValue(node, 'values')).toBe('Alice');
      expect(extractRoleValue(node, 'destination')).toBe('users');
    });

    it('should compile Russian UPDATE to SQL', () => {
      const result = sql.compile('обновить users установить active = true где id = 5', 'ru');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('UPDATE users SET active = true WHERE id = 5');
    });

    it('should parse Russian DELETE', () => {
      const node = sql.parse('удалить из users где inactive = true', 'ru');
      expect(node.action).toBe('delete');
      expect(extractRoleValue(node, 'source')).toBe('users');
    });

    it('natural alias: добавить is вставить', () => {
      const formal = sql.compile('вставить Alice в users', 'ru');
      const natural = sql.compile('добавить Alice в users', 'ru');
      expect(formal.ok).toBe(true);
      expect(natural.ok).toBe(true);
      expect(natural.code).toBe(formal.code);
    });

    it('natural: получить compiles to SELECT *', () => {
      const result = sql.compile('получить users где age > 18 лимит 10', 'ru');
      expect(result.ok).toBe(true);
      expect(result.code).toBe('SELECT * FROM users WHERE age > 18 LIMIT 10');
    });
  });

  // ===========================================================================
  // Round-trips: parse native → SemanticNode → renderSQL → parse again
  // ===========================================================================

  describe('Round-trips (parse → render → re-parse)', () => {
    // [lang, nativeSource][] — each re-parses to identical SQL after rendering.
    const cases: Array<[string, string]> = [
      ['de', 'auswählen name von users'],
      ['de', 'auswählen name von users wo age > 18'],
      ['de', 'einfügen Alice in users'],
      ['de', 'löschen von users wo inactive = true'],
      ['pt', 'selecionar nome de usuarios'],
      ['pt', 'selecionar nome de usuarios onde age > 18'],
      ['pt', 'inserir Alice em usuarios'],
      ['pt', 'excluir de usuarios onde inactive = true'],
      ['ru', 'выбрать name из users'],
      ['ru', 'выбрать name из users где age > 18'],
      ['ru', 'вставить Alice в users'],
      ['ru', 'удалить из users где inactive = true'],
    ];

    it.each(cases)('[%s] "%s" survives a render round-trip', (lang, source) => {
      const node = sql.parse(source, lang);
      const rendered = renderSQL(node, lang);
      const reparsed = sql.parse(rendered, lang);

      const original = sql.compile(source, lang);
      const roundTripped = sql.compile(rendered, lang);
      expect(original.ok).toBe(true);
      expect(roundTripped.ok).toBe(true);
      expect(roundTripped.code).toBe(original.code);
      expect(reparsed.action).toBe(node.action);
    });

    it('renders an English parse into each new language and back', () => {
      const node = sql.parse('select name from users', 'en');
      const en = sql.compile('select name from users', 'en');

      for (const lang of ['de', 'pt', 'ru']) {
        const rendered = renderSQL(node, lang);
        const result = sql.compile(rendered, lang);
        expect(result.ok).toBe(true);
        expect(result.code).toBe(en.code);
      }
    });
  });
});
