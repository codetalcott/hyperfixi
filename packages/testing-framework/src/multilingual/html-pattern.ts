/**
 * HTML-markup pattern detection.
 *
 * A handful of DB patterns (`hx-live`, `sse-connect`/`ws-connect`, and the
 * `<script type="text/hyperscript-template">` component patterns) are authored
 * as HTML markup — the hyperscript they exercise lives inside attributes
 * (`hx-live="…"`, `_="…"`) and is processed at runtime by the htmx-compat /
 * component layer, which is covered by the DOM + Playwright suites.
 *
 * The multilingual harness validates patterns with the hyperscript *text*
 * parser, which structurally cannot parse HTML — grading these is a category
 * error that understates the real parse rate, so they are excluded from the
 * semantic-parse denominator.
 *
 * Top-level hyperscript never begins with `<` (commands start with a
 * verb/event keyword or a `.`/`#`/`:`/`$` token), so a leading `<` is a
 * reliable, self-maintaining signal — new HTML patterns are excluded
 * automatically without a manual allow/deny list.
 *
 * Kept dependency-free so it is unit-testable without the patterns DB.
 */
export function isHtmlMarkupPattern(code: string): boolean {
  return /^\s*</.test(code);
}
