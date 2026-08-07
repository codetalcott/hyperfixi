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
 *   keeps showing what the author wrote. The one exception is an
 *   author-written canonical `hx-trigger` whose *value* uses localized
 *   event names (`hx-trigger="clic"`): there is no separate canonical
 *   target to write to, so the value is translated in place (idempotent —
 *   the maps are localized → canonical, so a second pass is a no-op).
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
import { hasAnyVocab, vocabFor, warnMissingLangOnce } from './registry.js';
import { claimHxOnAttribute, hasBodyExecutor } from './hx-on.js';
import { isResolverMode } from './resolver.js';

/** Attribute namespaces the adapter touches. */
const NS_RE = /^(?:hx|sse|ws)-/;

/**
 * Byte-mirror of htmx v4's `HCON.split` top-level-comma regex (vendored
 * 4.0.0-beta5, `HCON.split`). Spec boundaries must match core's grammar:
 * commas inside `[filters]`, `(calls)`, and quoted strings — e.g.
 * `from:".a, .b"` — are NOT separators.
 */
const TOP_LEVEL_COMMA_RE = /,(?![^\[]*\])(?![^(]*\))(?![^<]*\/>)(?=(?:[^"']|"[^"]*"|'[^']*')*$)/;

/**
 * Translate localized event names inside an `hx-trigger` value.
 *
 * hx-trigger grammar: comma-separated specs, each `eventName[filter]
 * modifier…`. Only the leading event token of each spec is translated
 * (an attached `[...]` filter, all modifiers like `delay:500ms` /
 * `from:body` / `once`, and the authored spacing stay byte-identical).
 * When nothing translates, the original string is returned verbatim, so
 * an all-canonical value is never rewritten. Unknown tokens pass
 * through untouched, which also makes translation idempotent (the maps
 * are localized → canonical only).
 */
export function translateTriggerValue(value: string, events: Record<string, string>): string {
  let changed = false;
  const specs = value.split(TOP_LEVEL_COMMA_RE).map(spec =>
    spec.replace(/^(\s*)([^[\s]+)/, (whole, ws: string, evt: string) => {
      const translated = events[evt];
      if (!translated) return whole;
      changed = true;
      return ws + translated;
    })
  );
  return changed ? specs.join(',') : value;
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
  let changed = false;

  // Snapshot — we mutate the attribute list while iterating.
  for (const attr of Array.from(elt.attributes)) {
    const name = attr.name;
    if (!NS_RE.test(name)) continue;

    // Executor mode owns the hx-on family outright: canonical-named
    // attrs are claimed (listener installed, attr removed so htmx never
    // JS-evals the hyperscript body)…
    if (executorMode && name.startsWith('hx-on:')) {
      if (claimHxOnAttribute(elt, name, lang, events)) changed = true;
      continue;
    }

    // Exact match: hx-obtener → hx-get.
    let canonical = attrs[name];

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
        colonBase = attrs[name.slice(0, colon)];
        if (colonBase) {
          const suffix = name.slice(colon + 1);
          canonical =
            colonBase === 'hx-on'
              ? `${colonBase}:${events[suffix] ?? suffix}`
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

    if (canonical === name || elt.hasAttribute(canonical)) continue;

    let value = attr.value;
    // hx-trigger and its modifier forms (hx-trigger:inherited etc.)
    // carry event names in the VALUE — translate on the way over.
    if (canonical === 'hx-trigger' || canonical.startsWith('hx-trigger:')) {
      value = translateTriggerValue(value, events);
    }
    elt.setAttribute(canonical, value);
    changed = true;
  }

  // Author-written canonical hx-trigger (including modifier forms like
  // hx-trigger:inherited) with localized event values
  // (`hx-trigger="clic"`). Translated in place — the only mutation of an
  // authored attribute, because there is no separate canonical target.
  if (Object.keys(events).length > 0) {
    for (const attr of Array.from(elt.attributes)) {
      if (attr.name !== 'hx-trigger' && !attr.name.startsWith('hx-trigger:')) continue;
      const translated = translateTriggerValue(attr.value, events);
      if (translated !== attr.value) {
        elt.setAttribute(attr.name, translated);
        changed = true;
      }
    }
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
