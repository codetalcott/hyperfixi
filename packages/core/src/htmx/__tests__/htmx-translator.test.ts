/**
 * Tests for htmx attribute translation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { translateToHyperscript, hasHtmxAttributes, type HtmxConfig } from '../htmx-translator.js';
import { HtmxAttributeProcessor } from '../htmx-attribute-processor.js';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { document } = dom.window;

describe('htmx-translator', () => {
  describe('translateToHyperscript', () => {
    describe('simple GET requests', () => {
      it('translates hx-get to fetch command', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/users',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/users'");
        expect(result).toContain('as html');
        expect(result).toContain('on click');
      });

      it('uses default innerHTML swap when no swap specified', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('swap innerHTML of #output with it');
      });
    });

    describe('POST requests', () => {
      it('translates hx-post to fetch via POST', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/users',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/users' via POST");
      });

      it('includes form values for form elements', () => {
        const form = document.createElement('form');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
        };
        const result = translateToHyperscript(config, form);
        expect(result).toContain('with values of me');
        expect(result).toContain('on submit');
        expect(result).toContain('halt the event');
      });
    });

    describe('other HTTP methods', () => {
      it('translates hx-put', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'PUT',
          url: '/api/resource',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/resource' via PUT");
      });

      it('translates hx-patch', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'PATCH',
          url: '/api/resource',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/resource' via PATCH");
      });

      it('translates hx-delete', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'DELETE',
          url: '/api/resource',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/resource' via DELETE");
      });
    });

    describe('target resolution', () => {
      it('resolves "this" to "me"', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: 'this',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('swap innerHTML of me with it');
      });

      it('resolves "closest div" syntax', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: 'closest div',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('closest <div/>');
      });

      it('resolves "find .item" syntax', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: 'find .item',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('first <.item/> in me');
      });

      it('resolves "next .sibling" syntax', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: 'next .sibling',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('next <.sibling/>');
      });

      it('resolves "previous .sibling" syntax', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: 'previous .sibling',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('previous <.sibling/>');
      });

      it('passes CSS selectors as-is', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#my-output',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('swap innerHTML of #my-output with it');
      });
    });

    describe('swap strategies', () => {
      it('translates innerHTML swap', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
          swap: 'innerHTML',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('swap innerHTML of #output with it');
      });

      it('translates outerHTML swap', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
          swap: 'outerHTML',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('swap #output with it');
      });

      it('translates beforeend swap', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
          swap: 'beforeend',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('put it at end of #output');
      });

      it('translates afterbegin swap', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
          swap: 'afterbegin',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('put it at start of #output');
      });

      it('translates beforebegin swap', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
          swap: 'beforebegin',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('put it before #output');
      });

      it('translates afterend swap', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
          swap: 'afterend',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('put it after #output');
      });

      it('translates morph swap', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
          swap: 'morph',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('morph #output with it');
      });

      it('translates delete swap', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          target: '#output',
          swap: 'delete',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('remove #output');
      });

      it('handles none swap (no swap command)', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          swap: 'none',
        };
        const result = translateToHyperscript(config, button);
        expect(result).not.toContain('swap');
        expect(result).not.toContain('put');
        expect(result).not.toContain('morph');
      });
    });

    describe('triggers', () => {
      it('uses default click trigger for buttons', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('on click');
      });

      it('uses default submit trigger for forms', () => {
        const form = document.createElement('form');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
        };
        const result = translateToHyperscript(config, form);
        expect(result).toContain('on submit');
      });

      it('uses default change trigger for inputs', () => {
        const input = document.createElement('input');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/search',
        };
        const result = translateToHyperscript(config, input);
        expect(result).toContain('on change');
      });

      it('uses custom trigger when specified', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          trigger: 'mouseenter',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('on mouseenter');
      });

      it('translates load trigger', () => {
        const div = document.createElement('div');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          trigger: 'load',
        };
        const result = translateToHyperscript(config, div);
        expect(result).toContain('on load');
      });

      it('translates revealed trigger to intersection', () => {
        const div = document.createElement('div');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          trigger: 'revealed',
        };
        const result = translateToHyperscript(config, div);
        expect(result).toContain('on intersection');
      });
    });

    describe('trigger modifiers', () => {
      it('translates delay modifier to debounce', () => {
        const input = document.createElement('input');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/search',
          trigger: 'input delay:500ms',
        };
        const result = translateToHyperscript(config, input);
        expect(result).toContain('.debounce(500)');
      });

      it('translates throttle modifier', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          trigger: 'click throttle:1000ms',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('.throttle(1000)');
      });

      it('translates once modifier', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          trigger: 'click once',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('.once');
      });
    });

    describe('confirmation dialog', () => {
      it('adds confirm check when hx-confirm specified', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'DELETE',
          url: '/api/resource/123',
          confirm: 'Are you sure?',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("confirm('Are you sure?')");
        expect(result).toContain('return');
      });

      it('escapes quotes in confirm message', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'DELETE',
          url: '/api/resource/123',
          confirm: "Delete this user's data?",
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("\\'s");
      });
    });

    describe('URL management', () => {
      it('adds push url command when hx-push-url is true', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/page/2',
          pushUrl: true,
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("push url '/page/2'");
      });

      it('adds push url with custom URL', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          pushUrl: '/custom-url',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("push url '/custom-url'");
      });

      it('adds replace url command when hx-replace-url is true', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/page/2',
          replaceUrl: true,
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("replace url '/page/2'");
      });
    });

    describe('hx-on:* handlers', () => {
      it('wraps hx-on handlers in event syntax', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          onHandlers: {
            click: 'toggle .active on me',
          },
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('on click toggle .active on me');
      });

      it('handles multiple hx-on handlers', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          onHandlers: {
            mouseenter: 'add .hover',
            mouseleave: 'remove .hover',
          },
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('on mouseenter add .hover');
        expect(result).toContain('on mouseleave remove .hover');
      });
    });
  });

  describe('hasHtmxAttributes', () => {
    it('returns true for elements with hx-get', () => {
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/data');
      expect(hasHtmxAttributes(el)).toBe(true);
    });

    it('returns true for elements with hx-post', () => {
      const el = document.createElement('button');
      el.setAttribute('hx-post', '/api/data');
      expect(hasHtmxAttributes(el)).toBe(true);
    });

    it('returns true for elements with hx-on:click', () => {
      const el = document.createElement('button');
      el.setAttribute('hx-on:click', 'toggle .active');
      expect(hasHtmxAttributes(el)).toBe(true);
    });

    it('returns false for elements without hx-* attributes', () => {
      const el = document.createElement('button');
      el.setAttribute('class', 'btn');
      el.setAttribute('_', 'on click toggle .active');
      expect(hasHtmxAttributes(el)).toBe(false);
    });
  });
});

describe('HtmxAttributeProcessor', () => {
  describe('collectAttributes', () => {
    it('collects hx-get into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/users');

      const config = processor.collectAttributes(el);
      expect(config.method).toBe('GET');
      expect(config.url).toBe('/api/users');
    });

    it('collects hx-post into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-post', '/api/users');

      const config = processor.collectAttributes(el);
      expect(config.method).toBe('POST');
      expect(config.url).toBe('/api/users');
    });

    it('collects hx-target into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/users');
      el.setAttribute('hx-target', '#users-list');

      const config = processor.collectAttributes(el);
      expect(config.target).toBe('#users-list');
    });

    it('collects hx-swap into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/users');
      el.setAttribute('hx-swap', 'outerHTML');

      const config = processor.collectAttributes(el);
      expect(config.swap).toBe('outerHTML');
    });

    it('collects hx-trigger into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/users');
      el.setAttribute('hx-trigger', 'mouseenter');

      const config = processor.collectAttributes(el);
      expect(config.trigger).toBe('mouseenter');
    });

    it('collects hx-confirm into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-delete', '/api/user/1');
      el.setAttribute('hx-confirm', 'Delete this user?');

      const config = processor.collectAttributes(el);
      expect(config.confirm).toBe('Delete this user?');
    });

    it('collects hx-boost into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('a');
      el.setAttribute('hx-boost', 'true');

      const config = processor.collectAttributes(el);
      expect(config.boost).toBe(true);
    });

    it('collects hx-on:* handlers into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-on:click', 'toggle .active');
      el.setAttribute('hx-on:mouseenter', 'add .hover');

      const config = processor.collectAttributes(el);
      expect(config.onHandlers).toEqual({
        click: 'toggle .active',
        mouseenter: 'add .hover',
      });
    });

    it('collects hx-push-url into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/page/2');
      el.setAttribute('hx-push-url', 'true');

      const config = processor.collectAttributes(el);
      expect(config.pushUrl).toBe(true);
    });

    it('collects hx-replace-url with custom value', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/data');
      el.setAttribute('hx-replace-url', '/custom-url');

      const config = processor.collectAttributes(el);
      expect(config.replaceUrl).toBe('/custom-url');
    });
  });

  describe('scanForHtmxElements', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('finds elements with hx-get', () => {
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/data');
      document.body.appendChild(el);

      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
        root: document.body,
      });
      const elements = processor.scanForHtmxElements();
      expect(elements).toHaveLength(1);
      expect(elements[0]).toBe(el);
    });

    it('finds elements with hx-post', () => {
      const el = document.createElement('button');
      el.setAttribute('hx-post', '/api/data');
      document.body.appendChild(el);

      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
        root: document.body,
      });
      const elements = processor.scanForHtmxElements();
      expect(elements).toHaveLength(1);
    });

    it('finds multiple htmx elements', () => {
      const el1 = document.createElement('button');
      el1.setAttribute('hx-get', '/api/data');
      const el2 = document.createElement('form');
      el2.setAttribute('hx-post', '/api/submit');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
        root: document.body,
      });
      const elements = processor.scanForHtmxElements();
      expect(elements).toHaveLength(2);
    });
  });

  describe('manualProcess', () => {
    it('translates element attributes to hyperscript', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/users');
      el.setAttribute('hx-target', '#users-list');
      el.setAttribute('hx-swap', 'innerHTML');

      const result = processor.manualProcess(el);
      expect(result).toContain("fetch '/api/users'");
      expect(result).toContain('swap innerHTML of #users-list with it');
      expect(result).toContain('on click');
    });
  });
});
