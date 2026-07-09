/**
 * htmx-wire.test.ts
 *
 * `hx-vals` and `hx-headers` used to be no-ops: the translator interpolated them
 * into a `with { ... }` clause whose keys `fetch` does not read, so nothing was
 * ever sent. Compiling the emitted hyperscript is therefore not enough — these
 * tests execute it against a stubbed `fetch` and assert on the actual request.
 *
 * The body must be `application/x-www-form-urlencoded`, matching htmx. That is
 * what lets a server framework read the values as form fields — Django, for one,
 * only populates `request.POST` from form-encoded or multipart bodies, so a JSON
 * body would make `csrfmiddlewaretoken` invisible.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { hyperscript } from '../../api/hyperscript-api.js';
import { translateToHyperscript, type HtmxConfig } from '../htmx-translator.js';

interface CapturedRequest {
  url: string;
  init: RequestInit | undefined;
}

let captured: CapturedRequest | null = null;

beforeEach(() => {
  captured = null;
  vi.stubGlobal('fetch', (url: unknown, init?: RequestInit) => {
    captured = { url: String(url), init };
    return Promise.resolve(
      new Response('<p>ok</p>', { status: 200, headers: { 'content-type': 'text/html' } })
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Emits the handler for `config`, then runs just its command body.
 *
 * `traditional: true` mirrors what the hx bundles' `executeOnElement` does. The
 * semantic parser drops `fetch`'s `with { ... }` clause, so a request driven
 * through it would carry neither headers nor body — see the guard test below.
 */
async function issueRequest(config: HtmxConfig, tag = 'button'): Promise<CapturedRequest> {
  const element = document.createElement(tag);
  document.body.appendChild(element);

  const source = translateToHyperscript(config, element);
  // Drop the `on <event>` head; execute the commands directly.
  const body = source.split('\n').slice(1).join('\n').trim();
  await hyperscript.eval(body, element, { traditional: true });

  expect(captured, `no request was issued for:\n${source}`).not.toBeNull();
  return captured as CapturedRequest;
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  const h = init?.headers;
  return h instanceof Headers ? h.get(name) : null;
}

describe('htmx request wire format', () => {
  it('sends hx-headers on the request', async () => {
    const req = await issueRequest({
      method: 'GET',
      url: '/api/data',
      headers: '{"X-CSRFToken": "abc123"}',
    });
    expect(headerOf(req.init, 'x-csrftoken')).toBe('abc123');
  });

  it('sends hx-vals as a form-encoded body on POST', async () => {
    const req = await issueRequest({
      method: 'POST',
      url: '/api/submit',
      vals: '{"csrfmiddlewaretoken": "abc123", "id": 7}',
    });

    expect(req.init?.method).toBe('POST');
    expect(req.init?.body).toBe('csrfmiddlewaretoken=abc123&id=7');
    expect(headerOf(req.init, 'content-type')).toBe('application/x-www-form-urlencoded');
  });

  it('carries the Django CSRF token as both a header and a form field', async () => {
    const req = await issueRequest({
      method: 'POST',
      url: '/api/submit',
      vals: 'csrfmiddlewaretoken:abc123',
      headers: '{"X-CSRFToken": "abc123"}',
    });

    expect(headerOf(req.init, 'x-csrftoken')).toBe('abc123');
    expect(req.init?.body).toBe('csrfmiddlewaretoken=abc123');
  });

  it('percent-encodes values rather than letting them break the body', async () => {
    const req = await issueRequest({
      method: 'POST',
      url: '/api/submit',
      vals: '{"q": "a&b=c d"}',
    });
    expect(req.init?.body).toBe('q=a%26b%3Dc+d');
  });

  it('appends hx-vals to the query string on GET, with no body', async () => {
    const req = await issueRequest({ method: 'GET', url: '/api/search', vals: 'q:hello page:2' });
    expect(req.url).toContain('/api/search?q=hello&page=2');
    expect(req.init?.body ?? null).toBeNull();
  });

  it('sends a form element’s fields as a form-encoded body', async () => {
    const form = document.createElement('form');
    form.innerHTML = '<input name="email" value="a@b.com"><input name="n" value="2">';
    document.body.appendChild(form);

    const source = translateToHyperscript({ method: 'POST', url: '/api/submit' }, form);
    const body = source.split('\n').slice(1).join('\n').trim();
    // `halt the event` needs an event; run only the fetch onward.
    await hyperscript.eval(body.replace(/^halt the event\s*/, ''), form, { traditional: true });

    expect(captured).not.toBeNull();
    expect(captured!.init?.body).toBe('email=a%40b.com&n=2');
    expect(headerOf(captured!.init, 'content-type')).toBe('application/x-www-form-urlencoded');
  });

  it('never evaluates a js: prefixed hx-vals', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const req = await issueRequest({
      method: 'POST',
      url: '/api/submit',
      vals: 'js:{token: (() => { throw new Error("evaluated!") })()}',
    });
    expect(req.init?.body ?? null).toBeNull();
    warn.mockRestore();
  });

  it('does not emit a `via` clause, which the main parser cannot consume', () => {
    const element = document.createElement('button');
    const source = translateToHyperscript({ method: 'POST', url: '/api/submit' }, element);
    // `via POST` is understood only by the hybrid parser. In the main parser it is
    // an unrecognized token that halts the modifier loop, silently discarding the
    // `with { ... }` and `as html` clauses that follow it.
    expect(source).not.toContain('via POST');
    expect(source).toContain("with { method: 'POST'");
  });
});

describe('parser gap this relies on', () => {
  // Guards the reason `executeOnElement` forces `traditional: true`. If the
  // semantic parser ever learns to carry `fetch`'s `with` options, this test
  // fails and the workaround can be reconsidered.
  it('the semantic parser still drops the fetch `with` clause', async () => {
    const element = document.createElement('button');
    document.body.appendChild(element);

    await hyperscript.eval("fetch '/x' with { method: 'POST', body: 'a=1' } as html", element);

    expect(captured).not.toBeNull();
    expect(captured!.init?.method ?? null).toBeNull();
    expect(captured!.init?.body ?? null).toBeNull();
  });
});
