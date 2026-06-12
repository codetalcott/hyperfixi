/**
 * Span-aware masking for hyperscript code prior to translation.
 *
 * The grammar transformer and keyword-substitute fallback both treat hyperscript
 * source as a flat token stream. They will happily reorder text inside HTML
 * elements, translate words inside string literals, and shred bracket
 * expressions like `[key is 'Escape']`. To avoid that, we replace
 * non-translatable spans with opaque placeholder tokens before translation,
 * then restore them after.
 *
 * Placeholders use the form `__HFXMSK_<idx>_<KIND>__`. Underscores on both
 * sides make the placeholder a single "word" to JS regex `\b` boundaries —
 * keyword substitution `\bword\b` cannot match a substring inside the
 * placeholder, regardless of case-insensitivity flags.
 */

export type SpanKind =
  | 'string-single'
  | 'string-double'
  | 'string-template'
  | 'url'
  | 'html-text'
  | 'directive'
  | 'bracket-expr'
  | 'js-block';

export interface MaskedSpan {
  kind: SpanKind;
  original: string;
  placeholder: string;
}

export interface MaskResult {
  masked: string;
  spans: MaskedSpan[];
}

const KIND_TAG: Record<SpanKind, string> = {
  'string-single': 'STR1',
  'string-double': 'STR2',
  'string-template': 'STRT',
  url: 'URL',
  'html-text': 'TEXT',
  directive: 'DIR',
  'bracket-expr': 'BRK',
  'js-block': 'JS',
};

function makePlaceholder(kind: SpanKind, idx: number): string {
  return `__HFXMSK_${idx}_${KIND_TAG[kind]}__`;
}

const PLACEHOLDER_RE = /__HFXMSK_(\d+)_(?:STR1|STR2|STRT|URL|TEXT|DIR|BRK|JS)__/g;

/**
 * Detect non-translatable spans in hyperscript code and replace them with
 * opaque placeholders. The detection order is significant: earlier rules
 * consume characters that later rules would otherwise misinterpret.
 *
 *   1. Template literals  (consume `${...}` interpolation contents)
 *   2. Double-quoted strings (consume HTML attribute values)
 *   3. Single-quoted strings (escaping possessive `'s`)
 *   4. HTML inner text  (between `>` and `<` with non-whitespace)
 *   5. Bracket expressions  (event filters like `[key is 'Escape']`)
 *   6. URL-like tokens  (paths and protocol://host)
 *   7. Component template directives  (`#if`, `#end`, `#for`, ...)
 */
export function maskSpans(input: string): MaskResult {
  let working = input;
  const spans: MaskedSpan[] = [];

  const record = (kind: SpanKind, original: string): string => {
    const placeholder = makePlaceholder(kind, spans.length);
    spans.push({ kind, original, placeholder });
    return placeholder;
  };

  // 0. Embedded JS blocks: `js(args) ... end` opens a raw-JavaScript escape
  //    hatch inside hyperscript. Its body must be passed through verbatim;
  //    the grammar transformer would otherwise tokenize JavaScript as if
  //    it were hyperscript and silently drop unrecognized tokens. Mask this
  //    first because the body can contain any other span kind.
  working = working.replace(/\bjs\([^)]*\)[\s\S]*?\bend\b/g, m => record('js-block', m));

  // 1. Template literals — match outermost backtick body with escape support.
  //    The body may contain `${...}` interpolations; treat the whole literal
  //    as one opaque span. Inner code stays English but is structurally safe.
  working = working.replace(/`(?:\\.|[^`\\])*`/g, m => record('string-template', m));

  // 2. Double-quoted strings. This also captures HTML attribute values so
  //    `component="my-layout"` cannot have `my` translated.
  working = working.replace(/"(?:\\.|[^"\\])*"/g, m => record('string-double', m));

  // 3. Single-quoted strings, but NOT possessive `'s` (preceded by a word char).
  //    The lookbehind ensures `me's value 'foo'` matches only `'foo'`.
  working = working.replace(/(?<!\w)'(?:\\.|[^'\\])*'/g, m => record('string-single', m));

  // 4. HTML inner text content. Match a non-whitespace text run between
  //    a `>` and the next `<`, on the SAME line. Newline confinement is
  //    critical: without it the regex would span multiple element boundaries
  //    and consume nested tags as if they were text. The middle character
  //    class `[^<\n\s]` ensures at least one printable non-`<` char exists
  //    so pure indentation between elements is not masked.
  //    The `(?<!\/)` lookbehind excludes a `>` that closes a SELF-CLOSING
  //    selector literal (`<button/>`): hyperscript between two selector
  //    literals (`… last <button/> in .modal focus first <button/> …`) is
  //    real code, not element inner text — masking it hid the whole segment
  //    from the transformer, which then emitted it untranslated (the
  //    focus-trap `focus first` leak).
  working = working.replace(
    /(?<!\/)>([^<\n]*[^<\n\s][^<\n]*)</g,
    (_m, text) => `>${record('html-text', text)}<`
  );

  // 5. Bracket expressions. Mask the entire `[...]` payload as one unit so
  //    SOV/VSO reordering cannot move tokens out of the brackets. Non-nested
  //    is fine for the current corpus; bracket-inside-bracket isn't used.
  working = working.replace(/\[[^\]]*\]/g, m => record('bracket-expr', m));

  // 6. URL-like tokens. Two forms:
  //      - protocol://host  (http, https, ws, wss, file)
  //      - /path  (whitespace-bounded, not preceded by a word char to avoid
  //                matching arithmetic like `1/2`)
  //    The path form matches a bare `/` too (precache root) when followed
  //    by non-word boundary. Path chars: word, dash, dot, slash, glob, query.
  working = working.replace(/(?:https?|wss?|file):\/\/[^\s,)]+|(?<![\w<])\/[\w\-./*?=&]*/g, m =>
    record('url', m)
  );

  // 7. Component template directives. Mask the `#keyword` token only — the
  //    expression after it (e.g. `^user.admin`) is left translatable, since
  //    those are typically variable references that pass through unchanged.
  working = working.replace(/#(?:if|else|elif|end|for|each)\b/g, m => record('directive', m));

  return { masked: working, spans };
}

/**
 * Restore placeholders to their original spans. Iterates to a fixed point so
 * that an `original` field containing another placeholder (which shouldn't
 * happen with the current detection rules, but is cheap insurance) is fully
 * resolved.
 */
export function unmaskSpans(translated: string, spans: MaskedSpan[]): string {
  let result = translated;
  let prev: string;
  do {
    prev = result;
    result = result.replace(PLACEHOLDER_RE, (m, idx) => {
      const span = spans[Number(idx)];
      return span ? span.original : m;
    });
  } while (result !== prev);
  return result;
}

/**
 * Convenience wrapper: mask, run a transform on the masked surface, then
 * unmask. The transform receives only the masked string and must preserve
 * placeholders (which it will, since they look like ordinary identifiers).
 */
export function withMaskedSpans(input: string, transform: (masked: string) => string): string {
  const { masked, spans } = maskSpans(input);
  const transformed = transform(masked);
  return unmaskSpans(transformed, spans);
}
