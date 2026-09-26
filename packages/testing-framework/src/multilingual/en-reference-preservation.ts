/**
 * En-reference preservation gate
 * ------------------------------
 * WHY THIS EXISTS
 * Every stored translation is `render(parse_en(src), L)`, and every other
 * multilingual signal — the eleven `--regression` ratchets, render-fidelity, and
 * foreign-canonical-validity (R4) — scores a language against, or renders from,
 * that same English parse. So a construct the ENGLISH parse drops is dropped in
 * all 23 languages at once while every signal stays green: en defines the
 * reference. `canonical-validity` does render en→en, but only asks whether the
 * output PARSES on the real engine, and only for rows that engine accepts.
 * Measured 2026-09-25: 24 corpus rows lose content or change meaning this way
 * (repeat-while lost `< 10`, so its loop no longer terminates; `go back` rendered
 * `go url back`, which navigates to a page called "back") — and one of them,
 * morph-form-update, was introduced by #1167 with CI fully green.
 *
 * WHAT IT ASSERTS
 * For every translatable corpus row — each plain row, and each `_="…"` body of a
 * translatable markup row (exactly the bodies the corpus writer renders) — the
 * English re-render `render(parse_en(src), 'en')` carries the source's content:
 * it equals the source under the NAMED EQUIVALENCES below, ignoring whitespace.
 * Failures are recorded against a committed allowlist that only shrinks (the R4
 * discipline): a new offender fails, an allowlisted unit whose render changed
 * fails (re-triage it), and an entry that now passes must be pruned.
 *
 * NAMED EQUIVALENCES
 * The renderer legitimately respells some constructs. Each respelling allowed
 * here is listed in `EQUIVALENCES`, and each one is pinned in
 * `en-reference-equivalences.test.ts` by showing that both spellings are the
 * same program on the real `hyperscript.org` engine (identical parse trees, or
 * identical effects where the node types differ). A respelling that is not in
 * the list is a difference. The pins are why the list is narrow: dropping `the`
 * is NOT allowed in general, because `halt the event` is valid and
 * `halt event` is not.
 *
 * Whitespace is ignored everywhere, including inside string literals — the same
 * known limitation as the writer's own guard (`reRenderPreservesContent`): it can
 * hide a re-spaced string, never a dropped token.
 */
import {
  findHyperscriptAttributes,
  getAllPatterns,
  isMarkupRow,
  type Pattern,
} from '@hyperfixi/patterns-reference';
import { parseSemantic, render } from '@lokascript/semantic';

// =============================================================================
// Named equivalences
// =============================================================================

export interface Equivalence {
  /** Stable id; `en-reference-equivalences.test.ts` pins each one. */
  readonly id: string;
  /** What the renderer respells, and why the two spellings are one program. */
  readonly description: string;
  /** A source spelling and the rendered spelling it must compare equal to. */
  readonly example: readonly [source: string, rendered: string];
}

export const EQUIVALENCES: readonly Equivalence[] = [
  {
    id: 'then-separator',
    description: '`then` between commands is an optional separator',
    example: ['on click toggle .a add .b to me', 'on click toggle .a then add .b to me'],
  },
  {
    id: 'quote-style',
    description: 'a single-quoted string literal is the same literal double-quoted',
    example: ["on click put 'Saved!' into me", 'on click put "Saved!" into me'],
  },
  {
    id: 'quoted-url',
    description:
      'a naked URL is the same value as the quoted URL (only for URL-shaped text with no ' +
      'whitespace and no `${…}` — interpolation is exactly where quoting could matter)',
    example: ['on click fetch /api/data', 'on click fetch "/api/data"'],
  },
  {
    id: 'article-before-query',
    description: '`a`/`an` directly before a query literal (`make a <div/>`) is an article',
    example: ['on click make a <div.card/>', 'on click make <div.card/>'],
  },
  {
    id: 'the-before-positional',
    description: '`the` directly before `next`/`previous` is an article',
    example: ['on click show the next <div/>', 'on click show next <div/>'],
  },
  {
    id: 'dotted-possessive',
    description: '`my.x` is `my x`; `it.x` and `its.x` are `its x`',
    example: ['on click put it.name into #o', 'on click put its name into #o'],
  },
  {
    id: 'of-possessive',
    description: "`the X of #id` is `#id's X`",
    example: ['on click set the *color of #t to "red"', 'on click set #t\'s *color to "red"'],
  },
  {
    id: 'go-to-url',
    description: '`to` in `go to url` is optional',
    example: ['on click go to url "/page"', 'on click go url "/page"'],
  },
  {
    id: 'with-object-braces',
    description: 'naked named arguments after `with` are the braced object literal',
    example: [
      'on click fetch /x with method:"POST", body:form',
      'on click fetch /x with {method:"POST", body:form}',
    ],
  },
  {
    id: 'trailing-end',
    description: 'an `end` at end of input is optional (end of input closes every open block)',
    example: ['on click repeat 3 times log 1', 'on click repeat 3 times log 1 end'],
  },
  {
    id: 'settle-me',
    description: "`settle`'s target defaults to `me`",
    example: ['on click settle', 'on click settle me'],
  },
  {
    id: 'pseudo-command-me',
    description: 'the pseudo-command `m() me` is `call me.m()`',
    example: ['on load click() me', 'on load call me.click()'],
  },
  {
    id: 'quoted-event-name',
    description:
      "`send`/`trigger`'s event name may be quoted: a string whose text is a plain name is " +
      'that name (upstream reads either as its eventName; only a plain name, since text ' +
      'that is not one cannot be written bare)',
    example: ['on click send "hello" to ChatSocket', 'on click send hello to ChatSocket'],
  },
];

// =============================================================================
// Normalization
// =============================================================================

type Token =
  | { readonly kind: 'string'; readonly quote: '"' | "'" | '`'; readonly body: string }
  | { readonly kind: 'word'; readonly text: string };

/**
 * Characters that always stand alone, so `with {` and `click()` split cleanly
 * (and a re-spaced `left:` / `left :` is one token sequence, which keeps
 * `describeDifference` quiet about pure re-spacing).
 */
const PUNCTUATION = new Set(['(', ')', '{', '}', '[', ']', ',', ':', ';']);

/**
 * A `'` right after a word character or a closing bracket is a possessive
 * (`#price's value`, `<form/>'s`), not the start of a string literal.
 */
function isApostrophe(src: string, index: number): boolean {
  const previous = src[index - 1];
  return previous !== undefined && /[\w)\]>}]/.test(previous);
}

/** Split hyperscript into string literals and whitespace/punctuation-delimited words. */
export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let word = '';
  const flush = () => {
    if (word) out.push({ kind: 'word', text: word });
    word = '';
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      flush();
    } else if (c === '"' || c === '`' || (c === "'" && !isApostrophe(src, i))) {
      flush();
      let body = '';
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\' && j + 1 < src.length) {
          body += src[j]! + src[j + 1]!;
          j += 2;
        } else {
          body += src[j]!;
          j++;
        }
      }
      out.push({ kind: 'string', quote: c, body });
      i = j;
    } else if (PUNCTUATION.has(c)) {
      flush();
      out.push({ kind: 'word', text: c });
    } else {
      word += c;
    }
  }
  flush();
  return out;
}

type WordToken = Extract<Token, { kind: 'word' }>;

/** Type guard only. (Folding a text check into a predicate would make its FALSE branch
 * claim "not a word at all" and mis-narrow every later check.) */
const isWord = (t: Token | undefined): t is WordToken => t?.kind === 'word';

/** Whether `t` is the word `text`. Deliberately not a type predicate — see isWord. */
const wordIs = (t: Token | undefined, text: string): boolean => isWord(t) && t.text === text;

const URL_SHAPED = /^(?:\/|https?:\/\/|wss?:\/\/)[^\s"'`${}]*$/;

/** Index of the `close` matching the `open` at `start`, or -1. */
function matchingIndex(tokens: Token[], start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    if (wordIs(tokens[i], open)) depth++;
    else if (wordIs(tokens[i], close) && --depth === 0) return i;
  }
  return -1;
}

/**
 * Apply every named equivalence, in a fixed order, and return the canonical
 * token list. Order matters only where two rules read the same word: the
 * of-possessive needs its `the` before `the-before-positional` could drop it.
 */
export function canonicalTokens(src: string): Token[] {
  let t = tokenize(src);

  // of-possessive: `the X of #id` → `#id's X`
  for (let i = 0; i + 3 < t.length; i++) {
    const [a, x, of, owner] = [t[i], t[i + 1], t[i + 2], t[i + 3]];
    if (
      wordIs(a, 'the') &&
      isWord(x) &&
      /^\*?[\w-]+$/.test(x.text) &&
      wordIs(of, 'of') &&
      isWord(owner) &&
      /^#[\w-]+$/.test(owner.text)
    ) {
      t.splice(i, 4, { kind: 'word', text: `${owner.text}'s` }, x);
    }
  }

  const out: Token[] = [];
  for (let i = 0; i < t.length; i++) {
    const tok = t[i]!;
    const next = t[i + 1];
    // then-separator
    if (wordIs(tok, 'then')) continue;
    // article-before-query
    if ((wordIs(tok, 'a') || wordIs(tok, 'an')) && isWord(next) && next.text.startsWith('<')) {
      continue;
    }
    // the-before-positional
    if (wordIs(tok, 'the') && (wordIs(next, 'next') || wordIs(next, 'previous'))) continue;
    // go-to-url
    if (wordIs(tok, 'to') && wordIs(out[out.length - 1], 'go') && wordIs(next, 'url')) continue;
    // dotted-possessive
    if (isWord(tok)) {
      const m = /^(my|its|it)\.(.+)$/.exec(tok.text);
      if (m) {
        out.push(
          { kind: 'word', text: m[1] === 'my' ? 'my' : 'its' },
          { kind: 'word', text: m[2]! }
        );
        continue;
      }
    }
    // settle-me
    if (wordIs(tok, 'me') && wordIs(out[out.length - 1], 'settle')) continue;
    // quoted-event-name
    if (
      tok.kind === 'string' &&
      tok.quote !== '`' &&
      (wordIs(out[out.length - 1], 'send') || wordIs(out[out.length - 1], 'trigger')) &&
      /^[A-Za-z_$][\w$]*$/.test(tok.body)
    ) {
      out.push({ kind: 'word', text: tok.body });
      continue;
    }
    out.push(tok);
  }
  t = out;

  // with-object-braces: `with { … }` → `with …`
  for (let i = 0; i + 1 < t.length; i++) {
    if (wordIs(t[i], 'with') && wordIs(t[i + 1], '{')) {
      const close = matchingIndex(t, i + 1, '{', '}');
      if (close > 0) {
        t.splice(close, 1);
        t.splice(i + 1, 1);
      }
    }
  }

  // pseudo-command-me: `m ( ) me` → `call me.m ( )`
  for (let i = 0; i + 3 < t.length; i++) {
    const [name, open, close, target] = [t[i], t[i + 1], t[i + 2], t[i + 3]];
    if (
      isWord(name) &&
      /^[A-Za-z_]\w*$/.test(name.text) &&
      wordIs(open, '(') &&
      wordIs(close, ')') &&
      wordIs(target, 'me')
    ) {
      t.splice(
        i,
        4,
        { kind: 'word', text: 'call' },
        { kind: 'word', text: `me.${name.text}` },
        { kind: 'word', text: '(' },
        { kind: 'word', text: ')' }
      );
    }
  }

  // trailing-end
  while (wordIs(t[t.length - 1], 'end')) t.pop();

  return t;
}

/** One token's canonical spelling (quote-style and quoted-url apply here). */
function spell(tok: Token): string {
  if (tok.kind === 'word') return tok.text;
  if (tok.quote === '`') return `\`${tok.body}\``;
  if (URL_SHAPED.test(tok.body)) return tok.body;
  return `"${tok.body}"`;
}

/** The comparison form: canonical tokens, all whitespace removed. */
export function normalizeForComparison(src: string): string {
  return canonicalTokens(src).map(spell).join('').replace(/\s+/g, '');
}

/** Whether `rendered` carries all of `source`'s content, under the named equivalences. */
export function preservesContent(source: string, rendered: string): boolean {
  return normalizeForComparison(source) === normalizeForComparison(rendered);
}

/**
 * What changed, as runs of canonical tokens: `lost` are in the source and not
 * the render, `added` the reverse. For messages and the allowlist only — the
 * verdict is `preservesContent`.
 */
export function describeDifference(
  source: string,
  rendered: string
): { lost: string[]; added: string[] } {
  const a = canonicalTokens(source).map(spell);
  const b = canonicalTokens(rendered).map(spell);
  // Longest-common-subsequence table (corpus rows are well under 300 tokens).
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const lost: string[] = [];
  const added: string[] = [];
  let runLost: string[] = [];
  let runAdded: string[] = [];
  const flush = () => {
    if (runLost.length) lost.push(runLost.join(' '));
    if (runAdded.length) added.push(runAdded.join(' '));
    runLost = [];
    runAdded = [];
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      i++;
      j++;
    } else if (j >= b.length || (i < a.length && lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) {
      runLost.push(a[i++]!);
    } else {
      runAdded.push(b[j++]!);
    }
  }
  flush();
  return { lost, added };
}

// =============================================================================
// The corpus check
// =============================================================================

/** One piece of hyperscript the corpus writer renders. */
export interface PreservationUnit {
  /** `<pattern id>` for a plain row; `<pattern id>#<n>` for a markup row's n-th `_` body. */
  readonly key: string;
  readonly id: string;
  readonly source: string;
}

export interface PreservationFailure extends PreservationUnit {
  /** The English re-render, or null when the parse or render failed outright. */
  readonly rendered: string | null;
  readonly lost: string[];
  readonly added: string[];
}

export interface PreservationResult {
  /** Units checked (translatable plain rows + translatable markup bodies). */
  checked: number;
  preserved: number;
  failures: PreservationFailure[];
}

/**
 * The units the corpus writer renders: every translatable plain row, and each
 * `_` body of a translatable markup row. Non-translatable rows are copied
 * verbatim into every language, so nothing they contain can be lost.
 */
export function collectUnits(
  patterns: ReadonlyArray<Pick<Pattern, 'id' | 'rawCode' | 'translatable'>>
): PreservationUnit[] {
  const units: PreservationUnit[] = [];
  for (const p of patterns) {
    if (!p.translatable) continue;
    if (isMarkupRow(p.rawCode)) {
      findHyperscriptAttributes(p.rawCode).forEach((span, n) => {
        if (span.body.trim()) units.push({ key: `${p.id}#${n}`, id: p.id, source: span.body });
      });
    } else {
      units.push({ key: p.id, id: p.id, source: p.rawCode });
    }
  }
  return units;
}

/** Render `source` to English through its own English parse; null on failure. */
export function renderEnglish(source: string): string | null {
  try {
    const node = parseSemantic(source, 'en').node;
    return node ? render(node, 'en') : null;
  } catch {
    return null;
  }
}

export async function checkEnReferencePreservation(opts?: {
  patterns?: ReadonlyArray<Pick<Pattern, 'id' | 'rawCode' | 'translatable'>>;
}): Promise<PreservationResult> {
  const patterns = opts?.patterns ?? (await getAllPatterns({ limit: 1000 }));
  const units = collectUnits(patterns);
  const failures: PreservationFailure[] = [];
  let preserved = 0;

  for (const unit of units) {
    const rendered = renderEnglish(unit.source);
    if (rendered !== null && preservesContent(unit.source, rendered)) {
      preserved++;
      continue;
    }
    const diff =
      rendered === null
        ? { lost: [unit.source], added: [] }
        : describeDifference(unit.source, rendered);
    failures.push({ ...unit, rendered, ...diff });
  }

  return { checked: units.length, preserved, failures };
}
