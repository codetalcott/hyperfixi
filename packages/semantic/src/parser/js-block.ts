/**
 * A `js … end` block read as one opaque command: the JavaScript between the
 * keyword and its `end` is never matched as hyperscript (its `if`, `return`
 * would come back as phantom commands).
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged, except that the source the token positions index
 * (the parser's `positionSource`) is a parameter.
 */
import type { ActionType, LanguageToken, SemanticNode } from '../types';
import { createCommandNode } from '../types';
import type { tokenize as tokenizeInternal } from '../tokenizers';
import {
  isJsBlockTerminator,
  isJsKeyword,
  isPatientMarker,
  isThenKeyword,
  profileKeywordMatches,
} from './clause-keywords';

/**
 * The verb-FINAL shape of the same block: `<body> <marker> <js> <end>`.
 *
 * SOV and agglutinative renders put the command word last — bn `console.log("x")
 * কে জেএস শেষ`, ja `console.log("x") を JS実行 終わり`, tr `console.log("x") i js
 * son` — so the head of the clause is the JavaScript, not the keyword, and
 * `consumeJsBlock`'s head test never fires. The body then reached the command
 * patterns, which is how a js body containing `if (…) return …;` produced
 * phantom `if`/`return` commands in bn and a bare `js ;` in ja/tr (the
 * behavior-removable action-drop rows).
 *
 * Gated hard, so it can only add parses: the js keyword must be followed
 * immediately by `end` (that is what makes it verb-FINAL rather than a `js`
 * command with a body after it), there must be at least one token before it,
 * and the scan stops at a conjunction so it can never reach across a clause
 * boundary into a later `js … end`.
 */
export function consumeVerbFinalJsBlock(
  tokens: ReturnType<typeof tokenizeInternal>,
  language: string,
  positionSource: string | undefined
): SemanticNode | null {
  const startMark = tokens.mark();

  let offset = 0;
  let jsAt = -1;
  for (;;) {
    const token = tokens.peek(offset);
    if (!token) break;
    if (isThenKeyword(token.value, language) || isJsBlockTerminator(token.value, language)) {
      break;
    }
    if (isJsKeyword(token)) {
      // The verb may be an ASCII+CJK compound the tokenizer split (zh `JS执行`,
      // ja `JS実行`) — see the same allowance in consumeJsBlock.
      const tail = tokens.peek(offset + 1);
      const tailIsVerb =
        !!tail &&
        token.position?.end !== undefined &&
        token.position.end === tail.position?.start &&
        profileKeywordMatches(language, 'js', `${token.value}${tail.value}`.toLowerCase());
      const closer = tokens.peek(offset + (tailIsVerb ? 2 : 1));
      if (offset > 0 && closer && isJsBlockTerminator(closer.value, language)) {
        jsAt = offset;
        break;
      }
    }
    offset++;
  }
  if (jsAt <= 0) return null;

  const bodyTokens: LanguageToken[] = [];
  for (let i = 0; i < jsAt; i++) {
    const token = tokens.peek(i);
    if (token) bodyTokens.push(token);
  }
  // Drop a POST-posed patient marker: it belongs to the command, not the code
  // (bn কে, ja を, ko 을, tr i, qu ta).
  const last = bodyTokens[bodyTokens.length - 1];
  if (last && isPatientMarker(last, language)) bodyTokens.pop();
  if (bodyTokens.length === 0) {
    tokens.reset(startMark);
    return null;
  }

  const raw = rawJsBody(bodyTokens, positionSource);
  for (let i = 0; i < jsAt; i++) tokens.advance();
  // Consume the verb (plus a split compound tail) and its closing `end`.
  tokens.advance();
  const afterVerb = tokens.peek();
  if (afterVerb && !isJsBlockTerminator(afterVerb.value, language)) tokens.advance();
  tokens.advance();

  return createCommandNode(
    'js' as ActionType,
    { patient: { type: 'expression', raw: raw || '()' } },
    { sourceLanguage: language, patternId: `js-opaque-final-${language}`, confidence: 1 }
  );
}

/**
 * Consume a `js(…) … end` block from the stream as one opaque unit and return a
 * single `js` command node. The FIRST `end` after the `js` keyword closes the
 * block — the same heuristic the i18n transformer's js-masking uses (raw JS never
 * carries a bare hyperscript `end` token). Returns null without consuming when
 * the head isn't a js keyword or the block has no closing `end` (malformed —
 * leave it to the normal path).
 *
 * The node is built directly rather than re-parsed: `matchBest` in `parseClause`
 * would match the `js` head and then keep matching the raw JS body (`if`,
 * `return`, …) as sibling commands — the exact phantom actions this skip exists
 * to suppress. Emitting `{ action: 'js', roles: { patient: expression } }`
 * mirrors the shape a standalone `js(…)` parse produces, and applies uniformly to
 * English and every translation (the keyword survives translation verbatim), so
 * the reference and candidate js nodes stay identical for fidelity scoring.
 */
export function consumeJsBlock(
  tokens: ReturnType<typeof tokenizeInternal>,
  language: string,
  positionSource: string | undefined
): SemanticNode | null {
  const head = tokens.peek();
  if (!head || !isJsKeyword(head)) return null;

  const startMark = tokens.mark();
  const bodyTokens: LanguageToken[] = [];
  tokens.advance(); // consume `js`

  // The authored verb may be an ASCII+CJK compound the tokenizer split: the
  // zh dict writes `JS执行`, the ASCII extractor claims `JS` (which is what
  // isJsKeyword matched), and the stranded `执行` lands at the head of the raw
  // body, leaking into the rendered JS (`js 执行 console.log(...)` —
  // canonically invalid). When the head and the next token are
  // source-adjacent and their concatenation is the profile's own js-command
  // surface, the second half is part of the VERB — consume it too.
  const verbTail = tokens.peek();
  if (
    verbTail &&
    head.position?.end !== undefined &&
    head.position.end === verbTail.position?.start &&
    profileKeywordMatches(language, 'js', `${head.value}${verbTail.value}`.toLowerCase())
  ) {
    tokens.advance();
  }

  // A PRE-posed patient marker belongs to the command, not to the JavaScript.
  // he renders `js את console.log(…)` and zh `JS执行 把 console.log(…)`; without
  // this the particle is swallowed into the opaque body and comes back as
  // `js את console.log ( … )`. Languages whose patient marker FOLLOWS the body
  // (ja を, ko 을, bn কে, tr i, qu ta) are unaffected: the marker is never at the
  // head, and the body walk stops at `end` before reaching it.
  const marker = tokens.peek();
  if (marker && isPatientMarker(marker, language)) tokens.advance();

  let sawEnd = false;
  while (!tokens.isAtEnd()) {
    const t = tokens.peek();
    if (!t) break;
    tokens.advance();
    if (isJsBlockTerminator(t.value, language)) {
      sawEnd = true;
      break;
    }
    bodyTokens.push(t);
  }

  if (!sawEnd) {
    tokens.reset(startMark);
    return null;
  }

  const raw = rawJsBody(bodyTokens, positionSource);
  return createCommandNode(
    'js' as ActionType,
    { patient: { type: 'expression', raw: raw || '()' } },
    { sourceLanguage: language, patternId: `js-opaque-${language}`, confidence: 1 }
  );
}

/**
 * Recover a js block's body EXACTLY as it was written.
 *
 * It used to be `bodyTokens.map(t => t.value).join(' ')`, which re-spaces the
 * JavaScript around every token boundary: `console.log("from js")` came back
 * as `console .log ( "from js" )`. That is not cosmetic — the js body is the
 * one role whose value is code in another language, so re-spacing it makes
 * the rendered surface differ from the reference's own English (the round-trip
 * veto that kept js-inline on the i18n renderer in ar/tl/zh) and, on a body
 * carrying a `//` comment or an ASI-sensitive line break, changes what the
 * JavaScript MEANS.
 *
 * The token positions index into `positionSource`, so the body is a slice of
 * it. The slice is verified against the token values with whitespace removed
 * before it is trusted: a nested `this.parse` of a sub-block overwrites
 * `positionSource`, and a re-tokenized sub-stream's offsets would then index
 * the wrong text. When it does not hold, fall back to joining on token
 * ADJACENCY — `position.start === previous.position.end` means the two were
 * written with nothing between them — which reproduces the original for every
 * single-line body and is never worse than the old unconditional space.
 */
export function rawJsBody(
  bodyTokens: readonly LanguageToken[],
  positionSource: string | undefined
): string {
  if (bodyTokens.length === 0) return '';

  const start = bodyTokens[0].position?.start;
  const end = bodyTokens[bodyTokens.length - 1].position?.end;
  const source = positionSource;
  if (source !== undefined && start !== undefined && end !== undefined) {
    const slice = source.slice(start, end);
    const bare = (text: string): string => text.replace(/\s+/g, '');
    if (bare(slice) === bare(bodyTokens.map(t => t.value).join(''))) return slice.trim();
  }

  let out = '';
  for (let i = 0; i < bodyTokens.length; i++) {
    const previous = bodyTokens[i - 1];
    const adjacent =
      previous?.position?.end !== undefined &&
      bodyTokens[i].position?.start === previous.position.end;
    if (i > 0 && !adjacent) out += ' ';
    out += bodyTokens[i].value;
  }
  return out.trim();
}
