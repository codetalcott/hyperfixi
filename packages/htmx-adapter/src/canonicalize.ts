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

/** Attribute namespaces the adapter touches. */
const NS_RE = /^(?:hx|sse|ws)-/;

/**
 * Translate localized event names inside an `hx-trigger` value.
 *
 * hx-trigger grammar: comma-separated specs, each `eventName[filter]
 * modifier…`. Only the leading event token of each spec is translated
 * (preserving an attached `[...]` filter); modifiers like `delay:500ms`,
 * `from:body`, `once` are language-invariant and left alone. Unknown
 * tokens pass through untouched, which also makes translation idempotent
 * (the maps are localized → canonical only).
 */
export function translateTriggerValue(value: string, events: Record<string, string>): string {
  return value
    .split(',')
    .map(spec => {
      const trimmed = spec.trim();
      if (!trimmed) return trimmed;
      const parts = trimmed.split(/\s+/);
      const m = parts[0].match(/^([^[\s]+)(\[.*)?$/);
      if (m) {
        const translated = events[m[1]];
        if (translated) parts[0] = translated + (m[2] ?? '');
      }
      return parts.join(' ');
    })
    .join(', ');
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

  const lang = langOf(elt);
  if (lang === 'en') return false;

  const vocab = vocabFor(lang);
  if (!vocab) {
    warnMissingLangOnce(lang);
    return false;
  }

  const attrs = vocab.attrs ?? {};
  const events = vocab.events ?? {};
  let changed = false;

  // Snapshot — we mutate the attribute list while iterating.
  for (const attr of Array.from(elt.attributes)) {
    const name = attr.name;
    if (!NS_RE.test(name)) continue;

    // Exact match: hx-obtener → hx-get.
    let canonical = attrs[name];

    // Colon family (hx-on:*): hx-en:clic → hx-on:click. The base is
    // looked up in attrs, the event suffix in events.
    if (!canonical) {
      const colon = name.indexOf(':');
      if (colon > 0) {
        const canonicalBase = attrs[name.slice(0, colon)];
        if (canonicalBase) {
          const suffix = name.slice(colon + 1);
          canonical = `${canonicalBase}:${events[suffix] ?? suffix}`;
        }
      }
    }

    if (!canonical || canonical === name || elt.hasAttribute(canonical)) continue;

    let value = attr.value;
    if (canonical === 'hx-trigger') value = translateTriggerValue(value, events);
    elt.setAttribute(canonical, value);
    changed = true;
  }

  // Author-written canonical hx-trigger with localized event values
  // (`hx-trigger="clic"`). Translated in place — the only mutation of an
  // authored attribute, because there is no separate canonical target.
  const trigger = elt.getAttribute('hx-trigger');
  if (trigger !== null && Object.keys(events).length > 0) {
    const translated = translateTriggerValue(trigger, events);
    if (translated !== trigger) {
      elt.setAttribute('hx-trigger', translated);
      changed = true;
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
  if (!root || !hasAnyVocab()) return 0;
  let count = 0;
  if (root instanceof Element && canonicalizeElement(root)) count++;
  if (typeof (root as Element).querySelectorAll === 'function') {
    for (const el of Array.from((root as Element).querySelectorAll('*'))) {
      if (canonicalizeElement(el)) count++;
    }
  }
  return count;
}
