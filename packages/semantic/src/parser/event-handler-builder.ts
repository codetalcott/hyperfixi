/**
 * An event handler built from its matched head: the event, its source and
 * modifiers, and its body read clause by clause.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type {
  SemanticNode,
  CommandSemanticNode,
  CompoundSemanticNode,
  EventHandlerSemanticNode,
  SemanticValue,
  SemanticRole,
  ActionType,
  LanguageToken,
} from '../types';
import { createCommandNode, createEventHandler, createCompoundNode } from '../types';
import { tokenize as tokenizeInternal, TokenStreamImpl } from '../tokenizers';
import { getPatternsForLanguage, tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { ROLE_MARKER_CONCEPTS } from './utils/marker-resolution';
import { patternMatcher } from './pattern-matcher';
import { isIfKeyword, isThenKeyword } from './clause-keywords';
import { closesBlockAt, endsClauseAt, endWordPlace, isCuratedEndWord, isThenAt } from './end-words';
import { type ParserState } from './parser-state';
import { RESPONSE_TYPE_WORDS } from './response-type-words';
import { eventNameTranslations } from '../patterns/event-handler';
import { KNOWN_EVENTS, WAITABLE_EVENT_WORDS } from './event-words';
import {
  tryAttachNewWindow,
  tryAttachTrailingExpressionRole,
  tryAttachTrailingRole,
  tryAttachTrailingStyle,
} from './trailing-roles';
import { LOOP_CLOSE, type WalkEntry } from './loop-heads';
import { consumeForPostposition } from './sov-clause';
import { extractOrConjunctionEvents } from './event-heads';
import {
  coverageMark,
  coverageRollback,
  recordDroppedTokens,
  registerBoundIdentifiers,
} from './coverage';
import { foldLoopBlocks } from './loop-walk';
import { isElseIfChain, takeHeadClause } from './clause-heads';
import {
  openLoopCount,
  parseBodyWithClauses,
  parseBodyWithGrammarPatterns,
  parseClause,
  wordBefore,
} from './clause-walk';

/**
 * Block-introducing command actions: their tokens are a condition/clause plus a
 * branch body, not a flat argument list. When a fused event pattern captures one
 * of these as the handler action, the trailing body must be parsed separately
 * (see `buildEventHandler`).
 */
export const BLOCK_BODY_ACTIONS = new Set(['if', 'unless', 'while', 'repeat', 'for']);

/** Two role values that read the same: the same type and the same surface. */
export function sameSemanticValue(a: SemanticValue, b: SemanticValue): boolean {
  const surface = (v: SemanticValue): unknown => {
    const { position: _position, ...rest } = v as SemanticValue & { position?: unknown };
    return JSON.stringify(rest);
  };
  return a.type === b.type && surface(a) === surface(b);
}

/**
 * The repeat HEAD patterns: each stops before the loop body (see
 * patterns/repeat.ts), so a fused handler's re-parse can swap one in without
 * swallowing a body command. The until-condition head joined late (PR 123):
 * without it a fused `al {event} ripetere {loopType}` took the language's own
 * `until` word alone for the loop's form (it `ripetere fino x > 3`), and the
 * loop lost its condition, while its `while` twin was swapped in.
 */
export const HEAD_ONLY_REPEAT =
  /^repeat-.*-(times|for-in|while-head|until-head|until-condition-head)$/;

/**
 * Build an event handler semantic node from a pattern match.
 */
export function buildEventHandler(
  state: ParserState,
  match: ReturnType<typeof patternMatcher.matchPattern>,
  tokens: ReturnType<typeof tokenizeInternal>,
  language: string
): EventHandlerSemanticNode {
  if (!match) {
    throw new Error('No match to build event handler from');
  }

  // Extract the event name
  let eventValue = match.captured.get('event');
  if (!eventValue) {
    throw new Error('Event handler pattern matched but no event captured');
  }

  // Canonicalize a native-word event capture. The fused *-sov-simple patterns
  // bind the {event} token AS TOKENIZED, so a native event word registered
  // only in eventNameTranslations (ja サイズ変更, ko 리사이즈, bn রিসাইজ) —
  // not as a tokenizer keyword — lands raw and expression-typed, while the
  // SOV-extraction path resolves it to the English literal. Which path ran
  // was decided by junk ahead of the clause (the `debounced at 300ms` head),
  // so the typing was path-incidental (window-resize R1). Gate to an exact
  // table hit (→ English literal, the handler convention) or a bare
  // KNOWN_EVENTS word typed expression (→ literal, same word); a genuine
  // reactive/expression head (`my value`, parenthesized params) matches
  // neither and is byte-identical.
  {
    const word =
      eventValue.type === 'expression'
        ? (eventValue as { raw?: unknown }).raw
        : eventValue.type === 'literal'
          ? eventValue.value
          : undefined;
    if (typeof word === 'string' && /^[^\s()[\]{}:]+$/.test(word)) {
      const english = eventNameTranslations[language]?.[word];
      if (english) {
        eventValue = { type: 'literal', value: english, dataType: 'string' };
      } else if (eventValue.type === 'expression' && KNOWN_EVENTS.has(word.toLowerCase())) {
        eventValue = { type: 'literal', value: word.toLowerCase(), dataType: 'string' };
      }
    }
  }

  // Extract event modifiers (.once, .debounce(), .throttle(), etc.)
  let eventModifiers = patternMatcher.extractEventModifiers(tokens);

  // Thread a pattern-extracted `source` role into eventModifiers.from. The
  // source-shaped patterns (`on resize from window …`, event-en-source)
  // consumed the from-clause tokens but the captured value was dropped on
  // the floor when the node was built — an en-symmetric SILENT loss (no
  // unconsumed-input firing, so even the coverage meter never saw it).
  // eventModifiers.from is the field the dot-syntax path and the AST
  // builder already declare for exactly this meaning; until now nothing
  // ever populated it.
  // Gated to patterns whose id declares a handler-head source group
  // (event-en-source and kin — all of them END in `-source`): the fused
  // generated patterns also bind a `source` group — as a DEFAULT-filled
  // reference `me`, or worse, by swallowing a BODY command's from-phrase
  // (`remove .active from all .tab` → source=.tab) — and threading those
  // turns a formerly-harmless dropped mis-capture into a live delegation
  // filter (the tabs-basic / tabs-content / remove-class-from-all R2
  // regression, 59 curated rows, caught by the execution ratchet mid-arc;
  // then again via `-sov-source-fronted`, whose mid-id `source` satisfied
  // the old includes() check and delegated qu's tabs handlers to `.tab` —
  // that source is the BODY command's, hence endsWith). Translated
  // window-resize renders get their from via reclaimDanglingFromTail
  // instead, which never routes through here.
  //
  // Widened 2026-09-23 (event-source round trip): the `-source` id gate also
  // discarded the two captures that ARE the handler's by construction —
  // (a) the marker-explicit source-clause consumer (`match.sourceClause`:
  // `al clic de #btn …`, `クリック を #btn から で …`), which then LEAKED into
  // the fused body command as a phantom `source` role, and (b) the generated
  // handler-head patterns' own source group (`on-ja-generated` `[{source}
  // から] {event} を で`, `on-ar-generated` `على {event} [من {source}]`), whose
  // ids start with `on-`/`event-` and contain no command that could own the
  // slot. The `<cmd>-event-…` fused patterns keep the old gate: their slot is
  // the body command's `from`. A default-filled `me` is still not a source.
  const notMe = (v: SemanticValue): boolean =>
    !(v.type === 'reference' && v.value === 'me') &&
    (v as { implicit?: unknown }).implicit !== true;
  const sourceValue = match.captured.get('source');
  const pureHandlerPattern =
    match.pattern.command === 'on' && /^(on|event)-/.test(match.pattern.id);
  let sourceThreaded = false;
  if (
    sourceValue &&
    (match.pattern.id.endsWith('source') || pureHandlerPattern) &&
    notMe(sourceValue)
  ) {
    eventModifiers = { ...(eventModifiers ?? {}), from: sourceValue };
    sourceThreaded = true;
  }
  // A head-position source the matcher found beside the event. In a
  // prepositional language it can only be the handler's (`al clic de #btn
  // quitar …` — a body command's from-phrase follows its verb). In a
  // postpositional one the renderer FRONTS the handler's source (`#btn から
  // クリック …`), so a phrase after the event marker is the fused body
  // command's own — when that command has a `source` role and its pattern
  // captured none (`クリック で .tab から .active を 削除`, the tabs rows).
  let bodySourceFromHead: SemanticValue | undefined;
  if (match.eventSource && !sourceThreaded) {
    const fusedAction = match.captured.get('action');
    const schema =
      fusedAction?.type === 'literal'
        ? getSchema(String(fusedAction.value) as ActionType)
        : undefined;
    const postpositional = tryGetProfile(language)?.roleMarkers?.source?.position === 'after';
    if (
      postpositional &&
      schema?.roles.some(r => r.role === 'source') &&
      !match.captured.has('source')
    ) {
      bodySourceFromHead = match.eventSource;
    } else if (notMe(match.eventSource)) {
      eventModifiers = { ...(eventModifiers ?? {}), from: match.eventSource };
    }
  }

  // Extract "or" conjunction events (e.g., "click or keydown"), kept as the
  // handler's `additionalEvents`, as parseInternal's or-lift keeps a known one.
  // They were joined into the event string (`click or foo`) when the event was a
  // literal and DROPPED when it was not (`on foo or bar` read as `on foo`), and the
  // renderer, which writes `additionalEvents` in each language's or-word, wrote the
  // joined string's English `or`.
  // Only directly after the event: a fused pattern can stop inside what
  // follows it (ms `apabila click jika r atau q`, whose `if-event-ms-vso`
  // takes one token of the condition), and the condition's `atau q` became
  // a second event, `click or q`. The span is the capture's: a translated
  // event name (pt `clique`) was re-created above without one.
  const eventSpan = match.captured.get('event')?.position;
  const lastConsumed = tokens.tokens[tokens.position() - 1];
  const pastEvent =
    eventSpan !== undefined &&
    lastConsumed !== undefined &&
    lastConsumed.position.end > eventSpan.end;
  const additionalEvents = pastEvent ? [] : extractOrConjunctionEvents(tokens, language);
  const resolvedEventValue = eventValue;
  const withAdditionalEvents = <T extends EventHandlerSemanticNode>(handler: T): T =>
    additionalEvents.length > 0 ? { ...handler, additionalEvents } : handler;

  let body: SemanticNode[];
  let headClause: string | undefined;

  // Check if pattern captured an action (grammar-transformed patterns)
  // These patterns combine event + action in a single match
  const actionValue = match.captured.get('action');

  // A fused event pattern that captured `if` as the body's first action has
  // swallowed the conditional KEYWORD into a flat command — the condition
  // truncates to whatever role the pattern grabbed and the branches flatten
  // into siblings (the §2 cluster, cross-language: en folds via
  // parseBodyWithClauses → tryParseConditionalBlock, but this action-captured
  // path never reached the fold). Rewind to the if-keyword token and parse the
  // remaining body through the clause path so the whole block folds. Swap in
  // ONLY when a conditional actually folded — otherwise fall through to the
  // existing flat path byte-identical. `unless` stays unfolded (see
  // tryParseConditionalBlock: folding would relabel its action and desync the
  // cross-language action-set comparison).
  if (actionValue && actionValue.type === 'literal' && actionValue.value === 'if') {
    const all = tokens.tokens as LanguageToken[];
    let ifIdx = -1;
    for (let k = tokens.position() - 1; k >= 0; k--) {
      const kTok = all[k] as { normalized?: string; value: string };
      const kv = (kTok.normalized ?? kTok.value).toLowerCase();
      if (isIfKeyword(kv, language)) {
        ifIdx = k;
        break;
      }
    }
    // Of two `if` words in a row the first is the head, and the second the
    // variable its condition names (es `si si …`, if si), which the fused
    // pattern may have consumed too.
    while (ifIdx > 0) {
      const before = all[ifIdx - 1]!;
      if (!isIfKeyword((before.normalized ?? before.value).toLowerCase(), language)) break;
      ifIdx--;
    }
    if (ifIdx >= 0) {
      const commandPatterns = getPatternsForLanguage(language)
        .filter(p => p.command !== 'on')
        .sort((a, b) => b.priority - a.priority);
      // Verb-first fused patterns put the event AFTER the `if` keyword, so the
      // fold slice still contains the already-captured event head — the
      // re-parse swallows it into the conditional and the handler's event
      // renders TWICE (`on keydown[..] if event.ctrlKey on keydown [..] halt`,
      // window-keydown ar/tl). Excise the on-marker + event token (+ the
      // following `[filter]` selector — the captured event value carries the
      // filter, the stream splits it off) before folding. The marker is
      // REQUIRED so a body-text occurrence of the event word is never excised;
      // event-first shapes (behavior-removable/sortable) put the event BEFORE
      // ifIdx, so the search misses and the slice is byte-identical.
      let foldTokens = all.slice(ifIdx);
      if (match.pattern.id.endsWith('vso-verb-first') && resolvedEventValue.type === 'literal') {
        const eventHead = String(resolvedEventValue.value ?? '')
          .split('[')[0]
          .trim()
          .toLowerCase();
        const evIdx = foldTokens.findIndex((t, k) => {
          if (k === 0 || eventHead === '') return false;
          const tv = ((t as { normalized?: string }).normalized ?? t.value).toLowerCase();
          const prev = foldTokens[k - 1] as { kind?: string; normalized?: string };
          return (
            tv === eventHead &&
            prev.kind === 'keyword' &&
            (prev.normalized ?? '').toLowerCase() === 'on'
          );
        });
        if (evIdx > 0) {
          const filter = foldTokens[evIdx + 1];
          const filterLen =
            filter && filter.kind === 'selector' && filter.value.startsWith('[') ? 1 : 0;
          foldTokens = [
            ...foldTokens.slice(0, evIdx - 1),
            ...foldTokens.slice(evIdx + 1 + filterLen),
          ];
        }
      }
      const bodyStream = new TokenStreamImpl(foldTokens, language);
      const foldCoverageMark = coverageMark(state);
      const folded = parseBodyWithClauses(state, bodyStream, commandPatterns, language);
      // A conditional folded if it sits at the top level (body is the single
      // `if` block) OR nested inside the single `compound` wrapper that
      // parseBodyWithClauses returns whenever the body has >1 clause
      // (`if confirmRemoval … end trigger … remove me`). The original guard only
      // checked the top level, so a multi-statement handler body — exactly the
      // removable/sortable shape — fell through to the flat path below, which
      // captures `if` as a bare command and then drops every command after the
      // SECOND `end` (`trigger removable:removed`, `remove me`). Looking inside
      // the compound lets the whole faithful body (the conditional + its trailing
      // siblings) survive, matching the English `parseBodyWithClauses` result.
      const foldedConditional =
        folded.some(n => n.kind === 'conditional') ||
        (folded.length === 1 &&
          folded[0]?.kind === 'compound' &&
          (folded[0] as CompoundSemanticNode).statements.some(s => s.kind === 'conditional'));
      if (foldedConditional) {
        while (!tokens.isAtEnd()) tokens.advance(); // body fully consumed by the fold
        return withAdditionalEvents(
          createEventHandler(resolvedEventValue, folded, eventModifiers, {
            sourceLanguage: language,
            patternId: match.pattern.id,
            confidence: match.confidence,
          })
        );
      }
      // Fold discarded — its coverage records describe a parse that never
      // happened; the flat path below does its own accounting.
      coverageRollback(state, foldCoverageMark);
    }
  }

  // `js` never takes this path. Its one role is not a value but an opaque span
  // of raw JavaScript running to the block's `end`, so building the command
  // from CAPTURED roles hands the body to the pattern matcher, which tokenizes
  // and re-spaces it (`console.log("x")` → `console .log ( "x" )`). Falling
  // through to the flat path rewinds to the action's own start and re-parses
  // through `parseBodyWithClauses`, whose `consumeJsBlock` claims the span
  // whole. bn was the language where it showed — `ক্লিক তে জেএস …` is the one
  // handler head whose `{action}` slot lands exactly on the js verb.
  if (
    actionValue &&
    actionValue.type === 'literal' &&
    String(actionValue.value) !== 'js' &&
    getSchema(String(actionValue.value) as ActionType) !== undefined
  ) {
    // Create a command node directly from captured roles
    const actionName = actionValue.value as string;
    const roles: Record<string, SemanticValue> = {};

    // Copy relevant roles (excluding event, action, and continues which are
    // structural, and a `source` already threaded to the handler's
    // eventModifiers.from — it is the handler's, not this command's).
    for (const [role, value] of match.captured) {
      if (role !== 'event' && role !== 'action' && role !== 'continues') {
        if (role === 'source' && sourceThreaded) continue;
        roles[role] = value;
      }
    }
    if (bodySourceFromHead) roles.source = bodySourceFromHead;

    // SOV repeat: recover a dropped `forever` loop keyword. The verb-first SOV
    // loop head is `{repeat-verb} forever <body>` (ja `繰り返し forever .pulse を
    // 切り替え`), but the fused SOV event pattern captures only the verb and
    // leaves `forever` unconsumed — so the loop defaults to `loopType:reference=me`
    // (the dropped-keyword residue) and the body parser later SKIPS the stray
    // `forever`. The keyword sits immediately after the verb (at the current
    // position); recognize it (en `forever` / native hi हमेशा / bn চিরকাল, all
    // normalized to `forever`), set `loopType:literal="forever"` to match the en
    // reference, and consume it so it can't leak. The body (toggle/wait) is still
    // recovered by the trailing-body path below.
    if (actionName === 'repeat') {
      const peeked = tokens.peek();
      const norm = (t: LanguageToken): string =>
        ((t as { normalized?: string }).normalized ?? t.value).toLowerCase();
      if (peeked && peeked.kind === 'keyword' && norm(peeked) === 'forever') {
        roles.loopType = { type: 'literal', value: 'forever' };
        // Drop the SOV default-patient leak (`reference:me`): repeat has no patient
        // role, so `normalizeCommandRoles` would normally relabel it to the
        // primaryRole `loopType` — but with loopType now set it would instead
        // surface as a phantom `patient:reference=me` that the en reference lacks
        // (a precision hit). en repeat-forever is `{loopType:literal="forever"}` only.
        delete roles.patient;
        tokens.advance();
      } else if (peeked && peeked.kind === 'keyword' && norm(peeked) === 'event') {
        // SOV repeat-UNTIL-event: `{repeat-verb} {event-kw} {event} {obj-marker}
        // {until-marker} <body>` (ja `繰り返し イベント マウス解放 を まで …`). The
        // fused SOV pattern leaves the event-kw..until span unconsumed, so the loop
        // defaults to loopType:reference=me AND the span breaks into phantom
        // `event`/`until` body commands. Recover: capture the event token after the
        // event-kw as event:literal, set loopType:literal="until-event" (matching
        // the en reference), drop the SOV default-patient leak, and CONSUME the span
        // to the clause boundary (then/end/EOF) so the phantoms can't form. The body
        // (increment/wait, after the boundary) is still recovered by the trailing path.
        tokens.advance(); // consume the event-kw
        const evTok = tokens.peek();
        if (evTok) {
          roles.event = { type: 'literal', value: norm(evTok) };
          roles.loopType = { type: 'literal', value: 'until-event' };
          delete roles.patient;
          while (!tokens.isAtEnd()) {
            const t = tokens.peek();
            if (!t || endsClauseAt(tokens.tokens, tokens.position(), language)) {
              break;
            }
            tokens.advance();
          }
        }
      }
      // Drop the SOV default-patient leak for ANY remaining repeat variant
      // (the forever/until branches above already delete it on their paths).
      // The fused SOV event pattern defaults `patient:reference=me`, but
      // repeat has no patient role — left in place it (a) surfaces as a
      // phantom `loopType:reference=me` via normalizeCommandRoles (a
      // precision hit the en reference never has), and (b) blocks the
      // fused re-parse swap below for the `for-in` HEAD: the superset guard
      // maps fused `patient`→`loopType` and the re-parse's
      // `loopType:literal="for"` can't type-match `reference`. Gated on the
      // exact default value so a REAL fused capture (`-times`' fronted
      // count under `patient`) is never touched.
      const leak = roles.patient as { type?: string; value?: unknown } | undefined;
      if (leak && leak.type === 'reference' && leak.value === 'me') {
        delete roles.patient;
      }
    }

    let commandNode = createCommandNode(actionName as ActionType, roles, {
      sourceLanguage: language,
      patternId: match.pattern.id,
      confidence: match.confidence,
    });
    registerBoundIdentifiers(state, commandNode);
    // Body commands recovered by the head-only re-parse below, which sees the
    // whole clause and so parses the loop body along with the head. Spliced in
    // after `commandNode` wherever the body is assembled.
    let reparsedTail: SemanticNode[] = [];

    // A fused event pattern captures the wrapped command's VERB + (at most) its
    // PRIMARY arg, leaving every SECONDARY role clause unconsumed: `su {event}
    // {action}` keeps only the verb (ZERO roles, args trail); `{event} {verb}
    // {source}` (fetch-event-<lang>-vso) keeps `source` but DROPS the `as
    // {responseType}` / `via {method}` tail. The en reference re-parses the same
    // clause through the command patterns and captures everything — so an
    // event-handler BODY silently loses roles a STANDALONE parse of the identical
    // clause keeps (the fused-body R1 residue: fetch.responseType ×63, …). Retry:
    // re-parse [verb..clause boundary] and swap in the result whenever it is the
    // SAME single command with STRICTLY MORE roles than the fused capture.
    //
    // The VERB is found by scanning BACK from the consumed region for the token
    // whose normalized form is the captured action — verb-LAST patterns put it at
    // pos-1, verb-MEDIAL ones (fetch: `… buscar /api/user`, source already
    // consumed between the verb and pos) put it earlier. The original code only
    // checked pos-1, so verb-medial fused captures never re-parsed. ">" (not
    // "> 0") subsumes the zero-role case AND the partial-capture case while never
    // REDUCING a node — a complete fused capture (re-parse ≤ fused) and a body
    // whose standalone pattern is missing (0 roles, not more) are left untouched.
    //
    // EXCLUDES block-body actions (`repeat`/`if`/`for`/`while`/`unless`): their
    // loop/conditional BODY sits in the SAME clause (no `then` before it —
    // `repeat forever toggle .pulse then …`), so re-parsing [verb..boundary] would
    // swallow the body command into the block node and DROP it (regressed
    // repeat-forever in 17 langs). Their bodies are recovered by the dedicated
    // block paths (parseBodyWithClauses fold / hasBlockBody trailing re-parse).
    //
    // VERB-FIRST fused patterns (`…-vso-verb-first`, ar) put the event head
    // BETWEEN the verb and the tail (`احضر /api/user عند نقر كـjson` =
    // `fetch /api/user on click as-json`), so the [verb..boundary] slice
    // RE-INCLUDES `عند نقر` and the standalone re-parse drops everything after it.
    // #530 therefore skipped them. Instead we EXCISE the event head (the event
    // token — located by its captured normalized value — plus an immediately
    // preceding `on`-marker keyword) from the clause before re-parsing; the
    // standalone `fetch-ar` pattern then recovers the `كـ {responseType}` tail.
    // If the event token can't be located in the clause, the swap is skipped
    // (re-parsing with the event still inside is the #530 hazard).
    // Block-body actions (`repeat`/`if`/`for`/`while`/`unless`) are normally NOT
    // re-parsed: their inline body sits in the SAME clause, so re-parsing
    // [verb..boundary] would swallow it (#530's repeat-forever regression). The
    // ONE exception is a counted-loop HEAD (`repeat {n} times`): it is HEAD-ONLY
    // (stops after the count word), so re-parsing recovers `quantity:literal` +
    // `loopType:literal="times"` (which the fused capture mistypes as the number
    // under `loopType`) WITHOUT a body — gated below on the re-parse matching a
    // `-times` HEAD pattern, which the body-swallowing generated repeat never is.
    // `while` joins `repeat` in the block-body exception for one shape: the
    // fused `while-event-<lang>-sov-simple` patterns (`{event} पर जब तक`)
    // have no condition slot, so a rendered `on click जब तक {condition}
    // {repeat-verb} …` handler captures a bare `while` with an implicit
    // default and drops the condition. The clause re-parses through the
    // HEAD-ONLY `repeat-<lang>-while-head` (the while-word IS the repeat
    // head's first literal), which stops before the loop body — same
    // no-body-swallow contract as the counted-loop heads. The swap below is
    // gated on exactly that pattern id, so every other `while` shape keeps
    // the #530 exclusion.
    if (!BLOCK_BODY_ACTIONS.has(actionName) || actionName === 'repeat' || actionName === 'while') {
      const isVerbFirst = match.pattern.id.includes('verb-first');
      const all = tokens.tokens;
      const pos = tokens.position();
      // A clause ends at a conjunction, `then` or an end word, but not at an
      // end word where a value stands (C3): es `repetir mientras fin < 3 …`
      // (repeat while fin < 3) ended its head at `fin`, and read `repeat
      // mientras` (PR 117).
      const isClauseBoundary = (k: number): boolean => {
        const t = all[k]!;
        if (t.kind === 'conjunction') return true;
        if (t.kind !== 'keyword') return false;
        const place = endWordPlace(all, k);
        return (
          isThenAt(t, place, language) ||
          // closesBlockAt: not a variable spelled like it (C3), and not the
          // noun of `at end of` (ms `letak x di tamat daripada saya`, he `at
          // סוף of`), which ended a loop body's clause inside its put.
          (isCuratedEndWord(t, language) && closesBlockAt(all, k, language))
        );
      };
      // A loop head's clause also stops at the loop's own `end` where
      // no curated set can list it (bn শেষ, also `last`): read past, the
      // `end` was swallowed as a stray terminator and the loop lost its extent.
      const loopHeadAction = actionName === 'repeat' || actionName === 'while';
      const endsClause = (k: number): boolean =>
        isClauseBoundary(k) || (loopHeadAction && closesBlockAt(all, k, language));
      // The scan-back below identifies the verb by its NORMALIZED form. That
      // misses whenever the language's verb normalizes to something other
      // than the action name: id `muat` normalizes to `load` (a synonym) and
      // he `הבא` to `next` (an outright homograph — the word means both
      // "next" and "fetch"). `verbIdx` stayed -1, no re-parse ran at all, and
      // the `as {responseType}` tail this whole retry exists to reclaim was
      // dropped from every he/id fetch row. The profile already carries the
      // verb surface per command, so ask it rather than trusting the
      // normalizer to agree with the schema's action name.
      const verbSurfaces = new Set<string>();
      {
        const kw = tryGetProfile(language)?.keywords?.[actionName];
        if (kw?.primary) verbSurfaces.add(kw.primary.toLowerCase());
        for (const alt of kw?.alternatives ?? []) verbSurfaces.add(alt.toLowerCase());
      }
      let verbIdx = -1;
      for (let k = pos - 1; k >= 0; k--) {
        const t = all[k];
        if (isClauseBoundary(k)) break; // don't cross into a previous clause
        const tn = ((t as { normalized?: string }).normalized ?? t.value).toLowerCase();
        if (tn === actionName || verbSurfaces.has(t.value.toLowerCase())) {
          verbIdx = k;
          break;
        }
      }
      if (verbIdx >= 0) {
        // Clause runs from the verb to the next boundary at/after the unconsumed
        // tail (the verb..pos span is already consumed by the fused match; the
        // tail pos..clauseEnd holds the dropped secondary clause).
        //
        // A loop head's clause takes in the conditionals its body opens: in
        // `repetir 3 times si x > 1 … fin fin`, the first `end` is the if's,
        // and the re-parse folds the if with it. Taken for the loop's, the
        // loop's own `end` then closed the handler and every command after
        // the loop was dropped (13 languages). A nested LOOP's `end` still
        // ends the clause: loops close through the open-loop count, not a
        // fold, and counting them here broke nested repeats in 12.
        let clauseEnd = pos;
        let nested = 0;
        while (clauseEnd < all.length) {
          const t = all[clauseEnd];
          const before = wordBefore(all, clauseEnd);
          if (
            loopHeadAction &&
            isIfKeyword((t.normalized ?? t.value).toLowerCase(), language) &&
            !isElseIfChain(t, before, language)
          ) {
            nested++;
          } else if (nested > 0) {
            if (closesBlockAt(all, clauseEnd, language)) nested--;
          } else if (endsClause(clauseEnd)) {
            break;
          }
          clauseEnd++;
        }
        const clauseTokens = all.slice(verbIdx, clauseEnd);
        // For verb-first fused patterns the event head sits inside the clause;
        // excise it (event token + a preceding `on`-marker keyword) so the
        // re-parse sees only the standalone command. For every other order the
        // event is OUTSIDE [verb..boundary], so reparseTokens === clauseTokens
        // (a no-op — the proven #530 path is byte-identical).
        let reparseTokens: LanguageToken[] | null = clauseTokens;
        if (isVerbFirst) {
          const eventNorm = String((eventValue as { value?: unknown }).value ?? '').toLowerCase();
          const evIdx = clauseTokens.findIndex(
            t => ((t as { normalized?: string }).normalized ?? t.value).toLowerCase() === eventNorm
          );
          if (evIdx < 0) {
            // Event token not in the clause → re-parsing would re-include it.
            reparseTokens = null;
          } else {
            const prev = clauseTokens[evIdx - 1];
            const from =
              prev && prev.kind === 'keyword' && prev.normalized?.toLowerCase() === 'on'
                ? evIdx - 1
                : evIdx;
            reparseTokens = [...clauseTokens.slice(0, from), ...clauseTokens.slice(evIdx + 1)];
          }
        }
        // Only retry when there are trailing args beyond the verb to reclaim.
        if (reparseTokens && reparseTokens.length > 1) {
          const commandPatterns = getPatternsForLanguage(language)
            .filter(p => p.command !== 'on')
            .sort((a, b) => b.priority - a.priority);
          const reparseCoverageMark = coverageMark(state);
          const reparsed = parseClause(state, reparseTokens, commandPatterns, language);
          const first = reparsed[0];
          // Swap ONLY when the re-parse is a SUPERSET of the fused capture: every
          // fused role must reappear with the SAME value-type. This is the safety
          // rail for verb-FINAL SOV (qu `#score ta ñitiy pi yapachiy 10`): the real
          // patient `#score` is FRONTED, ahead of the event, so it is NOT in the
          // [verb..boundary] clause — re-parsing `yapachiy 10` fills a DEFAULT
          // `patient:reference=me`, which would inflate the role count (2 > 1) and,
          // without this guard, REPLACE the correctly-captured `patient:selector`.
          // Requiring superset means the re-parse can only ADD roles (fetch's
          // `responseType` atop a preserved `source`), never swap a real role for a
          // defaulted one.
          const valType = (v: unknown): string =>
            v !== null &&
            typeof v === 'object' &&
            typeof (v as { type?: unknown }).type === 'string'
              ? (v as { type: string }).type
              : typeof v;
          // The fused capture binds the wrapped command's PRIMARY arg under the
          // generic `patient` role; `normalizeCommandRoles` relabels it to the
          // command's primaryRole (fetch→source, trigger→event) LATER, on the final
          // tree. The re-parse already uses the real role, so map fused `patient` →
          // primaryRole here (only when the schema has no real `patient` role — the
          // exact relabel condition) so the superset check lines them up. For commands
          // that DO keep `patient` (increment, …) the mapping is a no-op, so a
          // verb-final SOV default-`patient` re-parse still fails the type match.
          const schema = getSchema(actionName as ActionType);
          const primary = schema?.primaryRole;
          const mapRole = (role: string): SemanticRole =>
            (role === 'patient' &&
            primary &&
            primary !== 'patient' &&
            !schema?.roles.some(r => r.role === 'patient')
              ? primary
              : role) as SemanticRole;
          // A fused role is IGNORABLE (exempt from the superset requirement)
          // for a block-body action when the schema says it cannot be real:
          // the mapped role isn't declared at all (es `repeat-event-es-vso`
          // binds `.items` under `destination` — repeat has no destination
          // role), or its captured TYPE violates the role's expectedTypes
          // (`loopType:expression="item"` — loopType is literal-only). Such
          // junk would otherwise block the head-only re-parse swap below
          // (the fused mis-capture can never "reappear" in the canonical
          // parse). Scoped to block-body actions (only `repeat` reaches
          // here); real captures — the `-times` fronted count (patient→
          // loopType, literal ✓ literal) and every non-block command — keep
          // full superset protection, including the qu verb-final safety rail.
          const isIgnorableFusedRole = (role: string, val: unknown): boolean => {
            if (!BLOCK_BODY_ACTIONS.has(actionName) || !schema) return false;
            const spec = schema.roles.find(r => r.role === mapRole(role));
            if (!spec) return true;
            return (
              spec.expectedTypes.length > 0 && !spec.expectedTypes.includes(valType(val) as never)
            );
          };
          // A fused capture is provably JUNK — a swallowed role MARKER, not an
          // argument — when its literal value is a role-marker CONCEPT name.
          // The fused event shape hardwires a required `{patient}` slot
          // (`generators/event-handlers-vso.ts`), so on a schema that declares
          // no patient role that slot lands on the destination MARKER of a
          // corpus surface like `bei klick scrollen zu letzte <.message/> in
          // #chat`; the marker keyword normalizes to its concept, and
          // `tokenToSemanticValue` turns it into `literal="destination"`.
          // No user ever writes a concept name as an argument, so this value
          // can only be marker swallow — it must not veto the re-parse swap
          // that recovers the real destination (`last <.message/> in #chat`).
          // Scoped by the same no-real-`patient` condition as `mapRole`, so
          // every genuine patient capture (increment, pick, the qu verb-final
          // safety rail) keeps full superset protection.
          const isMarkerConceptJunk = (role: string, val: unknown): boolean =>
            role === 'patient' &&
            !!schema &&
            !schema.roles.some(r => r.role === 'patient') &&
            valType(val) === 'literal' &&
            ROLE_MARKER_CONCEPTS.has(
              String((val as { value?: unknown }).value ?? '').toLowerCase()
            );
          // A role the MATCHER defaulted (`applyExtractionRules` marks it
          // `implicit`) is not a capture at all — it is the absence of one.
          // `toggle-event-vi-vso` is `khi {event} chuyển đổi {patient} vào
          // {destination?}` while the renderer emits the destination marker
          // `trên`, so the group never fires and the pattern defaults
          // `destination:reference=me(implicit)`. Counting that as something
          // the re-parse must "preserve" made the real `destination:selector=
          // #menu` a TYPE MISMATCH and vetoed its own repair. Implicit
          // defaults are therefore exempt from the superset requirement, and
          // discounted from the FUSED side of the role count — otherwise a
          // swap that replaces a default with a real value ties 2 > 2 and is
          // rejected anyway. Only the fused side: on the RE-PARSE side an
          // implicit role is the canonical reading and does count (the
          // counted-loop head's `loopType:"times"` is implicit, and
          // discounting it there ties 1 > 1 and re-breaks every counted loop
          // — measured, 12 languages). The qu verb-final safety rail is
          // untouched: it guards against the RE-PARSE inventing a default,
          // which `preservesFused` still catches by type, and a real fused
          // capture is never implicit.
          const isImplicit = (val: unknown): boolean =>
            val !== null &&
            typeof val === 'object' &&
            (val as { implicit?: unknown }).implicit === true;
          const preservesFused =
            !!first &&
            first.kind === 'command' &&
            Object.entries(roles).every(([role, val]) => {
              if (isImplicit(val)) return true;
              if (isIgnorableFusedRole(role, val) || isMarkerConceptJunk(role, val)) return true;
              const rv = (first as CommandSemanticNode).roles.get(mapRole(role));
              if (rv !== undefined && valType(rv) === valType(val)) return true;
              // The fused slot holds the command's PRIMARY arg under `patient`
              // even where the schema has a real patient: swap's primary is its
              // destination, so `al clic intercambiar #target con yo` fuses
              // `patient:#target`, and the canonical parse moves #target to
              // `destination` and reads `con yo` as the patient. The same value
              // under the primary role is preservation; compared by type, a
              // reference patient vetoed its own repair and `con yo` was lost in
              // 12 languages (`con #b`, a selector, passed by coincidence).
              if (role === 'patient' && primary && primary !== 'patient') {
                const pv = (first as CommandSemanticNode).roles.get(primary);
                if (pv !== undefined && sameSemanticValue(pv, val as SemanticValue)) return true;
              }
              // Pick's fused patterns bind the unit/variant word under the
              // generic `patient` (`pick-event-es-vso` → patient:literal=
              // "characters"), while the canonical pick variant pattern
              // re-roles that word to `method` and captures the RANGE under
              // `patient` (`0 to 5`). The unit word reappearing under
              // `method` with the SAME SURFACE is preservation — the role
              // moved, nothing was lost. Without this the type check above
              // (literal vs expression) vetoes the swap and the handler body
              // truncates to `pick characters` (the arc-3 foreign
              // canonical-validity cluster).
              //
              // The re-parsed `method` may be a literal or an EXPRESSION: the
              // foreign pick patterns re-type unit words to the expression
              // shape en produces (patterns/pick.ts). Compare surfaces, not
              // types — a type check here would re-open the truncation
              // cluster for all 13 verb-initial languages.
              if (role === 'patient' && actionName === 'pick' && valType(val) === 'literal') {
                const mv = (first as CommandSemanticNode).roles.get('method');
                const mvType = valType(mv);
                const mvSurface =
                  mvType === 'literal'
                    ? String((mv as { value?: unknown }).value)
                    : mvType === 'expression'
                      ? String((mv as { raw?: unknown }).raw)
                      : undefined;
                return (
                  mvSurface !== undefined &&
                  mvSurface === String((val as { value?: unknown }).value)
                );
              }
              return false;
            });
          // For a block-body action (only `repeat` reaches here) the swap is
          // additionally gated on the re-parse matching a HEAD-ONLY counted-loop
          // pattern (`repeat-<lang>-times`): it stops after the count word so no
          // body is swallowed. The body-swallowing generated repeat (matching
          // `repetir forever alternar …` → quantity:literal="toggle") is NOT a
          // `-times` pattern, so the #530 repeat-forever hazard stays excluded.
          const reparsePid =
            (first as { metadata?: { patternId?: string } } | undefined)?.metadata?.patternId ?? '';
          const headOnlyOk =
            !BLOCK_BODY_ACTIONS.has(actionName) ||
            // The repeat HEAD families are HEAD-ONLY by construction
            // (HEAD_ONLY_REPEAT), so the swap can never swallow a body
            // command. The body-swallowing generated repeat matches none of
            // these ids.
            HEAD_ONLY_REPEAT.test(reparsePid);
          // A HEAD-ONLY re-parse legitimately returns MORE than one command:
          // the head stops after its count word, and `parseClause` carries on
          // to the loop body in the same clause (`repetir 3 times agregar
          // "<p>Line</p>" a yo` → [repeat, add]). Requiring exactly one
          // vetoed every counted loop inside a handler — 13 languages, one
          // corpus row each — even though every other condition held. The
          // extra commands ARE the body, so keep them (spliced in below)
          // rather than dropping them with the clause. Only the head-only
          // families qualify, so #530's body-swallowing generated repeat is
          // still excluded by `headOnlyOk`.
          const headOnlyPattern = HEAD_ONLY_REPEAT.test(reparsePid);
          if (
            (reparsed.length === 1 || (headOnlyPattern && reparsed.length > 1)) &&
            first &&
            first.kind === 'command' &&
            // Same action — or the one sanctioned upgrade: a fused `while`
            // whose clause re-parses as the head-only repeat while-head.
            // The while-word is the head's first literal, so the same
            // surface that fused as a bare `while` IS a `repeat while
            // {condition}` — the canonical reading the en reference has.
            (first.action === actionName ||
              (actionName === 'while' &&
                first.action === 'repeat' &&
                /-while-head$/.test(
                  (first as { metadata?: { patternId?: string } }).metadata?.patternId ?? ''
                ))) &&
            preservesFused &&
            headOnlyOk &&
            // Strictly-more: the re-parse must recover something the fused
            // capture lacked. Junk marker captures are excluded from the
            // count — a fused shape whose ONLY role is a swallowed marker
            // (scroll: `destination:literal="destination"`) would otherwise
            // tie 1 > 1 and veto its own repair.
            // The re-parse must GAIN something. Two ways, and the union is
            // what keeps all three measured cases right:
            //   (i) it binds MORE roles than the fused capture — the original
            //       test, unchanged. The counted-loop head lands here (it adds
            //       `quantity`, which the fused shape has no slot for) even
            //       though its own `loopType` is implicit.
            //   (ii) it binds more REAL roles — an upgrade from a default to
            //       an actual value, which is vi's `destination:me(implicit)`
            //       becoming `destination:selector=#menu` at an unchanged
            //       role count.
            // Neither fires when the re-parse merely re-defaults what the
            // fused capture already defaulted: SOV `add @disabled to <button/>
            // in me` keeps a fused `destination:me(implicit)` whose real value
            // is postposed OUTSIDE the [verb..boundary] slice, so the re-parse
            // defaults it too. Swapping there would consume the clause and rob
            // the trailing DESTINATION/SOURCE reclaim that does recover it
            // (measured: ja/ko/hi form-disable-on-submit).
            ((first as CommandSemanticNode).roles.size >
              Object.entries(roles).filter(([r, v]) => !isMarkerConceptJunk(r, v)).length ||
              [...(first as CommandSemanticNode).roles.values()].filter(v => !isImplicit(v))
                .length >
                Object.entries(roles).filter(
                  ([r, v]) => !isMarkerConceptJunk(r, v) && !isImplicit(v)
                ).length ||
              // (iii) a head-only loop head that reads the same roles and
              //       then the body, which the fused capture lost: it
              //       `su mousedown ripetere fino evento mouseup
              //       incrementare #c` fused as `repeat until event mouseup`
              //       and dropped the increment once the head wrote the
              //       language's own verb (M2, sheet A1).
              (headOnlyPattern && reparsed.length > 1))
          ) {
            commandNode = first as CommandSemanticNode;
            reparsedTail = reparsed.slice(1);
            while (tokens.position() < clauseEnd) tokens.advance();
          } else {
            // Re-parse rejected — discard its speculative coverage records
            // (the tail it re-scanned stays owned by the trailing-body walk).
            coverageRollback(state, reparseCoverageMark);
          }
        }
      }
    }

    // Trailing BARE-literal quantity reclaim. The i18n transformer renders
    // `increment #score by 10` with the amount AFTER the verb, bare (ja
    // `#score を クリック で 増加 10`, th `เมื่อ คลิก เพิ่มค่า #score 10`), but every
    // fused event pattern ends at the verb (SOV) or the primary role (th
    // VSO), so the amount is left unconsumed and silently drops — quantity
    // defaults to 1 (the R2 blocker on increment-by-amount in the SOV 6 +
    // th). The re-parse swap above cannot reclaim it in SOV: the fronted
    // patient sits OUTSIDE the [verb..boundary] slice, so the superset guard
    // rejects the re-parse (by design — the qu safety rail). Reclaim the
    // amount directly: when the schema declares an optional `quantity` role
    // the fused capture missed and the very next unconsumed token is a bare
    // number, capture it and consume the token. Precision-safe: gated to
    // non-block actions (only increment/decrement carry an optional
    // quantity outside `repeat`, whose counted-loop head has its own path
    // above), to a NUMERIC next token (a then-keyword, `end`, selector, or
    // duration like `200ms` never matches), and to an ABSENT quantity (the
    // marker langs es/fr/pt/de and positional it/zh capture it upstream).
    if (!BLOCK_BODY_ACTIONS.has(actionName)) {
      const qNode = commandNode as CommandSemanticNode;
      const hasOptionalQuantity = getSchema(actionName as ActionType)?.roles.some(
        r => r.role === 'quantity' && !r.required
      );
      if (hasOptionalQuantity && !qNode.roles.has('quantity')) {
        const trailing = tokens.peek();
        if (trailing && /^-?\d+(\.\d+)?$/.test(trailing.value)) {
          commandNode = createCommandNode(
            actionName as ActionType,
            {
              ...(Object.fromEntries(qNode.roles) as Record<string, SemanticValue>),
              quantity: {
                type: 'literal',
                value: parseFloat(trailing.value),
                dataType: 'number',
              },
            },
            qNode.metadata
          );
          tokens.advance();
        }
      }

      // Trailing DURATION reclaim — the `transition` sibling of the quantity
      // reclaim above. The transformer renders `transition opacity to 0 over
      // 500ms` with the duration AFTER the fused verb+goal, bare (ja `遷移 0
      // に 500ms`, ko `전환 0 에 500ms` — the `over` marker never survives
      // translation), so the time literal is left unconsumed and drops
      // (transition.duration missing in the SOV six across every transition
      // pattern). Gated to a schema-declared OPTIONAL `duration` role that is
      // absent (today only `transition` — wait's duration is required and has
      // its own paths) and to a TIME-shaped literal (`500ms`/`2s`/`2.5s`; a
      // bare number is the quantity reclaim's domain and never matches here).
      const dNode = commandNode as CommandSemanticNode;
      const hasOptionalDuration = getSchema(actionName as ActionType)?.roles.some(
        r => r.role === 'duration' && !r.required
      );
      if (hasOptionalDuration && !dNode.roles.has('duration')) {
        const timeRe = /^\d+(\.\d+)?(ms|s)$/i;
        let trailing = tokens.peek();
        // hi renders `over 500ms` with the marker BEFORE the time literal
        // (`में 500ms` — the prepositional sibling of the bn trailing জন্য
        // postposition consumed below). Skip exactly one particle when a
        // TIME-shaped literal directly follows it; ja/ko/bn keep the bare
        // adjacent-literal path unchanged.
        let markerSkip = false;
        if (trailing && trailing.kind === 'particle') {
          const after = tokens.peek(1);
          if (after && timeRe.test(after.value)) {
            markerSkip = true;
            trailing = after;
          }
        }
        if (trailing && timeRe.test(trailing.value)) {
          commandNode = createCommandNode(
            actionName as ActionType,
            {
              ...(Object.fromEntries(dNode.roles) as Record<string, SemanticValue>),
              duration: {
                type: 'literal',
                value: trailing.value,
                dataType: 'string',
              },
            },
            dNode.metadata
          );
          if (markerSkip) tokens.advance();
          tokens.advance();
          // Consume a trailing rendered duration postposition (bn `500ms
          // জন্য` — the transformer renders `over` as the for-postposition
          // AFTER the time literal). Left in place it anchors a phantom bare
          // `for` command in the remaining body tokens (the wait-for
          // precedent below, same particle). জন্য tokenizes as a PARTICLE
          // (no `normalized`), so also match the profile's for-keyword
          // surface form.
          consumeForPostposition(tokens, language);
        }
      }

      // Trailing RESPONSE-TYPE reclaim — the `responseType` sibling of the
      // quantity reclaim above (R1 handoff cluster B). The transformer
      // renders `fetch /api/user as json`'s tail AFTER the fused verb:
      // bare (ja `フェッチ json`, bn `আনুন json`), word + as-postposition
      // (tr `json olarak`, hi `json के रूप में`, qu `json hina` — the
      // postposition stays unconsumed skip-noise exactly as before), or
      // word + a particle the fused pattern's optional trailing DESTINATION
      // group swallows (ko `json 로` — 로 is a destination alternative), so
      // the responseType either drops or lands under `destination`, a role
      // whose schema types (selector/reference) it VIOLATES. Two moves,
      // both gated on the schema declaring an optional `responseType` that
      // is absent AND on the word being a KNOWN response-type word
      // (loanwords, language-invariant in the corpus):
      //  (a) relabel a schema-invalid `destination` capture to responseType;
      //  (b) capture a trailing bare response word and consume it.
      const rNode = commandNode as CommandSemanticNode;
      const rSchema = getSchema(actionName as ActionType);
      const rSpec = rSchema?.roles.find(r => r.role === 'responseType' && !r.required);
      if (rSpec && !rNode.roles.has('responseType')) {
        const isResponseWord = (w: unknown): w is string =>
          typeof w === 'string' && RESPONSE_TYPE_WORDS.has(w.toLowerCase());
        const rebuildWithResponseType = (word: string, dropDestination: boolean): void => {
          const roles = Object.fromEntries(rNode.roles) as Record<string, SemanticValue>;
          if (dropDestination) delete roles.destination;
          roles.responseType = { type: 'expression', raw: word } as SemanticValue;
          commandNode = createCommandNode(actionName as ActionType, roles, rNode.metadata);
        };
        const dest = rNode.roles.get('destination') as
          { type: string; raw?: unknown; value?: unknown } | undefined;
        const destSpec = rSchema?.roles.find(r => r.role === 'destination');
        const destWord = dest?.raw ?? dest?.value;
        if (
          dest &&
          destSpec &&
          !destSpec.expectedTypes.includes(dest.type as (typeof destSpec.expectedTypes)[number]) &&
          isResponseWord(destWord)
        ) {
          rebuildWithResponseType(destWord, true);
        } else {
          const trailing = tokens.peek();
          if (trailing && isResponseWord(trailing.value)) {
            rebuildWithResponseType(trailing.value, false);
            tokens.advance();
          }
        }
      }

      // Trailing WAITABLE-EVENT reclaim — the `wait` sibling of the quantity /
      // responseType reclaims above. The transformer renders `wait for
      // transitionend` with the event name AFTER the verb in verb-final
      // languages (ja `待つ transitionend`, hi `प्रतीक्षा transitionend`), but
      // the fused event pattern ends at the verb, so the event name is left
      // unconsumed and drops (the wait fills a junk schema-invalid
      // duration:reference instead — wait-for-event ×23). Gated on the
      // action being `wait`, an ABSENT event role, and the next unconsumed
      // token being a KNOWN waitable event name (language-invariant
      // loanwords — a then-keyword, `end`, selector, or bare number never
      // matches). A schema-invalid duration (reference — the junk fill) is
      // dropped in the rebuild; a real duration (literal/expression) is kept.
      if (actionName === 'wait') {
        const wNode = commandNode as CommandSemanticNode;
        if (!wNode.roles.has('event')) {
          const trailing = tokens.peek();
          // The language's `event` word captured as the duration, a name
          // after it (`al clic esperar evento foo`, P52): the name is the
          // event, as the wait-<lang>-event-head reads it off the fused path.
          const previous = tokens.peek(-1);
          const eventWordRead =
            !!trailing && !!previous && (previous.normalized ?? '').toLowerCase() === 'event';
          if (
            trailing &&
            (WAITABLE_EVENT_WORDS.has(trailing.value.toLowerCase()) || eventWordRead)
          ) {
            const roles = Object.fromEntries(wNode.roles) as Record<string, SemanticValue>;
            const dur = roles.duration as { type?: string } | undefined;
            if (dur && dur.type !== 'literal' && dur.type !== 'expression') {
              delete roles.duration;
            }
            // Drop the SOV default-patient leak (`patient:reference=me`, the
            // sov-simple fused extraction default): wait has no patient
            // role, and normalizeCommandRoles would otherwise relabel it
            // into the empty primary `duration` slot — a junk
            // duration:reference the en reference never has (the repeat
            // default-patient precedent).
            const pat = roles.patient as { type?: string; value?: unknown } | undefined;
            if (pat && pat.type === 'reference' && pat.value === 'me') {
              delete roles.patient;
            }
            roles.event = {
              type: 'literal',
              value: trailing.value,
              dataType: 'string',
            } as SemanticValue;
            commandNode = createCommandNode(actionName as ActionType, roles, wNode.metadata);
            tokens.advance();
            // Consume a trailing rendered `for`-postposition (bn `transitionend
            // জন্য` — the transformer renders the wait-for keyword AFTER the
            // event in postpositional languages). Left in place it anchors a
            // phantom bare `for` command in the remaining body tokens.
            consumeForPostposition(tokens, language);
          }
        }
      }

      // Trailing DESTINATION/SOURCE reclaim — the add/put/remove sibling of
      // the quantity/duration/responseType/wait reclaims above. The SOV
      // reorder fronts the patient (`@disabled を 送信 で 追加 <button/> in
      // me に`), so the [verb..boundary] re-parse's superset gate rejects
      // the swap (the fronted patient sits outside the slice) and the
      // postposed destination phrase is left unconsumed — the role silently
      // defaults to `me` (form-disable-on-submit ×4 SOV). Same guarded
      // helper as the parseClause call site: schema-declared role,
      // absent-or-`me`-default only, destination matched by PRIMARY marker
      // only, strict value shapes.
      tryAttachTrailingRole(
        tokens,
        commandNode as CommandSemanticNode,
        language,
        state.boundIdentifiers
      );

      // Trailing STYLE (with-options) reclaim — see tryAttachTrailingStyle.
      // Placed AFTER the responseType reclaim so fetch-with-headers' post-
      // marker `JSON` tail stays unconsumed exactly as before (en-symmetric
      // lossiness: the en reference drops it too).
      tryAttachTrailingStyle(tokens, commandNode as CommandSemanticNode, language);

      // Trailing EXPRESSION-run reclaim (js code / go+scroll destination
      // phrase) — see tryAttachTrailingExpressionRole.
      tryAttachTrailingExpressionRole(tokens, commandNode as CommandSemanticNode, language);
      tryAttachNewWindow(tokens, commandNode as CommandSemanticNode);
    }

    // Check if pattern has continuation marker (then-chains).
    const continuesValue = match.captured.get('continues');
    const hasContinuesMarker =
      continuesValue?.type === 'literal' && continuesValue.value === 'then';
    // Some fused VSO/SOV event patterns capture only the *first* command and
    // leave a trailing then-chain (`<cmd> on <event> then <cmd>…`) unconsumed
    // *without* emitting a `continues` marker. Without this, the handler body
    // silently collapses to that first command and every post-event command is
    // dropped (a degenerate parse — see fidelity ratchet). Gate the extra parse
    // on a leading then-keyword so we never sweep up unrelated trailing tokens.
    const nextToken = tokens.peek();
    const hasTrailingThenChain = !!nextToken && isThenKeyword(nextToken.value, language);

    // A fused VSO/SVO event pattern can capture a *block* command (if/unless/
    // while/repeat/for) as the action but leave the block's condition and branch
    // body unconsumed — and, unlike a simple command, those trailing tokens are
    // *not* bridged by a then-marker (`on click if <cond> show … else … end`).
    const isBlockBodyAction = BLOCK_BODY_ACTIONS.has(actionName);
    // The handler's own `end`, as the clause walk reads one: a curated end
    // word that closes a block here (closesBlockAt), not a variable spelled
    // like it, nor the noun of `at end of`.
    const nextEndsBody =
      !!nextToken &&
      nextToken.kind === 'keyword' &&
      isCuratedEndWord(nextToken, language) &&
      closesBlockAt(tokens.tokens, tokens.position(), language);
    const hasBlockBody = isBlockBodyAction && !!nextToken && !nextEndsBody;

    // General case: a fused event pattern captured the *first* body command as the
    // action and left the rest unconsumed. The body's remaining commands may be
    // then-chained (`… then …`), block bodies (if/else), OR simply *juxtaposed*
    // (`halt the event call validateForm() if … end` — no `then` between them).
    // Whenever any non-`end` token trails the captured action, re-parse it as body
    // commands. This is safe and additive: `parseBodyWithGrammarPatterns` only
    // appends tokens that match a command pattern and skips everything else, so an
    // already-consumed simple handler (no remainder) is unchanged, and stray role
    // words can never become spurious commands. Subsumes the then-chain and
    // block-body cases above; both are kept named for documentation.
    const hasTrailingBody = !!nextToken && !nextEndsBody;

    // The captured command can be a LOOP head (`repeat-event-es-vso` fuses
    // `al clic repetir 3 times`), whose body the re-parse above recovered.
    // Its `end` closes the loop, not the handler: when more body follows it,
    // consume the `end` as the loop's and walk on. The body walker never sees
    // the head, so it is handed the leading nodes to count open loops from.
    const leading: WalkEntry[] = [commandNode, ...reparsedTail];
    const closesLeadingLoop =
      !!nextToken &&
      closesBlockAt(tokens.tokens, tokens.position(), language) &&
      openLoopCount(leading) > 0 &&
      tokens.peek(1) !== null;
    if (closesLeadingLoop) {
      tokens.advance();
      leading.push(LOOP_CLOSE);
    }

    if (
      hasContinuesMarker ||
      hasTrailingThenChain ||
      hasBlockBody ||
      hasTrailingBody ||
      closesLeadingLoop
    ) {
      // Parse remaining tokens as additional commands
      const commandPatterns = getPatternsForLanguage(language)
        .filter(p => p.command !== 'on')
        .sort((a, b) => b.priority - a.priority);

      // Include grammar-transformed continuation patterns (these have specific command types)
      // Continuation patterns have command !== 'on' and id includes 'continuation'
      const grammarContinuationPatterns = getPatternsForLanguage(language)
        .filter(p => p.id.startsWith('grammar-') && p.id.includes('-continuation'))
        .sort((a, b) => b.priority - a.priority);

      const remainingCommands = parseBodyWithGrammarPatterns(
        state,
        tokens,
        commandPatterns,
        grammarContinuationPatterns,
        language,
        leading
      );

      // Combine the first command with the remaining commands, nesting loops.
      body = foldLoopBlocks(state, [...leading, ...remainingCommands]);
    } else {
      body = foldLoopBlocks(state, leading);
      // No trailing-body walk ran (next token is an `end` or the stream is
      // exhausted) — anything left past here is dropped. The residue filter
      // silences the bare block terminator(s), so only real content fires.
      if (!tokens.isAtEnd()) {
        recordDroppedTokens(
          state,
          (tokens.tokens as LanguageToken[]).slice(tokens.position()),
          language,
          'handler body tail'
        );
      }
    }
  } else {
    // Traditional parsing: parse remaining tokens as body commands
    const commandPatterns = getPatternsForLanguage(language)
      .filter(p => p.command !== 'on')
      .sort((a, b) => b.priority - a.priority);

    // A generic fused handler's trailing `{action}` slot is meant to capture
    // the body's VERB, and the body is then parsed from the tail AFTER it.
    // In a verb-FINAL language the verb is the last token of the body, so the
    // slot instead lands on the body's leading ARGUMENT and consumes it —
    // `event-handler-bn-sov` (`{event} তে {action}`) captures `আমি` out of
    // `ক্লিক তে আমি থেকে .highlight কে সরান` as `action:reference="me"`, the
    // tail parse starts at the stranded `থেকে`, and `remove.source` silently
    // falls back to its schema default (`me`, implicit — so the strict role
    // signature scores it as MISSING). The capture is not a literal here, so
    // it names no command and nothing downstream can use it.
    //
    // Rewind to where the slot started and parse the whole body from there,
    // the same move the `if` fold above makes for the conditional head. Only
    // when the slot really did swallow body text: a literal action goes down
    // the flat path above, and a handler that captured no action at all has
    // no recorded start, so both keep their existing token-identical parse.
    const actionStart = actionValue ? match.roleStarts?.get('action') : undefined;
    if (actionStart !== undefined && actionStart < tokens.position()) {
      const bodyStream = new TokenStreamImpl(
        (tokens.tokens as LanguageToken[]).slice(actionStart),
        language
      );
      // The slot can hold a count (bn `ক্লিকে 1 xকে 10তে সেট`), read as the head's.
      headClause = takeHeadClause(state, bodyStream, commandPatterns, language);
      body = parseBodyWithClauses(state, bodyStream, commandPatterns, language);
      while (!tokens.isAtEnd()) tokens.advance();
    } else {
      headClause = takeHeadClause(state, tokens, commandPatterns, language);
      // Use parseBodyWithClauses() to properly handle multi-clause then-chains
      body = parseBodyWithClauses(state, tokens, commandPatterns, language);
    }
  }

  // A multi-command handler body is a THEN-CHAIN, whichever path built it.
  //
  // `parseBodyWithClauses` (the clause path, and English always) wraps >1
  // clause in a compound with chainType 'then' — that is why the en reference
  // for `on click fetch X then put Y` is body=[compound{fetch,put}], and why
  // rendering it back to English re-emits `then`. The FUSED path above builds
  // its body by hand (`[commandNode, ...reparsedTail, ...remainingCommands]`)
  // and left it flat, so the same handler parsed in a language whose fused
  // `<command>-event-*` pattern wins came back as body=[fetch, put] — no
  // compound, no chainType, and the English re-render silently dropped every
  // `then`. Measured 2026-08-27 across the corpus: FIFTEEN languages (bn, es,
  // he, hi, id, it, ms, pl, pt, ru, sw, th, tl, uk, vi) lost the chain this
  // way, while the eight whose trigger pattern wins (ar, de, fr, ja, ko, qu,
  // tr, zh) kept it. No recall metric can see it — `then` is neither an action
  // nor a role — so only the English round trip does.
  //
  // Folding here rather than re-parsing: the commands are already correct, and
  // this is purely the shape the two paths disagreed on. A body that already
  // came from parseBodyWithClauses is length 1 (the compound), so it never
  // double-wraps.
  const foldedBody =
    body.length > 1 ? [createCompoundNode(body, 'then', { sourceLanguage: language })] : body;

  const handler = withAdditionalEvents(
    createEventHandler(resolvedEventValue, foldedBody, eventModifiers, {
      sourceLanguage: language,
      patternId: match.pattern.id,
      confidence: match.confidence,
    })
  );
  return headClause ? { ...handler, headClause } : handler;
}
