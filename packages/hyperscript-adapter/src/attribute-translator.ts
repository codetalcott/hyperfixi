/**
 * Attribute translator
 *
 * _hyperscript.org's Runtime#getScript is a private class field (`#getScript`),
 * not a property reachable through `internals.runtime` — every plugin variant
 * in this package used to monkey-patch `internals.runtime.getScript`, which
 * silently no-ops against current _hyperscript.org builds (the assignment
 * creates a stray own-property that the runtime's internal `#getScript()`
 * calls never read, so translation never happens and errors are swallowed by
 * `runtime.getScript.bind` throwing before any hyperscript even parses).
 *
 * `addBeforeProcessHook` is the supported, public extension point instead: it
 * fires on the subtree root passed to `processNode()` before the runtime reads
 * whichever configured attribute (`_`, `script`, `data-script` by default) or
 * `<script type="text/hyperscript">` body holds the source. Rewriting that
 * attribute/body in place — before the runtime's own scan reaches it — gets
 * the same "translate before parse" effect through a mechanism the runtime
 * actually calls.
 */

export interface HyperscriptHost {
  addBeforeProcessHook?: (fn: (elt: Element) => void) => void;
  config?: { attributes?: string };
}

/** Elements already processed, so a later `processNode()` call over the same
 *  subtree (e.g. a sibling swap re-scanning a shared ancestor) doesn't
 *  re-translate already-English text as if it were still the original language.
 *  A WeakSet instead of a marker attribute: the same idempotency with zero DOM
 *  mutation (devtools/serialization show exactly what the author wrote).
 *  Serialize→reparse (e.g. an innerHTML round-trip) produces NEW elements that
 *  are re-processed — safe, because re-translating already-English text is
 *  confidence-gated into a no-op. */
const processed = new WeakSet<Element>();

function scriptAttributeNames(hs: HyperscriptHost): string[] {
  const raw = hs.config?.attributes ?? '_, script, data-script';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function findScriptAttribute(elt: Element, attrNames: string[]): string | null {
  for (const name of attrNames) {
    if (elt.hasAttribute(name)) return name;
  }
  return null;
}

/**
 * Install a translator that rewrites non-English script attributes to English
 * in place, before `_hyperscript.org` parses them.
 *
 * @param translate Given the raw source and its element, return the English
 *   translation, or `null`/the same string to leave the element untouched
 *   (English input, unresolved language, translation failure, etc).
 */
export function installAttributeTranslator(
  hs: HyperscriptHost,
  translate: (src: string, elt: Element) => string | null
): void {
  if (typeof hs.addBeforeProcessHook !== 'function') {
    console.warn(
      '[hyperscript-i18n] _hyperscript.addBeforeProcessHook is unavailable — ' +
        'this build of _hyperscript.org is not supported. Load a current version ' +
        'from https://unpkg.com/hyperscript.org.'
    );
    return;
  }

  const attrNames = scriptAttributeNames(hs);
  const selector = [...attrNames.map(a => `[${a}]`), 'script[type="text/hyperscript"]'].join(', ');

  const translateOne = (elt: Element): void => {
    if (processed.has(elt)) return;

    if (elt instanceof HTMLScriptElement && elt.type === 'text/hyperscript') {
      const src = elt.textContent ?? '';
      if (!src) return;
      const english = translate(src, elt);
      processed.add(elt);
      if (english != null && english !== src) elt.textContent = english;
      return;
    }

    const attr = findScriptAttribute(elt, attrNames);
    if (!attr) return;
    const src = elt.getAttribute(attr);
    if (!src) return;
    const english = translate(src, elt);
    processed.add(elt);
    if (english != null && english !== src) elt.setAttribute(attr, english);
  };

  hs.addBeforeProcessHook((root: Element) => {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    if (typeof root.matches === 'function' && root.matches(selector)) translateOne(root);
    root.querySelectorAll(selector).forEach(translateOne);
  });
}
