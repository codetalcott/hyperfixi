/**
 * Locate and replace the hyperscript bodies inside an HTML-markup corpus row.
 *
 * WHY A REGEX, HERE, DELIBERATELY
 * -------------------------------
 * `html-snippets.ts` warns against regex-scanning HTML — correctly, for its job
 * (walking whole `.html` FILES, where a `<pre>` showing escaped source matches a
 * live attribute). This module has the opposite job: it takes one known-markup
 * corpus row and must splice a translated body back in **without disturbing a
 * single other byte** — indentation, quote style, attribute order, inner text.
 * A DOM round-trip (jsdom `innerHTML`) reserializes all of that, so it is the
 * wrong tool: the corpus stores these rows verbatim and they are compared
 * verbatim. Offsets + splice keeps everything outside the attribute value
 * untouched by construction.
 *
 * Scope: the `_` attribute, double- or single-quoted, which is what the corpus's
 * markup rows carry. A value may contain the OTHER quote character — hyperscript
 * string literals inside a double-quoted attribute are single-quoted, which is
 * how `_="set ^user to {name: 'Demo'}"` is written — so the value class excludes
 * only its own delimiter. (`hx-live` bodies are hyperscript too, but every corpus row
 * using one is flagged non-translatable — its attribute NAMES are resolved
 * per-language by vocab modules, so translating only the body would be half a
 * job.) An attribute whose value contains its own quote character cannot occur
 * in well-formed HTML and is not handled.
 */

/** One `_="…"` attribute value found in a markup row. */
export interface AttributeSpan {
  /** Offset of the first character of the VALUE (inside the quotes). */
  readonly start: number;
  /** Offset one past the last character of the value. */
  readonly end: number;
  /** The raw attribute value — the hyperscript body. */
  readonly body: string;
}

// `_` preceded by a tag-name/whitespace boundary so `data_x="…"` is not matched.
// The value excludes only its own delimiter: `[^"]*` for a double-quoted value,
// `[^']*` for a single-quoted one. (A single class excluding BOTH quotes was the
// first version and it silently skipped every attribute containing a hyperscript
// string literal — `component-with-conditional`, in all 23 languages.)
const ATTRIBUTE = /(^|[\s"'])_\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** Every `_="…"` body in `markup`, in source order. */
export function findHyperscriptAttributes(markup: string): AttributeSpan[] {
  const spans: AttributeSpan[] = [];
  ATTRIBUTE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE.exec(markup)) !== null) {
    const body = match[2] ?? match[3];
    // The value's offset: match start + everything before the body in the match.
    const start = match.index + match[0].length - body.length - 1;
    spans.push({ start, end: start + body.length, body });
  }
  return spans;
}

/**
 * Replace each span's body with `replacements[i]`, leaving every other byte of
 * `markup` untouched. Splices right-to-left so earlier offsets stay valid.
 */
export function spliceHyperscriptAttributes(
  markup: string,
  spans: readonly AttributeSpan[],
  replacements: readonly string[]
): string {
  if (spans.length !== replacements.length) {
    throw new Error(
      `spliceHyperscriptAttributes: ${spans.length} spans but ${replacements.length} replacements`
    );
  }
  let out = markup;
  for (let i = spans.length - 1; i >= 0; i--) {
    out = out.slice(0, spans[i].start) + replacements[i] + out.slice(spans[i].end);
  }
  return out;
}

/**
 * Whether a corpus row is HTML markup rather than hyperscript text.
 *
 * Mirrors testing-framework's `isHtmlMarkupPattern` (top-level hyperscript never
 * begins with `<`; a leading selector literal like `<button/>` is an expression,
 * never a statement start). Kept as its own copy rather than a dependency: this
 * package is upstream of the testing framework in the build order.
 */
export function isMarkupRow(code: string): boolean {
  return /^\s*<[a-zA-Z!]/.test(code);
}

/**
 * Whether a parse carried the whole body: every non-whitespace character of the
 * source reappears in its own English re-render.
 *
 * This is the guard that keeps a TRUNCATING parse out of the corpus. Measured
 * 2026-08-27: `set ^user to attrs.data as JSON` parses, scores "faithful"
 * against itself in all 23 languages, and has silently dropped `as JSON` — the
 * conversion is in no role, so every recall metric compares two equally
 * truncated things. Translating such a body would ship the truncation into 23
 * languages; leaving it English keeps the text intact until the parser is fixed.
 *
 * Whitespace is ignored because a faithful re-render legitimately re-spaces
 * punctuation (`{name: 'Demo'}` → `{ name : 'Demo' }`). The known limitation:
 * whitespace INSIDE a string literal is ignored too, so a body differing only
 * by spaces inside quotes would be accepted — narrow, and it cannot drop
 * content, only re-space it.
 */
export function reRenderPreservesContent(source: string, reRenderedEnglish: string): boolean {
  const strip = (s: string) => s.replace(/\s+/g, '');
  return strip(source) === strip(reRenderedEnglish);
}
