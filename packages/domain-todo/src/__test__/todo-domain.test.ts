import { describe, it, expect, beforeAll } from 'vitest';
import { createTodoDSL } from '../index';
import type { MultilingualDSL } from '@lokascript/framework';

describe('domain-todo', () => {
  let dsl: MultilingualDSL;

  beforeAll(() => {
    dsl = createTodoDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('language support', () => {
    it('supports 3 languages', () => {
      const langs = dsl.getSupportedLanguages();
      expect(langs).toContain('en');
      expect(langs).toContain('es');
      expect(langs).toContain('ja');
    });
  });

  // ===========================================================================
  // English (SVO)
  // ===========================================================================

  describe('English (en)', () => {
    it('parses "add" with item', () => {
      const result = dsl.parse('add groceries', 'en');
      expect(result.action).toBe('add');
    });

    it('parses "add" with item and list', () => {
      const result = dsl.parse('add milk to groceries', 'en');
      expect(result.action).toBe('add');
    });

    it('parses "complete" with item', () => {
      const result = dsl.parse('complete milk', 'en');
      expect(result.action).toBe('complete');
    });

    it('parses "list" with optional list name', () => {
      const result = dsl.parse('list groceries', 'en');
      expect(result.action).toBe('list');
    });

    it('compiles "add" to JSON', () => {
      const result = dsl.compile('add milk to groceries', 'en');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });

    it('compiles "complete" to JSON', () => {
      const result = dsl.compile('complete milk', 'en');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('complete');
    });

    it('compiles "list" to JSON', () => {
      const result = dsl.compile('list groceries', 'en');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('list');
    });

    it('validates correct input', () => {
      const result = dsl.validate('add milk', 'en');
      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (es)', () => {
    it('parses "agregar" with item', () => {
      const result = dsl.parse('agregar leche', 'es');
      expect(result.action).toBe('add');
    });

    it('parses "agregar" with item and list', () => {
      const result = dsl.parse('agregar leche a compras', 'es');
      expect(result.action).toBe('add');
    });

    it('parses "completar" with item', () => {
      const result = dsl.parse('completar leche', 'es');
      expect(result.action).toBe('complete');
    });

    it('parses "listar" with list name', () => {
      const result = dsl.parse('listar compras', 'es');
      expect(result.action).toBe('list');
    });

    it('compiles "agregar" to JSON', () => {
      const result = dsl.compile('agregar leche a compras', 'es');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  describe('Japanese (ja)', () => {
    it('parses "追加" (add) with item', () => {
      const result = dsl.parse('ミルク を 追加', 'ja');
      expect(result.action).toBe('add');
    });

    it('parses "完了" (complete) with item', () => {
      const result = dsl.parse('ミルク を 完了', 'ja');
      expect(result.action).toBe('complete');
    });

    it('parses "一覧" (list) with list name', () => {
      const result = dsl.parse('買い物 を 一覧', 'ja');
      expect(result.action).toBe('list');
    });

    it('compiles "追加" to JSON', () => {
      const result = dsl.compile('ミルク を 追加', 'ja');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });
  });

  // ===========================================================================
  // Semantic Equivalence
  // ===========================================================================

  describe('semantic equivalence', () => {
    it('"complete" produces same action across EN and ES', () => {
      const en = dsl.parse('complete milk', 'en');
      const es = dsl.parse('completar leche', 'es');
      expect(en.action).toBe(es.action);
      expect(en.action).toBe('complete');
    });

    it('"add" produces same action across EN and JA', () => {
      const en = dsl.parse('add milk', 'en');
      const ja = dsl.parse('ミルク を 追加', 'ja');
      expect(en.action).toBe(ja.action);
      expect(en.action).toBe('add');
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('returns errors for invalid input', () => {
      const result = dsl.validate('completely invalid gibberish xyz', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('returns errors for empty input', () => {
      const result = dsl.validate('', 'en');
      expect(result.valid).toBe(false);
    });
  });
});
