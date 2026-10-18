/**
 * The clause walk's loops, which read the parse's state: a bottom `until`
 * test taken after a body, the fold that nests each loop's clauses under its
 * head, and whether a `repeat` opens on its body.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type {
  SemanticNode,
  CommandSemanticNode,
  SemanticRole,
  ActionType,
  LanguagePattern,
  LanguageToken,
  PatternMatchResult,
} from '../types';
import { createCommandNode, BLOCK_COMMAND_ACTIONS } from '../types';
import { tokenize as tokenizeInternal, TokenStreamImpl } from '../tokenizers';
import { tryGetProfile } from '../registry';
import { closesBlockAt, endWordPlace, isThenAt } from './end-words';
import { type ParserState } from './parser-state';
import { joinTokenText } from './value-from-tokens';
import {
  BLOCK_HEAD_ACTIONS,
  LOOP_FORMS,
  buildLoopNode,
  isBottomTest,
  isLoopClose,
  type WalkEntry,
} from './loop-heads';
import { tokensBeginCommand } from './sov-clause';
import { recordDroppedTokens } from './coverage';

/**
 * A block head the walker emitted flat: a `repeat`/`for` command with no body,
 * or a `tell`'s or view transition's head with none attached (an empty body is a
 * block its own `end` closed: `tell #x end`).
 */
export function isOpenLoopHead(entry: WalkEntry): entry is CommandSemanticNode {
  if (isLoopClose(entry) || entry.kind !== 'command' || !BLOCK_HEAD_ACTIONS.has(entry.action)) {
    return false;
  }
  const body = (entry as { body?: unknown }).body;
  if (BLOCK_COMMAND_ACTIONS.has(entry.action)) return body === undefined;
  return !(Array.isArray(body) && body.length > 0);
}

/**
 * A `repeat` word: the keyword, or the English `repeat` a render left
 * untranslated (es `repeat mientras …`, ja `3 times を repeat`), which
 * tokenizes as an identifier.
 */
export function isRepeatToken(token: LanguageToken): boolean {
  if (token.kind !== 'keyword' && token.kind !== 'identifier') return false;
  return (token.normalized ?? token.value).toLowerCase() === 'repeat';
}

/**
 * Nest each loop's body under it. The walker emits a loop head FLAT, followed
 * by its body and — where it consumed the loop's `end` — a LOOP_CLOSE; this
 * turns every head … close span into a {@link LoopSemanticNode}. A loop still
 * open at the end of the list closes there, which is what the flat list
 * meant (the renderer used to close every loop at the tail). A head with no
 * body stays the flat head it was, unless its own `end` closed it.
 */
export function foldLoopBlocks(state: ParserState, entries: readonly WalkEntry[]): SemanticNode[] {
  const out: SemanticNode[] = [];
  const open: Array<{
    head: CommandSemanticNode;
    body: SemanticNode[];
    bottom?: CommandSemanticNode;
  }> = [];
  const append = (node: SemanticNode): void => {
    (open.length > 0 ? open[open.length - 1].body : out).push(node);
  };
  const close = (closed: boolean): void => {
    const frame = open.pop();
    if (frame) append(buildLoopNode(frame.head, frame.body, closed, frame.bottom));
  };
  entries.forEach((entry, i) => {
    const frame = open[open.length - 1];
    if (isLoopClose(entry)) close(true);
    else if (isOpenLoopHead(entry)) open.push({ head: entry, body: [] });
    else if (isBottomTest(entry, frame, entries[i + 1])) frame!.bottom = entry;
    else if (state.bottomTestTokens.has(entry)) {
      // An `until` that ends no loop: its words are unread, as they were.
      const language = entry.metadata?.sourceLanguage ?? 'en';
      recordDroppedTokens(state, state.bottomTestTokens.get(entry)!, language, 'body clause');
    } else append(entry);
  });
  while (open.length > 0) close(false);
  return out;
}

/**
 * A bare `repeat` before its body (`repeat set x to x + 1 until x is 3 end`,
 * upstream's bottom-tested loop): the loop pattern took the body's first
 * command for the loop's form, and its words for the count (`repeat set x`
 * read `repeat x times`). A form that is no loop form, where a command
 * begins, is the body's; SOV is loopHeadReadsBody's.
 */
export function repeatOpensOnItsBody(
  match: PatternMatchResult,
  after: readonly LanguageToken[],
  commandPatterns: LanguagePattern[],
  language: string
): boolean {
  if (tryGetProfile(language)?.wordOrder === 'SOV') return false;
  const form = match.captured.get('loopType' as SemanticRole);
  return (
    form?.type === 'literal' &&
    typeof form.value !== 'number' &&
    !LOOP_FORMS.has(String(form.value)) &&
    tokensBeginCommand([...after], commandPatterns, language)
  );
}

/**
 * A loop's bottom test, `until <condition>` after its body (`repeat set x to
 * x + 1 until x is 3 end`): the rest of the clause is the condition, up to
 * the loop's `end`. No pattern reads a bare `until`, so its words were
 * dropped and the loop ran forever. foldLoopBlocks attaches the test to the
 * loop it ends. (`while` has a pattern of its own.) After a `toggle`, the
 * `until` is the toggle's (`toggle .x until transitionend`).
 */
export function takeBottomUntil(
  state: ParserState,
  stream: TokenStreamImpl | ReturnType<typeof tokenizeInternal>,
  before: readonly WalkEntry[],
  language: string
): SemanticNode | null {
  const tok = stream.peek();
  if (!tok || (tok.kind !== 'keyword' && tok.kind !== 'particle')) return null;
  // The word, a particle marking the role (ja `まで`), or the profile's own
  // `until` where its particle reads as another role (ko `까지`, also `to`).
  const word = (tok.normalized ?? tok.value).toLowerCase();
  if (
    word !== 'until' &&
    tok.metadata?.role !== 'until' &&
    tryGetProfile(language)?.keywords?.until?.primary !== tok.value
  ) {
    return null;
  }
  if ((before[before.length - 1] as { action?: string } | undefined)?.action === 'toggle') {
    return null;
  }
  // The condition runs to the loop's `end` (or a `then`): the clause walker
  // hands over one clause, the fused walker the rest of the stream.
  const all = stream.tokens;
  const rest: LanguageToken[] = [];
  for (let k = stream.position() + 1; k < all.length; k++) {
    const t = all[k]!;
    const place = endWordPlace(all, k);
    if (closesBlockAt(all, k, language) || isThenAt(t, place, language)) break;
    // A loop's own word: the until-phrase heads a loop, fronted where an SOV
    // render writes it (bn `পর্যন্ত n > 3 পুনরাবৃত্তি …`, until n > 3 repeat).
    if (isRepeatToken(t)) return null;
    rest.push(t);
  }
  if (rest.length === 0) return null;
  const words = [tok, ...rest];
  for (let k = 0; k < words.length; k++) stream.advance();
  const node = createCommandNode(
    'until' as ActionType,
    { condition: { type: 'expression', raw: joinTokenText(rest, language) } },
    { sourceLanguage: language }
  );
  state.bottomTestTokens.set(node, words);
  return node;
}
