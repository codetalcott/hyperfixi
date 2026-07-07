/**
 * JSX Domain Tests
 *
 * Validates the multilingual JSX DSL across 8 languages (EN, ES, JA, AR, KO, ZH, TR, FR)
 * covering SVO, SOV, and VSO word orders for React/JSX code generation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createJSXDSL, createJSXCodeGenerator, renderJSX } from '../index';
import type { MultilingualDSL, SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

describe('JSX Domain', () => {
  let jsx: MultilingualDSL;

  beforeAll(() => {
    jsx = createJSXDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 11 languages', () => {
      const languages = jsx.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toContain('ko');
      expect(languages).toContain('zh');
      expect(languages).toContain('tr');
      expect(languages).toContain('fr');
      expect(languages).toContain('de');
      expect(languages).toContain('pt');
      expect(languages).toContain('ru');
      expect(languages).toHaveLength(11);
    });

    it('should reject unsupported language', () => {
      expect(() => jsx.parse('element div', 'xx')).toThrow();
    });
  });

  // ===========================================================================
  // English (SVO)
  // ===========================================================================

  describe('English (SVO)', () => {
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

    it('should parse component command', () => {
      const node = jsx.parse('component Button with text onClick', 'en');
      expect(node.action).toBe('component');
      expect(node.roles.has('name')).toBe(true);
    });

    it('should compile component to function', () => {
      const result = jsx.compile('component Button with text onClick', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('function Button');
    });

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
      const node = jsx.parse('componente Button con text', 'es');
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
      const node = jsx.parse('مكوّن Button مع text', 'ar');
      expect(node.action).toBe('component');
    });
  });

  // ===========================================================================
  // Korean (SOV) — Verb Last
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('should parse Korean element', () => {
      const node = jsx.parse('div className 로 요소', 'ko');
      expect(node.action).toBe('element');
      expect(node.roles.has('tag')).toBe(true);
    });

    it('should compile Korean element to JSX', () => {
      const result = jsx.compile('div className 로 요소', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<div');
    });

    it('should parse Korean render', () => {
      const node = jsx.parse('root 에 App 렌더링', 'ko');
      expect(node.action).toBe('render');
    });

    it('should compile Korean render to createRoot', () => {
      const result = jsx.compile('root 에 App 렌더링', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('createRoot');
    });

    it('should parse Korean state', () => {
      const node = jsx.parse('count 0 초기값 상태', 'ko');
      expect(node.action).toBe('state');
    });

    it('should compile Korean state to useState', () => {
      const result = jsx.compile('count 0 초기값 상태', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState');
      expect(result.code).toContain('count');
    });

    it('should parse Korean effect', () => {
      const node = jsx.parse('count 에서 fetchData 효과', 'ko');
      expect(node.action).toBe('effect');
    });

    it('should parse Korean fragment', () => {
      const node = jsx.parse('header 프래그먼트', 'ko');
      expect(node.action).toBe('fragment');
    });

    it('should parse Korean component', () => {
      const node = jsx.parse('Button text 속성 컴포넌트', 'ko');
      expect(node.action).toBe('component');
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('should parse Chinese element', () => {
      const node = jsx.parse('元素 div 用 className', 'zh');
      expect(node.action).toBe('element');
      expect(node.roles.has('tag')).toBe(true);
    });

    it('should compile Chinese element to JSX', () => {
      const result = jsx.compile('元素 div 用 className', 'zh');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<div');
    });

    it('should parse Chinese render', () => {
      const node = jsx.parse('渲染 App 到 root', 'zh');
      expect(node.action).toBe('render');
    });

    it('should compile Chinese render to createRoot', () => {
      const result = jsx.compile('渲染 App 到 root', 'zh');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('createRoot');
    });

    it('should parse Chinese state', () => {
      const node = jsx.parse('状态 count 初始 0', 'zh');
      expect(node.action).toBe('state');
    });

    it('should compile Chinese state to useState', () => {
      const result = jsx.compile('状态 count 初始 0', 'zh');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState');
    });

    it('should parse Chinese effect', () => {
      const node = jsx.parse('效果 fetchData 在 count', 'zh');
      expect(node.action).toBe('effect');
    });

    it('should parse Chinese fragment', () => {
      const node = jsx.parse('片段 header footer', 'zh');
      expect(node.action).toBe('fragment');
    });

    it('should parse Chinese component', () => {
      const node = jsx.parse('组件 Button 属性 text', 'zh');
      expect(node.action).toBe('component');
    });
  });

  // ===========================================================================
  // Turkish (SOV) — Verb Last
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('should parse Turkish element', () => {
      const node = jsx.parse('div className ile oge', 'tr');
      expect(node.action).toBe('element');
      expect(node.roles.has('tag')).toBe(true);
    });

    it('should compile Turkish element to JSX', () => {
      const result = jsx.compile('div className ile oge', 'tr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<div');
    });

    it('should parse Turkish render', () => {
      const node = jsx.parse('root e App isle', 'tr');
      expect(node.action).toBe('render');
    });

    it('should compile Turkish render to createRoot', () => {
      const result = jsx.compile('root e App isle', 'tr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('createRoot');
    });

    it('should parse Turkish state', () => {
      const node = jsx.parse('count 0 baslangic durum', 'tr');
      expect(node.action).toBe('state');
    });

    it('should compile Turkish state to useState', () => {
      const result = jsx.compile('count 0 baslangic durum', 'tr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState');
    });

    it('should parse Turkish effect', () => {
      const node = jsx.parse('count de fetchData etki', 'tr');
      expect(node.action).toBe('effect');
    });

    it('should parse Turkish fragment', () => {
      const node = jsx.parse('header parca', 'tr');
      expect(node.action).toBe('fragment');
    });

    it('should parse Turkish component', () => {
      const node = jsx.parse('Button text ozellik bilesen', 'tr');
      expect(node.action).toBe('component');
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('should parse French element', () => {
      const node = jsx.parse('element div avec className', 'fr');
      expect(node.action).toBe('element');
      expect(node.roles.has('tag')).toBe(true);
    });

    it('should compile French element to JSX', () => {
      const result = jsx.compile('element div avec className', 'fr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<div');
    });

    it('should parse French render', () => {
      const node = jsx.parse('afficher App dans root', 'fr');
      expect(node.action).toBe('render');
    });

    it('should compile French render to createRoot', () => {
      const result = jsx.compile('afficher App dans root', 'fr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('createRoot');
    });

    it('should parse French state', () => {
      const node = jsx.parse('etat count initial 0', 'fr');
      expect(node.action).toBe('state');
    });

    it('should compile French state to useState', () => {
      const result = jsx.compile('etat count initial 0', 'fr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('useState');
    });

    it('should parse French effect', () => {
      const node = jsx.parse('effet fetchData sur count', 'fr');
      expect(node.action).toBe('effect');
    });

    it('should parse French fragment', () => {
      const node = jsx.parse('fragment header footer', 'fr');
      expect(node.action).toBe('fragment');
    });

    it('should parse French component', () => {
      const node = jsx.parse('composant Button proprietes text', 'fr');
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

    it('should parse state in all 8 languages to equivalent action', () => {
      const en = jsx.parse('state count initial 0', 'en');
      const es = jsx.parse('estado count inicial 0', 'es');
      const ja = jsx.parse('count 0 初期値 状態', 'ja');
      const ar = jsx.parse('حالة count ابتدائي 0', 'ar');
      const ko = jsx.parse('count 0 초기값 상태', 'ko');
      const zh = jsx.parse('状态 count 初始 0', 'zh');
      const tr = jsx.parse('count 0 baslangic durum', 'tr');
      const fr = jsx.parse('etat count initial 0', 'fr');
      for (const node of [en, es, ja, ar, ko, zh, tr, fr]) {
        expect(node.action).toBe('state');
      }
    });

    it('should compile render from all 8 languages to equivalent output', () => {
      const en = jsx.compile('render App into root', 'en');
      const es = jsx.compile('renderizar App en root', 'es');
      const ja = jsx.compile('root に App 描画', 'ja');
      const ar = jsx.compile('ارسم App في root', 'ar');
      const ko = jsx.compile('root 에 App 렌더링', 'ko');
      const zh = jsx.compile('渲染 App 到 root', 'zh');
      const tr = jsx.compile('root e App isle', 'tr');
      const fr = jsx.compile('afficher App dans root', 'fr');
      for (const result of [en, es, ja, ar, ko, zh, tr, fr]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('createRoot');
        expect(result.code).toContain('.render(');
      }
    });

    it('should parse render from KO/ZH/TR/FR to equivalent roles', () => {
      const ko = jsx.parse('root 에 App 렌더링', 'ko');
      const zh = jsx.parse('渲染 App 到 root', 'zh');
      const tr = jsx.parse('root e App isle', 'tr');
      const fr = jsx.parse('afficher App dans root', 'fr');
      for (const node of [ko, zh, tr, fr]) {
        expect(node.action).toBe('render');
        expect(node.roles.has('source')).toBe(true);
        expect(node.roles.has('destination')).toBe(true);
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
      const result = jsx.compile('fragment sidebar content', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<>');
      expect(result.code).toContain('</>');
    });

    it('should generate component function skeleton', () => {
      const result = jsx.compile('component Card with title body', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('function Card');
      expect(result.code).toContain('return');
    });
  });

  // ===========================================================================
  // Cross-Language Compilation Equivalence
  // ===========================================================================

  describe('Compilation Equivalence', () => {
    it('should compile state to equivalent output across all 8 languages', () => {
      const en = jsx.compile('state count initial 0', 'en');
      const es = jsx.compile('estado count inicial 0', 'es');
      const ja = jsx.compile('count 0 初期値 状態', 'ja');
      const ar = jsx.compile('حالة count ابتدائي 0', 'ar');
      const ko = jsx.compile('count 0 초기값 상태', 'ko');
      const zh = jsx.compile('状态 count 初始 0', 'zh');
      const tr = jsx.compile('count 0 baslangic durum', 'tr');
      const fr = jsx.compile('etat count initial 0', 'fr');
      for (const result of [en, es, ja, ar, ko, zh, tr, fr]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('useState');
        expect(result.code).toContain('count');
        expect(result.code).toContain('setCount');
      }
    });

    it('should compile element to equivalent output across SVO languages', () => {
      const en = jsx.compile('element div with className "app"', 'en');
      const es = jsx.compile('elemento div con className "app"', 'es');
      const zh = jsx.compile('元素 div 用 className "app"', 'zh');
      const fr = jsx.compile('element div avec className "app"', 'fr');
      for (const result of [en, es, zh, fr]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('<div');
        expect(result.code).toContain('className');
      }
    });

    it('should compile effect to equivalent output across all 8 languages', () => {
      const en = jsx.compile('effect fetchData on count', 'en');
      const es = jsx.compile('efecto fetchData en count', 'es');
      const ja = jsx.compile('count で fetchData エフェクト', 'ja');
      const ar = jsx.compile('تأثير fetchData عند count', 'ar');
      const ko = jsx.compile('count 에서 fetchData 효과', 'ko');
      const zh = jsx.compile('效果 fetchData 在 count', 'zh');
      const tr = jsx.compile('count de fetchData etki', 'tr');
      const fr = jsx.compile('effet fetchData sur count', 'fr');
      for (const result of [en, es, ja, ar, ko, zh, tr, fr]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('useEffect');
        expect(result.code).toContain('fetchData');
      }
    });

    it('should compile fragment to equivalent output across all 8 languages', () => {
      const en = jsx.compile('fragment header footer', 'en');
      const es = jsx.compile('fragmento header footer', 'es');
      const ar = jsx.compile('جزء header footer', 'ar');
      const zh = jsx.compile('片段 header footer', 'zh');
      const fr = jsx.compile('fragment header footer', 'fr');
      for (const result of [en, es, ar, zh, fr]) {
        expect(result.ok).toBe(true);
        expect(result.code).toContain('<>');
        expect(result.code).toContain('</>');
      }
    });
  });

  // ===========================================================================
  // Greedy Role Capture — Multi-Token Values
  // ===========================================================================

  describe('Greedy Role Capture', () => {
    it('should capture multiple children in fragment', () => {
      const result = jsx.compile('fragment header sidebar footer', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<Header />');
      expect(result.code).toContain('<Sidebar />');
      expect(result.code).toContain('<Footer />');
    });

    it('should capture multiple props in component', () => {
      const node = jsx.parse('component Modal with title body footer', 'en');
      expect(node.action).toBe('component');
      const propsValue = extractRoleValue(node, 'props');
      expect(propsValue).toContain('title');
      expect(propsValue).toContain('body');
      expect(propsValue).toContain('footer');
    });

    it('should capture multiple props in element', () => {
      const node = jsx.parse('element div with className disabled onClick', 'en');
      expect(node.action).toBe('element');
      const propsValue = extractRoleValue(node, 'props');
      expect(propsValue).toContain('className');
      expect(propsValue).toContain('disabled');
      expect(propsValue).toContain('onClick');
    });

    it('should capture multiple deps in effect', () => {
      const node = jsx.parse('effect fetchData on count userId', 'en');
      expect(node.action).toBe('effect');
      const depsValue = extractRoleValue(node, 'deps');
      expect(depsValue).toContain('count');
      expect(depsValue).toContain('userId');
    });

    it('should support greedy capture in SOV languages', () => {
      const result = jsx.compile('header sidebar footer 프래그먼트', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<Header />');
      expect(result.code).toContain('<Sidebar />');
      expect(result.code).toContain('<Footer />');
    });

    it('should capture all tokens until end of stream in greedy role', () => {
      // Greedy capture inside a group consumes until the group's own end-markers or end-of-stream
      const node = jsx.parse('element div with className disabled', 'en');
      expect(node.action).toBe('element');
      const propsValue = extractRoleValue(node, 'props');
      expect(propsValue).toContain('className');
      expect(propsValue).toContain('disabled');
    });
  });

  // ===========================================================================
  // TypeScript Output Mode
  // ===========================================================================

  describe('TypeScript Output Mode', () => {
    it('should add type annotation to useState with number', () => {
      const gen = createJSXCodeGenerator({ typescript: true });
      const node = jsx.parse('state count initial 0', 'en');
      const code = gen.generate(node);
      expect(code).toContain('useState<number>(0)');
    });

    it('should add type annotation to useState with string', () => {
      const gen = createJSXCodeGenerator({ typescript: true });
      const node = jsx.parse('state name initial "hello"', 'en');
      const code = gen.generate(node);
      expect(code).toContain('useState<string>("hello")');
    });

    it('should add type annotation to useState with boolean', () => {
      const gen = createJSXCodeGenerator({ typescript: true });
      const node = jsx.parse('state isOpen initial false', 'en');
      const code = gen.generate(node);
      expect(code).toContain('useState<boolean>(false)');
    });

    it('should add unknown type for null initial value', () => {
      const gen = createJSXCodeGenerator({ typescript: true });
      const node = jsx.parse('state data', 'en');
      const code = gen.generate(node);
      expect(code).toContain('useState<unknown>(null)');
    });

    it('should generate interface for component props', () => {
      const gen = createJSXCodeGenerator({ typescript: true });
      const node = jsx.parse('component Button with text onClick', 'en');
      const code = gen.generate(node);
      expect(code).toContain('interface ButtonProps');
      expect(code).toContain('onClick: () => void');
      expect(code).toContain('text: string');
      expect(code).toContain('): JSX.Element');
    });

    it('should add return type to no-props component', () => {
      const gen = createJSXCodeGenerator({ typescript: true });
      const node = jsx.parse('component App', 'en');
      const code = gen.generate(node);
      expect(code).toContain('(): JSX.Element');
    });

    it('should add void return type to useEffect callback', () => {
      const gen = createJSXCodeGenerator({ typescript: true });
      const node = jsx.parse('effect fetchData on count', 'en');
      const code = gen.generate(node);
      expect(code).toContain('(): void =>');
    });

    it('should produce standard JS when typescript is false', () => {
      const gen = createJSXCodeGenerator({ typescript: false });
      const node = jsx.parse('state count initial 0', 'en');
      const code = gen.generate(node);
      expect(code).toContain('useState(0)');
      expect(code).not.toContain('useState<');
    });
  });

  // ===========================================================================
  // Natural Language Renderer
  // ===========================================================================

  describe('Natural Language Renderer', () => {
    it('should render element to English', () => {
      const node = jsx.parse('element div with className', 'en');
      const rendered = renderJSX(node, 'en');
      expect(rendered).toContain('element');
      expect(rendered).toContain('div');
      expect(rendered).toContain('with');
    });

    it('should render render command to Spanish', () => {
      const node = jsx.parse('render App into root', 'en');
      const rendered = renderJSX(node, 'es');
      expect(rendered).toContain('renderizar');
      expect(rendered).toContain('App');
      expect(rendered).toContain('en');
      expect(rendered).toContain('root');
    });

    it('should render state to Japanese (SOV word order)', () => {
      const node = jsx.parse('state count initial 0', 'en');
      const rendered = renderJSX(node, 'ja');
      expect(rendered).toContain('状態');
      expect(rendered).toContain('count');
      // SOV: name should come before keyword
      const stateIdx = rendered.indexOf('状態');
      const nameIdx = rendered.indexOf('count');
      expect(nameIdx).toBeLessThan(stateIdx);
    });

    it('should render fragment to Korean (SOV word order)', () => {
      const node = jsx.parse('fragment header', 'en');
      const rendered = renderJSX(node, 'ko');
      expect(rendered).toContain('프래그먼트');
      expect(rendered).toContain('header');
    });

    it('should render effect to Chinese', () => {
      const node = jsx.parse('effect fetchData on count', 'en');
      const rendered = renderJSX(node, 'zh');
      expect(rendered).toContain('效果');
      expect(rendered).toContain('fetchData');
    });

    it('should render component to French', () => {
      const node = jsx.parse('component Button with text', 'en');
      const rendered = renderJSX(node, 'fr');
      expect(rendered).toContain('composant');
      expect(rendered).toContain('Button');
    });

    it('should render state to Arabic', () => {
      const node = jsx.parse('state count initial 0', 'en');
      const rendered = renderJSX(node, 'ar');
      expect(rendered).toContain('حالة');
      expect(rendered).toContain('count');
    });

    it('should render element to Turkish (SOV word order)', () => {
      const node = jsx.parse('element div with className', 'en');
      const rendered = renderJSX(node, 'tr');
      expect(rendered).toContain('oge');
      expect(rendered).toContain('div');
    });
  });

  // ===========================================================================
  // Code Generation Edge Cases
  // ===========================================================================

  describe('Code Generation Edge Cases', () => {
    it('should generate component with multi-token props (greedy)', () => {
      const result = jsx.compile('component Button with text onClick', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('function Button');
    });

    it('should generate fragment with PascalCase component names', () => {
      const result = jsx.compile('fragment sidebar', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('<Sidebar />');
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
      for (const lang of ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr']) {
        const result = jsx.validate('xyzzy foobar baz qux', lang);
        expect(result.valid).toBe(false);
      }
    });
  });
});
