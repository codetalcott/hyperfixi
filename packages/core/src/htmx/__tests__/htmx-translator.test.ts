/**
 * Tests for htmx attribute translation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  translateToHyperscript,
  hasHtmxAttributes,
  resetUnsupportedModifierWarnings,
  type HtmxConfig,
} from '../htmx-translator.js';
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
        expect(result).toContain('put it into #output');
      });
    });

    describe('POST requests', () => {
      it('carries the method in the fetch options', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/users',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/users' with { method: 'POST' }");
      });

      it('sends form values as a form-encoded body', () => {
        const form = document.createElement('form');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
        };
        const result = translateToHyperscript(config, form);
        expect(result).toContain('body: me as FormEncoded');
        expect(result).toContain("'Content-Type': 'application/x-www-form-urlencoded'");
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
        expect(result).toContain("fetch '/api/resource' with { method: 'PUT' }");
      });

      it('translates hx-patch', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'PATCH',
          url: '/api/resource',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/resource' with { method: 'PATCH' }");
      });

      it('translates hx-delete', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'DELETE',
          url: '/api/resource',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/resource' with { method: 'DELETE' }");
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
        expect(result).toContain('put it into me');
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
        expect(result).toContain('put it into #my-output');
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
        expect(result).toContain('put it into #output');
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
        expect(result).toContain("set #output's outerHTML to it");
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
        expect(result).toContain('on init');
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

      // The old regex only matched `\d+`, so fractional and minute durations
      // were dropped on the floor.
      it.each([
        ['delay:1.5s', '.debounce(1500)'],
        ['delay:2m', '.debounce(120000)'],
        ['delay:500', '.debounce(500)'],
        ['throttle:0.5s', '.throttle(500)'],
      ])('parses duration %s', (modifier, expected) => {
        const button = document.createElement('button');
        const config: HtmxConfig = { method: 'GET', url: '/a', trigger: `click ${modifier}` };
        expect(translateToHyperscript(config, button)).toContain(expected);
      });

      it('emits dot-modifiers before the event filter (parser requires this order)', () => {
        const input = document.createElement('input');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/a',
          trigger: "keyup[key=='Enter'] delay:300ms",
        };
        expect(translateToHyperscript(config, input)).toContain(
          "on keyup.debounce(300)[key=='Enter']"
        );
      });

      it('preserves an event filter that was previously dropped', () => {
        const input = document.createElement('input');
        const config: HtmxConfig = { method: 'GET', url: '/a', trigger: "keyup[key=='Enter']" };
        expect(translateToHyperscript(config, input)).toContain("on keyup[key=='Enter']");
      });

      it.each([
        ['from:#modal', 'from <#modal/>'],
        ['from:.panel', 'from <.panel/>'],
        ['from:body', 'from body'],
        ['from:window', 'from window'],
        ['from:this', 'from me'],
      ])('wires %s', (modifier, expected) => {
        const button = document.createElement('button');
        const config: HtmxConfig = { method: 'GET', url: '/a', trigger: `click ${modifier}` };
        expect(translateToHyperscript(config, button)).toContain(expected);
      });

      it('wires target: to a matches filter', () => {
        const div = document.createElement('div');
        const config: HtmxConfig = { method: 'GET', url: '/a', trigger: 'click target:.child' };
        expect(translateToHyperscript(config, div)).toContain("[target matches '.child']");
      });

      it('combines an event filter with target:', () => {
        const div = document.createElement('div');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/a',
          trigger: "keyup[key=='Enter'] target:.child",
        };
        expect(translateToHyperscript(config, div)).toContain(
          "[(key=='Enter') and (target matches '.child')]"
        );
      });

      it('quotes a value containing spaces', () => {
        const div = document.createElement('div');
        const config: HtmxConfig = { method: 'GET', url: '/a', trigger: 'click from:"#a .b"' };
        expect(translateToHyperscript(config, div)).toContain('from <#a .b/>');
      });

      it('warns rather than silently dropping an unsupported modifier', () => {
        resetUnsupportedModifierWarnings();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const button = document.createElement('button');
        const config: HtmxConfig = { method: 'GET', url: '/a', trigger: 'click consume queue:all' };
        translateToHyperscript(config, button);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('consume'));
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('queue'));
        warn.mockRestore();
      });

      // `matches` only does CSS matching for `.#:[`-led or bare-tag selectors;
      // a combinator would silently evaluate to false, so we refuse it instead.
      it.each([['click target:"ul > li"'], ['click target:<ul > li/>']])(
        'warns rather than emitting a matches filter that always fails: %s',
        trigger => {
          resetUnsupportedModifierWarnings();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const div = document.createElement('div');
          const result = translateToHyperscript({ method: 'GET', url: '/a', trigger }, div);
          expect(result).not.toContain('matches');
          expect(warn).toHaveBeenCalledWith(expect.stringContaining('target'));
          warn.mockRestore();
        }
      );

      // An unquoted complex selector splits into bare keys, exactly as in htmx.
      // The stray tokens now surface as warnings instead of vanishing.
      it('warns about the stray tokens of an unquoted complex selector', () => {
        resetUnsupportedModifierWarnings();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const div = document.createElement('div');
        translateToHyperscript({ method: 'GET', url: '/a', trigger: 'click target:ul > li' }, div);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('li'));
        warn.mockRestore();
      });
    });

    describe('hx-swap modifiers', () => {
      it('parses a style followed by timing modifiers', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/a',
          swap: 'outerHTML swap:200ms settle:100ms',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('then wait 200ms');
        expect(result).toContain("set me's outerHTML to it");
        expect(result).toContain('then wait 100ms');
        // Timing must bracket the swap, not replace the style.
        expect(result.indexOf('wait 200ms')).toBeLessThan(result.indexOf('outerHTML to it'));
        expect(result.indexOf('outerHTML to it')).toBeLessThan(result.indexOf('wait 100ms'));
      });

      it('falls back to the default style when only modifiers are given', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = { method: 'GET', url: '/a', swap: 'swap:200ms' };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('then wait 200ms');
        expect(result).toContain('put it into me');
      });

      // `morph:innerHTML` is a style, but it also looks like a `key:value` pair.
      it.each([
        ['morph:innerHTML', 'morph innerHTML of me with it'],
        ['morph:outerHTML', 'morph me with it'],
      ])('keeps %s as a style, not a modifier', (swap, expected) => {
        const button = document.createElement('button');
        const config: HtmxConfig = { method: 'GET', url: '/a', swap };
        expect(translateToHyperscript(config, button)).toContain(expected);
      });

      it('warns on an unsupported swap modifier', () => {
        resetUnsupportedModifierWarnings();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const button = document.createElement('button');
        const config: HtmxConfig = { method: 'GET', url: '/a', swap: 'innerHTML scroll:top' };
        translateToHyperscript(config, button);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('scroll'));
        warn.mockRestore();
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
      // The translator deliberately ignores onHandlers — the processor
      // installs real addEventListener calls for those (see hx-on.test.ts).
      // Wrapping them as `on EVENT body` in the translated snippet parsed
      // fine but never reached the runtime path that registers listeners,
      // so handlers silently no-op'd. See htmx-v4-reactive-streaming.md
      // Phase 8-pre.
      it('does not emit translated hyperscript for onHandlers', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          onHandlers: { click: 'toggle .active on me' },
        };
        expect(translateToHyperscript(config, button)).toBe('');
      });

      it('does not emit anything for multiple onHandlers either', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          onHandlers: { mouseenter: 'add .hover', mouseleave: 'remove .hover' },
        };
        expect(translateToHyperscript(config, button)).toBe('');
      });

      it('still emits a request handler when onHandlers are present', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api',
          onHandlers: { mouseenter: 'add .hover' },
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api'");
        // But the hx-on body is NOT in the translated output.
        expect(result).not.toContain('add .hover');
      });
    });

    describe('hx-vals', () => {
      it('re-serializes JSON vals into a form-encoded body for POST', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
          vals: '{"key": "value", "id": 123}',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("body: { 'key': 'value', 'id': 123 } as FormEncoded");
        expect(result).toContain("'Content-Type': 'application/x-www-form-urlencoded'");
        // The raw attribute text must never survive into the generated source.
        expect(result).not.toContain('{"key": "value", "id": 123}');
      });

      it('includes vals for PUT requests', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'PUT',
          url: '/api/update',
          vals: '{"status": "active"}',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("body: { 'status': 'active' } as FormEncoded");
      });

      it('accepts HCON vals, not just JSON', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
          vals: 'status:active retries:3',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("body: { 'status': 'active', 'retries': 3 } as FormEncoded");
      });

      it('appends vals to the query string for GET', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/search',
          vals: 'q:hello page:2',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("fetch '/api/search?q=hello&page=2'");
        expect(result).not.toContain('body:');
      });

      it('merges into an existing query string for GET', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = { method: 'GET', url: '/api/search?a=1', vals: 'b:2' };
        expect(translateToHyperscript(config, button)).toContain("fetch '/api/search?a=1&b=2'");
      });

      it('escapes quotes rather than letting attribute text become code', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
          // A naive interpolation would close the literal and inject a command.
          vals: `{"x": "' then remove <body/> then set y to '"}`,
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("\\' then remove <body/> then set y to \\'");
        expect(result).not.toContain("'x': '' then remove");
      });

      it('drops prototype keys', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
          vals: '{"__proto__": {"polluted": true}, "ok": 1}',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("body: { 'ok': 1 } as FormEncoded");
        expect(result).not.toContain('__proto__');
      });

      it('warns and ignores a js: prefix instead of evaluating it', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
          vals: 'js:{token: getToken()}',
        };
        const result = translateToHyperscript(config, button);
        expect(result).not.toContain('getToken');
        expect(result).not.toContain('body:');
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('js:'));
        warn.mockRestore();
      });
    });

    describe('hx-headers', () => {
      it('threads headers into the fetch options', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'GET',
          url: '/api/data',
          headers: '{"X-Custom-Header": "value"}',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain(
          "fetch '/api/data' with { headers: { 'X-Custom-Header': 'value' } }"
        );
      });

      it('threads multiple headers', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
          headers: '{"Authorization": "Bearer token", "X-Request-Id": "123"}',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("'Authorization': 'Bearer token'");
        expect(result).toContain("'X-Request-Id': '123'");
      });

      it('carries a Django-style CSRF token header', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
          headers: '{"X-CSRFToken": "abc123"}',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("headers: { 'X-CSRFToken': 'abc123' }");
      });

      it('does not override an author-supplied Content-Type', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          method: 'POST',
          url: '/api/submit',
          headers: '{"Content-Type": "application/json"}',
          vals: 'a:1',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain("'Content-Type': 'application/json'");
        expect(result).not.toContain('x-www-form-urlencoded');
      });
    });

    describe('hx-live (reactive expression)', () => {
      it('emits a live ... end block when hxLive is set', () => {
        const div = document.createElement('div');
        const config: HtmxConfig = { hxLive: 'put $count into me' };
        const result = translateToHyperscript(config, div);
        expect(result).toBe('live\n  put $count into me\nend');
      });

      it('emits live block alone when onHandlers are also present', () => {
        const div = document.createElement('div');
        const config: HtmxConfig = {
          hxLive: 'put $count into me',
          onHandlers: { click: 'toggle .active on me' },
        };
        const result = translateToHyperscript(config, div);
        // Live block is the only translated output — onHandlers are
        // installed directly by the processor (see hx-on.test.ts).
        expect(result).toBe('live\n  put $count into me\nend');
      });

      it('emits live block alongside a request handler', () => {
        const button = document.createElement('button');
        const config: HtmxConfig = {
          hxLive: 'put $count into me',
          method: 'GET',
          url: '/api/data',
        };
        const result = translateToHyperscript(config, button);
        expect(result).toContain('live\n  put $count into me\nend');
        expect(result).toContain("fetch '/api/data'");
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

    it('collects hx-vals into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-post', '/api/submit');
      el.setAttribute('hx-vals', '{"id": 123, "action": "approve"}');

      const config = processor.collectAttributes(el);
      expect(config.vals).toBe('{"id": 123, "action": "approve"}');
    });

    it('collects hx-headers into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('button');
      el.setAttribute('hx-get', '/api/data');
      el.setAttribute('hx-headers', '{"X-Custom": "val", "Authorization": "Bearer token"}');

      const config = processor.collectAttributes(el);
      expect(config.headers).toBe('{"X-Custom": "val", "Authorization": "Bearer token"}');
    });

    it('collects hx-live into config', () => {
      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
      const el = document.createElement('div');
      el.setAttribute('hx-live', 'put $count into me');

      const config = processor.collectAttributes(el);
      expect(config.hxLive).toBe('put $count into me');
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

    it('finds elements with only hx-live (no request URL)', () => {
      // hx-live makes an element discoverable even without hx-get/post/etc.
      // — it's a standalone reactive expression.
      const el = document.createElement('div');
      el.setAttribute('hx-live', 'put $count into me');
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
      expect(result).toContain('put it into #users-list');
      expect(result).toContain('on click');
    });
  });

  describe('hx-live reactivity gate', () => {
    // These tests cover the processor's runtime check that the `live` feature
    // is registered before emitting a live block. They don't pull in
    // @hyperfixi/reactivity (which would be a cross-package dep); instead they
    // poke the parser-extension registry directly to simulate plugin presence.

    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('logs a clear error when reactivity plugin is not installed', async () => {
      const { getParserExtensionRegistry } = await import('../../parser/extensions');
      const registry = getParserExtensionRegistry();
      const baseline = registry.snapshot();
      // Ensure no `live` feature registered (default state).
      registry.restore(baseline);

      const el = document.createElement('div');
      el.setAttribute('hx-live', 'put $count into me');
      document.body.appendChild(el);

      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
        root: document.body,
      });

      let executed = false;
      processor.init(async () => {
        executed = true;
      });

      const errors: string[] = [];
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        errors.push(args.map(a => String(a)).join(' '));
      };
      try {
        processor.processElement(el);
      } finally {
        console.error = originalError;
      }

      expect(errors.some(e => e.includes('hx-live requires @hyperfixi/reactivity'))).toBe(true);
      expect(executed).toBe(false);

      registry.restore(baseline);
    });

    it('emits the live block when reactivity plugin is installed', async () => {
      const { getParserExtensionRegistry } = await import('../../parser/extensions');
      const registry = getParserExtensionRegistry();
      const baseline = registry.snapshot();
      // Register a no-op `live` feature parser to satisfy the hasFeature() gate.
      registry.registerFeature('live', () => null);

      const el = document.createElement('div');
      el.setAttribute('hx-live', 'put $count into me');
      document.body.appendChild(el);

      // Stub dispatchEvent — the processor dispatches lifecycle CustomEvents
      // and the jsdom instance set up at module top has stricter type checks
      // than the processor's globals expect. We're testing the live-block
      // emission, not the lifecycle dispatch path.
      el.dispatchEvent = (() => true) as Element['dispatchEvent'];

      const processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
        root: document.body,
      });

      let receivedCode = '';
      processor.init(async (code: string) => {
        receivedCode = code;
      });

      processor.processElement(el);
      // Give the async init callback a tick to fire.
      await Promise.resolve();
      await Promise.resolve();

      expect(receivedCode).toContain('live');
      expect(receivedCode).toContain('put $count into me');
      expect(receivedCode).toContain('end');

      registry.restore(baseline);
    });
  });
});
