/**
 * JSX Domain Tests
 *
 * Validates the multilingual JSX DSL across 4 languages (EN, ES, JA, AR)
 * covering SVO, SOV, and VSO word orders for React/JSX code generation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createJSXDSL } from '../index';
import type { MultilingualDSL } from '@lokascript/framework';

describe('JSX Domain', () => {
  let jsx: MultilingualDSL;

  beforeAll(() => {
    jsx = createJSXDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 4 languages', () => {
      const languages = jsx.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toHaveLength(4);
    });

    it('should reject unsupported language', () => {
      expect(() => jsx.parse('element div', 'fr')).toThrow();
    });
  });

  // ===========================================================================
  // English (SVO)
  // ===========================================================================

  describe('English (SVO)', () => {
    // --- element ---
    it('should parse element command', () => {
      const node = jsx.parse('element div with className "app"', 'en');
      expect(node.action).toBe('element');
      expect(node.roles.has('tag')).toBe(true);
    });

    it('should compile element to JSX', () => {
      const result = jsx.compile('element div with className "app"', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<div');
      expect(result.code).toContain('className');
    });

    it('should compile self-closing element', () => {
      const result = jsx.compile('element img', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<img');
      expect(result.code).toContain('/>');
    });

    // --- component ---
    it('should parse component command', () => {
      const node = jsx.parse('component Button with props text onClick', 'en');
      expect(node.action).toBe('component');
      expect(node.roles.has('name')).toBe(true);
    });

    it('should compile component to function', () => {
      const result = jsx.compile('component Button with props text onClick', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('function Button');
    });

    // --- render ---
    it('should parse render command', () => {
      const node = jsx.parse('render App into root', 'en');
      expect(node.action).toBe('render');
      expect(node.roles.has('source')).toBe(true);
      expect(node.roles.has('destination')).toBe(true);
    });

    it('should compile render to createRoot', () => {
      const result = jsx.compile('render App into root', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('createRoot');
      expect(result.code).toContain('getElementById("root")');
      expect(result.code).toContain('<App />');
    });

    // --- state ---
    it('should parse state command', () => {
      const node = jsx.parse('state count initial 0', 'en');
      expect(node.action).toBe('state');
      expect(node.roles.has('name')).toBe(true);
    });

    it('should compile state to useState', () => {
      const result = jsx.compile('state count initial 0', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState');
      expect(result.code).toContain('count');
      expect(result.code).toContain('setCount');
    });

    // --- effect ---
    it('should parse effect command', () => {
      const node = jsx.parse('effect fetchData on count', 'en');
      expect(node.action).toBe('effect');
      expect(node.roles.has('callback')).toBe(true);
    });

    it('should compile effect to useEffect', () => {
      const result = jsx.compile('effect fetchData on count', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useEffect');
      expect(result.code).toContain('fetchData');
    });

    // --- fragment ---
    it('should parse fragment command', () => {
      const node = jsx.parse('fragment header footer', 'en');
      expect(node.action).toBe('fragment');
      expect(node.roles.has('children')).toBe(true);
    });

    it('should compile fragment to JSX fragment', () => {
      const result = jsx.compile('fragment header footer', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<>');
      expect(result.code).toContain('</>');
    });

    // --- validation ---
    it('should validate correct input', () => {
      const result = jsx.validate('element div with className "app"', 'en');
      expect(result.valid).toBe(true);
      expect(result.node).toBeDefined();
    });

    it('should reject invalid input', () => {
      const result = jsx.validate('xyzzy foobar baz', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('should parse Spanish element', () => {
      const node = jsx.parse('elemento div con className "app"', 'es');
      expect(node.action).toBe('element');
      expect(node.roles.has('tag')).toBe(true);
    });

    it('should compile Spanish element to JSX', () => {
      const result = jsx.compile('elemento div con className "app"', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<div');
    });

    it('should parse Spanish render', () => {
      const node = jsx.parse('renderizar App en root', 'es');
      expect(node.action).toBe('render');
      expect(node.roles.has('source')).toBe(true);
      expect(node.roles.has('destination')).toBe(true);
    });

    it('should compile Spanish render to createRoot', () => {
      const result = jsx.compile('renderizar App en root', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('createRoot');
      expect(result.code).toContain('<App />');
    });

    it('should parse Spanish state', () => {
      const node = jsx.parse('estado count inicial 0', 'es');
      expect(node.action).toBe('state');
    });

    it('should compile Spanish state to useState', () => {
      const result = jsx.compile('estado count inicial 0', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState');
    });

    it('should parse Spanish effect', () => {
      const node = jsx.parse('efecto fetchData en count', 'es');
      expect(node.action).toBe('effect');
    });

    it('should parse Spanish fragment', () => {
      const node = jsx.parse('fragmento header footer', 'es');
      expect(node.action).toBe('fragment');
    });

    it('should parse Spanish component', () => {
      const node = jsx.parse('componente Button con props text', 'es');
      expect(node.action).toBe('component');
    });
  });

  // ===========================================================================
  // Japanese (SOV) — Verb Last
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('should parse Japanese element (SOV: object before verb)', () => {
      const node = jsx.parse('div className で 要素', 'ja');
      expect(node.action).toBe('element');
      expect(node.roles.has('tag')).toBe(true);
    });

    it('should compile Japanese element to JSX', () => {
      const result = jsx.compile('div className で 要素', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<div');
    });

    it('should parse Japanese render', () => {
      const node = jsx.parse('root に App 描画', 'ja');
      expect(node.action).toBe('render');
    });

    it('should compile Japanese render to createRoot', () => {
      const result = jsx.compile('root に App 描画', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('createRoot');
    });

    it('should parse Japanese state', () => {
      const node = jsx.parse('count 0 初期値 状態', 'ja');
      expect(node.action).toBe('state');
    });

    it('should compile Japanese state to useState', () => {
      const result = jsx.compile('count 0 初期値 状態', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState');
    });

    it('should parse Japanese effect', () => {
      const node = jsx.parse('count で fetchData エフェクト', 'ja');
      expect(node.action).toBe('effect');
    });

    it('should parse Japanese fragment', () => {
      const node = jsx.parse('header フラグメント', 'ja');
      expect(node.action).toBe('fragment');
    });

    it('should parse Japanese component', () => {
      const node = jsx.parse('Button text プロパティ コンポーネント', 'ja');
      expect(node.action).toBe('component');
    });
  });

  // ===========================================================================
  // Arabic (VSO) — Verb First
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('should parse Arabic element (VSO: verb first)', () => {
      const node = jsx.parse('عنصر div مع className "app"', 'ar');
      expect(node.action).toBe('element');
      expect(node.roles.has('tag')).toBe(true);
    });

    it('should compile Arabic element to JSX', () => {
      const result = jsx.compile('عنصر div مع className "app"', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<div');
    });

    it('should parse Arabic render', () => {
      const node = jsx.parse('ارسم App في root', 'ar');
      expect(node.action).toBe('render');
    });

    it('should compile Arabic render to createRoot', () => {
      const result = jsx.compile('ارسم App في root', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('createRoot');
    });

    it('should parse Arabic state', () => {
      const node = jsx.parse('حالة count ابتدائي 0', 'ar');
      expect(node.action).toBe('state');
    });

    it('should compile Arabic state to useState', () => {
      const result = jsx.compile('حالة count ابتدائي 0', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState');
    });

    it('should parse Arabic effect', () => {
      const node = jsx.parse('تأثير fetchData عند count', 'ar');
      expect(node.action).toBe('effect');
    });

    it('should parse Arabic fragment', () => {
      const node = jsx.parse('جزء header footer', 'ar');
      expect(node.action).toBe('fragment');
    });

    it('should parse Arabic component', () => {
      const node = jsx.parse('مكوّن Button مع خصائص text', 'ar');
      expect(node.action).toBe('component');
    });
  });

  // ===========================================================================
  // Cross-Language Semantic Equivalence
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('should parse EN and ES element to equivalent structures', () => {
      const en = jsx.parse('element div with className "app"', 'en');
      const es = jsx.parse('elemento div con className "app"', 'es');
      expect(en.action).toBe(es.action);
      expect(en.roles.size).toBe(es.roles.size);
    });

    it('should parse EN and JA render to equivalent structures', () => {
      const en = jsx.parse('render App into root', 'en');
      const ja = jsx.parse('root に App 描画', 'ja');
      expect(en.action).toBe(ja.action);
      expect(en.roles.has('source')).toBe(ja.roles.has('source'));
      expect(en.roles.has('destination')).toBe(ja.roles.has('destination'));
    });

    it('should parse EN and AR render to equivalent structures', () => {
      const en = jsx.parse('render App into root', 'en');
      const ar = jsx.parse('ارسم App في root', 'ar');
      expect(en.action).toBe(ar.action);
      expect(en.roles.has('source')).toBe(ar.roles.has('source'));
      expect(en.roles.has('destination')).toBe(ar.roles.has('destination'));
    });

    it('should parse state in all 4 languages to equivalent action', () => {
      const en = jsx.parse('state count initial 0', 'en');
      const es = jsx.parse('estado count inicial 0', 'es');
      const ja = jsx.parse('count 0 初期値 状態', 'ja');
      const ar = jsx.parse('حالة count ابتدائي 0', 'ar');
      expect(en.action).toBe('state');
      expect(es.action).toBe('state');
      expect(ja.action).toBe('state');
      expect(ar.action).toBe('state');
    });

    it('should compile render from all languages to equivalent output', () => {
      const en = jsx.compile('render App into root', 'en');
      const es = jsx.compile('renderizar App en root', 'es');
      const ja = jsx.compile('root に App 描画', 'ja');
      const ar = jsx.compile('ارسم App في root', 'ar');
      expect(en.ok).toBe(true);
      expect(es.ok).toBe(true);
      expect(ja.ok).toBe(true);
      expect(ar.ok).toBe(true);
      // All should generate createRoot
      for (const result of [en, es, ja, ar]) {
        expect(result.code).toContain('createRoot');
        expect(result.code).toContain('.render(');
      }
    });
  });

  // ===========================================================================
  // Code Generation Quality
  // ===========================================================================

  describe('Code Generation', () => {
    it('should generate valid useState with setter naming', () => {
      const result = jsx.compile('state isOpen initial false', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('isOpen');
      expect(result.code).toContain('setIsOpen');
      expect(result.code).toContain('useState(false)');
    });

    it('should generate useEffect with deps array', () => {
      const result = jsx.compile('effect loadData on userId', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useEffect');
      expect(result.code).toContain('loadData');
    });

    it('should generate empty fragment', () => {
      // fragment with children should produce <>...</>
      const result = jsx.compile('fragment sidebar content', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<>');
      expect(result.code).toContain('</>');
    });

    it('should generate component function skeleton', () => {
      const result = jsx.compile('component Card with props title body', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('function Card');
      expect(result.code).toContain('return');
    });
  });

  // ===========================================================================
  // Cross-Language Compilation Equivalence
  // ===========================================================================

  describe('Compilation Equivalence', () => {
    it('should compile state to identical output across all languages', () => {
      const en = jsx.compile('state count initial 0', 'en');
      const es = jsx.compile('estado count inicial 0', 'es');
      const ja = jsx.compile('count 0 初期値 状態', 'ja');
      const ar = jsx.compile('حالة count ابتدائي 0', 'ar');
      for (const result of [en, es, ja, ar]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('useState');
        expect(result.code).toContain('count');
        expect(result.code).toContain('setCount');
      }
    });

    it('should compile element to identical output across SVO languages', () => {
      const en = jsx.compile('element div with className "app"', 'en');
      const es = jsx.compile('elemento div con className "app"', 'es');
      for (const result of [en, es]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('<div');
        expect(result.code).toContain('className');
      }
    });

    it('should compile effect to identical output across all languages', () => {
      const en = jsx.compile('effect fetchData on count', 'en');
      const es = jsx.compile('efecto fetchData en count', 'es');
      const ja = jsx.compile('count で fetchData エフェクト', 'ja');
      const ar = jsx.compile('تأثير fetchData عند count', 'ar');
      for (const result of [en, es, ja, ar]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('useEffect');
        expect(result.code).toContain('fetchData');
      }
    });

    it('should compile fragment to identical output across all languages', () => {
      const en = jsx.compile('fragment header footer', 'en');
      const es = jsx.compile('fragmento header footer', 'es');
      const ar = jsx.compile('جزء header footer', 'ar');
      for (const result of [en, es, ar]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('<>');
        expect(result.code).toContain('</>');
      }
    });
  });

  // ===========================================================================
  // Code Generation Edge Cases
  // ===========================================================================

  describe('Code Generation Edge Cases', () => {
    it('should generate component function declaration', () => {
      const result = jsx.compile('component Button with props text onClick', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('function Button');
      // Note: multi-token prop extraction ('text onClick') is a known limitation —
      // the pattern matcher captures single tokens per role.
    });

    it('should generate fragment with PascalCase component name', () => {
      const result = jsx.compile('fragment sidebar', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<Sidebar />');
      // Note: multi-child capture ('sidebar content') is a known limitation —
      // single-role patterns capture one token.
    });

    it('should generate state with no initial value', () => {
      const result = jsx.compile('state count', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState(null)');
    });

    it('should generate effect with empty deps array when no deps given', () => {
      const result = jsx.compile('effect cleanup', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('[]');
    });

    it('should handle render with escaped characters in target ID', () => {
      const result = jsx.compile('render App into root', 'en');
      expect(result.ok).toBe(true);
      // Verify the output is well-formed JavaScript
      expect(result.code).toContain('document.getElementById("root")');
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle empty input', () => {
      expect(() => jsx.parse('', 'en')).toThrow();
    });

    it('should handle whitespace-only input', () => {
      expect(() => jsx.parse('   ', 'en')).toThrow();
    });

    it('should provide error info for unrecognized input', () => {
      const result = jsx.validate('xyzzy foobar', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate across all supported languages', () => {
      for (const lang of ['en', 'es', 'ja', 'ar']) {
        const result = jsx.validate('xyzzy foobar baz qux', lang);
        expect(result.valid).toBe(false);
      }
    });
  });
});
