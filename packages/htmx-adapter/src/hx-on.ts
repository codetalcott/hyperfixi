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
 * - Canonical-named attrs (`hx-on:click`) must be kept away from htmx's
 *   own binder: if htmx bound them, it would eval the hyperscript body
 *   as JS — a console error plus a double-execution attempt on every
 *   fire. A claim RECORDS the attribute (name + body) on the element;
 *   what keeps htmx off it is decided by whoever owns the runtime:
 *   - htmx v4, extension accepted: the extension's cancelable
 *     `htmx:before:on:init` hook consults the record per node and
 *     cancels htmx's binding — the authored attribute stays in the DOM
 *     (see extension.ts). `registerWith` turns claim-time removal OFF
 *     only after the registration actually succeeded.
 *   - everywhere else (htmx v2, a rejected v4 registration, no htmx):
 *     `neutralizeOnClaim` is ON (the default) and the canonical-named
 *     attribute is removed at claim time — the only guard that does not
 *     depend on a hook being installed, documented as the executor-mode
 *     exception in the README.
 *
 * With no executor set (the default), none of this runs and bodies keep
 * upstream JS semantics — the behavior-preservation invariant.
 *
 * Translation is lazy (first event fire, memoized) so a translator that
 * loads after the initial sweep still applies. Both auto-detection
 * (`autoDetectBodyHooks`) and manual configuration are supported; the
 * executor is also re-read at fire time so replacing it takes effect on
 * live listeners. The body is re-read on every re-claim, so
 * `htmx.process(elt, true)` after editing the attribute runs the new body.
 */

export type BodyExecutor = (code: string, elt: Element, evt: Event) => unknown;
export type BodyTranslator = (body: string, lang: string) => string;

/** Own-key lookup: vocab maps are plain objects, and `constructor` is not an event. */
const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

let executor: BodyExecutor | null = null;
let translator: BodyTranslator | null = null;

/** Listeners notified when the executor is set/cleared (drives re-sweeps). */
const hookChangeListeners = new Set<() => void>();

/** One claimed hx-on attribute on an element. */
interface Claim {
  /** The attribute the listener was installed for (`hx-on:click` / `hx-en:clic`). */
  attrName: string;
  /** Element language at claim time — drives lazy body translation. */
  lang: string;
  /** Authored body, refreshed on re-claim when the attribute changed. */
  body: string;
  /** Memoized translation of `body` (null = not translated yet). */
  translated: string | null;
}

/**
 * Per-element claims keyed by resolved EVENT name (sweep idempotency).
 * Keyed by event rather than attribute name so a localized attr and its
 * canonical form never both install a listener. When both are genuinely
 * authored, DOM attribute order decides which body wins; an
 * adapter-created canonical sibling (a no-executor sweep copied
 * `hx-en:clic` to `hx-on:click`, then an executor arrived) is removed
 * on the re-claim — it was never authored, so the never-mutate rule does
 * not cover it, and leaving it would hand htmx a foreign-language body.
 */
let claimed = new WeakMap<Element, Map<string, Claim>>();

/**
 * Whether a claim on a canonical-named `hx-on:*` attribute deletes it.
 *
 * ON (default) is the hook-independent guard. `registerWith` turns it
 * OFF only once htmx v4 has actually accepted the extension, because
 * only then does the per-node `htmx_before_on_init` cancellation exist
 * to keep htmx off the preserved attribute. Consumers wiring
 * `createExtension()` into `htmx.registerExtension` themselves must
 * call `setNeutralizeOnClaim(false)` after a successful registration
 * to get the same zero-mutation behaviour.
 */
let neutralizeOnClaim = true;

export function setNeutralizeOnClaim(enabled: boolean): void {
  neutralizeOnClaim = enabled;
}

export function neutralizesOnClaim(): boolean {
  return neutralizeOnClaim;
}

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

/** True when the adapter has claimed at least one hx-on attribute on `elt`. */
export function isClaimed(elt: Element): boolean {
  return (claimed.get(elt)?.size ?? 0) > 0;
}

/** Names of the attributes claimed on `elt` (canonical and localized). */
export function claimedAttrNames(elt: Element): Set<string> {
  const names = new Set<string>();
  const claims = claimed.get(elt);
  if (claims) for (const c of claims.values()) names.add(c.attrName);
  return names;
}

/**
 * Remove the claimed CANONICAL-named (`hx-on:*`) attributes from `elt`.
 * The per-node fallback for runtimes that will bind the node anyway
 * (v4 mixed nodes). Localized names are invisible to htmx and stay.
 * Returns how many were removed.
 */
export function removeClaimedCanonicalAttrs(elt: Element): number {
  let n = 0;
  for (const name of claimedAttrNames(elt)) {
    if (name.startsWith('hx-on:') && elt.hasAttribute(name)) {
      elt.removeAttribute(name);
      n++;
    }
  }
  return n;
}

/**
 * Resolve the DOM event name for an hx-on attribute suffix.
 * `hx-on::after-swap` shorthand (leading `:`) means the `htmx:` namespace;
 * plain suffixes translate through the vocab events map (own keys only —
 * `constructor` is not an event).
 */
function eventNameForSuffix(rawSuffix: string, events: Record<string, string>): string {
  if (rawSuffix.startsWith(':')) return `htmx${rawSuffix}`;
  return hasOwn(events, rawSuffix) ? events[rawSuffix] : rawSuffix;
}

export interface ClaimOptions {
  /**
   * The attribute was written by the adapter's own canonicalization (a
   * no-executor sweep's `hx-on:*` copy of a localized attr), not by the
   * author. Such a duplicate is always removed on claim.
   */
  adapterCreated?: boolean;
}

/**
 * Claim one hx-on-family attribute on an element: record it, install the
 * executor listener, and — when claim-time neutralization is on — remove
 * a canonical-named attribute so htmx never JS-evals it. Returns true if
 * the element changed or a listener was installed now (false when no
 * executor, already claimed for that event, or malformed).
 *
 * `lang` is the element's language at claim time — used for lazy body
 * translation. `events` is the language's event-name map (for the
 * listener's event name; the shorthand/unknown cases pass through).
 */
export function claimHxOnAttribute(
  elt: Element,
  attrName: string,
  lang: string,
  events: Record<string, string>,
  options: ClaimOptions = {}
): boolean {
  if (!executor) return false;

  const colon = attrName.indexOf(':');
  if (colon <= 0) return false; // colon-form only; legacy composite hx-on="…" unsupported

  const eventName = eventNameForSuffix(attrName.slice(colon + 1), events);
  const canonical = attrName.startsWith('hx-on:');
  const body = elt.getAttribute(attrName) ?? '';

  let claims = claimed.get(elt);
  const existing = claims?.get(eventName);
  if (existing) {
    if (existing.attrName === attrName) {
      // Re-claim of the same attribute (re-sweep, or a force re-process
      // after the author edited it): refresh the body, no new listener.
      if (existing.body !== body) {
        existing.body = body;
        existing.translated = null;
      }
      if (canonical && neutralizeOnClaim && elt.hasAttribute(attrName)) {
        elt.removeAttribute(attrName);
        return true;
      }
      return false;
    }
    // A second attribute for an already-claimed event (localized +
    // canonical naming the same event). No second listener. A canonical
    // duplicate is removed when it is adapter-created (never authored)
    // or when claim-time neutralization is on; an authored one stays
    // for the v4 hook to cancel.
    if (canonical && (options.adapterCreated || neutralizeOnClaim) && elt.hasAttribute(attrName)) {
      elt.removeAttribute(attrName);
      return true;
    }
    return false;
  }

  const claim: Claim = { attrName, lang, body, translated: null };
  elt.addEventListener(eventName, evt => {
    if (!executor) return; // executor cleared after claim — go quiet
    if (claim.translated === null) {
      claim.translated =
        claim.lang !== 'en' && translator ? translator(claim.body, claim.lang) : claim.body;
    }
    try {
      executor(claim.translated, elt, evt);
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.error(`[htmx-i18n] hx-on body execution failed (${attrName} → ${eventName})`, err);
      }
    }
  });

  if (!claims) {
    claims = new Map();
    claimed.set(elt, claims);
  }
  claims.set(eventName, claim);

  // Hook-independent guard: with neutralization on, a canonical-named
  // claim is deleted so htmx never JS-evals the hyperscript body. With it
  // off (v4 extension accepted) the attribute stays and the extension's
  // before:on:init hook cancels htmx's binding instead. Localized names
  // are invisible to htmx and always stay verbatim.
  if (canonical && neutralizeOnClaim) elt.removeAttribute(attrName);
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
  neutralizeOnClaim = true;
}
