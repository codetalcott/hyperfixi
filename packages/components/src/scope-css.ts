/**
 * Scoped CSS — lift `<style>` blocks out of component templates and inject
 * them into `<head>` wrapped in `@scope (tag-name) { ... }`.
 *
 * Mirrors upstream _hyperscript 0.9.91's component style-scoping behavior.
 * Two reasons we do this:
 *   1. Without lifting, every instance's innerHTML would contain a copy of
 *      the `<style>` block. The browser parses each one — wasteful and a
 *      footgun if the user uses non-`@scope` selectors.
 *   2. Wrapping the contents in `@scope (tag-name) { ... }` confines them
 *      to that custom-element tree, so styles authored against a generic
 *      `.btn` class don't leak globally.
 *
 * Browser support: `@scope` is in Chrome 118+, Safari 17.4+, Firefox 128+.
 * In older browsers, the `@scope` rule is ignored and styles leak globally
 * — graceful degradation; nothing actively breaks.
 *
 * Idempotency: the same component may be (re)scanned multiple times via
 * `componentsPlugin.scan()` followed by `watchForTemplates()`. We dedupe by
 * a `data-component="${tagName}"` attribute on the injected `<style>`.
 */

const STYLE_BLOCK_RE = /<style(?:\s[^>]*)?>([\s\S]*?)<\/style\s*>/gi;

export interface ExtractResult {
  /** The HTML with all `<style>` blocks removed. */
  html: string;
  /** The raw text content of each removed `<style>` block, in document order. */
  styles: string[];
}

/**
 * Strip `<style>...</style>` blocks from `html` and return their text content.
 * Preserves the surrounding HTML otherwise. Tag-attributes on `<style>` are
 * dropped (we re-build the injected element's attributes ourselves).
 */
export function extractStyles(html: string): ExtractResult {
  const styles: string[] = [];
  const cleaned = html.replace(STYLE_BLOCK_RE, (_match, body: string) => {
    styles.push(body);
    return '';
  });
  return { html: cleaned, styles };
}

/**
 * Inject the given style blocks into `document.head` as a single
 * `<style data-component="${tagName}">` element wrapped in `@scope`. No-op if
 * `styles` is empty or if the injection has already been done for this tag.
 *
 * Returns `true` if injection happened, `false` if it was skipped (already
 * present, no styles, or no document/head available).
 */
export function injectScopedStyles(tagName: string, styles: string[]): boolean {
  if (styles.length === 0) return false;
  if (typeof document === 'undefined' || !document.head) return false;

  const selector = `style[data-component="${cssAttrEscape(tagName)}"]`;
  if (document.head.querySelector(selector)) return false;

  const wrapped = styles.map(body => `@scope (${tagName}) {\n${body}\n}`).join('\n\n');
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-component', tagName);
  styleEl.textContent = wrapped;
  document.head.appendChild(styleEl);
  return true;
}

/**
 * Test-only helper: remove any styles previously injected by
 * `injectScopedStyles`. Real usage doesn't need this — once a component is
 * registered, its scoped styles persist for the page's lifetime.
 */
export function _resetInjectedStylesForTest(): void {
  if (typeof document === 'undefined' || !document.head) return;
  const injected = document.head.querySelectorAll('style[data-component]');
  injected.forEach(el => el.parentNode?.removeChild(el));
}

/**
 * Escape `tagName` for safe use inside a CSS attribute-selector string.
 * Custom-element tag names are restricted by the spec (lowercase ASCII +
 * digit + hyphen + colon + dot + underscore), so this is mostly defensive.
 */
function cssAttrEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}
