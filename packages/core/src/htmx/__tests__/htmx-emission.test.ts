/**
 * htmx-emission.test.ts
 *
 * The rest of the htmx suite asserts on substrings of the generated hyperscript.
 * That cannot catch a snippet that contains all the right substrings in an order
 * the parser rejects — which is exactly how the trigger clause is easy to get
 * wrong (`[filter]` must follow the dot-modifiers, and `from` must follow both).
 *
 * So: feed every emitted snippet through the real parser and require it to compile.
 */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

import { hyperscript } from '../../api/hyperscript-api.js';
import { translateToHyperscript, type HtmxConfig } from '../htmx-translator.js';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { document } = dom.window;

function compileEmitted(config: HtmxConfig, tag = 'button'): string {
  const element = document.createElement(tag);
  const source = translateToHyperscript(config, element as unknown as Element);
  const result = hyperscript.compileSync(source);

  expect(
    result.ok,
    `emitted hyperscript did not compile:\n${source}\n${JSON.stringify(result.errors ?? [])}`
  ).toBe(true);

  return source;
}

describe('emitted hyperscript compiles', () => {
  it.each([
    ['bare GET', { method: 'GET', url: '/a' }],
    ['POST', { method: 'POST', url: '/a' }],
    ['delay', { method: 'GET', url: '/a', trigger: 'click delay:300ms' }],
    ['throttle', { method: 'GET', url: '/a', trigger: 'click throttle:1s' }],
    ['once', { method: 'GET', url: '/a', trigger: 'click once' }],
    ['all dot-modifiers', { method: 'GET', url: '/a', trigger: 'click delay:1s throttle:2s once' }],
    ['event filter', { method: 'GET', url: '/a', trigger: "keyup[key=='Enter']" }],
    ['filter + delay', { method: 'GET', url: '/a', trigger: "keyup[key=='Enter'] delay:300ms" }],
    ['from selector', { method: 'GET', url: '/a', trigger: 'click from:#modal' }],
    ['from keyword', { method: 'GET', url: '/a', trigger: 'click from:body' }],
    ['target filter', { method: 'GET', url: '/a', trigger: 'click target:.child' }],
    [
      'filter + target + delay + from (full stack)',
      {
        method: 'GET',
        url: '/a',
        trigger: "keyup[key=='Enter'] delay:300ms target:.child from:#m",
      },
    ],
    ['swap timings', { method: 'GET', url: '/a', swap: 'outerHTML swap:200ms settle:100ms' }],
    ['modifiers-only swap', { method: 'GET', url: '/a', swap: 'swap:200ms' }],
    ['morph style', { method: 'GET', url: '/a', swap: 'morph:innerHTML' }],
    ['headers', { method: 'GET', url: '/a', headers: '{"X-CSRFToken": "abc"}' }],
    ['vals POST', { method: 'POST', url: '/a', vals: '{"a": 1, "b": "x"}' }],
    ['vals GET (query string)', { method: 'GET', url: '/a', vals: 'q:hello' }],
    ['vals + headers', { method: 'POST', url: '/a', vals: 'a:1', headers: '{"X-T": "1"}' }],
    ['nested vals', { method: 'POST', url: '/a', vals: '{"n": {"q": 1}, "arr": [1, 2]}' }],
    ['confirm', { method: 'DELETE', url: '/a', confirm: "Really? It's permanent" }],
    ['push url', { method: 'GET', url: '/a', pushUrl: true }],
    ['replace url', { method: 'GET', url: '/a', replaceUrl: '/b' }],
    ['target shortcut', { method: 'GET', url: '/a', target: 'closest form' }],
    ['swap none', { method: 'GET', url: '/a', swap: 'none' }],
    ['swap delete', { method: 'GET', url: '/a', swap: 'delete' }],
  ] satisfies [string, HtmxConfig][])('%s', (_name, config) => {
    compileEmitted(config);
  });

  it('form POST body', () => {
    compileEmitted({ method: 'POST', url: '/a' }, 'form');
  });

  it('quotes in values do not break out of the literal', () => {
    const source = compileEmitted({
      method: 'POST',
      url: '/a',
      vals: `{"x": "' then remove <body/> then set y to '"}`,
    });
    // Compiles, and the injected text stayed inside the string literal.
    expect(source).toContain("\\'");
  });

  it("a url containing a quote can't escape the fetch literal", () => {
    compileEmitted({ method: 'GET', url: "/a'; halt" });
  });
});
