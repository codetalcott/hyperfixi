/**
 * hx-on body support — opt-in "executor mode".
 *
 * Upstream htmx evals `hx-on:*` bodies as JavaScript. In the hyperfixi
 * ecosystem the convention is hyperscript bodies (`hx-on:click="toggle
 * .active on me"`), which htmx's JS eval cannot run — and localized
 * bodies (`hx-en:clic="alternar .active"`) doubly so. This module lets a
 * page opt in to hyperscript-body semantics by configuring an executor:
 *
 *   setBodyExecutor((code, elt, evt) => _hyperscript.evaluate(code, { me: elt, event: evt }))
 *   setBodyTranslator((body, lang) => HyperscriptI18n.preprocess(body, lang))
 *
 * With an executor set, the adapter CLAIMS every hx-on-family attribute
 * (localized-named or canonical-named — all bodies are treated as
 * hyperscript; mixed JS/hyperscript pages have no reliable detection):
 * it installs a real event listener that runs the (lazily translated)
 * body through the executor, and keeps htmx away from it:
 *
 * - Localized-named attrs (`hx-en:clic`) stay verbatim in the DOM — htmx
 *   never recognized them anyway — and NO canonical `hx-on:*` sibling is
 *   created.
 * - Canonical-named attrs (`hx-on:click`) are REMOVED after claiming.
 *   This is the one place the adapter deletes an authored attribute: if
 *   it stayed, htmx would eval the hyperscript body as JS — a console
 *   error plus a double-execution attempt on every fire. Documented as
 *   the executor-mode exception in the README.
 *
 * With no executor set (the default), none of this runs and bodies keep
 * upstream JS semantics — the behavior-preservation invariant.
 *
 * Translation is lazy (first event fire, memoized) so a translator that
 * loads after the initial sweep still applies. Both auto-detection
 * (`autoDetectBodyHooks`) and manual configuration are supported; the
 * executor is also re-read at fire time so replacing it takes effect on
 * live listeners.
 */

export type BodyExecutor = (code: string, elt: Element, evt: Event) => unknown;
export type BodyTranslator = (body: string, lang: string) => string;

let executor: BodyExecutor | null = null;
let translator: BodyTranslator | null = null;

/** Listeners notified when the executor is set/cleared (drives re-sweeps). */
const hookChangeListeners = new Set<() => void>();

/**
 * Per-element set of already-claimed EVENT names (sweep idempotency).
 * Keyed by resolved event name rather than attribute name so a localized
 * attr and its canonical form never both install a listener — e.g. after
 * a v1 (no-executor) sweep created an `hx-on:click` sibling of
 * `hx-en:clic` and an executor registered later, the re-sweep claims one
 * of them and neutralizes the other. When both are genuinely authored,
 * DOM attribute order decides which body wins.
 */
let claimed = new WeakMap<Element, Set<string>>();

/** Configure the body executor. Setting/clearing it notifies subscribers. */
export function setBodyExecutor(fn: BodyExecutor | null): void {
  executor = fn;
  for (const listener of hookChangeListeners) listener();
}

/** Configure the body translator (localized body → English hyperscript). */
export function setBodyTranslator(fn: BodyTranslator | null): void {
  translator = fn;
}

export function hasBodyExecutor(): boolean {
  return executor !== null;
}

export function hasBodyTranslator(): boolean {
  return translator !== null;
}

/** Subscribe to executor changes. Returns an unsubscribe fn. */
export function onBodyHooksChanged(listener: () => void): () => void {
  hookChangeListeners.add(listener);
  return () => {
    hookChangeListeners.delete(listener);
  };
}

/**
 * Resolve the DOM event name for an hx-on attribute suffix.
 * `hx-on::after-swap` shorthand (leading `:`) means the `htmx:` namespace;
 * plain suffixes translate through the vocab events map.
 */
function eventNameForSuffix(rawSuffix: string, events: Record<string, string>): string {
  if (rawSuffix.startsWith(':')) return `htmx${rawSuffix}`;
  return events[rawSuffix] ?? rawSuffix;
}

/**
 * Claim one hx-on-family attribute on an element: install the executor
 * listener and neutralize htmx's view of it. Returns true if the claim
 * happened now (false when no executor, already claimed, or malformed).
 *
 * `lang` is the element's language at claim time — used for lazy body
 * translation. `events` is the language's event-name map (for the
 * listener's event name; the shorthand/unknown cases pass through).
 */
export function claimHxOnAttribute(
  elt: Element,
  attrName: string,
  lang: string,
  events: Record<string, string>
): boolean {
  if (!executor) return false;

  const colon = attrName.indexOf(':');
  if (colon <= 0) return false; // colon-form only; legacy composite hx-on="…" unsupported

  const eventName = eventNameForSuffix(attrName.slice(colon + 1), events);
  const already = claimed.get(elt);
  if (already?.has(eventName)) {
    // Duplicate claim for an already-claimed event — no second listener,
    // but canonical-named attrs still get neutralized so htmx never
    // JS-evals them.
    if (attrName.startsWith('hx-on:') && elt.hasAttribute(attrName)) {
      elt.removeAttribute(attrName);
      return true;
    }
    return false;
  }

  const body = elt.getAttribute(attrName) ?? '';

  // Lazy, memoized translation: translator may register after the sweep,
  // and repeated fires shouldn't re-translate.
  let translatedBody: string | null = null;
  elt.addEventListener(eventName, evt => {
    if (!executor) return; // executor cleared after claim — go quiet
    if (translatedBody === null) {
      translatedBody = lang !== 'en' && translator ? translator(body, lang) : body;
    }
    try {
      executor(translatedBody, elt, evt);
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.error(`[htmx-i18n] hx-on body execution failed (${attrName} → ${eventName})`, err);
      }
    }
  });

  // Canonical-named claims are removed so htmx never JS-evals the
  // hyperscript body (double-execution guard). Localized names are
  // invisible to htmx and stay verbatim.
  if (attrName.startsWith('hx-on:')) elt.removeAttribute(attrName);

  if (already) {
    already.add(eventName);
  } else {
    claimed.set(elt, new Set([eventName]));
  }
  return true;
}

/**
 * Auto-detect body hooks from page globals — called by the browser entry
 * at load and again at DOMContentLoaded. Never overwrites hooks that
 * were set explicitly.
 *
 * - `window._hyperscript` → executor (original _hyperscript; pairs with
 *   `@lokascript/hyperscript-adapter` for multilingual `_=` too)
 * - `window.HyperscriptI18n.preprocess` → translator (the
 *   hyperscript-adapter browser bundles expose exactly this)
 */
export function autoDetectBodyHooks(win: object): void {
  const w = win as {
    _hyperscript?: ((code: string) => unknown) & {
      evaluate?: (code: string, ctx?: object) => unknown;
    };
    HyperscriptI18n?: { preprocess?: (src: string, lang: string) => string };
  };

  if (!executor && typeof w._hyperscript === 'function') {
    const hs = w._hyperscript;
    setBodyExecutor((code, elt, evt) =>
      typeof hs.evaluate === 'function' ? hs.evaluate(code, { me: elt, event: evt }) : hs(code)
    );
  }

  if (!translator && typeof w.HyperscriptI18n?.preprocess === 'function') {
    const preprocess = w.HyperscriptI18n.preprocess;
    setBodyTranslator((body, lang) => preprocess(body, lang));
  }
}

/** Reset all body-hook state. Mainly for tests. */
export function resetBodyHooks(): void {
  executor = null;
  translator = null;
  hookChangeListeners.clear();
  claimed = new WeakMap();
}
