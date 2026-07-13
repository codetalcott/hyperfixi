/**
 * Naked named-argument fold — `fetch /api/form with method:"POST" body:form`.
 *
 * The core parser folds a post-`with` run of `key:value` pairs (no braces)
 * into the same objectLiteral AST the braced form produces
 * (`parseFetchNakedNamedArgs` in core's utility-commands.ts). The semantic
 * layer had no equivalent: an expression-only `style` slot captured just the
 * first key (`method`) and the rest of the run dropped as unconsumed input —
 * the Arc C fetch-options family, 78 corpus firings across all 24 languages.
 *
 * This fold is the semantic-layer mirror, shared by the pattern matcher
 * (en's generated `with {style}` slot) and the trailing-style reclaims in
 * semantic-parser (the fused/SOV walks). It consumes a run of pairs —
 * comma- OR space-separated, per the corpus (`method:"POST" body:form` and
 * `method:"POST", body:"name=Joe"` both render) — and returns ONE
 * object-literal-shaped raw (`{method:"POST", body:form}`) so the expression
 * parser builds a real objectLiteral, byte-consistent across languages.
 *
 * Pair grammar (corpus-complete, deliberately no wider):
 * - split pair: `<key> : <value>` — the tokenizers split the colon off when
 *   the value is quoted (`method` `:` `"POST"`).
 * - fused pair: one identifier token containing a colon (`body:form`) — the
 *   colon-compound the tokenizers keep whole when neither side is quoted.
 *   URL-kind tokens and values with slashes never qualify.
 * - value: a single token (string, identifier, number, template literal) or
 *   a depth-balanced `{…}` / `(…)` run. Runs are reconstructed with
 *   offset-exact inter-token gaps (the tryMatchBraceRunExpression rule) so a
 *   template interpolation survives and a tokenizer that shatters a word
 *   inside the run re-joins losslessly (qu splits `FormData` → `FormDa`+`ta`,
 *   its accusative suffix; hi splits `के_रूप_में` at the underscores — both
 *   heal because the fragments are offset-adjacent). Keyword-kind tokens
 *   inside a run contribute their NORMALIZED form (the joinTokenText rule:
 *   the raw is handed to core's English-only expression parser).
 *
 * The fold stops at the first token that cannot continue a pair — a trailing
 * SOV particle (ja `で`), an as-marker (`as JSON`), a connective — leaving it
 * for the caller. Returns null (stream reset) when no complete pair is found.
 */
import type { TokenStream } from '../types';

const MAX_FOLD_TOKENS = 96;
const KEY_RE = /^[A-Za-z_][\w-]*$/;
// Fused `key:value` in one token: code-shaped, no quotes/slashes/spaces.
const FUSED_PAIR_RE = /^[A-Za-z_][\w-]*:[^\s'"`/:][^\s]*$/;

function isFusedPair(stream: TokenStream, offset: number): boolean {
  const t = stream.peek(offset);
  return !!t && t.kind === 'identifier' && FUSED_PAIR_RE.test(t.value);
}

function isSplitPairStart(stream: TokenStream, offset: number): boolean {
  const t0 = stream.peek(offset);
  if (!t0 || (t0.kind !== 'identifier' && t0.kind !== 'keyword') || !KEY_RE.test(t0.value)) {
    return false;
  }
  const t1 = stream.peek(offset + 1);
  const t2 = stream.peek(offset + 2);
  return !!t1 && t1.value === ':' && !!t2;
}

function isPairStart(stream: TokenStream, offset = 0): boolean {
  return isFusedPair(stream, offset) || isSplitPairStart(stream, offset);
}

/** Depth-balanced `{…}`/`(…)` run, offset-exact gaps, keywords normalized. */
function readBalancedRun(stream: TokenStream): string | null {
  const open = stream.peek();
  if (!open || (open.value !== '{' && open.value !== '(')) return null;
  let raw = '';
  let prevEnd = -1;
  let depth = 0;
  let guard = 0;
  while (!stream.isAtEnd() && guard++ < MAX_FOLD_TOKENS) {
    const t = stream.advance();
    if (!t) break;
    if (prevEnd >= 0 && t.position.start > prevEnd) {
      raw += ' '.repeat(t.position.start - prevEnd);
    }
    // Surface text, never normalized: offset-adjacent fragments re-fuse
    // (zh `作`+`为` — normalizing 为→`for` would weld `作for`).
    raw += t.value;
    prevEnd = t.position.end;
    if (t.value === '{' || t.value === '(') depth++;
    else if (t.value === '}' || t.value === ')') {
      depth--;
      if (depth === 0) return raw;
    }
  }
  return null;
}

function readPairValue(stream: TokenStream): string | null {
  const t = stream.peek();
  if (!t) return null;
  if (t.value === '{' || t.value === '(') return readBalancedRun(stream);
  if (t.value === ',' || t.value === ':') return null;
  stream.advance();
  return t.value;
}

/**
 * Fold a naked named-arg run into one `{…}` raw. Advances the stream past
 * the run on success; resets and returns null when nothing folds.
 *
 * `pendingKey` is the continuation form: a key already captured elsewhere
 * (the Slavic `z`/`с`/`з` fused patterns bind the run's head token into the
 * style slot before the relabel — style raw `method`, stream at `: "POST" …`)
 * is prepended as the first pair's key, with the stream expected to sit at
 * its `:`.
 */
export function foldNakedNamedArgsRaw(stream: TokenStream, pendingKey?: string): string | null {
  const mark = stream.mark();
  const pairs: string[] = [];

  if (pendingKey !== undefined) {
    const colon = stream.peek();
    if (!colon || colon.value !== ':' || !stream.peek(1)) return null;
    stream.advance();
    const value = readPairValue(stream);
    if (value === null) {
      stream.reset(mark);
      return null;
    }
    pairs.push(`${pendingKey}:${value}`);
  } else if (!isPairStart(stream)) {
    return null;
  }

  let guard = 0;
  while (guard++ < MAX_FOLD_TOKENS) {
    const t0 = stream.peek();
    if (!t0) break;
    if (t0.value === ',') {
      // A comma only continues the run when a pair follows — a clause-level
      // comma stays unconsumed for the caller.
      if (pairs.length === 0 || !isPairStart(stream, 1)) break;
      stream.advance();
      continue;
    }
    if (isFusedPair(stream, 0)) {
      pairs.push(stream.advance().value);
      continue;
    }
    if (!isSplitPairStart(stream, 0)) break;
    const key = stream.advance().value;
    stream.advance(); // ':'
    const value = readPairValue(stream);
    if (value === null) {
      stream.reset(mark);
      return null;
    }
    pairs.push(`${key}:${value}`);
  }

  if (pairs.length === 0) {
    stream.reset(mark);
    return null;
  }
  return `{${pairs.join(', ')}}`;
}
