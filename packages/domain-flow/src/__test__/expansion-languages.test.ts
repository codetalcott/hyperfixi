/**
 * Bridge-era languages (arc Phase 2 expansion): German, Portuguese, Russian.
 *
 * Each language was added with ONE vocab file (9 flow verbs + marker words) —
 * grammar comes from @lokascript/semantic's profiles through the framework
 * bridge. Mirrors the per-language blocks in flow-domain.test.ts, plus
 * parse → SemanticNode → renderFlow round-trips.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import { createFlowDSL, renderFlow, toFlowSpec } from '../index.js';

let flow: MultilingualDSL;

beforeAll(() => {
  flow = createFlowDSL();
});

describe('FlowScript Domain — bridge-era languages', () => {
  it('supports 11 languages', () => {
    const languages = flow.getSupportedLanguages();
    expect(languages).toHaveLength(11);
    for (const code of ['de', 'pt', 'ru']) {
      expect(languages).toContain(code);
    }
  });

  describe('German (SVO)', () => {
    it('parses fetch with format and target', () => {
      const node = flow.parse('abrufen /api/users als json in #user-list', 'de');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
      expect(extractRoleValue(node, 'destination')).toBe('#user-list');
    });

    it('parses poll with interval', () => {
      const node = flow.parse('abfragen /api/status alle 5s', 'de');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('parses submit', () => {
      const node = flow.parse('senden #checkout an /api/order als json', 'de');
      expect(node.action).toBe('submit');
      expect(extractRoleValue(node, 'patient')).toBe('#checkout');
      expect(extractRoleValue(node, 'destination')).toBe('/api/order');
    });

    it('parses transform', () => {
      const node = flow.parse('transformieren data mit uppercase', 'de');
      expect(node.action).toBe('transform');
      expect(extractRoleValue(node, 'patient')).toBe('data');
      expect(extractRoleValue(node, 'instrument')).toBe('uppercase');
    });

    it('compiles German fetch to same JS as English', () => {
      const enResult = flow.compile('fetch /api/users as json into #user-list', 'en');
      const deResult = flow.compile('abrufen /api/users als json in #user-list', 'de');
      expect(enResult.ok).toBe(true);
      expect(deResult.ok).toBe(true);
      expect(enResult.code).toBe(deResult.code);
    });
  });

  describe('Portuguese (SVO)', () => {
    it('parses fetch with format and target', () => {
      const node = flow.parse('buscar /api/users como json em #user-list', 'pt');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
      expect(extractRoleValue(node, 'destination')).toBe('#user-list');
    });

    it('parses poll with interval', () => {
      const node = flow.parse('sondar /api/status cada 5s', 'pt');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('parses submit', () => {
      const node = flow.parse('enviar #checkout para /api/order como json', 'pt');
      expect(node.action).toBe('submit');
      expect(extractRoleValue(node, 'patient')).toBe('#checkout');
      expect(extractRoleValue(node, 'destination')).toBe('/api/order');
    });

    it('parses transform', () => {
      const node = flow.parse('transformar data com uppercase', 'pt');
      expect(node.action).toBe('transform');
      expect(extractRoleValue(node, 'patient')).toBe('data');
      expect(extractRoleValue(node, 'instrument')).toBe('uppercase');
    });
  });

  describe('Russian (SVO)', () => {
    it('parses fetch with format and target', () => {
      const node = flow.parse('получить /api/users как json в #user-list', 'ru');
      expect(node.action).toBe('fetch');
      expect(extractRoleValue(node, 'source')).toBe('/api/users');
      expect(extractRoleValue(node, 'style')).toBe('json');
      expect(extractRoleValue(node, 'destination')).toBe('#user-list');
    });

    it('parses poll with interval', () => {
      const node = flow.parse('опрашивать /api/status каждые 5s', 'ru');
      expect(node.action).toBe('poll');
      expect(extractRoleValue(node, 'source')).toBe('/api/status');
      expect(extractRoleValue(node, 'duration')).toBe('5s');
    });

    it('parses submit', () => {
      const node = flow.parse('отправить #checkout на /api/order как json', 'ru');
      expect(node.action).toBe('submit');
      expect(extractRoleValue(node, 'patient')).toBe('#checkout');
      expect(extractRoleValue(node, 'destination')).toBe('/api/order');
    });

    it('parses transform', () => {
      const node = flow.parse('преобразовать data с uppercase', 'ru');
      expect(node.action).toBe('transform');
      expect(extractRoleValue(node, 'patient')).toBe('data');
      expect(extractRoleValue(node, 'instrument')).toBe('uppercase');
    });
  });

  // ===========================================================================
  // Semantic equivalence: same FlowSpec as English
  // ===========================================================================

  describe('Semantic equivalence with English', () => {
    it('produces identical FlowSpec for fetch across the new languages', () => {
      const inputs: [string, string][] = [
        ['fetch /api/users as json into #user-list', 'en'],
        ['abrufen /api/users als json in #user-list', 'de'],
        ['buscar /api/users como json em #user-list', 'pt'],
        ['получить /api/users как json в #user-list', 'ru'],
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
  // Round-trips: parse native → SemanticNode → renderFlow → re-parse
  // ===========================================================================

  describe('Round-trips (parse → render → re-parse)', () => {
    const cases: Array<[string, string]> = [
      ['de', 'abrufen /api/users als json in #user-list'],
      ['de', 'abfragen /api/status alle 5s in #dashboard'],
      ['de', 'senden #checkout an /api/order als json'],
      ['de', 'transformieren data mit uppercase'],
      ['pt', 'buscar /api/users como json em #user-list'],
      ['pt', 'sondar /api/status cada 5s em #dashboard'],
      ['pt', 'enviar #checkout para /api/order como json'],
      ['pt', 'transformar data com uppercase'],
      ['ru', 'получить /api/users как json в #user-list'],
      ['ru', 'опрашивать /api/status каждые 5s в #dashboard'],
      ['ru', 'отправить #checkout на /api/order как json'],
      ['ru', 'преобразовать data с uppercase'],
    ];

    it.each(cases)('[%s] "%s" survives a render round-trip', (lang, source) => {
      const node = flow.parse(source, lang);
      const rendered = renderFlow(node, lang);

      const original = flow.compile(source, lang);
      const roundTripped = flow.compile(rendered, lang);
      expect(original.ok).toBe(true);
      expect(roundTripped.ok).toBe(true);
      expect(roundTripped.code).toBe(original.code);
    });
  });
});
