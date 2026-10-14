/**
 * The clause walk: a body read clause by clause, each clause read as a
 * command, a conditional block or a loop, with its `end` and its `else`.
 * The members here call each other, so they move together.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type {
  SemanticNode,
  CommandSemanticNode,
  CompoundSemanticNode,
  ConditionalSemanticNode,
  SemanticValue,
  ActionType,
  LanguagePattern,
  LanguageToken,
} from '../types';
import { createCommandNode, createCompoundNode, createConditionalNode } from '../types';
import { tokenize as tokenizeInternal, TokenStreamImpl } from '../tokenizers';
import { tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { patternMatcher } from './pattern-matcher';
import { CONDITION_PREDICATES, copulaHoldsCondition } from './value-reading';
import { isElseKeyword, isIfKeyword, isThenKeyword, isUnlessKeyword } from './clause-keywords';
import {
  closesBlockAt,
  endWordPlace,
  isAtEndOfNoun,
  isCuratedEndWord,
  isThenAt,
} from './end-words';
import { consumeJsBlock, consumeVerbFinalJsBlock } from './js-block';
import { type ParserState } from './parser-state';
import { joinTokenText } from './value-from-tokens';
import {
  tryAttachTrailingDuration,
  tryAttachTrailingExpressionRole,
  tryAttachTrailingRole,
  tryAttachTrailingStyle,
} from './trailing-roles';
import {
  LOOP_CLOSE,
  bareRepeatHead,
  foldFrontedWhileIntoRepeat,
  isLoopClose,
  loopHeadReadsBody,
  takeRepeatCount,
  type WalkEntry,
} from './loop-heads';
import {
  buildVerbLookup,
  parseSOVClauseByVerbAnchoring,
  sovCommandStartsAt,
  tokensBeginCommand,
} from './sov-clause';
import {
  coverageMark,
  coverageRollback,
  keepVerbatimClause,
  recordDroppedTokens,
} from './coverage';
import {
  foldLoopBlocks,
  isOpenLoopHead,
  isRepeatToken,
  repeatOpensOnItsBody,
  takeBottomUntil,
} from './loop-walk';
import {
  buildCommand,
  isElseIfChain,
  opensNestedBlock,
  tryParsePseudoCommand,
} from './clause-heads';

/**
 * The last token before `end` in `list` that is not a particle: the word a
 * role marker follows (he `repeat את כל עוד …`, zh `重复 把 …`).
 */
export function wordBefore(list: readonly LanguageToken[], end: number): LanguageToken | undefined {
  for (let k = end - 1; k >= 0; k--) if (list[k].kind !== 'particle') return list[k];
  return undefined;
}

/**
 * Upstream's statement modifier, `<command> unless <condition>`: the guard
 * follows the command it guards, in the same clause. The flat model reads a
 * guard AHEAD of its command (core's prefix `unless <cond> <command>`, the SOV
 * trailing guard), so a guard read after a command moves there; an English
 * render writes it back after (toUpstreamSpelling). Read in place, `toggle .foo
 * unless I match .bar` was written `toggle .foo then unless I match .bar`, which
 * upstream rejects. Only within one clause: after a `then`, an `unless` is the
 * prefix guard of what follows it.
 */
export function frontPostfixGuards(commands: SemanticNode[]): SemanticNode[] {
  const isGuard = (n: SemanticNode | undefined): boolean =>
    !!n && n.kind === 'command' && n.action === 'unless' && n.roles.has('condition');
  const out = [...commands];
  for (let i = 1; i < out.length; i++) {
    if (isGuard(out[i]) && !isGuard(out[i - 1])) {
      [out[i - 1], out[i]] = [out[i]!, out[i - 1]!];
      i++;
    }
  }
  return out;
}

/** Loop heads in the walker's list still waiting for their `end`. */
export function openLoopCount(entries: readonly WalkEntry[]): number {
  let open = 0;
  for (const entry of entries) {
    if (isOpenLoopHead(entry)) open++;
    else if (isLoopClose(entry) && open > 0) open--;
  }
  return open;
}

/** The token before a run in the tokens it was taken from. */
export function tokenBefore(
  tokens: readonly LanguageToken[],
  run: readonly LanguageToken[]
): LanguageToken | undefined {
  const at = run[0] ? tokens.indexOf(run[0]) : -1;
  return at > 0 ? tokens[at - 1] : undefined;
}

/**
 * Parse body with proper clause separation.
 * Splits the token stream at conjunction boundaries (then/それから/ثم/etc.)
 * and parses each clause independently.
 *
 * This handles multi-clause patterns like:
 * - "toggle .active then remove .hidden"
 * - ".active を 切り替え それから .hidden を 削除"
 * - "بدل .active ثم احذف .hidden"
 *
 * @param tokens Token stream to parse
 * @param commandPatterns Command patterns for the language
 * @param language Language code
 * @returns Array of semantic nodes (one per clause)
 */
export function parseBodyWithClauses(
  state: ParserState,
  tokens: ReturnType<typeof tokenizeInternal>,
  commandPatterns: LanguagePattern[],
  language: string
): SemanticNode[] {
  // Parsed clauses in order, plus a LOOP_CLOSE wherever a loop's `end` was
  // consumed; foldLoopBlocks nests each loop's body before this returns.
  const clauses: WalkEntry[] = [];
  const currentClauseTokens: LanguageToken[] = [];
  // Nesting depth of block openers (`if`/`unless`/`while`/`for`/`repeat`)
  // accumulated into the pending clause — see the depth-aware `end` note below.
  let pendingBlockDepth = 0;
  // Kind of each open block, parallel to pendingBlockDepth (LIFO — an `end`
  // closes the innermost opener). While an `if` block is open, a conjunction
  // is BLOCK CONTENT, not a clause boundary — see the then-boundary note in
  // the conjunction branch below. `loop` is a `repeat`/`for` opener, whose
  // `end` the walker resolves itself (see closeLoopAtEnd); `while` is a while
  // word no `repeat` has claimed yet; `other` is an `unless`.
  const pendingOpenerKinds: Array<'if' | 'loop' | 'while' | 'other'> = [];
  // Re-derive the owed `end`s after the pending clause is flushed: every loop
  // head still waiting for its `end`, plus `whileHeads` (see the conjunction
  // branch).
  const resetDebt = (whileHeads = 0): void => {
    const open = openLoopCount(clauses);
    pendingBlockDepth = open + whileHeads;
    pendingOpenerKinds.length = 0;
    for (let k = 0; k < open; k++) pendingOpenerKinds.push('loop');
    for (let k = 0; k < whileHeads; k++) pendingOpenerKinds.push('while');
  };

  while (!tokens.isAtEnd()) {
    const current = tokens.peek();
    if (!current) break;

    // Fold a leading `if`/`unless` block into a ConditionalSemanticNode.
    // At a clause boundary (no tokens accumulated for a pending command), an
    // `if`/`unless` keyword introduces a conditional whose condition + then/else
    // branches must nest under one node — otherwise the branches flatten into
    // sibling commands and the condition truncates to its first token (the §2
    // dominant cluster, observable in English itself). `tryParseConditionalBlock`
    // consumes the whole block from the stream and returns the conditional, or
    // null without consuming when the head isn't a usable conditional — so a
    // non-conditional clause is byte-identical to the previous behavior.
    if (currentClauseTokens.length === 0) {
      // A `js(…) … end` block is raw JavaScript and must stay OPAQUE. Its body
      // tokens (`if (…) return …;`) look like hyperscript keywords, so if the
      // clause loop splits the block at its internal `end`, parseClause re-parses
      // the body and emits phantom `if`/`return`/… commands — the spurious
      // `return` the en reference extracted from behavior-removable's js body,
      // which capped it at fid 0.889 (translations mask the js body, so they
      // never reproduced it). Consume the whole block — up to and including its
      // first `end` — and parse it as one unit, so matchBest matches the single
      // `js` command (as it already does for a standalone block) and the JS body
      // never reaches the command patterns.
      const jsNode =
        consumeJsBlock(tokens, language, state.positionSource) ??
        consumeVerbFinalJsBlock(tokens, language, state.positionSource);
      if (jsNode) {
        clauses.push(jsNode);
        continue;
      }

      const conditional = tryParseConditionalBlock(state, tokens, commandPatterns, language);
      if (conditional) {
        clauses.push(conditional);
        continue;
      }

      // Leading `unless` — same splitter, flat shape (see tryParseUnlessGuard).
      const unlessGuard = tryParseUnlessGuard(state, tokens, commandPatterns, language);
      if (unlessGuard) {
        clauses.push(...unlessGuard);
        continue;
      }
    }

    // Check if this is a conjunction token (clause boundary)
    const isConjunction =
      current.kind === 'conjunction' ||
      (current.kind === 'keyword' &&
        isThenAt(current, endWordPlace(tokens.tokens, tokens.position()), language));

    // Check if this is an 'end' keyword (terminates block): not the noun of
    // `at end of <target>` (`put it at end of body`, make-toast-element; zh
    // `在 结束 的`, id `di akhir dari`), which is a position, and not a variable
    // spelled like it where a value stands (C3).
    const closesBlock = closesBlockAt(tokens.tokens, tokens.position(), language);
    const isEnd = closesBlock && current.kind === 'keyword' && isCuratedEndWord(current, language);

    // Depth-aware termination. An `end` that closes a NESTED block accumulated
    // mid-clause must not terminate the whole body. A nested `if`/`unless`/
    // `while`/`for`/`repeat` is normally consumed as a unit by the fold guards
    // above — but those only fire at a clause boundary (currentClauseTokens
    // empty). In SOV/VSO the event-handler pattern leaves the leading
    // `from <source>` clause (removable `triggerEl 에서`) or event-param clause
    // (sortable `(clientY) … me から`) unconsumed at the head of the body, so the
    // pending clause is non-empty at the first nested opener and the fold never
    // fires. The naive break below would then terminate the body at that nested
    // block's `end`, dropping every command after it (`trigger`/`remove` after
    // the conditional — the SOV/VSO analogue of the #452/#453 fused-body fixes).
    // While inside a nested block (depth > 0), treat `end` as block content and
    // keep accumulating so the whole body reaches the per-clause parser.
    //
    // A LOOP's `end` is the exception: it closes the loop, so flush the pending
    // clause and mark the close (foldLoopBlocks nests the body). As block
    // content the `end` vanished into the clause, and the loop's extent with
    // it — the renderer then closed the loop at the END of the list, pulling
    // whatever followed into it (template-literal-list-build's `set
    // #list.innerHTML`, behavior-sortable's `remove`). An opener the walker
    // cannot see (es/pt `para` and sw `kwa` are particles, the SOV heads are
    // verb-final) was worse: its `end` terminated the whole body. Only when
    // every opener in the pending clause is a loop — an open `if` or `unless`
    // keeps the block-content reading, which its own fold reassembles.
    //
    // bn's শেষ is `end` AND the positional `last`, so no curated set can list
    // it and it never terminates a body; it can still close an open loop, by
    // the conditional fold's test (a keyword normalized `end`, not before a
    // selector). closeLoopAtEnd declines unless a loop is open.
    // A `while` no `repeat` claimed, last in a loop, is that loop's bottom
    // test (`repeat … while x < 3 end`): the `end` is the loop's. An SOV
    // while-phrase is claimed by the `repeat` verb after it before any `end`.
    const kinds = pendingOpenerKinds;
    const bottomWhile =
      kinds.length >= 2 &&
      kinds[kinds.length - 1] === 'while' &&
      kinds.slice(0, -1).every(kind => kind === 'loop');
    if (closesBlock && (kinds.every(kind => kind === 'loop') || bottomWhile)) {
      if (closeLoopAtEnd(state, tokens, currentClauseTokens, clauses, commandPatterns, language)) {
        currentClauseTokens.length = 0;
        resetDebt();
        continue;
      }
    }
    if (isEnd && pendingBlockDepth > 0) {
      pendingBlockDepth--;
      pendingOpenerKinds.pop();
      // Annotate: THIS terminator closes a tracked open block. Downstream,
      // the flat clause run can't tell a block-closing `son`/`শেষ` from a
      // positional `last` — the selector lookahead in isStrayTerminator
      // would read `son .{dragClass}` (loop-end + remove's patient) as
      // `last .{dragClass}` and prefix the next command's role value (the
      // tr behavior-sortable remove.patient R3 row). The annotation keeps
      // the positional reading for every terminator-shaped token EXCEPT the
      // ones this walker itself matched to an opener.
      currentClauseTokens.push({
        ...current,
        metadata: { ...current.metadata, closesTrackedBlock: true },
      });
      tokens.advance();
      continue;
    }

    // Then-boundary suppression for an OPEN mid-clause `if` block. The `then`
    // between an if-head and its branch is a CONJUNCTION, so the naive split
    // below would land the if-head clause-FINAL with no branch tokens — the
    // mid-clause fold in parseClause then has nothing to fold (empty branch →
    // null), the flat `if` truncates its condition to the first token, the
    // branch command becomes the NEXT clause, and the if's owed `end` desyncs
    // the debt bookkeeping until a later `end` terminates the walk early
    // (behavior-resizable en: the walk broke at the 3rd of 4 ifs, dropping
    // every following command — bn parsed MORE of the body than the en
    // reference, so bn's flags were en deficits). While an `if` block is open
    // in the pending clause, a conjunction is block content: keep
    // accumulating so the whole `if … then … end` block reaches parseClause,
    // whose mid-clause fold (tryParseConditionalBlock) splits condition/
    // branch at the `then` and consumes the matching `end`. Ifs opened at a
    // clause BOUNDARY never get here — the leading fold consumes them whole.
    if (isConjunction && pendingOpenerKinds.includes('if')) {
      currentClauseTokens.push(current);
      tokens.advance();
      continue;
    }

    if (isConjunction) {
      // We've reached a clause boundary - parse accumulated tokens
      if (currentClauseTokens.length > 0) {
        const clauseNodes = parseClause(state, currentClauseTokens, commandPatterns, language);
        clauses.push(...clauseNodes);
        currentClauseTokens.length = 0; // Clear for next clause
        // Re-derive the "end debt" from what the clause actually PARSED to:
        // each blockless loop-head command (for/repeat/while with no attached
        // body) still owes its block-terminating `end`. The i18n transformer
        // inserts a conjunction between a loop head and its body (`para item
        // en $items ENTONCES establecer … fin` — en renders `for item in
        // $items set … end`, no conjunction), so the head's `end` arrives in
        // a LATER clause; the old unconditional reset made that `fin` read as
        // the body terminator and every command after the loop was silently
        // dropped (template-literal-list-build ×22 — the largest set-family
        // R1 cluster, all 22 translations losing the final `set
        // #list.innerHTML`). Deriving from the PARSE (not token-kind
        // heuristics) is language-independent: pt `para` and sw `kwa`
        // tokenize as destination PARTICLES (never keyword/for), and a
        // spurious homonym token (bn `জন্য`, both `for` and a benefactive
        // postposition) that parsed to no loop head contributes nothing —
        // exactly the old reset.
        //
        // The debt is every loop head still open, not just this clause's: a
        // loop whose body spans several clauses owes its `end` until it
        // arrives. A flat `while` head (the SOV fronted while-phrase) still
        // owes one too, as before; it opens no loop of its own.
        resetDebt(
          clauseNodes.filter(n => {
            const rec = n as { action?: string; body?: unknown[] };
            return rec.action === 'while' && (!Array.isArray(rec.body) || rec.body.length === 0);
          }).length
        );
      }
      tokens.advance(); // Consume conjunction token
      continue;
    }

    if (isEnd) {
      tokens.advance(); // Consume 'end' token

      // The verb-final SOV reorder can place the block-terminating `end`
      // *between* a trailing command's argument and its verb:
      //   ja: `… それから 200ms 終わり を 待つ`  (`… then 200ms end ‹patient› wait`)
      //   ko: `… 그러면 200ms 끝 를 대기`         (`… then 200ms end ‹patient› wait`)
      //   qu: `… chayqa 200ms tukuy ta suyay`     (`… then 200ms end ‹patient› wait`)
      // A naive `end`-break discards the `を 待つ` / `를 대기` / `ta suyay` that
      // follows, dropping the trailing `wait` (fidelity residue). Tolerate a
      // single trailing command clause after `end`: collect the tokens up to the
      // next then/end boundary (so a genuine nested-block close can't swallow
      // arbitrary following content), then parse — merging with the pre-`end`
      // tokens only when those tokens are a stranded fragment (the SOV
      // verb-final split above), otherwise parsing the two as separate clauses.
      const trailingTokens: LanguageToken[] = [];
      while (!tokens.isAtEnd()) {
        const t = tokens.peek();
        if (!t) break;
        const tIsBoundary =
          t.kind === 'conjunction' ||
          (t.kind === 'keyword' &&
            (isThenKeyword(t.value, language) || isCuratedEndWord(t, language)));
        if (tIsBoundary) break;
        trailingTokens.push(t);
        tokens.advance();
      }

      if (trailingTokens.length > 0) {
        const preParseMark = coverageMark(state);
        const preNodes =
          currentClauseTokens.length > 0
            ? parseClause(state, currentClauseTokens, commandPatterns, language)
            : [];
        if (preNodes.length === 0 && currentClauseTokens.length > 0) {
          // Pre-`end` tokens parsed to nothing — a stranded argument (e.g. `200ms`)
          // whose verb sits after `end`. Merge so the verb reclaims its argument.
          // The discarded first parse's coverage records are superseded by the
          // merged parse's own accounting.
          coverageRollback(state, preParseMark);
          clauses.push(
            ...parseClause(
              state,
              [...currentClauseTokens, ...trailingTokens],
              commandPatterns,
              language
            )
          );
        } else {
          // Pre-`end` tokens were already a complete clause (or empty); the
          // trailing tokens are a distinct sibling command — parse separately.
          clauses.push(...preNodes);
          clauses.push(...parseClause(state, trailingTokens, commandPatterns, language));
        }
      } else if (currentClauseTokens.length > 0) {
        const clauseNodes = parseClause(state, currentClauseTokens, commandPatterns, language);
        clauses.push(...clauseNodes);
      }
      currentClauseTokens.length = 0;
      break;
    }

    // Accumulate token for current clause. Count nested-block openers so the
    // depth-aware `end` check above knows when an `end` closes a nested block
    // rather than the body itself. (Openers reached at a clause boundary are
    // consumed by the fold guards instead and never get here. A loop opener
    // that tokenizes as a PARTICLE — es/pt `para`, sw `kwa` — is invisible
    // here, but the conjunction boundary re-derives the owed-`end` debt from
    // the clause's PARSE, which covers it.)
    //
    // One loop head can carry two loop words, and owes ONE `end`:
    // `repeat for …` / `repeat while …` (the second word names the form), and
    // the SOV fronted while-phrase (`… の間 x < 10 繰り返し`), whose while word
    // comes first and is claimed by the repeat verb after it. The English
    // `repeat` counts as a keyword does: several renders keep it
    // untranslated (es `repeat mientras …`, ja `3 times を repeat`), and there
    // it tokenizes as an identifier.
    const cv = (current.normalized ?? current.value).toLowerCase();
    const isRepeatWord = isRepeatToken(current);
    if (current.kind === 'keyword' || isRepeatWord) {
      const isIf = isIfKeyword(cv, language);
      const prev = wordBefore(currentClauseTokens, currentClauseTokens.length);
      if ((cv === 'for' || cv === 'while') && prev && isRepeatToken(prev)) {
        // the form word of `repeat for …` / `repeat while …`
      } else if (isIf && isElseIfChain(current, prev, language)) {
        // `else if` continues its chain, which one `end` closes (opensNestedBlock)
      } else if (isRepeatWord && pendingOpenerKinds[pendingOpenerKinds.length - 1] === 'while') {
        pendingOpenerKinds[pendingOpenerKinds.length - 1] = 'loop';
      } else if (
        isIf ||
        isUnlessKeyword(cv, language) ||
        cv === 'while' ||
        cv === 'for' ||
        isRepeatWord
      ) {
        pendingBlockDepth++;
        // `unless` counts as 'other': the mid-clause fold only folds `if`
        // (folding unless would relabel its action — see
        // tryParseConditionalBlock), so suppressing then-boundaries for an
        // open `unless` would glue clauses with no fold to reassemble them.
        pendingOpenerKinds.push(
          isIf ? 'if' : isRepeatWord || cv === 'for' ? 'loop' : cv === 'while' ? 'while' : 'other'
        );
      }
    }
    currentClauseTokens.push(current);
    tokens.advance();
  }

  // Parse any remaining tokens as final clause
  if (currentClauseTokens.length > 0) {
    const clauseNodes = parseClause(state, currentClauseTokens, commandPatterns, language);
    clauses.push(...clauseNodes);
  }

  // Stream remainder after the walk ended at a depth-0 `end`: tokens this
  // body parse will never read. Per sub-stream by construction — SOV/VSO
  // extraction passes a re-tokenized segment, so the accounting is
  // per-segment, never against the outer stream.
  if (!tokens.isAtEnd()) {
    recordDroppedTokens(
      state,
      (tokens.tokens as LanguageToken[]).slice(tokens.position()),
      language,
      'body stream tail'
    );
  }

  foldFrontedWhileIntoRepeat(clauses, language);

  // Drop phantom BARE `for` clauses: a lone for-homonym token (bn `জন্য` is
  // both the for-keyword and the benefactive postposition) parses as a `for`
  // command node with ZERO roles and no body — never a real command, only a
  // rendered marker orphaned from its phrase (`অপেক্ষা transitionend জন্য`:
  // the trailing for-postposition survives the wait clause split and anchors
  // an empty `for` — a precision phantom vs the en reference). Real for
  // parses always carry a patient/source role or a body (loop kinds are
  // built with them). Scoped to `for` ONLY: a bare zero-role `repeat` is a
  // legitimate intermediate of the loop-body recovery paths (zh
  // repeat-forever, qu repeat-while) and must survive.
  for (let i = clauses.length - 1; i >= 0; i--) {
    const c = clauses[i] as CommandSemanticNode & { body?: unknown[] };
    if (
      c.kind === 'command' &&
      c.action === 'for' &&
      (!(c.roles instanceof Map) || c.roles.size === 0) &&
      (!Array.isArray(c.body) || c.body.length === 0)
    ) {
      clauses.splice(i, 1);
    }
  }

  const statements = foldLoopBlocks(state, clauses);

  // If we have multiple clauses, wrap in CompoundSemanticNode
  if (statements.length > 1) {
    return [createCompoundNode(statements, 'then', { sourceLanguage: language })];
  }

  return statements;
}

/**
 * Resolve a clause-walker `end` that may close a LOOP. The pending clause is
 * parsed here, where the `end` bounds it; if a loop head is open — one the
 * walker already emitted, or one inside this clause — the `end` is that
 * loop's: push the clause and a LOOP_CLOSE, consume the `end`, and return
 * true. Otherwise nothing is kept and the caller's own `end` handling runs.
 *
 * Asking the PARSE, not the token, is what makes this language-independent:
 * es/pt `para` and sw `kwa` are particles, and the SOV loop words are
 * verb-final, so no token-level opener count can see them.
 */
export function closeLoopAtEnd(
  state: ParserState,
  tokens: ReturnType<typeof tokenizeInternal>,
  pending: readonly LanguageToken[],
  clauses: WalkEntry[],
  commandPatterns: LanguagePattern[],
  language: string
): boolean {
  const openBefore = openLoopCount(clauses);
  if (pending.length === 0) {
    if (openBefore === 0) return false;
    clauses.push(LOOP_CLOSE);
    tokens.advance();
    return true;
  }
  const mark = coverageMark(state);
  const nodes = parseClause(state, [...pending], commandPatterns, language);
  // Nothing parsed: a stranded fragment whose verb follows the `end` (the SOV
  // `… 200ms 終わり を 待つ` shape). The caller's handling reunites the two.
  if (nodes.length === 0 || openBefore + nodes.filter(isOpenLoopHead).length === 0) {
    coverageRollback(state, mark);
    return false;
  }
  clauses.push(...nodes, LOOP_CLOSE);
  tokens.advance();
  return true;
}

/**
 * Parse a single clause (sequence of tokens between conjunctions).
 * Returns array of semantic nodes parsed from the clause.
 */
export function parseClause(
  state: ParserState,
  clauseTokens: LanguageToken[],
  commandPatterns: LanguagePattern[],
  language: string
): SemanticNode[] {
  if (clauseTokens.length === 0) {
    return [];
  }

  // SOV/postpositional trailing `unless` guard. The leading-fold path
  // (tryParseConditionalBlock) only fires when the block marker is the clause
  // HEAD, but a verb-final reorder renders the negated-conditional marker
  // clause-FINAL (ko `… 토글 .selected 를 아니라면`, tr `… değiştir .selected i
  // değilse`) with its condition fronted ahead of the guarded command. That
  // leaves the `unless` action unparsed and the fronted condition orphaned — the
  // dominant `unless-condition` lossy cluster. Detect the trailing marker, parse
  // the body without it, then re-emit `unless` carrying the recovered fronted
  // condition, mirroring en's flat `[unless(cond), toggle]` compound. Only
  // `unless` is handled here: `if` keeps its existing leading-fold semantics, and
  // a conditional node would relabel the action `unless`→`if` (see
  // tryParseConditionalBlock), desyncing the cross-language action set.
  let trailingGuard: ActionType | null = null;
  let bodyTokens = clauseTokens;
  const lastTok = clauseTokens[clauseTokens.length - 1];
  if (lastTok && clauseTokens.length >= 2) {
    const lv = (lastTok.normalized ?? lastTok.value).toLowerCase();
    if (isUnlessKeyword(lv, language)) {
      trailingGuard = 'unless' as ActionType;
      bodyTokens = clauseTokens.slice(0, -1);
    }
  }

  // Verb-split for the trailing-`unless` guard. The fronted condition (`I match
  // .disabled`) precedes the body command's verb (ko `… 토글 .selected 를`, hi `…
  // टॉगल .selected को`). A patient-BEFORE-verb pattern (hi `toggle-hi-simple` =
  // `{patient} टॉगल`) otherwise grabs the condition's trailing selector
  // (`match .disabled`) as the body patient and strands the real marked `.selected`
  // — leaving the body faithful-by-recall but role-wrong (the hi residual). Reserve
  // everything before the first command-verb KEYWORD as the condition and parse
  // only from the verb, so the body command sees `टॉगल .selected को` and binds the
  // real patient. Gated to a real command verb (not an operator like `matches`)
  // that is verb-MEDIAL (a fronted condition before it AND tokens after it); a
  // non-medial / verb-first body finds no split and the skip-based capture below
  // stands (byte-identical). Already-correct verb-medial langs (ko/ja/bn) resolve
  // to the same `[condition][verb …]` split they reached via skip-capture.
  let presetCondition: LanguageToken[] | null = null;
  if (trailingGuard && bodyTokens.length >= 3) {
    const profile = tryGetProfile(language);
    const verbLookup = profile ? buildVerbLookup(profile) : null;
    if (verbLookup) {
      for (let i = 1; i < bodyTokens.length - 1; i++) {
        const t = bodyTokens[i];
        const action =
          verbLookup.get(t.value.toLowerCase()) ??
          (t.normalized ? verbLookup.get(t.normalized.toLowerCase()) : undefined);
        // A command verb: tr's profile lists `değil` (`not`) as a keyword,
        // which split `ben değil eşleşir .bar` (I do not match .bar) after `ben`.
        if (action && !CONDITION_OPERATORS.has(action) && getSchema(action as ActionType)) {
          presetCondition = bodyTokens.slice(0, i);
          bodyTokens = bodyTokens.slice(i);
          break;
        }
      }
    }
  }

  // Create a TokenStream from the (guard-stripped) clause tokens
  const clauseStream = new TokenStreamImpl(bodyTokens, language);

  const commands: SemanticNode[] = [];

  // Coverage mark for this clause: if the whole-clause verb-anchoring
  // fallback below supersedes the per-gap walk, its records are stale.
  const clauseCoverageMark = coverageMark(state);

  // Count of commands produced by the existing paths (matchBest + the `repeat`
  // special-case). Used to decide between per-gap recovery and the legacy
  // whole-clause fallback below — see the `directHits === 0` branch.
  let directHits = 0;

  // Tokens matchBest could not anchor on. In SOV a *verb-medial* command
  // (`triggerEl を 設定 私 に` = `set triggerEl to me`) doesn't match matchBest
  // (it anchors on a selector/typed role), so when such a command is JUXTAPOSED
  // before a matchable one (`set X to me` then `toggle .y`, no `then` between),
  // matchBest skips the whole verb-medial command one token at a time and it is
  // silently dropped — the all-or-nothing whole-clause fallback at the end never
  // fired because a later command DID match. Collect each skipped run and recover
  // verb-medial commands from it (in order, so execution semantics are kept).
  const skipped: LanguageToken[] = [];
  // For a trailing-`unless` guard clause, the fronted condition is either the
  // reserved verb-split prefix (above) or — when no clean verb-medial split
  // exists — the first unmatched run before any body command (claimed below).
  let leadingCondition: LanguageToken[] | null = presetCondition;
  const flushSkipped = () => {
    if (skipped.length === 0) return;
    const run = skipped.slice();
    skipped.length = 0;
    // The clause of the command before it, kept as written (M1 phase 3).
    const keepAsClause = (): boolean =>
      keepVerbatimClause(
        state,
        commands[commands.length - 1],
        run,
        tokenBefore(bodyTokens, run),
        language
      );
    if (trailingGuard && commands.length === 0 && leadingCondition === null) {
      leadingCondition = run;
      return;
    }
    // Recover only a *value-led* run (a verb-medial command always opens with
    // its first role value — identifier/selector/literal). A keyword-led run is
    // an event-clause leak (`스크롤 …` / `scroll …`, where the event word is also
    // a command verb) and must NOT be turned into a command.
    const head = run[0];
    const headIsValue =
      head &&
      (head.kind === 'identifier' ||
        head.kind === 'selector' ||
        head.kind === 'literal' ||
        (head.kind as string) === 'reference');
    if (!headIsValue) {
      if (keepAsClause()) return;
      // Discarded without recovery — a keyword-led run is exactly where
      // `break`/`continue` clauses vanish (Arc C). Record the drop.
      recordDroppedTokens(state, run, language, 'body clause');
      return;
    }
    // Verb-anchoring on a *fragment* can still mis-fire on a stray marker/keyword
    // (`from`/`into`/`or`/`until`). Keep only well-formed recoveries: a real
    // command schema with at least one captured role.
    let recoveredFromRun = false;
    for (const node of parseSOVClauseByVerbAnchoring(run, language)) {
      const action = (node as { action?: string }).action;
      const roles = (node as { roles?: unknown }).roles;
      if (action && getSchema(action as ActionType) && roles instanceof Map && roles.size > 0) {
        commands.push(node);
        recoveredFromRun = true;
      }
    }
    if (recoveredFromRun || keepAsClause()) return;
    recordDroppedTokens(state, run, language, 'body clause');
  };

  while (!clauseStream.isAtEnd()) {
    // Try to match as a command
    const startTok = clauseStream.peek();
    // English keywords carry no `normalized`: the word is its own.
    const startIsRepeatKw =
      !!startTok &&
      startTok.kind === 'keyword' &&
      (startTok.normalized ?? startTok.value).toLowerCase() === 'repeat';
    const startMark = clauseStream.mark();
    const startPos = clauseStream.position();
    const commandMatch = patternMatcher.matchBest(clauseStream, commandPatterns);

    // A verb-final command (qu `… suyay` = wait, verb-LAST) can greedily span
    // backward across the clause-final `repeat` loop keyword, anchoring its
    // match AT that keyword and consuming it as part of the argument run — so
    // matchBest *succeeds* (as `wait`/`set`/…), the swallowed `repeat` keyword
    // disappears, and the bare-`repeat` recovery below (gated on matchBest
    // failing) never fires (behavior-draggable qu: `… kutipay suyay …` matched
    // `wait` from `kutipay`, dropping the loop — was lossy 0.875). When a
    // NON-repeat command anchors AT the repeat keyword, reject the swallow:
    // rewind, emit the bare repeat, and consume only that keyword so the
    // verb-final command re-matches cleanly on the next iteration. A genuine
    // `repeat` variant (`repeat N times`/`repeat for …`) keeps its full match,
    // unless it read the body as its head (`loopHeadReadsBody`).
    if (
      startIsRepeatKw &&
      commandMatch &&
      ((commandMatch.pattern.command as string) !== 'repeat' ||
        loopHeadReadsBody(commandMatch, skipped, language) ||
        repeatOpensOnItsBody(
          commandMatch,
          clauseStream.tokens.slice(startPos + 1),
          commandPatterns,
          language
        ))
    ) {
      clauseStream.reset(startMark);
      clauseStream.advance(); // consume only the repeat keyword (and a count by it)
      const count = takeRepeatCount(clauseStream, skipped, language);
      flushSkipped();
      commands.push(bareRepeatHead(count, language));
      directHits++;
      continue;
    }

    // An `if` whose condition opens with a literal (`if 1 < 2`, `if "a" is
    // …`, `if true`) matches no `if {condition}` pattern at all, so the fold
    // below — keyed on matchBest yielding a flat `if` — never ran: the head
    // was skipped as junk and its branch ran unconditionally, inside a loop
    // in English and so in every translation. Where nothing matched at an
    // `if` keyword, fold at the keyword itself.
    if (
      !commandMatch &&
      startTok &&
      isIfKeyword((startTok.normalized ?? startTok.value).toLowerCase(), language)
    ) {
      const conditional = tryParseConditionalBlock(state, clauseStream, commandPatterns, language);
      if (conditional) {
        flushSkipped();
        commands.push(conditional);
        directHits++;
        continue;
      }
    }

    // Mid-clause `if` fold — the parseClause mirror of the fused-body walker's
    // hook (see the matchBest-yields-flat-`if` fold in parseBody). A juxtaposed
    // `<cmd> … if <condition> <cmd> …` clause (no `then` before the `if`, so the
    // clause-boundary fold in parseBodyWithClauses never fires) otherwise
    // pattern-matches the flat `if` head (`if-en-basic` = `if {condition}`),
    // truncating the condition to its FIRST token (`if result is false` →
    // condition:reference="result", the comparison silently dropped) and
    // flattening the branch into sibling commands. This was en-REFERENCE noise:
    // translations reach the folding walkers and capture the full condition as
    // an expression, then mis-score against the truncated en signature
    // (form-submit-prevent ×14). Rewind and fold the whole `if … end` block —
    // same condition/branch split, full-expression condition. Junk between the
    // match start and the if-keyword joins the skipped-run recovery (restored on
    // a failed fold). tryParseConditionalBlock returns null without consuming
    // when the head isn't a usable conditional, so a non-foldable flat `if`
    // (e.g. no branch commands) is byte-identical to before.
    if (commandMatch && (commandMatch.pattern.command as string) === 'if') {
      const afterMatch = clauseStream.mark();
      const skippedLenBefore = skipped.length;
      clauseStream.reset(startMark);
      while (!clauseStream.isAtEnd()) {
        const h = clauseStream.peek();
        if (!h || isIfKeyword((h.normalized ?? h.value).toLowerCase(), language)) break;
        skipped.push(h);
        clauseStream.advance();
      }
      const conditional = tryParseConditionalBlock(state, clauseStream, commandPatterns, language);
      if (conditional) {
        flushSkipped();
        commands.push(conditional);
        directHits++;
        continue;
      }
      skipped.length = skippedLenBefore;
      clauseStream.reset(afterMatch);
    }

    if (commandMatch) {
      flushSkipped();
      const cmd = buildCommand(state, commandMatch, language);
      commands.push(cmd);
      directHits++;
      tryAttachTrailingRole(clauseStream, cmd, language, state.boundIdentifiers);
      tryAttachTrailingStyle(clauseStream, cmd, language);
      tryAttachTrailingExpressionRole(clauseStream, cmd, language);
      tryAttachTrailingDuration(clauseStream, cmd);
    } else {
      // English pseudo-command (`click() me`): parsed as the `call` it is.
      // Only at a command boundary — never inside a skipped run, where a
      // glued `name(…)` is an event with params (`wait for pointermove(x) or
      // pointerup(x) from document`), not a command.
      const pseudo =
        skipped.length === 0
          ? tryParsePseudoCommand(state, clauseStream, commandPatterns, language)
          : null;
      if (pseudo) {
        flushSkipped();
        commands.push(pseudo);
        directHits++;
        continue;
      }
      const bottom =
        skipped.length === 0 ? takeBottomUntil(state, clauseStream, commands, language) : null;
      if (bottom) {
        commands.push(bottom);
        directHits++;
        continue;
      }
      // A `for`-binding loop (`repeat for <var> in <coll>`) loses its `for`
      // binder keyword in transit (the i18n transformer emits `repeat <var> in
      // <coll>`), so the bare `repeat` keyword carries no matchable variant
      // (`forever`/`while`/`N times`/`for`) and matchBest can't anchor it — the
      // `repeat` action is silently dropped (ar/tl/zh `repeat-for-each` residue;
      // ko escapes only because its SOV order puts the keyword last where it
      // matches). When matchBest fails on a token whose normalized form is the
      // `repeat` loop keyword, emit the loop action directly so it survives.
      const tok = clauseStream.peek();
      // The English verb the render writes in some languages (qu `3 times ta
      // repeat`) is a plain identifier: a loop head only with a count by it.
      const englishRepeat = tok?.kind === 'identifier' && tok.value.toLowerCase() === 'repeat';
      if (tok && (tok.normalized?.toLowerCase() === 'repeat' || englishRepeat)) {
        const verb = clauseStream.mark();
        clauseStream.advance();
        const count = takeRepeatCount(clauseStream, skipped, language);
        if (count || !englishRepeat) {
          flushSkipped();
          commands.push(bareRepeatHead(count, language));
          directHits++;
          continue;
        }
        clauseStream.reset(verb);
      }
      if (tok) skipped.push(tok);
      // Skip unrecognized token
      clauseStream.advance();
    }
  }
  flushSkipped();

  let bodyCommands = commands;
  // No command matched via matchBest or the `repeat` special-case: prefer the
  // legacy whole-clause verb-anchoring (byte-identical to the prior behavior).
  // It handles a single verb-FINAL command (`call updateScrollPosition()`) that
  // the per-gap recovery would mis-split into fragments — so a clause that is one
  // such command is parsed correctly, and any per-gap noise is discarded.
  if (directHits === 0) {
    // Under a trailing `unless`, keep only real commands, as flushSkipped
    // does: a condition-only clause (ja `それ 一致する .bar ない限り`) anchored
    // on its operator and added a phantom `matches` command after the guard.
    const sovCommands = parseSOVClauseByVerbAnchoring(bodyTokens, language).filter(
      n => !trailingGuard || !!getSchema((n as { action?: string }).action as ActionType)
    );
    if (sovCommands.length > 0) {
      // The whole-clause re-parse consumed what the per-gap walk recorded as
      // dropped — those records are stale.
      coverageRollback(state, clauseCoverageMark);
      bodyCommands = sovCommands;
    }
  }

  // Re-emit a stripped trailing `unless` guard ahead of its body, carrying the
  // fronted condition recovered from the clause head. Conservative: fires only
  // when a real body command parsed AND a fronted condition was captured — a bare
  // trailing marker with no condition is left unparsed rather than fabricated, so
  // this can't inject a phantom `unless` (precision-safe).
  // `leadingCondition` is only assigned inside the `flushSkipped` closure, which
  // TS's flow analysis can't see — the cast restores its declared union so the
  // truthiness guard narrows correctly.
  const cond = leadingCondition as LanguageToken[] | null;
  if (trailingGuard && bodyCommands.length > 0 && cond && cond.length > 0) {
    const guardNode = createCommandNode(
      trailingGuard,
      { condition: { type: 'expression', raw: joinTokenText(cond, language) } },
      {
        sourceLanguage: language,
        patternId: `${trailingGuard}-${language}-trailing-guard`,
        confidence: 0.85,
      }
    );
    // Mirror en's flat `[unless(cond), toggle]` order: guard first, then body.
    return [guardNode, ...bodyCommands];
  }
  // A condition-only clause: the RENDERER emits en's flat compound shape —
  // `unless(cond)` in its own clause, the guarded command in the NEXT one
  // (`I ない限り それから .selected を 切り替え`) — so at this point the whole
  // clause was the fronted condition plus the trailing marker, and there is
  // no body command to anchor on. Emit the guard alone; the following clause
  // parses its command as a sibling, exactly the en reference's `[unless,
  // toggle]` action set. Still precision-safe: a real condition run was
  // captured (a bare trailing marker with nothing ahead of it stays
  // unparsed), so no phantom `unless` can appear on a clause that never
  // carried one.
  if (trailingGuard && cond && cond.length > 0 && bodyCommands.length === 0) {
    return [
      createCommandNode(
        trailingGuard,
        { condition: { type: 'expression', raw: joinTokenText(cond, language) } },
        {
          sourceLanguage: language,
          patternId: `${trailingGuard}-${language}-trailing-guard`,
          confidence: 0.85,
        }
      ),
    ];
  }

  return frontPostfixGuards(bodyCommands);
}

/**
 * Parse body commands with support for grammar-transformed patterns.
 * Used after a grammar-transformed pattern with continuation marker.
 *
 * Returns the walk UNFOLDED: matched commands in order, plus a LOOP_CLOSE
 * wherever a loop's `end` was consumed; the caller folds them together with
 * `leading`, what it parsed ahead of this stream (a fused handler's first
 * command). `leading` is read only to count the loops still open, so an
 * `end` closing a loop the caller holds is kept as its close.
 */
export function parseBodyWithGrammarPatterns(
  state: ParserState,
  tokens: ReturnType<typeof tokenizeInternal>,
  commandPatterns: LanguagePattern[],
  grammarPatterns: LanguagePattern[],
  language: string,
  leading: readonly WalkEntry[] = []
): WalkEntry[] {
  const commands: WalkEntry[] = [];
  const openLoops = (): number => openLoopCount([...leading, ...commands]);

  // SOV verb-anchoring recovery, per clause. The SOV grammar transforms put
  // the verb BETWEEN roles (`#name.innerText 를 설정 그것의.name 에`), an order
  // no command pattern covers — parseClause recovers it via
  // parseSOVClauseByVerbAnchoring, but this body walker used to just skip the
  // tokens, silently dropping the command (ko fetch-json/form-disable-on-submit
  // then-tails once the fused event pattern anchors). Mirror parseClause's
  // fallback semantics exactly: collect skipped tokens per clause and anchor
  // them ONLY if nothing in that clause matched a pattern — additive, so a
  // clause with any pattern match is byte-identical to the old behavior.
  let skippedClauseTokens: LanguageToken[] = [];
  let clauseHadMatch = false;
  let firstClause = true;
  // The clause of the command before it, kept as written (M1 phase 3): the
  // run ends the clause, right after its last command, or after the fused
  // command in the first clause.
  const keepAsClause = (): boolean => {
    const run = skippedClauseTokens;
    const all = tokens.tokens as LanguageToken[];
    const at = all.indexOf(run[0] as LanguageToken);
    if (at < 0 || at + run.length !== tokens.position()) return false;
    if (run.some((t, i) => all[at + i] !== t)) return false;
    const owner = clauseHadMatch
      ? commands[commands.length - 1]
      : firstClause
        ? leading[leading.length - 1]
        : undefined;
    return keepVerbatimClause(state, owner, run, all[at - 1], language);
  };
  const flushClause = () => {
    if (!clauseHadMatch && skippedClauseTokens.length > 0) {
      const recovered = parseSOVClauseByVerbAnchoring(skippedClauseTokens, language);
      commands.push(...recovered);
      if (recovered.length === 0 && !keepAsClause()) {
        recordDroppedTokens(state, skippedClauseTokens, language, 'fused body walk');
      }
    } else if (skippedClauseTokens.length > 0 && !keepAsClause()) {
      // A clause that DID match a pattern also silently discards its skipped
      // tokens (the recovery is gated on !clauseHadMatch) — record them.
      recordDroppedTokens(state, skippedClauseTokens, language, 'fused body walk');
    }
    skippedClauseTokens = [];
    clauseHadMatch = false;
    firstClause = false;
  };

  // Loop-head "end debt": an `end` owed to an earlier flat loop HEAD
  // (for/repeat pushed without a body) closes that loop, not the body. The
  // i18n transformer inserts a conjunction between a loop head and its body
  // (`para item en $items ENTONCES establecer … fin` — en renders no
  // conjunction there), so the head's `end` arrives clauses later; breaking
  // on it silently dropped every command after the loop
  // (template-literal-list-build ×22 — all translations losing the final
  // `set #list.innerHTML`). The `end` is marked where it closes, so the loop
  // keeps its extent: parseBodyWithClauses does the same (closeLoopAtEnd).
  // A standalone `while` head (the SOV fronted while-phrase) still owes one
  // too, and consumes it as content, as before.
  let whileEndsConsumed = 0;
  const openWhileHeads = (): number =>
    commands.filter(n => {
      const rec = n as { action?: string; body?: unknown[] };
      return rec.action === 'while' && (!Array.isArray(rec.body) || rec.body.length === 0);
    }).length - whileEndsConsumed;

  while (!tokens.isAtEnd()) {
    const current = tokens.peek();

    // Check for 'then' keyword - skip it and continue parsing
    if (current && isThenKeyword(current.value, language)) {
      flushClause();
      tokens.advance();
      continue;
    }

    // Check for 'end' keyword - terminates block. But an `end` keyword that is
    // the position NOUN of an `at end of` phrase (qu `… pi tukuy pa kurku ta
    // churay`, where `tukuy` = end) is not a block terminator — the same guard
    // parseBodyWithClauses applies, now mirrored on this fused-body path so a
    // make-event's trailing at-end put (make-toast) isn't chopped.
    //
    // bn's শেষ (`end` AND the positional `last`) is no curated end word; it closes
    // an open loop all the same, by the conditional fold's test — see the
    // matching note in parseBodyWithClauses.
    if (
      current &&
      openLoops() > 0 &&
      !isCuratedEndWord(current, language) &&
      closesBlockAt(tokens.tokens, tokens.position(), language)
    ) {
      flushClause();
      commands.push(LOOP_CLOSE);
      tokens.advance();
      continue;
    }
    if (current && isCuratedEndWord(current, language)) {
      const place = endWordPlace(tokens.tokens, tokens.position());
      if (!isAtEndOfNoun(current, place, language)) {
        flushClause();
        if (openLoops() > 0) {
          // This `end` closes an earlier loop head — mark it and keep walking.
          commands.push(LOOP_CLOSE);
          tokens.advance();
          continue;
        }
        if (openWhileHeads() > 0) {
          whileEndsConsumed++;
          tokens.advance();
          continue;
        }
        tokens.advance();
        break;
      }
    }

    // Fold a leading `if … end` block into a conditional, mirroring the
    // clause-boundary fold in parseBodyWithClauses. A fused SOV/VSO event
    // pattern captures the FIRST body command (`fetch`) as the action and
    // routes the trailing `then if it set $users to it end` here — but this
    // body walker only ran matchBest, where the schema-generated bare-`if`
    // pattern (`if-ja-generated-verb-first`) captures the if-keyword and
    // swallows the whole block as a flat `if` with NO condition and an empty
    // then-branch, silently dropping the block body (the verb-medial `set` of
    // fetch-do-not-throw — lossy across bn/hi/ja/ko/tr). The if-keyword itself
    // marks a sub-clause boundary, so flush any pending tokens first: in
    // hi/ko/tr a leaked `as` remnant (के रूप में / 로 / olarak) strands between
    // `then` and `if`, and without the flush skippedClauseTokens stays
    // non-empty (the flush recovers a real pending verb-medial command and
    // harmlessly discards non-command junk). Gated on `!clauseHadMatch` so a
    // juxtaposed `<cmd> if` mid-clause is untouched. tryParseConditionalBlock
    // folds `if` only and returns null without consuming when the head isn't a
    // usable conditional, so a non-`if` clause is byte-identical to before.
    // A `js(…) … end` block at a clause start is raw JavaScript, read whole, as
    // parseBodyWithClauses reads it. Without it a fused handler's tail ran the
    // generated `js` pattern, which took `(t)` as the value and left the body to the
    // command patterns: es `al clic registrar 1 entonces js (t) window.x = t fin` read
    // `window.x = t` as a `set` (bn/es/it/ko/pl/ru/th/tl/uk). Returns null without
    // consuming when no block starts here.
    if (current && !clauseHadMatch && skippedClauseTokens.length === 0) {
      const jsNode =
        consumeJsBlock(tokens, language, state.positionSource) ??
        consumeVerbFinalJsBlock(tokens, language, state.positionSource);
      if (jsNode) {
        commands.push(jsNode);
        clauseHadMatch = true;
        continue;
      }
    }

    if (
      current &&
      !clauseHadMatch &&
      isIfKeyword((current.normalized ?? current.value).toLowerCase(), language)
    ) {
      flushClause();
      const conditional = tryParseConditionalBlock(state, tokens, commandPatterns, language);
      if (conditional) {
        commands.push(conditional);
        clauseHadMatch = true;
        continue;
      }
    }

    // A loop's bottom test (`… hasta x es 3 fin`), as parseClause reads it.
    const bottom =
      skippedClauseTokens.length === 0 ? takeBottomUntil(state, tokens, commands, language) : null;
    if (bottom) {
      commands.push(bottom);
      clauseHadMatch = true;
      continue;
    }

    let matched = false;

    // Try grammar-transformed continuation patterns first
    // These patterns have command set to the actual command type (e.g., 'remove', 'toggle')
    if (grammarPatterns.length > 0) {
      const grammarMatch = patternMatcher.matchBest(tokens, grammarPatterns);
      if (grammarMatch) {
        // Use the pattern's command field as the action
        const actionName = grammarMatch.pattern.command;
        const roles: Record<string, SemanticValue> = {};

        // Copy relevant roles (excluding structural roles)
        for (const [role, value] of grammarMatch.captured) {
          if (role !== 'event' && role !== 'action' && role !== 'continues') {
            roles[role] = value;
          }
        }

        const commandNode = createCommandNode(actionName as ActionType, roles, {
          sourceLanguage: language,
          patternId: grammarMatch.pattern.id,
        });
        commands.push(commandNode);
        matched = true;
        clauseHadMatch = true;

        // Check if this pattern also has continuation
        const continuesValue = grammarMatch.captured.get('continues');
        if (
          continuesValue &&
          continuesValue.type === 'literal' &&
          continuesValue.value === 'then'
        ) {
          // Continue parsing for more commands
          continue;
        }
      }
    }

    // Try regular command patterns
    if (!matched) {
      const preMatch = tokens.mark();
      const commandMatch = patternMatcher.matchBest(tokens, commandPatterns);
      if (commandMatch) {
        // A schema-generated bare-`if` pattern (`if-tr-generated`,
        // `if-ja-generated-verb-first`, …) matches the if-keyword and yields a
        // flat `if` with no condition and an EMPTY then-branch — dropping the
        // block body (the verb-medial `set` of fetch-do-not-throw). It can even
        // swallow a leaked `as` remnant just ahead of the if (tr `olarak eğer`),
        // so the clause-head fold guard above never sees the if as the head.
        // Whenever matchBest yields a flat `if` here, rewind, skip any non-`if`
        // junk to the if-keyword, and fold the whole `if … end` block instead —
        // flushing first so a pending verb-medial command is recovered, not lost.
        // A folded `if` strictly dominates the bare one for recall (same `if`
        // action plus the recovered branch); if the block isn't foldable
        // (no `end`), restore the post-match position and keep the bare `if`.
        if ((commandMatch.pattern.command as string) === 'if') {
          const afterMatch = tokens.mark();
          tokens.reset(preMatch);
          while (!tokens.isAtEnd()) {
            const h = tokens.peek();
            if (!h || isIfKeyword((h.normalized ?? h.value).toLowerCase(), language)) break;
            tokens.advance();
          }
          const conditional = tryParseConditionalBlock(state, tokens, commandPatterns, language);
          if (conditional) {
            flushClause();
            commands.push(conditional);
            clauseHadMatch = true;
            continue;
          }
          tokens.reset(afterMatch);
        }
        const cmd = buildCommand(state, commandMatch, language);
        commands.push(cmd);
        // Reclaim a trailing post-verb source/destination phrase the matched
        // pattern left unconsumed (`remove .x from body` → `.x を 削除 ボディ から`,
        // `add .x to body` → `.x を 追加 ボディ に`); without this the SOV grammar
        // body walker skips the trailing `<value> <marker>` and the role stays
        // the `me` default. Same guard as the parseClause call site.
        tryAttachTrailingRole(tokens, cmd, language, state.boundIdentifiers);
        matched = true;
        clauseHadMatch = true;
      }
    }

    // Skip unrecognized token (collected for the per-clause SOV recovery)
    if (!matched) {
      if (current) skippedClauseTokens.push(current);
      tokens.advance();
    }
  }

  flushClause();

  // Stream remainder after the walk ended at a depth-0 `end` — the fused
  // path's sibling of the parseBodyWithClauses exit check.
  if (!tokens.isAtEnd()) {
    recordDroppedTokens(
      state,
      (tokens.tokens as LanguageToken[]).slice(tokens.position()),
      language,
      'fused body walk'
    );
  }

  // Drop phantom BARE `for` clauses — the parseBodyWithClauses guard,
  // mirrored on this fused-body path: a lone for-homonym token (bn `জন্য`,
  // both the for-keyword and a duration/benefactive postposition) orphaned
  // from its phrase anchors a `for` command node with ZERO roles and no
  // body (slide-toggle's then-clause `*max-height কে সংক্রমণ 300ms জন্য` —
  // spurious vs the en reference). Real for heads always carry roles or a
  // body; the loop-end-debt walk above has already finished, so a dropped
  // phantom can't desync it. Scoped to `for` ONLY (see the clause-path
  // guard: a bare `repeat` is a legitimate recovery intermediate).
  for (let i = commands.length - 1; i >= 0; i--) {
    const c = commands[i] as CommandSemanticNode & { body?: unknown[] };
    if (
      c.kind === 'command' &&
      c.action === 'for' &&
      (!(c.roles instanceof Map) || c.roles.size === 0) &&
      (!Array.isArray(c.body) || c.body.length === 0)
    ) {
      commands.splice(i, 1);
    }
  }

  return commands;
}

/**
 * Condition operators that join two operands inside an `if` condition
 * expression (`I match .x`, `me contains .y`, `#m exists`). An operator can
 * never begin a then-branch command, so the condition extraction must not
 * truncate AT one — but in SOV languages the then-branch verb is clause-final,
 * so a span like `match .disabled durdur` (tr) can spuriously match a verb-last
 * command pattern and break the condition at `match`, dropping the operator and
 * its right operand (tr if-matches; ja/ko/hi escape only because their halt
 * pattern happens not to match the equivalent span). Checked by the token's
 * normalized form too, so per-language `matches` keywords (ko 일치 → `matches`)
 * are covered; the corpus also leaks these as English across every language.
 */
export const CONDITION_OPERATORS = new Set([
  'matches',
  'match',
  'contains',
  'exists',
  'has',
  'have',
  'equals',
  'includes',
]);

/**
 * Parse a leading `if`/`unless` conditional block from the stream into a
 * ConditionalSemanticNode, consuming the whole block (condition + then/else
 * branches, up to the matching `end` or the stream end). Returns null WITHOUT
 * consuming when the head token is not an `if`/`unless` keyword or no condition
 * is present, so the caller falls through unchanged.
 *
 * Word-order scope: this matches the English-style `if <cond> [then] <body>
 * [else <body>] [end]` order (the §2 dominant cluster, which manifests in
 * English itself). SOV/VSO transforms place the condition/branches differently;
 * those clauses don't start with a bare `if`/`unless` keyword here, so they fall
 * through to the existing per-clause path untouched.
 */
/**
 * Parse a LEADING `unless` guard, reusing the conditional block's condition
 * splitter but emitting the FLAT `[unless(condition), …body]` shape.
 *
 * WHY THIS EXISTS. `unless` is deliberately never folded into a conditional
 * node (that would relabel its action `unless`→`if` and desync the
 * cross-language action-set comparison), so it always fell to the flat
 * `unless {condition}` command pattern — whose role capture takes ONE value
 * and stops. The en REFERENCE therefore truncated its own condition:
 *
 *   unless I match .disabled toggle .selected
 *     -> condition: expression "I"        <- `match .disabled` silently gone
 *
 * That is a correctness bug in English before it is a fidelity one: the guard
 * the runtime evaluates is not the guard the author wrote. It also poisons
 * every multilingual signal, because all 24 languages are scored against this
 * reference — a translation "matches" by reproducing the truncation.
 *
 * The block path already splits a condition correctly (operator-aware,
 * copula-guarded, SOV verb-medial aware), so this reuses it verbatim and then
 * FLATTENS: the conditional's condition becomes the guard's, and its
 * then-branch becomes the guard's following siblings. Action set is unchanged
 * (`unless` + the body commands, exactly as before); only the condition value
 * gains the rest of the expression.
 *
 * Declines — leaving the previous flat parse untouched — when the block form
 * carries an `else`, which the flat shape cannot represent faithfully.
 */
export function tryParseUnlessGuard(
  state: ParserState,
  tokens: ReturnType<typeof tokenizeInternal>,
  commandPatterns: LanguagePattern[],
  language: string
): SemanticNode[] | null {
  const head = tokens.peek();
  if (!head) return null;
  if (!isUnlessKeyword((head.normalized ?? head.value).toLowerCase(), language)) return null;

  const mark = tokens.mark();
  const folded = tryParseConditionalBlock(state, tokens, commandPatterns, language, true);
  if (!folded || folded.kind !== 'conditional') {
    tokens.reset(mark);
    return null;
  }
  const conditional = folded as ConditionalSemanticNode;
  // An else-branch has no flat equivalent; keep the old parse rather than
  // invent one.
  if (conditional.elseBranch && conditional.elseBranch.length > 0) {
    tokens.reset(mark);
    return null;
  }
  const condition = conditional.roles.get('condition');
  if (!condition) {
    tokens.reset(mark);
    return null;
  }
  const guard = createCommandNode(
    'unless' as ActionType,
    { condition },
    {
      sourceLanguage: language,
      patternId: `unless-${language}-guard`,
      confidence: 1,
    }
  );
  return [guard, ...conditional.thenBranch];
}

export function tryParseConditionalBlock(
  state: ParserState,
  tokens: ReturnType<typeof tokenizeInternal>,
  commandPatterns: LanguagePattern[],
  language: string,
  // Set only by tryParseUnlessGuard, which flattens the result back to the
  // `unless` action rather than emitting a conditional node — see there.
  allowUnless = false
): SemanticNode | null {
  const head = tokens.peek();
  if (!head) return null;
  const headVal = (head.normalized ?? head.value).toLowerCase();
  // Fold `if` only. `unless` is deliberately left on its existing flat parse:
  // a conditional node is always action `if`, so folding `unless` would relabel
  // its action from `unless` to `if` and desync the cross-language action-set
  // comparison (every language that still emits `unless` would read as having
  // dropped the conditional). Folding `if` keeps the same `if` action the flat
  // parse already produced, so no action set changes — only the nesting and the
  // (previously truncated) condition do.
  if (!isIfKeyword(headVal, language) && !(allowUnless && isUnlessKeyword(headVal, language))) {
    return null;
  }

  const startMark = tokens.mark();
  // Speculative: a failed fold rewinds the stream, so any coverage records
  // its branch parses made describe a parse that never happened.
  const foldCoverageMark = coverageMark(state);
  tokens.advance(); // consume if/unless
  // The block's tokens stand in the stream from here on: where an end word
  // stands (endWordPlace) is read there, the `if` before the first included.
  const all = tokens.tokens;
  const blockStart = tokens.position();

  // Collect the whole block from the stream: every token up to the matching
  // depth-0 `end` (or the stream end). A nested block opener (see
  // opensNestedBlock) raises the depth; a nested `end` lowers it — so an inner
  // conditional's or loop's `end` never terminates the outer block.
  const blockTokens: LanguageToken[] = [];
  let depth = 0;
  let closed = false;
  while (!tokens.isAtEnd()) {
    const t = tokens.peek();
    if (!t) break;
    // The condition's first word opens nothing: `if if` is never a nested
    // block, so es `si si …` (if si) names a variable spelled like `if`.
    if (
      blockTokens.length > 0 &&
      opensNestedBlock(t, wordBefore(blockTokens, blockTokens.length), language)
    ) {
      depth++;
      blockTokens.push(t);
      tokens.advance();
      continue;
    }
    if (closesBlockAt(tokens.tokens, tokens.position(), language)) {
      if (depth === 0) {
        tokens.advance(); // consume the terminating `end`
        closed = true;
        break;
      }
      depth--;
      blockTokens.push(t);
      tokens.advance();
      continue;
    }
    blockTokens.push(t);
    tokens.advance();
  }

  if (blockTokens.length === 0) {
    tokens.reset(startMark);
    coverageRollback(state, foldCoverageMark);
    return null;
  }

  // Split blockTokens into condition / then-branch / else-branch. The condition
  // ends at the first depth-0 `then` keyword, or at the first depth-0 token that
  // begins a command (copula-guarded). then/else are split at depth-0 `else`.
  // For SOV, also recognise a verb-medial command head (matchBest can't — A2a).
  const sovProfile = tryGetProfile(language);
  const sovVerbLookup = sovProfile?.wordOrder === 'SOV' ? buildVerbLookup(sovProfile) : null;
  let i = 0;
  let bodyDepth = 0;
  const condTokens: LanguageToken[] = [];
  let sawThen = false;
  for (; i < blockTokens.length; i++) {
    const t = blockTokens[i];
    const tv = (t.normalized ?? t.value).toLowerCase();
    // Conditionals only: a loop head here STARTS the then-branch, so it must
    // stay visible to the command-start test below.
    if (i > 0 && (isIfKeyword(tv, language) || isUnlessKeyword(tv, language))) {
      bodyDepth++;
    } else if (closesBlockAt(all, blockStart + i, language)) bodyDepth--;
    if (bodyDepth === 0 && isThenAt(t, endWordPlace(all, blockStart + i), language)) {
      sawThen = true;
      i++; // skip the `then`
      break;
    }
    // An empty then-branch: the condition ends at its `else` (`if x else …`).
    // Read on, the condition took in the else branch whole.
    if (bodyDepth === 0 && condTokens.length > 0 && isElseKeyword(t.value, language)) break;
    if (bodyDepth === 0 && condTokens.length > 0) {
      const cur = (t.normalized ?? t.value).toLowerCase();
      // Does a copula before this word keep it in the condition (S2, S3)?
      const prevIsCopula = copulaHoldsCondition(
        blockTokens[i - 1],
        t,
        condTokens.length === 1,
        language
      );
      // A condition operator (`match`/`contains`/`exists`/…) is part of the
      // expression, never a then-branch command head — don't truncate at it
      // even if a verb-last SOV command pattern spuriously matches the span.
      //
      // Copula guard: normally don't truncate right AFTER a copula (`is`/`be`/…),
      // because the next token is the predicate (`X is empty …` → don't split at
      // `empty`). But the SOV transform can split a verb-final `is empty` predicate
      // so a then-branch command VERB lands DIRECTLY after the copula
      // (ko `… 내 값 이다 추가 .error 를 … 비어있는 …` = my value IS add .error … empty):
      // the guard then swallows `add` into the condition and drops it
      // (if-empty/input-validation ko, fid 0.75). ja/bn USED to escape only because
      // their copula wasn't lexed as a single `is` token; since the copula slice
      // registered ja である / bn হয় as `is` keywords that escape is gone, and they
      // now rely on the same curIsSovCommandVerb exception ko does (verified: both
      // still render `if my value is <predicate> add .error …`, verb not swallowed).
      // Allow the split after a copula when a real SOV command-VERB keyword opens
      // here — gated to SOV (verb lookup present) and an actual verb-lookup hit, so
      // SVO `X is empty <cmd>` (a predicate, not a verb, after the copula) is
      // byte-identical to before. EXCEPT when the verb-lookup hit is itself a
      // condition PREDICATE word (hi खाली / tr boş → `null`, bn খালি →
      // `empty` — each doubles as the language's empty/null COMMAND verb):
      // with the transformer's predicate-adjective guard the renders now keep
      // `<copula> <predicate>` adjacent inside the condition, and the verb
      // exception would re-split there — re-minting the spurious `empty`
      // command this whole guard exists to prevent (empty ×8 bn/hi/tr, incl.
      // the behavior-sortable `if item is null` shape). A REAL then-branch
      // verb after a copula (the ko displaced shape this exception was built
      // for) never normalizes to a predicate word, so ko is untouched.
      const curIsSovCommandVerb =
        sovVerbLookup !== null &&
        sovVerbLookup.has(t.value.toLowerCase()) &&
        !CONDITION_PREDICATES.has(cur);
      // A `.member` selector glued to the previous token (no source gap) is a
      // member-access continuation of the condition (bn `এর.error`), never a
      // command head — the SOV verb-final checker would otherwise fire here
      // and strand the member (`if এর` + unconsumed `.error`). An SOV
      // then-branch patient (`.error কে যোগ …`) is authored with a space, so
      // adjacency is the exact discriminator — the same rule the expression
      // joiner's `.`-glue uses.
      const gluedDotMember =
        /^\.[a-zA-Z_]\w*$/.test(t.value) &&
        blockTokens[i - 1].position?.end !== undefined &&
        t.position?.start !== undefined &&
        blockTokens[i - 1].position.end === t.position.start;
      if (
        !CONDITION_OPERATORS.has(cur) &&
        !gluedDotMember &&
        (!prevIsCopula || curIsSovCommandVerb) &&
        (tokensBeginCommand(blockTokens.slice(i), commandPatterns, language) ||
          sovCommandStartsAt(blockTokens.slice(i), sovVerbLookup))
      ) {
        break; // this token starts the then-branch
      }
    }
    condTokens.push(t);
  }

  if (condTokens.length === 0) {
    tokens.reset(startMark);
    coverageRollback(state, foldCoverageMark);
    return null;
  }

  // Partition the remaining tokens into then- / else-branch at the depth-0 else.
  const thenTokens: LanguageToken[] = [];
  const elseTokens: LanguageToken[] = [];
  let inElse = false;
  let branchDepth = 0;
  for (; i < blockTokens.length; i++) {
    const t = blockTokens[i];
    if (opensNestedBlock(t, wordBefore(blockTokens, i), language)) branchDepth++;
    else if (closesBlockAt(all, blockStart + i, language)) branchDepth--;
    if (branchDepth === 0 && !inElse && isElseKeyword(t.value, language)) {
      inElse = true;
      continue; // skip the `else`
    }
    (inElse ? elseTokens : thenTokens).push(t);
  }

  const conditionValue = {
    type: 'expression' as const,
    raw: joinTokenText(condTokens, language),
  };

  const thenBranch = parseBranch(state, thenTokens, commandPatterns, language);
  const elseBranch =
    elseTokens.length > 0 ? parseBranch(state, elseTokens, commandPatterns, language) : undefined;

  // Nothing parsed in either branch — not a usable conditional; fall through so
  // the existing per-clause path can try (e.g. a stray `if` token). Unless the
  // block is empty as written, `if x then end`: read flat, it lost its `end`,
  // and the commands after it fell into its body.
  const writtenEmpty = closed && sawThen && thenTokens.length === 0 && elseTokens.length === 0;
  if (thenBranch.length === 0 && (!elseBranch || elseBranch.length === 0) && !writtenEmpty) {
    tokens.reset(startMark);
    coverageRollback(state, foldCoverageMark);
    return null;
  }

  return createConditionalNode(conditionValue, thenBranch, elseBranch, {
    sourceLanguage: language,
    patternId: `conditional-${language}-folded`,
    confidence: 1,
  });
}

/**
 * Parse a conditional branch's tokens into a flat list of statements. Reuses
 * `parseBodyWithClauses` (so then-chains, juxtaposed commands, and nested
 * conditionals inside the branch all work), then unwraps a single top-level
 * compound into its statements so the branch array is flat.
 */
export function parseBranch(
  state: ParserState,
  toks: LanguageToken[],
  commandPatterns: LanguagePattern[],
  language: string
): SemanticNode[] {
  if (toks.length === 0) return [];
  const stream = new TokenStreamImpl(toks, language);
  const parsed = parseBodyWithClauses(state, stream, commandPatterns, language);
  if (parsed.length === 1 && parsed[0]?.kind === 'compound') {
    return (parsed[0] as CompoundSemanticNode).statements;
  }
  return parsed;
}
