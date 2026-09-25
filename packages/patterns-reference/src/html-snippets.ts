/**
 * Extract hyperscript sources out of HTML markup, via the DOM.
 *
 * Shared by the two harnesses that need it: `scripts/verify-engines.ts` (which
 * classifies each corpus pattern's `engine` column) and the testing-framework's
 * shipped-sources validity gate.
 *
 * **Why the DOM and not a regex.** A raw-text regex over `.html` cannot tell a
 * live attribute from a code sample: a `<pre>`/`<code>`/`.code` block showing
 * escaped source (`&lt;button _="…"&gt;`) matches just as well as the real
 * thing. That is not hypothetical — it is how an earlier sweep "found" two
 * malformed sources in `examples/events-and-dom/send-events.html` that were
 * only ever display text. Parsing the markup makes the distinction structural:
 * escaped text decodes into a text node, never into an attribute, so it cannot
 * be reached by an attribute walk.
 *
 * Do not reuse `@hyperfixi/vite-plugin`'s scanner for this purpose — it is
 * deliberately a regex (it scans partial source files that need not be
 * well-formed HTML) and has exactly that blind spot.
 */

/** Attribute prefixes that only the hyperfixi htmx-compat layer implements. */
const HYPERFIXI_ONLY_ATTR_PREFIXES = ['hx-live', 'sse-', 'ws-'];

/**
 * The DOM surface this module needs, declared structurally.
 *
 * This package compiles with `lib: ["ES2022"]` (it is Node-oriented — a SQLite
 * pattern database), so the ambient `Document`/`Element` types are not in
 * scope. Declaring the three members used here keeps the extractor usable from
 * a jsdom window, a browser document, or a happy-dom one without dragging the
 * whole DOM lib into the package's build.
 */
export interface MinimalAttr {
  name: string;
  value: string;
}

export interface MinimalElement {
  tagName: string;
  attributes: ArrayLike<MinimalAttr>;
  textContent: string | null;
  /** Read only on `<template>`, whose content `querySelectorAll` cannot reach. */
  innerHTML?: string;
  getAttribute(name: string): string | null;
}

export interface MinimalContainer extends MinimalElement {
  innerHTML: string;
  querySelectorAll(selectors: string): ArrayLike<MinimalElement>;
}

export interface MinimalDocument {
  createElement(tagName: string): MinimalContainer;
}

export interface MarkupSnippets {
  /**
   * Every hyperscript source found, in document order — including the `_`
   * attributes inside component template bodies, which run once the
   * component renders.
   */
  snippets: string[];
  /**
   * The markup uses at least one attribute upstream `_hyperscript` has no
   * concept of, so it cannot be claimed as upstream-compatible regardless of
   * how its snippets parse.
   */
  hyperfixiOnly: boolean;
  /**
   * Custom-element names the markup defines as template components. A
   * component's behavior is its RENDER, which no parse of its snippets can
   * check, so a verifier should instantiate each one.
   */
  componentTags: string[];
}

/**
 * Pull every hyperscript source out of `markup`.
 *
 * Collects `_="…"` attributes, `hx-live="…"` values (which ARE hyperscript —
 * the htmx-compat layer compiles them), and `<script type="text/hyperscript">`
 * bodies. The other hyperfixi-only attribute values (`sse-connect` URLs,
 * `sse-swap` event names, `ws-connect` URLs) are not hyperscript and carry no
 * snippet to verify, but they do set `hyperfixiOnly`.
 *
 * Template components — `<script type="text/hyperscript-template"
 * component="x">` (upstream's form, which upstream's official `component`
 * extension implements and @hyperfixi/components also accepts) and
 * `<template component="x">` — are NOT hyperfixi-only. Their bodies are markup
 * the DOM walk cannot reach (script text; template content), so each is
 * extracted recursively and its `_` sources join `snippets`.
 *
 * `doc` is any DOM `Document` — a jsdom window's, or the ambient one in a
 * browser/jsdom test environment. Markup that fails to parse yields no
 * snippets rather than throwing.
 */
export function extractHyperscriptFromMarkup(doc: MinimalDocument, markup: string): MarkupSnippets {
  const container = doc.createElement('div');
  try {
    container.innerHTML = markup;
  } catch {
    return { snippets: [], hyperfixiOnly: false, componentTags: [] };
  }

  const snippets: string[] = [];
  const componentTags: string[] = [];
  let hyperfixiOnly = false;

  for (const el of Array.from(container.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === '_' && attr.value.trim()) {
        snippets.push(attr.value);
      }
      if (attr.name === 'hx-live' && attr.value.trim()) {
        snippets.push(attr.value);
      }
      if (HYPERFIXI_ONLY_ATTR_PREFIXES.some(p => attr.name.startsWith(p))) {
        hyperfixiOnly = true;
      }
    }

    const tag = el.getAttribute('component');
    const isScriptTemplate =
      el.tagName === 'SCRIPT' && el.getAttribute('type') === 'text/hyperscript-template';
    if (tag && (isScriptTemplate || el.tagName === 'TEMPLATE')) {
      componentTags.push(tag);
      const body = isScriptTemplate ? (el.textContent ?? '') : (el.innerHTML ?? '');
      const inner = extractHyperscriptFromMarkup(doc, body);
      snippets.push(...inner.snippets);
      componentTags.push(...inner.componentTags);
      hyperfixiOnly ||= inner.hyperfixiOnly;
    } else if (
      el.tagName === 'SCRIPT' &&
      el.getAttribute('type') === 'text/hyperscript' &&
      el.textContent?.trim()
    ) {
      snippets.push(el.textContent);
    }
  }

  return { snippets, hyperfixiOnly, componentTags };
}
