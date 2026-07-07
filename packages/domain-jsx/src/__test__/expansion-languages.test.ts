/**
 * Bridge-era languages (arc Phase 2 expansion): German, Portuguese, Russian.
 *
 * Each language was added with ONE vocab file (JSX verbs + marker words) —
 * grammar comes from @lokascript/semantic's profiles through the framework
 * bridge. Mirrors the per-language blocks in jsx-domain.test.ts, plus
 * parse → SemanticNode → renderJSX round-trips.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import { createJSXDSL, renderJSX } from '../index';

let jsx: MultilingualDSL;

beforeAll(() => {
  jsx = createJSXDSL();
});

describe('JSX Domain — bridge-era languages', () => {
  it('supports 11 languages', () => {
    const languages = jsx.getSupportedLanguages();
    expect(languages).toHaveLength(11);
    for (const code of ['de', 'pt', 'ru']) {
      expect(languages).toContain(code);
    }
  });

  describe('German (SVO)', () => {
    it('parses element with props', () => {
      const node = jsx.parse('element div mit className', 'de');
      expect(node.action).toBe('element');
      expect(extractRoleValue(node, 'tag')).toBe('div');
      expect(extractRoleValue(node, 'props')).toBe('className');
    });

    it('parses render into destination', () => {
      const node = jsx.parse('rendern App in root', 'de');
      expect(node.action).toBe('render');
      expect(extractRoleValue(node, 'source')).toBe('App');
      expect(extractRoleValue(node, 'destination')).toBe('root');
    });

    it('parses state with initial value', () => {
      const node = jsx.parse('zustand count initial 0', 'de');
      expect(node.action).toBe('state');
      expect(extractRoleValue(node, 'name')).toBe('count');
      expect(extractRoleValue(node, 'initial')).toBe('0');
    });

    it('parses effect with deps', () => {
      const node = jsx.parse('effekt fetchData bei count', 'de');
      expect(node.action).toBe('effect');
      expect(extractRoleValue(node, 'callback')).toBe('fetchData');
      expect(extractRoleValue(node, 'deps')).toBe('count');
    });
  });

  describe('Portuguese (SVO)', () => {
    it('parses element with props', () => {
      const node = jsx.parse('elemento div com className', 'pt');
      expect(node.action).toBe('element');
      expect(extractRoleValue(node, 'tag')).toBe('div');
      expect(extractRoleValue(node, 'props')).toBe('className');
    });

    it('parses render into destination', () => {
      const node = jsx.parse('renderizar App em root', 'pt');
      expect(node.action).toBe('render');
      expect(extractRoleValue(node, 'source')).toBe('App');
      expect(extractRoleValue(node, 'destination')).toBe('root');
    });

    it('parses state with initial value', () => {
      const node = jsx.parse('estado count inicial 0', 'pt');
      expect(node.action).toBe('state');
      expect(extractRoleValue(node, 'name')).toBe('count');
      expect(extractRoleValue(node, 'initial')).toBe('0');
    });
  });

  describe('Russian (SVO)', () => {
    it('parses element with props', () => {
      const node = jsx.parse('элемент div с className', 'ru');
      expect(node.action).toBe('element');
      expect(extractRoleValue(node, 'tag')).toBe('div');
      expect(extractRoleValue(node, 'props')).toBe('className');
    });

    it('parses render into destination', () => {
      const node = jsx.parse('отрисовать App в root', 'ru');
      expect(node.action).toBe('render');
      expect(extractRoleValue(node, 'source')).toBe('App');
      expect(extractRoleValue(node, 'destination')).toBe('root');
    });

    it('parses state with initial value', () => {
      const node = jsx.parse('состояние count начально 0', 'ru');
      expect(node.action).toBe('state');
      expect(extractRoleValue(node, 'name')).toBe('count');
      expect(extractRoleValue(node, 'initial')).toBe('0');
    });
  });

  // ===========================================================================
  // Round-trips: parse native → SemanticNode → renderJSX → re-parse
  // ===========================================================================

  describe('Round-trips (parse → render → re-parse)', () => {
    const cases: Array<[string, string]> = [
      ['de', 'element div mit className'],
      ['de', 'rendern App in root'],
      ['de', 'zustand count initial 0'],
      ['de', 'effekt fetchData bei count'],
      ['de', 'fragment header footer'],
      ['pt', 'elemento div com className'],
      ['pt', 'renderizar App em root'],
      ['pt', 'estado count inicial 0'],
      ['ru', 'элемент div с className'],
      ['ru', 'отрисовать App в root'],
      ['ru', 'состояние count начально 0'],
    ];

    it.each(cases)('[%s] "%s" survives a render round-trip', (lang, source) => {
      const node = jsx.parse(source, lang);
      const rendered = renderJSX(node, lang);

      const original = jsx.compile(source, lang);
      const roundTripped = jsx.compile(rendered, lang);
      expect(original.ok).toBe(true);
      expect(roundTripped.ok).toBe(true);
      expect(roundTripped.code).toBe(original.code);
    });
  });
});
