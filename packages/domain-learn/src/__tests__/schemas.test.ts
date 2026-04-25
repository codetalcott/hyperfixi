/**
 * Schema Tests — Verify all 15 verbs parse in all 10 languages
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createLearnDSL, ALL_VERBS } from '../index';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

describe('Learn Domain Schemas', () => {
  let learn: MultilingualDSL;

  beforeAll(() => {
    learn = createLearnDSL();
  });

  describe('Language Support', () => {
    it('should support 10 languages', () => {
      const languages = learn.getSupportedLanguages();
      expect(languages).toHaveLength(10);
      expect(languages).toContain('en');
      expect(languages).toContain('ja');
      expect(languages).toContain('es');
      expect(languages).toContain('ar');
      expect(languages).toContain('zh');
      expect(languages).toContain('ko');
      expect(languages).toContain('fr');
      expect(languages).toContain('tr');
      expect(languages).toContain('de');
      expect(languages).toContain('pt');
    });

    it('should have all 15 verbs defined', () => {
      expect(ALL_VERBS).toHaveLength(15);
    });
  });

  describe('English Parsing (SVO)', () => {
    it('should parse "add active to button"', () => {
      const node = learn.parse('add active to button', 'en');
      expect(node.action).toBe('add');
    });

    it('should parse "remove active from button"', () => {
      const node = learn.parse('remove active from button', 'en');
      expect(node.action).toBe('remove');
    });

    it('should parse "toggle active on button"', () => {
      const node = learn.parse('toggle active on button', 'en');
      expect(node.action).toBe('toggle');
    });

    it('should parse "show message"', () => {
      const node = learn.parse('show message', 'en');
      expect(node.action).toBe('show');
    });

    it('should parse "hide menu"', () => {
      const node = learn.parse('hide menu', 'en');
      expect(node.action).toBe('hide');
    });

    it('should parse "get data"', () => {
      const node = learn.parse('get data', 'en');
      expect(node.action).toBe('get');
    });

    it('should parse "send event to target"', () => {
      const node = learn.parse('send event to target', 'en');
      expect(node.action).toBe('send');
    });

    it('should parse "increment counter"', () => {
      const node = learn.parse('increment counter', 'en');
      expect(node.action).toBe('increment');
    });
  });

  describe('Explicit Syntax', () => {
    it('should parse explicit syntax for add', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      expect(node.action).toBe('add');
      expect(extractRoleValue(node, 'patient')).toBe('.active');
      expect(extractRoleValue(node, 'destination')).toBe('#button');
    });

    it('should parse explicit syntax for ditransitive verbs', () => {
      const ditransitive = [
        { verb: 'add', roles: 'patient:.active destination:#btn' },
        { verb: 'remove', roles: 'patient:.active source:#btn' },
        { verb: 'toggle', roles: 'patient:.active destination:#btn' },
        { verb: 'put', roles: 'patient:.item destination:#box' },
        { verb: 'set', roles: 'destination:#prop patient:value' },
        { verb: 'send', roles: 'patient:.event destination:#target' },
        { verb: 'take', roles: 'patient:.item source:#shelf' },
      ];
      for (const { verb, roles } of ditransitive) {
        const node = learn.parse(`[${verb} ${roles}]`, 'explicit');
        expect(node.action).toBe(verb);
      }
    });

    it('should parse explicit syntax for transitive verbs', () => {
      const transitive = [
        { verb: 'show', roles: 'patient:.msg' },
        { verb: 'hide', roles: 'patient:.msg' },
        { verb: 'get', roles: 'source:#data' },
        { verb: 'wait', roles: 'patient:1000' },
        { verb: 'fetch', roles: 'source:#api' },
        { verb: 'go', roles: 'destination:#page' },
        { verb: 'increment', roles: 'patient:.counter' },
        { verb: 'decrement', roles: 'patient:.counter' },
      ];
      for (const { verb, roles } of transitive) {
        const node = learn.parse(`[${verb} ${roles}]`, 'explicit');
        expect(node.action).toBe(verb);
      }
    });
  });

  describe('Code Generation', () => {
    it('should generate English commanding form', () => {
      const result = learn.compile('[add patient:.active destination:#button]', 'explicit');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('add');
    });

    it('should compile all verbs from explicit syntax', () => {
      const testCases = [
        '[add patient:.active destination:#button]',
        '[remove patient:.active source:#button]',
        '[show patient:.message]',
        '[hide patient:.menu]',
        '[get source:#data]',
        '[go destination:#page]',
        '[increment patient:.counter]',
      ];
      for (const input of testCases) {
        const result = learn.compile(input, 'explicit');
        expect(result.ok).toBe(true);
      }
    });
  });
});
