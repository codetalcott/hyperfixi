/**
 * FlowScript Domain Tests
 *
 * Validates the multilingual FlowScript DSL across 8 languages (EN, ES, JA, AR, KO, ZH, TR, FR)
 * covering SVO, SOV, and VSO word orders.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createFlowDSL, renderFlow, toFlowSpec } from '../index.js';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import type { FlowSpec } from '../types.js';
import { parseDuration } from '../generators/flow-generator.js';

describe('FlowScript Domain', () => {
  let flow: MultilingualDSL;

  beforeAll(() => {
    flow = createFlowDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 8 languages', () => {
      const languages = flow.getSupportedLanguages();
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
      expect(() => flow.parse('fetch /api/users', 'de')).toThrow();
    });
  });

  // ===========================================================================
  // Duration Parsing
  // ===========================================================================

  describe('Duration Parsing', () => {
    it('should parse milliseconds', () => {
      expect(parseDuration('500ms')).toBe(500);
    });

    it('should parse seconds', () => {
      expect(parseDuration('5s')).toBe(5000);
    });

    it('should parse minutes', () => {
      expect(parseDuration('1m')).toBe(60000);
    });

    it('should parse hours', () => {
      expect(parseDuration('1h')).toBe(3600000);
    });

    it('should parse plain numbers as ms', () => {
      expect(parseDuration('1000')).toBe(1000);
    });
  });

  // ===========================================================================
  // English (SVO) — fetch
  // ===========================================================================

  describe('English — fetch', () => {
    it('should parse simple fetch', () => {
      const node = flow.parse('fetch /api/users', 'en');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
    });

    it('should parse fetch with format', () => {
      const node = flow.parse('fetch /api/users as json', 'en');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
    });

    it('should parse fetch with target', () => {
      const node = flow.parse('fetch /api/users as json into #user-list', 'en');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
      expect(extractRoleValue(node, 'destination')).toBe('#user-list');
    });

    it('should compile fetch to JS', () => {
      const result = flow.compile('fetch /api/users as json into #user-list', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain("fetch('/api/users')");
      expect(result.code).toContain('.json()');
      expect(result.code).toContain('#user-list');
    });

    it('should produce correct FlowSpec', () => {
      const node = flow.parse('fetch /api/users as json into #user-list', 'en');
      const spec = toFlowSpec(node, 'en');
      expect(spec.action).toBe('fetch');
      expect(spec.url).toBe('/api/users');
      expect(spec.responseFormat).toBe('json');
      expect(spec.target).toBe('#user-list');
      expect(spec.method).toBe('GET');
    });
  });

  // ===========================================================================
  // English (SVO) — poll
  // ===========================================================================

  describe('English — poll', () => {
    it('should parse poll with interval', () => {
      const node = flow.parse('poll /api/status every 5s', 'en');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('should parse poll with target', () => {
      const node = flow.parse('poll /api/status every 5s into #dashboard', 'en');
      expect(extractRoleValue(node, 'destination')).toBe('#dashboard');
    });

    it('should compile poll to JS with setInterval', () => {
      const result = flow.compile('poll /api/status every 5s into #dashboard', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('setInterval');
      expect(result.code).toContain("fetch('/api/status')");
      expect(result.code).toContain('5000');
      expect(result.code).toContain('#dashboard');
    });

    it('should produce correct FlowSpec for poll', () => {
      const node = flow.parse('poll /api/status every 5s into #dashboard', 'en');
      const spec = toFlowSpec(node, 'en');
      expect(spec.action).toBe('poll');
      expect(spec.url).toBe('/api/status');
      expect(spec.intervalMs).toBe(5000);
      expect(spec.target).toBe('#dashboard');
    });
  });

  // ===========================================================================
  // English (SVO) — stream
  // ===========================================================================

  describe('English — stream', () => {
    it('should parse stream', () => {
      const node = flow.parse('stream /api/events as sse into #event-log', 'en');
      expect(node.action).toBe('stream');
      expect(extractRoleValue(node, 'source')).toBe('/api/events');
      expect(extractRoleValue(node, 'style')).toBe('sse');
      expect(extractRoleValue(node, 'destination')).toBe('#event-log');
    });

    it('should compile stream to EventSource', () => {
      const result = flow.compile('stream /api/events as sse into #event-log', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('EventSource');
      expect(result.code).toContain('/api/events');
      expect(result.code).toContain('#event-log');
    });

    it('should produce sse responseFormat in FlowSpec', () => {
      const node = flow.parse('stream /api/events as sse', 'en');
      const spec = toFlowSpec(node, 'en');
      expect(spec.responseFormat).toBe('sse');
    });
  });

  // ===========================================================================
  // English (SVO) — submit
  // ===========================================================================

  describe('English — submit', () => {
    it('should parse submit', () => {
      const node = flow.parse('submit #checkout to /api/order as json', 'en');
      expect(node.action).toBe('submit');
      expect(extractRoleValue(node, 'patient')).toBe('#checkout');
      expect(extractRoleValue(node, 'destination')).toBe('/api/order');
      expect(extractRoleValue(node, 'style')).toBe('json');
    });

    it('should compile submit to POST fetch', () => {
      const result = flow.compile('submit #checkout to /api/order as json', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain("method: 'POST'");
      expect(result.code).toContain('/api/order');
      expect(result.code).toContain('application/json');
    });

    it('should produce POST method in FlowSpec', () => {
      const node = flow.parse('submit #checkout to /api/order', 'en');
      const spec = toFlowSpec(node, 'en');
      expect(spec.method).toBe('POST');
      expect(spec.formSelector).toBe('#checkout');
    });
  });

  // ===========================================================================
  // English (SVO) — transform
  // ===========================================================================

  describe('English — transform', () => {
    it('should parse transform', () => {
      const node = flow.parse('transform data with uppercase', 'en');
      expect(node.action).toBe('transform');
      expect(extractRoleValue(node, 'patient')).toBe('data');
      expect(extractRoleValue(node, 'instrument')).toBe('uppercase');
    });

    it('should compile transform to function call', () => {
      const result = flow.compile('transform data with uppercase', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('uppercase');
      expect(result.code).toContain('data');
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('should parse fetch in Spanish', () => {
      const node = flow.parse('obtener /api/users como json en #user-list', 'es');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
      expect(extractRoleValue(node, 'destination')).toBe('#user-list');
    });

    it('should parse poll in Spanish', () => {
      const node = flow.parse('sondear /api/status cada 5s', 'es');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('should parse submit in Spanish', () => {
      const node = flow.parse('enviar #checkout a /api/order como json', 'es');
      expect(node.action).toBe('submit');
      expect(extractRoleValue(node, 'patient')).toBe('#checkout');
      expect(extractRoleValue(node, 'destination')).toBe('/api/order');
    });

    it('should compile Spanish fetch to same JS as English', () => {
      const enResult = flow.compile('fetch /api/users as json into #user-list', 'en');
      const esResult = flow.compile('obtener /api/users como json en #user-list', 'es');
      expect(enResult.ok).toBe(true);
      expect(esResult.ok).toBe(true);
      // Same JS output regardless of source language
      expect(enResult.code).toBe(esResult.code);
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('should parse fetch in Japanese SOV order', () => {
      const node = flow.parse('/api/users json で 取得', 'ja');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
    });

    it('should parse poll in Japanese', () => {
      const node = flow.parse('/api/status 5s ごとに ポーリング', 'ja');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('should produce same FlowSpec as English', () => {
      const enNode = flow.parse('fetch /api/users as json', 'en');
      const jaNode = flow.parse('/api/users json で 取得', 'ja');
      const enSpec = toFlowSpec(enNode, 'en');
      const jaSpec = toFlowSpec(jaNode, 'ja');
      expect(enSpec.action).toBe(jaSpec.action);
      expect(enSpec.url).toBe(jaSpec.url);
      expect(enSpec.responseFormat).toBe(jaSpec.responseFormat);
    });
  });

  // ===========================================================================
  // Arabic (VSO)
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('should parse fetch in Arabic VSO order', () => {
      const node = flow.parse('جلب /api/users ك json في #user-list', 'ar');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
      expect(extractRoleValue(node, 'destination')).toBe('#user-list');
    });

    it('should parse stream in Arabic', () => {
      const node = flow.parse('بث /api/events ك sse في #event-log', 'ar');
      expect(node.action).toBe('stream');
      expect(extractRoleValue(node, 'source')).toBe('/api/events');
    });

    it('should produce same FlowSpec as English', () => {
      const enNode = flow.parse('fetch /api/users as json into #user-list', 'en');
      const arNode = flow.parse('جلب /api/users ك json في #user-list', 'ar');
      const enSpec = toFlowSpec(enNode, 'en');
      const arSpec = toFlowSpec(arNode, 'ar');
      expect(enSpec.action).toBe(arSpec.action);
      expect(enSpec.url).toBe(arSpec.url);
      expect(enSpec.responseFormat).toBe(arSpec.responseFormat);
      expect(enSpec.target).toBe(arSpec.target);
    });
  });

  // ===========================================================================
  // Korean (SOV)
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('should parse fetch in Korean SOV order', () => {
      const node = flow.parse('/api/users json 로 가져오기', 'ko');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
    });

    it('should parse poll in Korean', () => {
      const node = flow.parse('/api/status 5s 마다 폴링', 'ko');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('should parse stream in Korean', () => {
      const node = flow.parse('/api/events sse 로 스트리밍', 'ko');
      expect(node.action).toBe('stream');
      expect(extractRoleValue(node, 'source')).toBe('/api/events');
      expect(extractRoleValue(node, 'style')).toBe('sse');
    });

    it('should parse transform in Korean', () => {
      // SOV: instrument(sovPos:2) before patient(sovPos:1), marker after value
      const node = flow.parse('uppercase 로 data 변환', 'ko');
      expect(node.action).toBe('transform');
      expect(extractRoleValue(node, 'patient')).toBe('data');
      expect(extractRoleValue(node, 'instrument')).toBe('uppercase');
    });

    it('should produce same FlowSpec as English', () => {
      const enNode = flow.parse('fetch /api/users as json', 'en');
      const koNode = flow.parse('/api/users json 로 가져오기', 'ko');
      const enSpec = toFlowSpec(enNode, 'en');
      const koSpec = toFlowSpec(koNode, 'ko');
      expect(enSpec.action).toBe(koSpec.action);
      expect(enSpec.url).toBe(koSpec.url);
      expect(enSpec.responseFormat).toBe(koSpec.responseFormat);
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('should parse fetch in Chinese', () => {
      const node = flow.parse('获取 /api/users 以 json 到 #user-list', 'zh');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
      expect(extractRoleValue(node, 'destination')).toBe('#user-list');
    });

    it('should parse poll in Chinese', () => {
      const node = flow.parse('轮询 /api/status 每 5s', 'zh');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('should parse stream in Chinese', () => {
      const node = flow.parse('流式 /api/events 以 sse 到 #event-log', 'zh');
      expect(node.action).toBe('stream');
      expect(extractRoleValue(node, 'source')).toBe('/api/events');
      expect(extractRoleValue(node, 'style')).toBe('sse');
    });

    it('should parse transform in Chinese', () => {
      const node = flow.parse('转换 data 用 uppercase', 'zh');
      expect(node.action).toBe('transform');
      expect(extractRoleValue(node, 'patient')).toBe('data');
      expect(extractRoleValue(node, 'instrument')).toBe('uppercase');
    });

    it('should compile Chinese fetch to same JS as English', () => {
      const enResult = flow.compile('fetch /api/users as json into #user-list', 'en');
      const zhResult = flow.compile('获取 /api/users 以 json 到 #user-list', 'zh');
      expect(enResult.ok).toBe(true);
      expect(zhResult.ok).toBe(true);
      expect(enResult.code).toBe(zhResult.code);
    });
  });

  // ===========================================================================
  // Turkish (SOV)
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('should parse fetch in Turkish SOV order', () => {
      const node = flow.parse('/api/users json olarak getir', 'tr');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
    });

    it('should parse poll in Turkish', () => {
      // SOV: marker comes after value (postposition)
      const node = flow.parse('/api/status 5s her yokla', 'tr');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('should parse stream in Turkish', () => {
      const node = flow.parse('/api/events sse olarak aktar', 'tr');
      expect(node.action).toBe('stream');
      expect(extractRoleValue(node, 'source')).toBe('/api/events');
      expect(extractRoleValue(node, 'style')).toBe('sse');
    });

    it('should parse transform in Turkish', () => {
      // SOV: instrument(sovPos:2) before patient(sovPos:1), marker after value
      const node = flow.parse('uppercase ile data dönüştür', 'tr');
      expect(node.action).toBe('transform');
      expect(extractRoleValue(node, 'patient')).toBe('data');
      expect(extractRoleValue(node, 'instrument')).toBe('uppercase');
    });

    it('should produce same FlowSpec as English', () => {
      const enNode = flow.parse('fetch /api/users as json', 'en');
      const trNode = flow.parse('/api/users json olarak getir', 'tr');
      const enSpec = toFlowSpec(enNode, 'en');
      const trSpec = toFlowSpec(trNode, 'tr');
      expect(enSpec.action).toBe(trSpec.action);
      expect(enSpec.url).toBe(trSpec.url);
      expect(enSpec.responseFormat).toBe(trSpec.responseFormat);
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('should parse fetch in French', () => {
      const node = flow.parse('récupérer /api/users comme json dans #user-list', 'fr');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
      expect(extractRoleValue(node, 'destination')).toBe('#user-list');
    });

    it('should parse poll in French', () => {
      const node = flow.parse('interroger /api/status chaque 5s', 'fr');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('should parse stream in French', () => {
      const node = flow.parse('diffuser /api/events comme sse dans #event-log', 'fr');
      expect(node.action).toBe('stream');
      expect(extractRoleValue(node, 'source')).toBe('/api/events');
      expect(extractRoleValue(node, 'style')).toBe('sse');
    });

    it('should parse transform in French', () => {
      const node = flow.parse('transformer data avec uppercase', 'fr');
      expect(node.action).toBe('transform');
      expect(extractRoleValue(node, 'patient')).toBe('data');
      expect(extractRoleValue(node, 'instrument')).toBe('uppercase');
    });

    it('should compile French fetch to same JS as English', () => {
      const enResult = flow.compile('fetch /api/users as json into #user-list', 'en');
      const frResult = flow.compile('récupérer /api/users comme json dans #user-list', 'fr');
      expect(enResult.ok).toBe(true);
      expect(frResult.ok).toBe(true);
      expect(enResult.code).toBe(frResult.code);
    });
  });

  // ===========================================================================
  // Semantic Equivalence (all 8 languages)
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('should produce identical FlowSpec for fetch across all languages', () => {
      const inputs: [string, string][] = [
        ['fetch /api/users as json into #user-list', 'en'],
        ['obtener /api/users como json en #user-list', 'es'],
        ['جلب /api/users ك json في #user-list', 'ar'],
        ['获取 /api/users 以 json 到 #user-list', 'zh'],
        ['récupérer /api/users comme json dans #user-list', 'fr'],
      ];

      const specs = inputs.map(([input, lang]) => {
        const node = flow.parse(input, lang);
        return toFlowSpec(node, lang);
      });

      for (const spec of specs) {
        expect(spec.action).toBe('fetch');
        expect(spec.url).toBe('/api/users');
        expect(spec.responseFormat).toBe('json');
        expect(spec.target).toBe('#user-list');
      }
    });
  });

  // ===========================================================================
  // Validation / Error Handling
  // ===========================================================================

  describe('Validation', () => {
    it('should validate correct fetch syntax', () => {
      const result = flow.validate('fetch /api/users as json', 'en');
      expect(result.valid).toBe(true);
    });

    it('should return ok=false for invalid input', () => {
      const result = flow.compile('gobbledygook nonsense', 'en');
      expect(result.ok).toBe(false);
    });

    it('should handle URLs with path params', () => {
      const node = flow.parse('fetch /api/users/{id}', 'en');
      expect(extractRoleValue(node, 'source')).toBe('/api/users/{id}');
    });

    it('should handle URLs with query params', () => {
      const node = flow.parse('fetch /api/search?q=hello', 'en');
      expect(extractRoleValue(node, 'source')).toBe('/api/search?q=hello');
    });

    it('should validate in all 8 languages', () => {
      const validInputs: [string, string][] = [
        ['fetch /api/users as json', 'en'],
        ['obtener /api/users como json', 'es'],
        ['/api/users json で 取得', 'ja'],
        ['جلب /api/users ك json', 'ar'],
        ['/api/users json 로 가져오기', 'ko'],
        ['获取 /api/users 以 json', 'zh'],
        ['/api/users json olarak getir', 'tr'],
        ['récupérer /api/users comme json', 'fr'],
      ];

      for (const [input, lang] of validInputs) {
        const result = flow.validate(input, lang);
        expect(result.valid).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Natural Language Renderer
  // ===========================================================================

  describe('Renderer', () => {
    it('should render fetch to English', () => {
      const node = flow.parse('fetch /api/users as json into #user-list', 'en');
      const rendered = renderFlow(node, 'en');
      expect(rendered).toContain('fetch');
      expect(rendered).toContain('/api/users');
      expect(rendered).toContain('json');
      expect(rendered).toContain('#user-list');
    });

    it('should render fetch to Japanese SOV', () => {
      const node = flow.parse('fetch /api/users as json', 'en');
      const rendered = renderFlow(node, 'ja');
      expect(rendered).toContain('取得');
      expect(rendered).toContain('/api/users');
    });

    it('should render poll to Spanish', () => {
      const node = flow.parse('poll /api/status every 5s into #dashboard', 'en');
      const rendered = renderFlow(node, 'es');
      expect(rendered).toContain('sondear');
      expect(rendered).toContain('cada');
    });

    it('should render fetch to Arabic VSO', () => {
      const node = flow.parse('fetch /api/users as json into #user-list', 'en');
      const rendered = renderFlow(node, 'ar');
      expect(rendered).toContain('جلب');
      expect(rendered).toContain('/api/users');
      expect(rendered).toContain('ك');
      expect(rendered).toContain('في');
    });

    it('should render submit to Arabic VSO', () => {
      const node = flow.parse('submit #checkout to /api/order as json', 'en');
      const rendered = renderFlow(node, 'ar');
      expect(rendered).toContain('أرسل');
      expect(rendered).toContain('إلى');
      expect(rendered).toContain('/api/order');
    });

    it('should render transform to Arabic', () => {
      const node = flow.parse('transform data with uppercase', 'en');
      const rendered = renderFlow(node, 'ar');
      expect(rendered).toContain('حوّل');
      expect(rendered).toContain('ب');
    });

    it('should render stream to Arabic VSO', () => {
      const node = flow.parse('stream /api/events as sse into #event-log', 'en');
      const rendered = renderFlow(node, 'ar');
      expect(rendered).toContain('بث');
      expect(rendered).toContain('/api/events');
    });

    it('should render fetch to Korean SOV', () => {
      const node = flow.parse('fetch /api/users as json', 'en');
      const rendered = renderFlow(node, 'ko');
      expect(rendered).toContain('가져오기');
      expect(rendered).toContain('/api/users');
    });

    it('should render fetch to Chinese', () => {
      const node = flow.parse('fetch /api/users as json into #user-list', 'en');
      const rendered = renderFlow(node, 'zh');
      expect(rendered).toContain('获取');
      expect(rendered).toContain('/api/users');
      expect(rendered).toContain('以');
      expect(rendered).toContain('到');
    });

    it('should render fetch to Turkish SOV', () => {
      const node = flow.parse('fetch /api/users as json', 'en');
      const rendered = renderFlow(node, 'tr');
      expect(rendered).toContain('getir');
      expect(rendered).toContain('/api/users');
    });

    it('should render fetch to French', () => {
      const node = flow.parse('fetch /api/users as json into #user-list', 'en');
      const rendered = renderFlow(node, 'fr');
      expect(rendered).toContain('récupérer');
      expect(rendered).toContain('/api/users');
      expect(rendered).toContain('comme');
      expect(rendered).toContain('dans');
    });

    it('should round-trip Arabic render through parser', () => {
      const enNode = flow.parse('fetch /api/users as json into #user-list', 'en');
      const arText = renderFlow(enNode, 'ar');
      const arNode = flow.parse(arText, 'ar');
      expect(arNode.action).toBe('fetch');
      expect(extractRoleValue(arNode, 'source')).toBe('/api/users');
      expect(extractRoleValue(arNode, 'style')).toBe('json');
      expect(extractRoleValue(arNode, 'destination')).toBe('#user-list');
    });
  });

  // ===========================================================================
  // Poll with Format
  // ===========================================================================

  describe('Poll with responseFormat', () => {
    it('should compile poll with json format', () => {
      const result = flow.compile('poll /api/status every 5s as json into #dashboard', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.json()');
      expect(result.code).toContain('JSON.stringify');
    });

    it('should compile poll without format as text', () => {
      const result = flow.compile('poll /api/status every 5s into #dashboard', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.text()');
      expect(result.code).not.toContain('.json()');
    });
  });
});
