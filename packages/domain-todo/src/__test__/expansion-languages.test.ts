/**
 * Bridge-era languages (arc Phase 2 expansion): German, Portuguese, Russian.
 *
 * Each language was added with ONE vocab file (todo verbs + the list marker
 * word) — grammar comes from @lokascript/semantic's profiles through the
 * framework bridge. Mirrors the per-language blocks in todo-domain.test.ts,
 * plus parse → SemanticNode → renderTodo round-trips.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import { createTodoDSL, renderTodo } from '../index';

let todo: MultilingualDSL;

beforeAll(() => {
  todo = createTodoDSL();
});

describe('Todo Domain — bridge-era languages', () => {
  it('supports 11 languages', () => {
    const languages = todo.getSupportedLanguages();
    expect(languages).toHaveLength(11);
    for (const code of ['de', 'pt', 'ru']) {
      expect(languages).toContain(code);
    }
  });

  describe('German (SVO)', () => {
    it('parses add with item and list', () => {
      const node = todo.parse('hinzufügen milk zu groceries', 'de');
      expect(node.action).toBe('add');
      expect(extractRoleValue(node, 'item')).toBe('milk');
      expect(extractRoleValue(node, 'list')).toBe('groceries');
    });

    it('parses add without a list', () => {
      const node = todo.parse('hinzufügen milk', 'de');
      expect(node.action).toBe('add');
      expect(extractRoleValue(node, 'item')).toBe('milk');
    });

    it('parses complete', () => {
      const node = todo.parse('erledigen milk', 'de');
      expect(node.action).toBe('complete');
      expect(extractRoleValue(node, 'item')).toBe('milk');
    });

    it('parses list', () => {
      const node = todo.parse('auflisten groceries', 'de');
      expect(node.action).toBe('list');
      expect(extractRoleValue(node, 'list')).toBe('groceries');
    });

    it('natural alias: ergänzen is hinzufügen', () => {
      const formal = todo.compile('hinzufügen milk zu groceries', 'de');
      const natural = todo.compile('ergänzen milk zu groceries', 'de');
      expect(formal.ok).toBe(true);
      expect(natural.ok).toBe(true);
      expect(natural.code).toBe(formal.code);
    });
  });

  describe('Portuguese (SVO)', () => {
    it('parses add with item and list', () => {
      const node = todo.parse('adicionar milk a groceries', 'pt');
      expect(node.action).toBe('add');
      expect(extractRoleValue(node, 'item')).toBe('milk');
      expect(extractRoleValue(node, 'list')).toBe('groceries');
    });

    it('parses complete', () => {
      const node = todo.parse('concluir milk', 'pt');
      expect(node.action).toBe('complete');
      expect(extractRoleValue(node, 'item')).toBe('milk');
    });

    it('parses list', () => {
      const node = todo.parse('listar groceries', 'pt');
      expect(node.action).toBe('list');
      expect(extractRoleValue(node, 'list')).toBe('groceries');
    });

    it('natural alias: mostrar is listar', () => {
      const formal = todo.compile('listar groceries', 'pt');
      const natural = todo.compile('mostrar groceries', 'pt');
      expect(formal.ok).toBe(true);
      expect(natural.ok).toBe(true);
      expect(natural.code).toBe(formal.code);
    });
  });

  describe('Russian (SVO)', () => {
    it('parses add with item and list', () => {
      const node = todo.parse('добавить milk в groceries', 'ru');
      expect(node.action).toBe('add');
      expect(extractRoleValue(node, 'item')).toBe('milk');
      expect(extractRoleValue(node, 'list')).toBe('groceries');
    });

    it('parses complete', () => {
      const node = todo.parse('завершить milk', 'ru');
      expect(node.action).toBe('complete');
      expect(extractRoleValue(node, 'item')).toBe('milk');
    });

    it('parses list', () => {
      const node = todo.parse('показать groceries', 'ru');
      expect(node.action).toBe('list');
      expect(extractRoleValue(node, 'list')).toBe('groceries');
    });

    it('natural alias: выполнить is завершить', () => {
      const formal = todo.compile('завершить milk', 'ru');
      const natural = todo.compile('выполнить milk', 'ru');
      expect(formal.ok).toBe(true);
      expect(natural.ok).toBe(true);
      expect(natural.code).toBe(formal.code);
    });
  });

  // ===========================================================================
  // Round-trips: parse native → SemanticNode → renderTodo → re-parse
  // ===========================================================================

  describe('Round-trips (parse → render → re-parse)', () => {
    // [lang, nativeSource][] — each re-parses to identical output after render.
    const cases: Array<[string, string]> = [
      ['de', 'hinzufügen milk zu groceries'],
      ['de', 'erledigen milk'],
      ['de', 'auflisten groceries'],
      ['pt', 'adicionar milk a groceries'],
      ['pt', 'concluir milk'],
      ['pt', 'listar groceries'],
      ['ru', 'добавить milk в groceries'],
      ['ru', 'завершить milk'],
      ['ru', 'показать groceries'],
    ];

    it.each(cases)('[%s] "%s" survives a render round-trip', (lang, source) => {
      const node = todo.parse(source, lang);
      const rendered = renderTodo(node, lang);
      const reparsed = todo.parse(rendered, lang);

      const original = todo.compile(source, lang);
      const roundTripped = todo.compile(rendered, lang);
      expect(original.ok).toBe(true);
      expect(roundTripped.ok).toBe(true);
      expect(roundTripped.code).toBe(original.code);
      expect(reparsed.action).toBe(node.action);
    });
  });
});
