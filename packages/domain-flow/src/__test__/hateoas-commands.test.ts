/**
 * HATEOAS Command Tests
 *
 * Validates the 4 HATEOAS FlowScript commands (enter, follow, perform, capture)
 * across 8 languages (EN, ES, JA, AR, KO, ZH, TR, FR) covering SVO, SOV, and VSO.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createFlowDSL, toFlowSpec } from '../index.js';
import { toWorkflowSpec, toSirenGrailSteps } from '../generators/workflow-generator.js';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

describe('HATEOAS Commands', () => {
  let flow: MultilingualDSL;

  beforeAll(() => {
    flow = createFlowDSL();
  });

  // ===========================================================================
  // English (SVO) — enter
  // ===========================================================================

  describe('English — enter', () => {
    it('should parse enter with URL', () => {
      const node = flow.parse('enter /api', 'en');
      expect(node.action).toBe('enter');
      expect(extractRoleValue(node, 'source')).toBe('/api');
    });

    it('should compile enter to JS', () => {
      const result = flow.compile('enter /api', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SirenAgent');
      expect(result.code).toContain('/api');
    });

    it('should produce correct FlowSpec', () => {
      const node = flow.parse('enter /api', 'en');
      const spec = toFlowSpec(node, 'en');
      expect(spec.action).toBe('enter');
      expect(spec.url).toBe('/api');
    });
  });

  // ===========================================================================
  // English (SVO) — follow
  // ===========================================================================

  describe('English — follow', () => {
    it('should parse follow with rel', () => {
      const node = flow.parse('follow orders', 'en');
      expect(node.action).toBe('follow');
      expect(extractRoleValue(node, 'patient')).toBe('orders');
    });

    it('should compile follow to JS', () => {
      const result = flow.compile('follow orders', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain("followLink('orders')");
    });

    it('should produce correct FlowSpec', () => {
      const node = flow.parse('follow orders', 'en');
      const spec = toFlowSpec(node, 'en');
      expect(spec.action).toBe('follow');
      expect(spec.linkRel).toBe('orders');
    });
  });

  // ===========================================================================
  // English (SVO) — perform
  // ===========================================================================

  describe('English — perform', () => {
    it('should parse perform with action name', () => {
      const node = flow.parse('perform createOrder', 'en');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
    });

    it('should parse perform with data source', () => {
      const node = flow.parse('perform createOrder with #checkout', 'en');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
      expect(extractRoleValue(node, 'source')).toBe('#checkout');
    });

    it('should compile perform to JS', () => {
      const result = flow.compile('perform createOrder', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain("executeAction('createOrder')");
    });

    it('should compile perform with data source', () => {
      const result = flow.compile('perform createOrder with #checkout', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain("executeAction('createOrder', data)");
      expect(result.code).toContain('#checkout');
    });

    it('should produce correct FlowSpec', () => {
      const node = flow.parse('perform createOrder with #checkout', 'en');
      const spec = toFlowSpec(node, 'en');
      expect(spec.action).toBe('perform');
      expect(spec.actionName).toBe('createOrder');
      expect(spec.dataSource).toBe('#checkout');
    });
  });

  // ===========================================================================
  // English (SVO) — capture
  // ===========================================================================

  describe('English — capture', () => {
    it('should parse capture with variable name', () => {
      const node = flow.parse('capture as orders', 'en');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'destination')).toBe('orders');
    });

    it('should parse capture with property path', () => {
      const node = flow.parse('capture message as confirmationText', 'en');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'patient')).toBe('message');
      expect(extractRoleValue(node, 'destination')).toBe('confirmationText');
    });

    it('should compile capture to JS', () => {
      const result = flow.compile('capture as orders', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('orders');
      expect(result.code).toContain('properties');
    });

    it('should produce correct FlowSpec', () => {
      const node = flow.parse('capture message as confirmationText', 'en');
      const spec = toFlowSpec(node, 'en');
      expect(spec.action).toBe('capture');
      expect(spec.captureAs).toBe('confirmationText');
      expect(spec.capturePath).toBe('message');
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('should parse enter in Spanish', () => {
      const node = flow.parse('entrar /api', 'es');
      expect(node.action).toBe('enter');
      expect(extractRoleValue(node, 'source')).toBe('/api');
    });

    it('should parse follow in Spanish', () => {
      const node = flow.parse('seguir orders', 'es');
      expect(node.action).toBe('follow');
      expect(extractRoleValue(node, 'patient')).toBe('orders');
    });

    it('should parse perform in Spanish', () => {
      const node = flow.parse('ejecutar createOrder con #checkout', 'es');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
      expect(extractRoleValue(node, 'source')).toBe('#checkout');
    });

    it('should parse capture in Spanish', () => {
      const node = flow.parse('capturar como orders', 'es');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'destination')).toBe('orders');
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('should parse enter in Japanese', () => {
      const node = flow.parse('/api 入る', 'ja');
      expect(node.action).toBe('enter');
      expect(extractRoleValue(node, 'source')).toBe('/api');
    });

    it('should parse follow in Japanese', () => {
      const node = flow.parse('orders 辿る', 'ja');
      expect(node.action).toBe('follow');
      expect(extractRoleValue(node, 'patient')).toBe('orders');
    });

    it('should parse perform in Japanese', () => {
      const node = flow.parse('#checkout で createOrder 実行', 'ja');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
      expect(extractRoleValue(node, 'source')).toBe('#checkout');
    });

    it('should parse capture in Japanese', () => {
      const node = flow.parse('orders として 取得変数', 'ja');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'destination')).toBe('orders');
    });
  });

  // ===========================================================================
  // Arabic (VSO)
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('should parse enter in Arabic', () => {
      const node = flow.parse('ادخل /api', 'ar');
      expect(node.action).toBe('enter');
      expect(extractRoleValue(node, 'source')).toBe('/api');
    });

    it('should parse follow in Arabic', () => {
      const node = flow.parse('اتبع orders', 'ar');
      expect(node.action).toBe('follow');
      expect(extractRoleValue(node, 'patient')).toBe('orders');
    });

    it('should parse perform in Arabic', () => {
      const node = flow.parse('نفّذ createOrder ب #checkout', 'ar');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
      expect(extractRoleValue(node, 'source')).toBe('#checkout');
    });

    it('should parse capture in Arabic', () => {
      const node = flow.parse('التقط ك orders', 'ar');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'destination')).toBe('orders');
    });
  });

  // ===========================================================================
  // Korean (SOV)
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('should parse enter in Korean', () => {
      const node = flow.parse('/api 진입', 'ko');
      expect(node.action).toBe('enter');
      expect(extractRoleValue(node, 'source')).toBe('/api');
    });

    it('should parse follow in Korean', () => {
      const node = flow.parse('orders 따라가기', 'ko');
      expect(node.action).toBe('follow');
      expect(extractRoleValue(node, 'patient')).toBe('orders');
    });

    it('should parse perform in Korean', () => {
      const node = flow.parse('#checkout 로 createOrder 실행', 'ko');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
      expect(extractRoleValue(node, 'source')).toBe('#checkout');
    });

    it('should parse capture in Korean', () => {
      const node = flow.parse('orders 로 캡처', 'ko');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'destination')).toBe('orders');
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('should parse enter in Chinese', () => {
      const node = flow.parse('进入 /api', 'zh');
      expect(node.action).toBe('enter');
      expect(extractRoleValue(node, 'source')).toBe('/api');
    });

    it('should parse follow in Chinese', () => {
      const node = flow.parse('跟随 orders', 'zh');
      expect(node.action).toBe('follow');
      expect(extractRoleValue(node, 'patient')).toBe('orders');
    });

    it('should parse perform in Chinese', () => {
      const node = flow.parse('执行 createOrder 用 #checkout', 'zh');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
      expect(extractRoleValue(node, 'source')).toBe('#checkout');
    });

    it('should parse capture in Chinese', () => {
      const node = flow.parse('捕获 为 orders', 'zh');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'destination')).toBe('orders');
    });
  });

  // ===========================================================================
  // Turkish (SOV)
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('should parse enter in Turkish', () => {
      const node = flow.parse('/api gir', 'tr');
      expect(node.action).toBe('enter');
      expect(extractRoleValue(node, 'source')).toBe('/api');
    });

    it('should parse follow in Turkish', () => {
      const node = flow.parse('orders izle', 'tr');
      expect(node.action).toBe('follow');
      expect(extractRoleValue(node, 'patient')).toBe('orders');
    });

    it('should parse perform in Turkish', () => {
      const node = flow.parse('#checkout ile createOrder yürüt', 'tr');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
      expect(extractRoleValue(node, 'source')).toBe('#checkout');
    });

    it('should parse capture in Turkish', () => {
      const node = flow.parse('orders olarak yakala', 'tr');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'destination')).toBe('orders');
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('should parse enter in French', () => {
      const node = flow.parse('entrer /api', 'fr');
      expect(node.action).toBe('enter');
      expect(extractRoleValue(node, 'source')).toBe('/api');
    });

    it('should parse follow in French', () => {
      const node = flow.parse('suivre orders', 'fr');
      expect(node.action).toBe('follow');
      expect(extractRoleValue(node, 'patient')).toBe('orders');
    });

    it('should parse perform in French', () => {
      const node = flow.parse('exécuter createOrder avec #checkout', 'fr');
      expect(node.action).toBe('perform');
      expect(extractRoleValue(node, 'patient')).toBe('createOrder');
      expect(extractRoleValue(node, 'source')).toBe('#checkout');
    });

    it('should parse capture in French', () => {
      const node = flow.parse('capturer comme orders', 'fr');
      expect(node.action).toBe('capture');
      expect(extractRoleValue(node, 'destination')).toBe('orders');
    });
  });

  // ===========================================================================
  // Semantic Equivalence (all 8 languages)
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('should produce identical FlowSpec for enter across SVO languages', () => {
      const inputs: [string, string][] = [
        ['enter /api', 'en'],
        ['entrar /api', 'es'],
        ['进入 /api', 'zh'],
        ['entrer /api', 'fr'],
      ];

      for (const [input, lang] of inputs) {
        const node = flow.parse(input, lang);
        const spec = toFlowSpec(node, lang);
        expect(spec.action).toBe('enter');
        expect(spec.url).toBe('/api');
      }
    });

    it('should produce identical FlowSpec for follow across SVO languages', () => {
      const inputs: [string, string][] = [
        ['follow orders', 'en'],
        ['seguir orders', 'es'],
        ['跟随 orders', 'zh'],
        ['suivre orders', 'fr'],
      ];

      for (const [input, lang] of inputs) {
        const node = flow.parse(input, lang);
        const spec = toFlowSpec(node, lang);
        expect(spec.action).toBe('follow');
        expect(spec.linkRel).toBe('orders');
      }
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('Validation', () => {
    it('should validate correct HATEOAS command syntax', () => {
      expect(flow.validate('enter /api', 'en').valid).toBe(true);
      expect(flow.validate('follow orders', 'en').valid).toBe(true);
      expect(flow.validate('perform createOrder', 'en').valid).toBe(true);
      expect(flow.validate('capture as orders', 'en').valid).toBe(true);
    });

    it('should validate HATEOAS commands in all 8 languages', () => {
      const enterInputs: [string, string][] = [
        ['enter /api', 'en'],
        ['entrar /api', 'es'],
        ['/api 入る', 'ja'],
        ['ادخل /api', 'ar'],
        ['/api 진입', 'ko'],
        ['进入 /api', 'zh'],
        ['/api gir', 'tr'],
        ['entrer /api', 'fr'],
      ];

      for (const [input, lang] of enterInputs) {
        const result = flow.validate(input, lang);
        expect(result.valid, `Failed for ${lang}: ${input}`).toBe(true);
      }
    });
  });

  // ===========================================================================
  // WorkflowSpec Generation
  // ===========================================================================

  describe('WorkflowSpec', () => {
    it('should build a workflow from a sequence of HATEOAS commands', () => {
      const specs = [
        toFlowSpec(flow.parse('enter /api', 'en'), 'en'),
        toFlowSpec(flow.parse('follow orders', 'en'), 'en'),
        toFlowSpec(flow.parse('perform createOrder with #checkout', 'en'), 'en'),
        toFlowSpec(flow.parse('capture as orderId', 'en'), 'en'),
      ];

      const workflow = toWorkflowSpec(specs);
      expect(workflow.entryPoint).toBe('/api');
      expect(workflow.steps).toHaveLength(2); // follow + perform (capture attaches to perform)

      expect(workflow.steps[0]).toEqual({ type: 'navigate', rel: 'orders' });
      expect(workflow.steps[1]).toEqual({
        type: 'action',
        action: 'createOrder',
        dataSource: '#checkout',
        capture: { orderId: 'properties' },
      });
    });

    it('should throw if no enter command is found', () => {
      const specs = [toFlowSpec(flow.parse('follow orders', 'en'), 'en')];
      expect(() => toWorkflowSpec(specs)).toThrow('enter');
    });

    it('should convert to siren-grail step format', () => {
      const specs = [
        toFlowSpec(flow.parse('enter /api', 'en'), 'en'),
        toFlowSpec(flow.parse('follow orders', 'en'), 'en'),
        toFlowSpec(flow.parse('perform createOrder', 'en'), 'en'),
      ];

      const workflow = toWorkflowSpec(specs);
      const steps = toSirenGrailSteps(workflow);

      expect(steps).toEqual([
        { type: 'navigate', rel: 'orders' },
        { type: 'action', action: 'createOrder' },
      ]);
    });

    it('should build workflow from multilingual commands', () => {
      // Same workflow in Japanese SOV
      const specs = [
        toFlowSpec(flow.parse('/api 入る', 'ja'), 'ja'),
        toFlowSpec(flow.parse('orders 辿る', 'ja'), 'ja'),
      ];

      const workflow = toWorkflowSpec(specs);
      expect(workflow.entryPoint).toBe('/api');
      expect(workflow.steps[0]).toEqual({ type: 'navigate', rel: 'orders' });
    });

    it('should handle standalone capture as navigate self', () => {
      const specs = [
        toFlowSpec(flow.parse('enter /api', 'en'), 'en'),
        toFlowSpec(flow.parse('capture as data', 'en'), 'en'),
      ];

      const workflow = toWorkflowSpec(specs);
      expect(workflow.steps[0]).toEqual({
        type: 'navigate',
        rel: 'self',
        capture: { data: 'properties' },
      });
    });

    it('should handle capture with property path', () => {
      const specs = [
        toFlowSpec(flow.parse('enter /api', 'en'), 'en'),
        toFlowSpec(flow.parse('follow orders', 'en'), 'en'),
        toFlowSpec(flow.parse('capture message as confirmationText', 'en'), 'en'),
      ];

      const workflow = toWorkflowSpec(specs);
      expect(workflow.steps[0]).toEqual({
        type: 'navigate',
        rel: 'orders',
        capture: { confirmationText: 'message' },
      });
    });
  });
});
