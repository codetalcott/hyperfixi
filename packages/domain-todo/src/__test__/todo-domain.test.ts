/**
 * Todo Domain Tests
 *
 * Validates the multilingual todo DSL across 8 languages (EN, ES, JA, AR, KO, ZH, TR, FR)
 * covering SVO, SOV, and VSO word orders, with role value verification,
 * compilation output assertions, renderer round-trips, alternative keywords,
 * and edge cases.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createTodoDSL, renderTodo } from '../index';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

describe('Todo Domain', () => {
  let todo: MultilingualDSL;

  beforeAll(() => {
    todo = createTodoDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 11 languages', () => {
      const langs = todo.getSupportedLanguages();
      expect(langs).toContain('en');
      expect(langs).toContain('es');
      expect(langs).toContain('ja');
      expect(langs).toContain('ar');
      expect(langs).toContain('ko');
      expect(langs).toContain('zh');
      expect(langs).toContain('tr');
      expect(langs).toContain('fr');
      expect(langs).toContain('de');
      expect(langs).toContain('pt');
      expect(langs).toContain('ru');
      expect(langs).toHaveLength(11);
    });

    it('should reject unsupported language', () => {
      expect(() => todo.parse('add milk', 'xx')).toThrow();
    });
  });

  // ===========================================================================
  // English (SVO)
  // ===========================================================================

  describe('English (SVO)', () => {
    it('parses "add" with item', () => {
      const result = todo.parse('add groceries', 'en');
      expect(result.action).toBe('add');
      expect(result.roles.has('item')).toBe(true);
    });

    it('extracts correct role value from "add"', () => {
      const result = todo.parse('add milk', 'en');
      expect(extractRoleValue(result, 'item')).toBe('milk');
    });

    it('parses "add" with item and list', () => {
      const result = todo.parse('add milk to groceries', 'en');
      expect(result.action).toBe('add');
      expect(result.roles.has('item')).toBe(true);
      expect(result.roles.has('list')).toBe(true);
    });

    it('extracts correct role values from "add" with list', () => {
      const result = todo.parse('add milk to groceries', 'en');
      expect(extractRoleValue(result, 'item')).toBe('milk');
      expect(extractRoleValue(result, 'list')).toBe('groceries');
    });

    it('parses "complete" with item', () => {
      const result = todo.parse('complete milk', 'en');
      expect(result.action).toBe('complete');
      expect(extractRoleValue(result, 'item')).toBe('milk');
    });

    it('parses "list" with optional list name', () => {
      const result = todo.parse('list groceries', 'en');
      expect(result.action).toBe('list');
      expect(extractRoleValue(result, 'list')).toBe('groceries');
    });

    it('parses bare "list" without argument', () => {
      const result = todo.parse('list', 'en');
      expect(result.action).toBe('list');
    });

    it('compiles "add" with item and list to correct JSON', () => {
      const result = todo.compile('add milk to groceries', 'en');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
      expect(parsed.item).toBe('milk');
      expect(parsed.list).toBe('groceries');
    });

    it('compiles "complete" to correct JSON', () => {
      const result = todo.compile('complete milk', 'en');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('complete');
      expect(parsed.item).toBe('milk');
    });

    it('compiles "list" to correct JSON', () => {
      const result = todo.compile('list groceries', 'en');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('list');
      expect(parsed.list).toBe('groceries');
    });

    it('validates correct input', () => {
      const result = todo.validate('add milk', 'en');
      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // English Alternative Keywords
  // ===========================================================================

  describe('English alternative keywords', () => {
    it('parses "done" as complete', () => {
      const result = todo.parse('done milk', 'en');
      expect(result.action).toBe('complete');
    });

    it('parses "finish" as complete', () => {
      const result = todo.parse('finish milk', 'en');
      expect(result.action).toBe('complete');
    });

    it('parses "show" as list', () => {
      const result = todo.parse('show groceries', 'en');
      expect(result.action).toBe('list');
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('parses "agregar" with item', () => {
      const result = todo.parse('agregar leche', 'es');
      expect(result.action).toBe('add');
      expect(extractRoleValue(result, 'item')).toBe('leche');
    });

    it('parses "agregar" with item and list', () => {
      const result = todo.parse('agregar leche a compras', 'es');
      expect(result.action).toBe('add');
      expect(extractRoleValue(result, 'item')).toBe('leche');
      expect(extractRoleValue(result, 'list')).toBe('compras');
    });

    it('parses "completar" with item', () => {
      const result = todo.parse('completar leche', 'es');
      expect(result.action).toBe('complete');
      expect(extractRoleValue(result, 'item')).toBe('leche');
    });

    it('parses "listar" with list name', () => {
      const result = todo.parse('listar compras', 'es');
      expect(result.action).toBe('list');
      expect(extractRoleValue(result, 'list')).toBe('compras');
    });

    it('compiles "agregar" to correct JSON', () => {
      const result = todo.compile('agregar leche a compras', 'es');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
      expect(parsed.item).toBe('leche');
      expect(parsed.list).toBe('compras');
    });
  });

  // ===========================================================================
  // Spanish Alternative Keywords
  // ===========================================================================

  describe('Spanish alternative keywords', () => {
    it('parses "añadir" as add', () => {
      const result = todo.parse('añadir leche', 'es');
      expect(result.action).toBe('add');
    });

    it('parses "terminar" as complete', () => {
      const result = todo.parse('terminar leche', 'es');
      expect(result.action).toBe('complete');
    });

    it('parses "mostrar" as list', () => {
      const result = todo.parse('mostrar compras', 'es');
      expect(result.action).toBe('list');
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('parses "追加" (add) with item', () => {
      const result = todo.parse('ミルク を 追加', 'ja');
      expect(result.action).toBe('add');
    });

    it('parses "追加" (add) with item and list', () => {
      const result = todo.parse('買い物 に ミルク を 追加', 'ja');
      expect(result.action).toBe('add');
    });

    it('parses "完了" (complete) with item', () => {
      const result = todo.parse('ミルク を 完了', 'ja');
      expect(result.action).toBe('complete');
    });

    it('parses "一覧" (list) with list name', () => {
      const result = todo.parse('買い物 を 一覧', 'ja');
      expect(result.action).toBe('list');
    });

    it('compiles "追加" to correct JSON', () => {
      const result = todo.compile('ミルク を 追加', 'ja');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });
  });

  // ===========================================================================
  // Arabic (VSO)
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('parses "أضف" (add) with item', () => {
      const result = todo.parse('أضف حليب', 'ar');
      expect(result.action).toBe('add');
    });

    it('parses "أضف" (add) with item and list', () => {
      const result = todo.parse('أضف حليب إلى مشتريات', 'ar');
      expect(result.action).toBe('add');
    });

    it('parses "أكمل" (complete) with item', () => {
      const result = todo.parse('أكمل حليب', 'ar');
      expect(result.action).toBe('complete');
    });

    it('parses "اعرض" (list) with list name', () => {
      const result = todo.parse('اعرض مشتريات', 'ar');
      expect(result.action).toBe('list');
    });

    it('compiles "أضف" to correct JSON', () => {
      const result = todo.compile('أضف حليب إلى مشتريات', 'ar');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });
  });

  // ===========================================================================
  // Korean (SOV)
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('parses "추가" (add) with item', () => {
      const result = todo.parse('우유 를 추가', 'ko');
      expect(result.action).toBe('add');
    });

    it('parses "완료" (complete) with item', () => {
      const result = todo.parse('우유 를 완료', 'ko');
      expect(result.action).toBe('complete');
    });

    it('parses "목록" (list) with list name', () => {
      const result = todo.parse('장보기 를 목록', 'ko');
      expect(result.action).toBe('list');
    });

    it('compiles "추가" to correct JSON', () => {
      const result = todo.compile('우유 를 추가', 'ko');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('parses "添加" (add) with item', () => {
      const result = todo.parse('添加 牛奶', 'zh');
      expect(result.action).toBe('add');
    });

    it('parses "添加" (add) with item and list', () => {
      const result = todo.parse('添加 牛奶 到 杂货', 'zh');
      expect(result.action).toBe('add');
    });

    it('parses "完成" (complete) with item', () => {
      const result = todo.parse('完成 牛奶', 'zh');
      expect(result.action).toBe('complete');
    });

    it('parses "列出" (list) with list name', () => {
      const result = todo.parse('列出 杂货', 'zh');
      expect(result.action).toBe('list');
    });

    it('compiles "添加" to correct JSON', () => {
      const result = todo.compile('添加 牛奶', 'zh');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });
  });

  // ===========================================================================
  // Turkish (SOV)
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('parses "ekle" (add) with item', () => {
      const result = todo.parse('süt ekle', 'tr');
      expect(result.action).toBe('add');
    });

    it('parses "tamamla" (complete) with item', () => {
      const result = todo.parse('süt tamamla', 'tr');
      expect(result.action).toBe('complete');
    });

    it('parses "listele" (list) with list name', () => {
      const result = todo.parse('market listele', 'tr');
      expect(result.action).toBe('list');
    });

    it('compiles "ekle" to correct JSON', () => {
      const result = todo.compile('süt ekle', 'tr');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('parses "ajouter" (add) with item', () => {
      const result = todo.parse('ajouter lait', 'fr');
      expect(result.action).toBe('add');
    });

    it('parses "ajouter" (add) with item and list', () => {
      const result = todo.parse('ajouter lait à courses', 'fr');
      expect(result.action).toBe('add');
    });

    it('parses "terminer" (complete) with item', () => {
      const result = todo.parse('terminer lait', 'fr');
      expect(result.action).toBe('complete');
    });

    it('parses "lister" (list) with list name', () => {
      const result = todo.parse('lister courses', 'fr');
      expect(result.action).toBe('list');
    });

    it('compiles "ajouter" to correct JSON', () => {
      const result = todo.compile('ajouter lait à courses', 'fr');
      expect(result.ok).toBe(true);
      const parsed = JSON.parse(result.code!);
      expect(parsed.action).toBe('add');
    });
  });

  // ===========================================================================
  // French Alternative Keywords
  // ===========================================================================

  describe('French alternative keywords', () => {
    it('parses "afficher" as list', () => {
      const result = todo.parse('afficher courses', 'fr');
      expect(result.action).toBe('list');
    });
  });

  // ===========================================================================
  // Semantic Equivalence
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('"complete" produces same action across EN and ES', () => {
      const en = todo.parse('complete milk', 'en');
      const es = todo.parse('completar leche', 'es');
      expect(en.action).toBe(es.action);
      expect(en.action).toBe('complete');
    });

    it('"add" produces same action across EN and JA', () => {
      const en = todo.parse('add milk', 'en');
      const ja = todo.parse('ミルク を 追加', 'ja');
      expect(en.action).toBe(ja.action);
      expect(en.action).toBe('add');
    });

    it('"add" produces same action across EN and AR (VSO)', () => {
      const en = todo.parse('add milk', 'en');
      const ar = todo.parse('أضف حليب', 'ar');
      expect(en.action).toBe(ar.action);
      expect(en.action).toBe('add');
    });

    it('"list" produces same action across EN, KO, and ZH', () => {
      const en = todo.parse('list groceries', 'en');
      const ko = todo.parse('장보기 를 목록', 'ko');
      const zh = todo.parse('列出 杂货', 'zh');
      expect(en.action).toBe(ko.action);
      expect(en.action).toBe(zh.action);
      expect(en.action).toBe('list');
    });

    it('"complete" produces same action across TR and FR', () => {
      const tr = todo.parse('süt tamamla', 'tr');
      const fr = todo.parse('terminer lait', 'fr');
      expect(tr.action).toBe(fr.action);
      expect(tr.action).toBe('complete');
    });
  });

  // ===========================================================================
  // Renderer
  // ===========================================================================

  describe('Renderer', () => {
    it('renders add to English', () => {
      const node = todo.parse('add milk to groceries', 'en');
      const rendered = renderTodo(node, 'en');
      expect(rendered).toContain('add');
      expect(rendered).toContain('milk');
    });

    it('renders add to Spanish', () => {
      const node = todo.parse('add milk to groceries', 'en');
      const rendered = renderTodo(node, 'es');
      expect(rendered).toContain('agregar');
    });

    it('renders complete to Japanese (SOV order)', () => {
      const node = todo.parse('complete milk', 'en');
      const rendered = renderTodo(node, 'ja');
      expect(rendered).toContain('完了');
      // SOV: item comes before verb
      expect(rendered.indexOf('milk')).toBeLessThan(rendered.indexOf('完了'));
    });

    it('renders add to Arabic', () => {
      const node = todo.parse('add milk', 'en');
      const rendered = renderTodo(node, 'ar');
      expect(rendered).toContain('أضف');
    });

    it('renders list to Korean (SOV order)', () => {
      const node = todo.parse('list groceries', 'en');
      const rendered = renderTodo(node, 'ko');
      expect(rendered).toContain('목록');
    });

    it('renders add to Chinese', () => {
      const node = todo.parse('add milk', 'en');
      const rendered = renderTodo(node, 'zh');
      expect(rendered).toContain('添加');
    });

    it('renders complete to Turkish (SOV order)', () => {
      const node = todo.parse('complete milk', 'en');
      const rendered = renderTodo(node, 'tr');
      expect(rendered).toContain('tamamla');
    });

    it('renders list to French', () => {
      const node = todo.parse('list groceries', 'en');
      const rendered = renderTodo(node, 'fr');
      expect(rendered).toContain('lister');
    });

    it('renders bare list command', () => {
      const node = todo.parse('list', 'en');
      const rendered = renderTodo(node, 'en');
      expect(rendered).toBe('list');
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('returns errors for invalid input', () => {
      const result = todo.validate('completely invalid gibberish xyz', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('returns errors for empty input', () => {
      const result = todo.validate('', 'en');
      expect(result.valid).toBe(false);
    });
  });
});
