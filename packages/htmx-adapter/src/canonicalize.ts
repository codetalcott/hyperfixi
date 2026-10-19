/**
 * Localized → canonical attribute canonicalization for upstream htmx.
 *
 * htmx v4 has no hook to override how core resolves an attribute name —
 * it reads `hx-get` literally. Until an upstream resolver seam exists
 * (see docs/UPSTREAM_HOOK_PROPOSAL.md), this module makes localized
 * authoring work by copying each localized attribute to its canonical
 * name on the same element *before* htmx processes the node:
 *
 *   <button lang="es" hx-obtener="/api">  →  + hx-get="/api"
 *
 * Design rules (mirroring the loka-js invariants where the mechanism
 * allows):
 *
 * - **The authored attribute is never removed or rewritten** — devtools
 *   keeps showing what the author wrote. Two documented exceptions:
 *   an author-written canonical `hx-trigger` whose *value* uses localized
 *   event names (`hx-trigger="clic"`) has no separate canonical target,
 *   so the value is translated in place (idempotent — the maps are
 *   localized → canonical, so a second pass is a no-op); and in executor
 *   mode a canonical-named `hx-on:*` attribute may be removed by the
 *   claim when no htmx hook exists to cancel htmx's binding (hx-on.ts).
 * - **An existing canonical attribute always wins.** If the element
 *   already has `hx-get`, a localized `hx-obtener` never overwrites it.
 * - **No vocab, no work.** With no languages registered every function
 *   here is a cheap no-op, so stock htmx pages pay ~nothing.
 *
 * Only attributes in the `hx-` / `sse-` / `ws-` namespaces are ever
 * considered — the brand prefix is preserved across languages (Phase 8
 * convention: Spanish writes `hx-obtener`, not `xx-obtener`), so the
 * prefix doubles as the discovery anchor.
 */

import { langOf } from './lang-resolver.js';
import { hasAnyVocab, lookupByAttrName, vocabFor, warnMissingLangOnce } from './registry.js';
import { claimHxOnAttribute, hasBodyExecutor } from './hx-on.js';
import { isResolverMode } from './resolver.js';

/** Own-key lookup: vocab maps are plain objects, and `constructor` is not an event. */
const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

/** Attribute namespaces the adapter touches. */
const NS_RE = /^(?:hx|sse|ws)-/;

/**
 * Byte-mirror of htmx v4's `HCON.split` top-level-comma regex (vendored
 * 4.0.0, `HCON.split`; pinned against the vendored file by
 * test/vendor-mirror.test.ts). Spec boundaries must match core's grammar:
 * commas inside `[filters]`, `(calls)`, and quoted strings — e.g.
 * `from:".a, .b"` — are NOT separators.
 *
 * On htmx 4.0.0 the extension's `init(internalAPI)` swaps in htmx's own
 * `HCON.split` (see setTriggerSpecSplitter), so the mirror is the
 * fallback for v2 and for pages where the extension is not registered.
 */
// The `\[` spelling is htmx's own and must stay byte-identical (the drift guard compares sources).
/* oxlint-disable no-useless-escape */
export const TOP_LEVEL_COMMA_RE =
  /,(?![^\[]*\])(?![^(]*\))(?![^<]*\/>)(?=(?:[^"']|"[^"]*"|'[^']*')*$)/;
/* oxlint-enable no-useless-escape */

export type TriggerSpecSplitter = (value: string) => string[];

const mirrorSplit: TriggerSpecSplitter = value => value.split(TOP_LEVEL_COMMA_RE);
let splitSpecs: TriggerSpecSplitter = mirrorSplit;

/**
 * Use htmx's own top-level splitter (`internalAPI.HCON.split` on 4.0.0)
 * instead of the mirror. Pass `null` to restore the mirror.
 */
export function setTriggerSpecSplitter(fn: TriggerSpecSplitter | null): void {
  splitSpecs = fn ?? mirrorSplit;
}

/**
 * What SSE and WebSocket names canonicalize to, by htmx generation. htmx 4's extensions read
 * `hx-sse:connect`, `hx-ws:connect` and `hx-ws:send` (in htmx's `metaCharacter`). They still read
 * htmx 2's `sse-connect`, `ws-connect` and `ws-send`, copying each with a console warning, and htmx
 * 2 reads only those. `sse-swap` has no htmx 4 name (removed: unnamed messages swap on their own),
 * so it stays `sse-swap` and htmx 4 says why. Until `registerWith` sees an htmx, the htmx-2 names,
 * which both generations read.
 */
const HTMX4_NAMES: Record<string, readonly [string, string]> = {
  'sse-connect': ['sse', 'connect'],
  'ws-connect': ['ws', 'connect'],
  'ws-send': ['ws', 'send'],
};

/** htmx 4's `hx-sse:<name>` / `hx-ws:<name>`: a localized `<name>` reads as `sse-<name>` / `ws-<name>`. */
const HTMX4_SPELLING_RE = /^hx-(sse|ws):(.+)$/;

/** htmx 4's metaCharacter while the page runs htmx 4; `null` for htmx 2 or none seen. */
let htmx4MetaCharacter: string | null = null;

/**
 * Set the htmx generation SSE and WebSocket names are written for. `registerWith` calls it from
 * the htmx it is given, whether or not htmx 4 accepts the registration.
 */
export function setHtmxGeneration(generation: 'v4' | 'v2' | null, metaCharacter?: string): void {
  htmx4MetaCharacter = generation === 'v4' ? metaCharacter || ':' : null;
}

/** The name `canonical` is written as on this page's htmx. */
function emittedName(canonical: string): string {
  const v4 = htmx4MetaCharacter === null ? undefined : HTMX4_NAMES[canonical];
  return v4 ? `hx-${v4[0]}${htmx4MetaCharacter}${v4[1]}` : canonical;
}

/** `hx-trigger` and its v4 modifier forms (`hx-trigger:inherited`, …). */
function isTriggerAttr(name: string): boolean {
  return name === 'hx-trigger' || name.startsWith('hx-trigger:');
}

/**
 * Translate localized event names inside an `hx-trigger` value.
 *
 * hx-trigger grammar: comma-separated specs, each `eventName[filter]
 * modifier…`. Only the leading event token of each spec is translated
 * (an attached `[...]` filter, all modifiers like `delay:500ms` /
 * `from:body` / `once`, and the authored spacing stay byte-identical —
 * the split removes exactly the commas the join restores, so an
 * all-canonical value comes back verbatim). Unknown tokens pass
 * through untouched, which also makes translation idempotent (the maps
 * are localized → canonical only). Only the map's OWN keys translate:
 * `constructor` is not an event.
 */
export function translateTriggerValue(value: string, events: Record<string, string>): string {
  return splitSpecs(value)
    .map(spec =>
      spec.replace(/^(\s*)([^[\s]+)/, (whole, ws: string, evt: string) =>
        hasOwn(events, evt) ? ws + events[evt] : whole
      )
    )
    .join(',');
}

/**
 * Canonical attributes THIS module wrote (per element), as opposed to
 * authored ones. Lets executor mode tell an adapter-created `hx-on:*`
 * sibling from an authored one when both name the same event.
 */
const created = new WeakMap<Element, Set<string>>();

function markCreated(elt: Element, name: string): void {
  let names = created.get(elt);
  if (!names) {
    names = new Set();
    created.set(elt, names);
  }
  names.add(name);
}

/** True when `name` on `elt` was written by canonicalization, not authored. */
export function wasCreatedByAdapter(elt: Element, name: string): boolean {
  return created.get(elt)?.has(name) ?? false;
}

/**
 * Canonicalize one element's localized htmx attributes in place.
 * Returns true if any attribute was added or updated.
 */
export function canonicalizeElement(elt: Element): boolean {
  if (!elt.attributes || elt.attributes.length === 0) return false;

  // Cheap prefilter before any lang resolution: bail unless some
  // attribute is in our namespaces.
  let hasNsAttr = false;
  for (const attr of Array.from(elt.attributes)) {
    if (NS_RE.test(attr.name)) {
      hasNsAttr = true;
      break;
    }
  }
  if (!hasNsAttr) return false;

  const executorMode = hasBodyExecutor();
  const lang = langOf(elt);
  if (lang === 'en' && !executorMode) return false;

  const vocab = vocabFor(lang);
  if (lang !== 'en' && !vocab) {
    warnMissingLangOnce(lang);
    // Executor mode still claims canonical-named hx-on:* attrs below —
    // body semantics don't depend on vocab being loaded.
    if (!executorMode) return false;
  }

  const attrs = vocab?.attrs ?? {};
  const events = vocab?.events ?? {};
  let hasEvents = false;
  for (const _ in events) {
    hasEvents = true;
    break;
  }
  let changed = false;

  // Snapshot — we mutate the attribute list while iterating, and the
  // canonical attributes written below must not be revisited.
  for (const attr of Array.from(elt.attributes)) {
    const name = attr.name;
    if (!NS_RE.test(name)) continue;

    // Executor mode owns the hx-on family outright: canonical-named
    // attrs are claimed (listener installed; removal is the claim's
    // call — see hx-on.ts)…
    if (executorMode && name.startsWith('hx-on:')) {
      if (
        claimHxOnAttribute(elt, name, lang, events, {
          adapterCreated: wasCreatedByAdapter(elt, name),
        })
      ) {
        changed = true;
      }
      continue;
    }

    // Author-written canonical hx-trigger (including modifier forms like
    // hx-trigger:inherited) with localized event values
    // (`hx-trigger="clic"`). Translated in place — a documented mutation
    // of an authored attribute, because there is no separate canonical
    // target. Idempotent by construction.
    if (isTriggerAttr(name)) {
      if (hasEvents) {
        const translated = translateTriggerValue(attr.value, events);
        if (translated !== attr.value) {
          elt.setAttribute(name, translated);
          changed = true;
        }
      }
      continue;
    }

    // Exact match: hx-obtener → hx-get. Every key below is read off the
    // attribute NAME, which HTML has lowercased (lookupByAttrName).
    let canonical = lookupByAttrName(attrs, name);

    // htmx 4's spelling of a localized SSE/WebSocket name: hx-sse:conectar is sse-conectar.
    const htmx4Spelling = canonical ? null : HTMX4_SPELLING_RE.exec(name);
    if (htmx4Spelling)
      canonical = lookupByAttrName(attrs, `${htmx4Spelling[1]}-${htmx4Spelling[2]}`);

    // Colon family: the base is looked up in attrs; what the suffix
    // means depends on the base. For hx-on the suffix is an EVENT name
    // (hx-en:clic → hx-on:click) and translates through events. For
    // every other attribute a colon suffix is an htmx v4 MODIFIER
    // (`:inherited` / `:append` — #attributeValue reads name+":inherited"
    // etc.), never an event name: pass it through verbatim so e.g.
    // hx-objetivo:inherited → hx-target:inherited, and an events-map
    // collision can never corrupt the modifier.
    let colonBase: string | undefined;
    if (!canonical) {
      const colon = name.indexOf(':');
      if (colon > 0) {
        const base = name.slice(0, colon);
        colonBase = lookupByAttrName(attrs, base);
        if (colonBase) {
          const suffix = name.slice(colon + 1);
          canonical =
            colonBase === 'hx-on'
              ? `${colonBase}:${lookupByAttrName(events, suffix) ?? suffix}`
              : `${colonBase}:${suffix}`;
        }
      }
    }

    if (!canonical) continue;

    // …and localized-named hx-on attrs are claimed in place: no
    // canonical sibling is created, the authored attr stays verbatim
    // (htmx never recognized it).
    if (executorMode && colonBase === 'hx-on') {
      if (claimHxOnAttribute(elt, name, lang, events)) changed = true;
      continue;
    }

    // sse-connect is written hx-sse:connect on htmx 4 (emittedName).
    canonical = emittedName(canonical);
    if (canonical === name || elt.hasAttribute(canonical)) continue;

    let value = attr.value;
    // hx-trigger and its modifier forms carry event names in the VALUE —
    // translate on the way over.
    if (isTriggerAttr(canonical)) value = translateTriggerValue(value, events);
    elt.setAttribute(canonical, value);
    markCreated(elt, canonical);
    changed = true;
  }

  return changed;
}

/**
 * Canonicalize an element and all its descendants. Returns the number of
 * elements that changed. This is what the htmx extension hook and the
 * initial document sweep call — htmx processes subtrees, so we mirror
 * that granularity.
 */
export function canonicalizeTree(root: Element | Document | DocumentFragment | null): number {
  if (!root) return 0;
  // Resolver mode (patched htmx answers reads directly) stands the
  // canonicalization shim down entirely — zero DOM mutation.
  if (isResolverMode()) return 0;
  // Executor mode must sweep even with no vocab loaded (English
  // hyperscript bodies need claiming too).
  if (!hasAnyVocab() && !hasBodyExecutor()) return 0;
  let count = 0;
  if (root instanceof Element && canonicalizeElement(root)) count++;
  if (typeof (root as Element).querySelectorAll === 'function') {
    for (const el of Array.from((root as Element).querySelectorAll('*'))) {
      if (canonicalizeElement(el)) count++;
    }
  }
  return count;
}
