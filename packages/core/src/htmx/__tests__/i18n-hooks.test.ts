/**
 * Tests for the namespace-aware hook contract. Phase 8a of
 * htmx-v4-reactive-streaming. The contract is what Phase 8b/8c will
 * use to swap English literals for localized attribute names —
 * verify the defaults are namespace-aware and that installHooks/
 * getHooks round-trip cleanly.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { getHooks, installHooks, resetHooks, KEYS, type I18nHooks } from '../i18n-hooks.js';

describe('i18n-hooks', () => {
  afterEach(() => resetHooks());

  describe('defaults', () => {
    it('nameOf is namespace-aware (closes follow-up #19)', () => {
      const hooks = getHooks();
      const elt = document.createElement('div');
      expect(hooks.nameOf(elt, 'hx', 'get')).toBe('hx-get');
      expect(hooks.nameOf(elt, 'sse', 'connect')).toBe('sse-connect');
      expect(hooks.nameOf(elt, 'ws', 'send')).toBe('ws-send');
    });

    it('selectorFor namespaces too', () => {
      const hooks = getHooks();
      expect(hooks.selectorFor('hx', 'target')).toBe('[hx-target]');
      expect(hooks.selectorFor('sse', 'swap')).toBe('[sse-swap]');
    });

    it('eventNameOf is identity', () => {
      const hooks = getHooks();
      expect(hooks.eventNameOf(document.body, 'click')).toBe('click');
      expect(hooks.eventNameOf(document.body, 'clic')).toBe('clic');
    });
  });

  describe('installHooks', () => {
    it('replaces all three hook implementations atomically', () => {
      const custom: I18nHooks = {
        nameOf: (_elt, ns, key) => `prefix-${ns}-${key}`,
        selectorFor: (ns, key) => `[prefix-${ns}-${key}]`,
        eventNameOf: (_elt, value) => `mapped-${value}`,
      };
      installHooks(custom);
      const hooks = getHooks();
      expect(hooks.nameOf(document.body, 'hx', 'get')).toBe('prefix-hx-get');
      expect(hooks.selectorFor('sse', 'connect')).toBe('[prefix-sse-connect]');
      expect(hooks.eventNameOf(document.body, 'click')).toBe('mapped-click');
    });

    it('resetHooks restores defaults', () => {
      installHooks({
        nameOf: () => 'pinned',
        selectorFor: () => '[pinned]',
        eventNameOf: () => 'pinned',
      });
      resetHooks();
      expect(getHooks().nameOf(document.body, 'hx', 'get')).toBe('hx-get');
    });
  });

  describe('KEYS registry', () => {
    it('lists the canonical hx keys', () => {
      expect(KEYS.hx).toContain('get');
      expect(KEYS.hx).toContain('live');
      expect(KEYS.hx).toContain('on'); // for vocab-generator visibility
    });

    it('lists sse and ws keys separately', () => {
      expect(KEYS.sse).toEqual(['connect', 'swap']);
      expect(KEYS.ws).toEqual(['connect', 'send']);
    });
  });
});
