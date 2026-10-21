/**
 * htmx and fixi: content they swap in is processed, and content a script puts in is handed to
 * htmx. `boot()` installs this once the document is processed, as upstream's boot installs its
 * `HtmxCompat`. Without htmx or fixi on the page it only adds two document listeners.
 *
 * Follows upstream _hyperscript 0.9.93's `src/core/runtime/htmx-compat.js` (its tests:
 * `integration/htmx.js`, `ext/hs-include.js`), with two additions upstream does not have:
 *
 * - The hand-off to htmx marks what htmx then processes as htmx's. Upstream's does not, so a
 *   page that also hands htmx's content to the engine (`htmx.onLoad(el =>
 *   _hyperscript.process(el))`, the workaround for an engine without this module) recursed
 *   until the stack ran out.
 * - fixi: on `fx:swapped`, the swapped content is processed. fixi processes `fx-action`
 *   content a script puts in on its own, with a MutationObserver.
 */
import { peekData } from './runtime';

/** What this module uses of the public object (`api` in `engine.ts`). */
export interface CompatHost {
  process(node: unknown): void;
  addAfterProcessHook(hook: (root: Element | Document | DocumentFragment) => void): void;
}

interface Htmx {
  process(elt: unknown): void;
  version?: string;
  registerExtension?(name: string, extension: Record<string, unknown>): void;
}

export function installHtmxCompat(hs: CompatHost): void {
  let fromHtmx = false;
  const asHtmx = (f: () => void) => {
    const was = fromHtmx;
    fromHtmx = true;
    try {
      f();
    } finally {
      fromHtmx = was;
    }
  };

  // htmx 2 announces swapped-in content with `htmx:load`, htmx 4 with `htmx:after:process`.
  document.addEventListener('htmx:load', evt =>
    asHtmx(() => hs.process((evt as CustomEvent).detail?.elt))
  );
  document.addEventListener('htmx:after:process', evt => asHtmx(() => hs.process(evt.target)));

  // fixi fires `fx:swapped` on the element that made the request, and on `document` too when
  // the swap removed that element. The target's parent holds every swap's new content but an
  // `outerHTML` one that replaced the target; then the body is read again (processed elements
  // are skipped).
  document.addEventListener('fx:swapped', evt => {
    const target = (evt as CustomEvent).detail?.cfg?.target;
    hs.process(
      target instanceof Element && target.isConnected ? target.parentElement : document.body
    );
  });

  const htmx = Reflect.get(globalThis, 'htmx') as Htmx | undefined;
  if (typeof htmx?.process !== 'function') return;
  hs.addAfterProcessHook(elt => {
    if (!fromHtmx) asHtmx(() => htmx.process(elt));
  });
  if (htmx.version?.startsWith('4')) {
    htmx.registerExtension?.('hs-include', {
      htmx_config_request(elt: Element, detail: { ctx?: HsIncludeCtx } | undefined) {
        const ctx = detail?.ctx;
        if (!ctx) return;
        const found = findHsInclude(ctx.sourceElement || elt);
        if (!found) return;
        const vars = resolveSpecifiers(found.value, found.scopeElt);
        const body = ctx.request?.body;
        if (body instanceof FormData) for (const k in vars) body.set(k, vars[k]);
      },
    });
  }
}

// ---------------------------------------------------------------------------
// hs-include: element-scoped variables into an htmx 4 request's form data
// ---------------------------------------------------------------------------

interface HsIncludeCtx {
  sourceElement?: Element;
  request?: { body?: unknown };
}

/** `hs-include` on the element, else `hs-include:inherited` on the nearest ancestor. */
function findHsInclude(sourceElt: Element): { value: string; scopeElt: Element } | null {
  const attr = sourceElt.getAttribute('hs-include');
  if (attr !== null) return { value: attr, scopeElt: sourceElt };
  for (let elt = sourceElt.parentElement; elt; elt = elt.parentElement) {
    const inherited = elt.getAttribute('hs-include:inherited');
    if (inherited !== null) return { value: inherited, scopeElt: elt };
  }
  return null;
}

const readScope = (elt: Element | null): Record<string, unknown> =>
  (elt && peekData(elt)?.scopes?.elementScope) || {};

function serialize(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

function resolveInherited(scopeKey: string, startElt: Element): unknown {
  for (let elt: Element | null = startElt; elt; elt = elt.parentElement) {
    const scope = readScope(elt);
    if (scopeKey in scope) return scope[scopeKey];
  }
  return undefined;
}

/** `*`, or a comma list of `:name` (this element), `^name` (inherited), `#sel:name`. */
function resolveSpecifiers(attrValue: string, scopeElt: Element): Record<string, string> {
  const result: Record<string, string> = {};
  const raw = attrValue.trim();
  if (raw === '*') {
    const scope = readScope(scopeElt);
    for (const k of Object.keys(scope)) result[k[0] === ':' ? k.slice(1) : k] = serialize(scope[k]);
    return result;
  }
  for (let part of raw.split(',')) {
    part = part.trim();
    if (!part) continue;
    if (part[0] === ':') {
      const scope = readScope(scopeElt);
      if (part in scope) result[part.slice(1)] = serialize(scope[part]);
    } else if (part[0] === '^') {
      const value = resolveInherited(':' + part.slice(1), scopeElt);
      if (value !== undefined) result[part.slice(1)] = serialize(value);
    } else if (part[0] === '#') {
      const colon = part.lastIndexOf(':');
      if (colon > 0) {
        const scope = readScope(document.querySelector(part.slice(0, colon)));
        const name = part.slice(colon + 1);
        if (':' + name in scope) result[name] = serialize(scope[':' + name]);
      }
    }
  }
  return result;
}
