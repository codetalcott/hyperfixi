/**
 * One parse, stage by stage: the structural block layer, the feature and
 * program layers, a bare `js` block, the per-command rescues, then the event
 * handler, the trailing event, the command, and the SOV event stages. Plus
 * `parseStatements` (a body read as a list) and the `catch`/`finally` clauses.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type {
  SemanticNode,
  EventHandlerSemanticNode,
  SemanticValue,
  SemanticRole,
  LanguageToken,
  Diagnostic,
} from '../types';
import { createCompoundNode } from '../types';
import { tokenize as tokenizeInternal } from '../tokenizers';
import { getPatternsForLanguage, tryGetProfile } from '../registry';
import { isOrWordToken } from './utils/or-words';
import { patternMatcher } from './pattern-matcher';
import { isIfKeyword } from './clause-keywords';
import { consumeJsBlock } from './js-block';
import { type ParserState } from './parser-state';
import { SemanticParseError } from './parse-error';
import {
  describeUnconsumedInput,
  hoistUnconsumedDiagnostics,
  parseDiagnostic,
  withDiagnostics,
} from './parse-diagnostics';
import { reclaimEventCompoundTail } from './tail-reclaim';
import {
  parseErrorClauses,
  splitErrorClauses,
  tryParseBlock,
  tryParseFeatureBlock,
  tryParseProgram,
} from './block-parser';
import { eventNameTranslations, nativeEventNames } from '../patterns/event-handler';
import { findEventModifierPhrase } from './event-modifier-lift';
import { KNOWN_EVENTS, WAITABLE_EVENT_WORDS, matchEventParamPhrase } from './event-words';
import {
  stripDoNotThrowModifier,
  tryDoNotThrow,
  tryLoopIndex,
  tryScrollModifiers,
  tryTellTo,
  tryWaitAlternatives,
} from './command-rescues';
import { BLOCK_HEAD_ACTIONS } from './loop-heads';
import { isBodyCommandWord } from './sov-clause';
import {
  applyModifiers,
  extractStandaloneModifiers,
  hasSOVEventMarkerHead,
  stripAsyncModifier,
} from './event-heads';
import { buildCommand, tryParsePseudoCommand } from './clause-heads';
import { parseBodyWithClauses, tryParseUnlessGuard } from './clause-walk';
import {
  tryCompoundCommandParsing,
  tryMidStreamEventExtraction,
  trySOVEventExtraction,
  tryTopLevelCommandSequence,
  tryTopLevelLoop,
  tryTrailingEventExtraction,
} from './statement-strategies';
import { BLOCK_BODY_ACTIONS, buildEventHandler } from './event-handler-builder';

export const COMMAND_WORDS = new Map<string, ReadonlySet<string>>();

/** The command actions a language's patterns parse (not `on`), memoized. */
export function commandWordsFor(language: string): ReadonlySet<string> {
  let words = COMMAND_WORDS.get(language);
  if (!words) {
    words = new Set(
      getPatternsForLanguage(language)
        .map(pattern => pattern.command)
        .filter(command => command !== 'on')
    );
    COMMAND_WORDS.set(language, words);
  }
  return words;
}

/**
 * Parse input in the specified language to a semantic node.
 * Accumulates diagnostics from each fallback stage (Phase 3.4).
 */
export function parseInternal(state: ParserState, input: string, language: string): SemanticNode {
  // Stage 0: structural / block layer. A `behavior … end` block is decomposed
  // into its handlers (each parsed by the single-statement path below) and
  // re-assembled — otherwise the leading keyword matches and the whole body is
  // dropped at a false confidence 1.0. Returns null (fast) for non-block input.
  // Stage −1: a PROGRAM of features (`def a … end def b … end`, `init … end
  // on click …`, `bind … end live …`): split before the block layers below,
  // each of which reads its own feature and dropped whatever came after it.
  // Returns null (fast) unless every top-level segment reads as a feature.
  const programFirst = tryParseProgram(input, language, {
    statement: (text, lang) => state.parse(text, lang),
    body: (text, lang) => parseStatements(state, text, lang),
  });
  if (programFirst) return programFirst;

  // Stage −0.5: a handler's error clauses (`on click … catch e … finally …`).
  // The handler patterns read its commands and left `catch e …` unread, or
  // ran the clauses as more commands. A def reads its own (parseDefBlock).
  const withClauses = tryParseErrorClauses(state, input, language);
  if (withClauses) return withClauses;

  const blockNode = tryParseBlock(input, language, {
    statement: (text, lang) => state.parse(text, lang),
    body: (text, lang) => parseStatements(state, text, lang),
  });
  if (blockNode) return blockNode;

  // Stage 0.1: feature block layer (`live`/`eventsource`/`socket`/`intercept`).
  // These schemas declare no roles, so their generated pattern is a lone keyword
  // literal that matches at Stage 2 and eats the whole body — at a vacuous
  // confidence 1.0, since `scoreRoleCoverage` returns 1 for a role-less pattern.
  // Runs AFTER tryParseBlock so a `behavior`/`def` block whose body contains a
  // feature keyword is still claimed by the behavior layer, and BEFORE Stages
  // 1–2 so the bare-keyword pattern never wins. Returns null (fast) otherwise.
  const featureNode = tryParseFeatureBlock(input, language, {
    statement: (text, lang) => state.parse(text, lang),
    body: (text, lang) => parseStatements(state, text, lang),
  });
  if (featureNode) return featureNode;

  // Stage 0.5: multi-handler PROGRAM layer. A top-level script with ≥2 event
  // handlers (`on click … end on keyup … end`) otherwise matches only the first
  // handler at Stage 1 and silently absorbs the rest into its body. This splits
  // the input into top-level handler segments (end-delimited, trigger-agnostic)
  // and re-assembles them. Returns null (fast) unless ≥2 segments all parse as
  // handlers, so single statements fall through unchanged.
  const programNode = tryParseProgram(input, language, {
    statement: (text, lang) => state.parse(text, lang),
    body: (text, lang) => parseStatements(state, text, lang),
  });
  if (programNode) return programNode;

  // Extract standalone event modifiers (once, debounced, throttled) from input
  const { modifiers, remainingInput } = extractStandaloneModifiers(input, language);
  const modInput = remainingInput || input;

  // Strip a transparent `async` command prefix (`async fetch … then …`). `async`
  // marks the *following* command for asynchronous execution — it's a modifier,
  // not a command verb. The grammar transformer, treating it as a verb, reorders
  // it (often verb-final SOV / event-mid VSO), so a fused event pattern captures
  // `async` as the handler action and the real command + then-chain collapse to a
  // degenerate parse. Removing the keyword and re-parsing the remainder mirrors
  // English — whose body parser already skips `async`, so the action set is
  // identical with or without it (async is not yet surfaced as a node; preserving
  // its execution semantics across languages is Track 5 Tier 2). Gated to the
  // async keyword token, so non-async inputs are byte-identical.
  const asyncStrip = stripAsyncModifier(modInput, language);
  const asyncInput = asyncStrip.remainingInput ?? modInput;

  // Strip the `do [not] throw` fetch-error modifier (en `fetch … as JSON do not
  // throw`). It is a fetch OPTION (suppress the error throw), not a command — en
  // drops it entirely (no `throw` action). The SOV grammar transform mangles it:
  // the English `do` leaks untranslated and the throw VERB is reordered out, so
  // in a multi-clause body (`… 投げる それから もし …`) it anchors a spurious
  // `throw` command (the fetch-do-not-throw phantom-throw, a precision defect in
  // bn/hi/ja/ko/tr). Removing the `do … throw` span before parsing matches en and
  // is a no-op on en's action set. Gated to a literal `do` followed within two
  // tokens by a `throw`-normalized verb, so a real `throw` (no leaked `do`) and a
  // pl/pt `do`-marker not adjacent to a throw verb are byte-identical.
  const dntStrip = stripDoNotThrowModifier(asyncInput, language);
  const parseInput = dntStrip.remainingInput ?? asyncInput;

  // Diagnostics accumulator (Phase 3.4)
  const diagnostics: Diagnostic[] = [];

  // Tokenize the input
  const tokens = tokenizeInternal(parseInput, language);
  // The text these tokens' `position` offsets index into. `consumeJsBlock`
  // slices it to recover a js body's ORIGINAL spacing; every other consumer
  // reads token values, so this is the only reason the parser keeps it.
  // Guarded there against a stale value (a nested `this.parse` of a sub-block
  // overwrites it), so it can never produce text the tokens do not support.
  state.positionSource = parseInput;

  // Stage 0.2: a BARE `js … end` block. `consumeJsBlock` is otherwise only
  // reached from the clause walk, so a js block inside a handler was opaque
  // while the same block on its own fell to the per-language `js` PATTERN —
  // which re-spaces the JavaScript and, in zh, splits the `JS执行` compound
  // verb and returns `js 执行`, losing the body outright. Head-form ONLY: the
  // verb-final variant scans forward for its keyword, and at this stage the
  // event-handler head has not been consumed yet, so it would swallow it
  // (`クリック を で … を JS実行 終わり` → one js command whose body is the whole
  // handler). It runs in the clause walk, where the head is already gone.
  // Gated on the block consuming the WHOLE input, so every other parse is
  // byte-identical.
  {
    const mark = tokens.mark();
    const bareJs = consumeJsBlock(tokens, language, state.positionSource);
    if (bareJs && tokens.isAtEnd()) return withDiagnostics(bareJs, diagnostics);
    tokens.reset(mark);
  }

  // Get patterns for this language
  const patterns = getPatternsForLanguage(language);

  if (patterns.length === 0) {
    throw new SemanticParseError(
      `No patterns available for language: ${language}`,
      language,
      parseInput,
      [parseDiagnostic(`No patterns registered for language '${language}'`, 'error', 'no-patterns')]
    );
  }

  // Sort patterns by priority (descending)
  const sortedPatterns = [...patterns].sort((a, b) => b.priority - a.priority);

  // VSO from-first event-handler head. The VSO transform fronts a handler's
  // `from <source>` clause ahead of the `on <event>` marker (`من triggerEl عند
  // نقر` / `mula_sa triggerEl kapag click` = `on click from triggerEl`), so no
  // event pattern anchors on the leading source marker and the whole handler +
  // body drop (ar/tl behavior-removable/sortable were degenerate). When the
  // input leads with a `source` marker and an `on`-marker follows, move the
  // leading from-clause to AFTER the event and re-parse the normalized
  // `on <event> from <source>` order — the same order the event path already
  // handles in SVO (es `en clic de triggerEl`). The reorder preserves the
  // source (it is moved, not dropped), so role-fidelity is intact. Gated to VSO
  // + this exact `<source-marker> … <on-marker> <event>` token shape and only
  // returned when the re-parse yields an event-handler, so it can only add parses.
  {
    const arr = tokens.tokens as LanguageToken[];
    if (
      tryGetProfile(language)?.wordOrder === 'VSO' &&
      arr.length >= 4 &&
      arr[0]?.normalized === 'source'
    ) {
      const onIdx = arr.findIndex(t => t.normalized === 'on');
      if (onIdx >= 2 && onIdx + 1 < arr.length) {
        const fromClause = parseInput
          .slice(arr[0].position.start, arr[onIdx].position.start)
          .trim();
        const eventEnd = arr[onIdx + 1].position.end;
        const reordered =
          parseInput.slice(arr[onIdx].position.start, eventEnd) +
          ' ' +
          fromClause +
          parseInput.slice(eventEnd);
        if (reordered !== parseInput) {
          try {
            const reparsed = state.parse(reordered, language);
            if (reparsed && reparsed.kind === 'event-handler') {
              const result = modifiers
                ? applyModifiers(reparsed as EventHandlerSemanticNode, modifiers)
                : reparsed;
              return withDiagnostics(result, diagnostics);
            }
          } catch {
            // fall through to the normal stages unchanged
          }
        }
      }
    }
  }

  // Displaced event-SOURCE clause drop. A handler's `from <source>` phrase is
  // dropped by the parser BY DESIGN — en `on keydown[..] from .modal if …`
  // itself renders `on keydown[..] if …`; the source never round-trips in any
  // language. But when a reordered non-English source floats that clause into
  // the body ahead of its own `on <event>` head — tl
  // `… mula_sa .modal kapag keydown[..]`, ar `… من نافذة عند keydown[..]` — no
  // event pattern consumes the `<source-marker> <value>` pair, so it LEAKS
  // (`source .modal` / `من window`) into the rendered condition and the
  // canonical parser rejects it. Excise the pair when it sits immediately
  // before the `<on-marker> <event>` head and re-parse: the remainder is the
  // same handler minus a clause en drops anyway, so this can only ever REMOVE
  // a leak — it never changes a faithful render. Gated on the exact
  // `source · value · on · <known-event>` token shape and on the re-parse
  // yielding an event-handler, so it can only add parses. The leading-position
  // VSO form is the from-first block above (which MOVES the clause); this
  // covers the mid-input position, where moving still leaks (the parser has no
  // faithful `from <selector>` event-source render to move it into).
  //
  // CONDITION-LED heads only (`arr[0]` normalizes to `if`). A `from <source>`
  // clause is the EVENT source only when nothing governs it: a condition has no
  // `from`-source role, so a floating source between the condition and the
  // event head can only be the handler's. A COMMAND-led head owns its source —
  // tl `alisin .active mula_sa .items kapag click` (remove .active from .items
  // on click) and `tawagin adjustLayout() mula_sa bintana … kapag resize`
  // (call … from window … on resize) both put a real command source right
  // before the event marker, and excising it would drop the command's role.
  {
    const arr = tokens.tokens as LanguageToken[];
    const conditionLed = arr[0]?.normalized === 'if';
    for (let s = 0; conditionLed && s + 3 < arr.length; s++) {
      const evNorm = (arr[s + 3]?.normalized ?? arr[s + 3]?.value ?? '').toLowerCase();
      if (
        arr[s]?.normalized === 'source' &&
        arr[s + 2]?.normalized === 'on' &&
        KNOWN_EVENTS.has(evNorm)
      ) {
        const reduced = (
          parseInput.slice(0, arr[s].position.start).trimEnd() +
          ' ' +
          parseInput.slice(arr[s + 1].position.end).trimStart()
        ).trim();
        if (reduced && reduced !== parseInput) {
          try {
            const reparsed = state.parse(reduced, language);
            if (reparsed && reparsed.kind === 'event-handler') {
              const result = modifiers
                ? applyModifiers(reparsed as EventHandlerSemanticNode, modifiers)
                : reparsed;
              return withDiagnostics(result, diagnostics);
            }
          } catch {
            // fall through to the normal stages unchanged
          }
        }
        break; // only the first source-before-event clause
      }
    }
  }

  // `fetch … do not throw`: see tryDoNotThrow.
  {
    const flagged = tryDoNotThrow(
      tokens.tokens as LanguageToken[],
      parseInput,
      language,
      state.parse
    );
    if (flagged) {
      const result =
        modifiers && flagged.kind === 'event-handler'
          ? applyModifiers(flagged as EventHandlerSemanticNode, modifiers)
          : flagged;
      return withDiagnostics(result, diagnostics);
    }
  }

  // `tell <target> to …`: see tryTellTo.
  {
    const told = tryTellTo(tokens.tokens as LanguageToken[], parseInput, language, state.parse);
    if (told) {
      const result =
        modifiers && told.kind === 'event-handler'
          ? applyModifiers(told as EventHandlerSemanticNode, modifiers)
          : told;
      return withDiagnostics(result, diagnostics);
    }
  }

  // A `go`/`scroll` position or adverb: see tryScrollModifiers.
  {
    const placed = tryScrollModifiers(
      tokens.tokens as LanguageToken[],
      parseInput,
      language,
      state.parse
    );
    if (placed) {
      const result =
        modifiers && placed.kind === 'event-handler'
          ? applyModifiers(placed as EventHandlerSemanticNode, modifiers)
          : placed;
      return withDiagnostics(result, diagnostics);
    }
  }

  // A loop's index variable (`index i`, core's `with index`): see tryLoopIndex.
  {
    const indexed = tryLoopIndex(
      tokens.tokens as LanguageToken[],
      parseInput,
      language,
      state.parse
    );
    if (indexed) {
      const result =
        modifiers && indexed.kind === 'event-handler'
          ? applyModifiers(indexed as EventHandlerSemanticNode, modifiers)
          : indexed;
      return withDiagnostics(result, diagnostics);
    }
  }

  // A `wait for` run with more than its first event (params, `or`
  // alternatives, a `from` source): see tryWaitAlternatives.
  {
    const waited = tryWaitAlternatives(
      tokens.tokens as LanguageToken[],
      parseInput,
      language,
      state.parse
    );
    if (waited) {
      const result =
        modifiers && waited.kind === 'event-handler'
          ? applyModifiers(waited as EventHandlerSemanticNode, modifiers)
          : waited;
      return withDiagnostics(result, diagnostics);
    }
  }

  // Event PARAMETERS on the handler head: `on pointerdown(clientX, clientY)
  // from dragHandle`. The SOV head extraction consumes a param phrase, but the
  // SVO/VSO event patterns expect a `from` or the body right after the event:
  // the `(` broke the source pattern, and the params and the `from` phrase
  // after them fell into the body, where they were discarded. Excise the
  // phrase, re-parse the plain head, and put the names back as
  // `parameterNames` (which buildAST hands core as `args`). The scan stops at
  // the first command word: a call in the body (`wait for pointermove(clientY)`,
  // `log f(x)`) is never a head, and the confirmation below would reject one
  // anyway, so the stop is what keeps a long body from costing a re-parse per
  // call.
  //
  // Every candidate is confirmed by the re-parse: the handler's event must be
  // the word before the phrase. So a custom event qualifies (`on myEvent(detail)`,
  // ja `myEvent(detail) を で`), and a call that is not the event never does:
  // a body pseudo-command `click()` in `on load click() me`, a behavior header
  // `Demo(cls)`, `js(me)`.
  {
    const arr = tokens.tokens as LanguageToken[];
    const commands = commandWordsFor(language);
    for (let i = 0; i + 1 < arr.length; i++) {
      const t = arr[i];
      if (isBodyCommandWord(t, commands)) break;
      if (arr[i + 1].value !== '(') continue;
      const norm = (t.normalized ?? t.value).toLowerCase();
      const known = KNOWN_EVENTS.has(norm) || WAITABLE_EVENT_WORDS.has(norm);
      if (!known && t.kind !== 'identifier') continue;
      const phrase = matchEventParamPhrase(arr, i + 1);
      if (phrase.len === 0) continue;
      const close = arr[i + phrase.len];
      const reduced = (
        parseInput.slice(0, arr[i + 1].position.start).trimEnd() +
        ' ' +
        parseInput.slice(close.position.end).trimStart()
      ).trim();
      try {
        let reparsed = state.parse(reduced, language);
        // The outermost parse joins an event the tokenizer split into words
        // (ar `تمرير الماوس` is mouseover, not its first word's `scroll`).
        // This re-parse is nested, so join it here.
        if (reparsed?.kind === 'event-handler') {
          const joined = reclaimEventCompoundTail(
            hoistUnconsumedDiagnostics(reparsed) as EventHandlerSemanticNode,
            reduced,
            language
          );
          if (joined) reparsed = joined.node;
        }
        const event = reparsed?.roles.get('event' as SemanticRole);
        const eventName =
          event?.type === 'expression'
            ? event.raw
            : event && 'value' in event
              ? String(event.value)
              : undefined;
        const named = eventName?.toLowerCase();
        // The event's own spelling right before the phrase: its keyword or
        // English name, or any native form the head reads as it — a coinage
        // (de `mausbewegen`), several words (ar `ضغط المفتاح`), an unspaced
        // name (zh `鼠标移动`). Comparing one token missed all three.
        const before = parseInput
          .slice(0, arr[i + 1].position.start)
          .trimEnd()
          .toLowerCase();
        const spelled =
          named === t.value.toLowerCase() ||
          named === norm ||
          (named !== undefined &&
            nativeEventNames(named, language).some(native =>
              before.endsWith(native.toLowerCase())
            ));
        if (reparsed?.kind === 'event-handler' && spelled) {
          (reparsed as { parameterNames?: string[] }).parameterNames = phrase.names;
          const result = modifiers
            ? applyModifiers(reparsed as EventHandlerSemanticNode, modifiers)
            : reparsed;
          return withDiagnostics(result, diagnostics);
        }
      } catch {
        // not this phrase: keep looking
      }
    }
  }

  // Multi-event `or` conjunction normalization. A handler head can list several
  // events: `on click or keypress[key=="Enter"] toggle .active`. English handles
  // this in buildEventHandler (extractOrConjunctionEvents runs right after the
  // event is captured), but the per-language pattern paths do NOT: the SVO "full"
  // patterns capture the translated `or` (`o`/`또는`/…) as a phantom body command
  // (it → `or` command → runtime "Unknown command: or"), and the SOV Stage-3
  // fallback mangles the clause (ko folds `또는keypress…할때` into an invalid CSS
  // selector), so the handler never binds the first event and the body drops.
  // Normalize uniformly: excise the `<or-word> <event>[ <[filter]>]` span and
  // re-parse the remaining single-event handler — which every language already
  // parses — then re-attach the extra event(s) as `additionalEvents`. The source
  // event is preserved (moved to additionalEvents), so fidelity is intact, and en
  // routes through here byte-identically to its old extractOrConjunctionEvents
  // result. Gated on a KNOWN event after the or-word, so it can NEVER fire on `or`
  // inside an expression (`when $a or $b changes`, `($count or 0)` — the post-`or`
  // token there is a variable/number, not an event).
  {
    const arr = tokens.tokens as LanguageToken[];
    const commands = commandWordsFor(language);
    for (let i = 1; i < arr.length - 1; i++) {
      const t = arr[i];
      // Only the HEAD's `or`: a command word means the body has begun, and an
      // `or <event>` after it is that command's (`wait for keydown or click`).
      // Lifting it into the head gave the handler an event its author never
      // bound. A verb-final (SOV) body still reaches here: its verb comes
      // after its arguments.
      if (isBodyCommandWord(t, commands)) break;
      // Language-scoped: `o` is the or-word in es/it/tl and the BY-marker in
      // pl, so a language-blind surface match reads `zwiększ #score o 10` as a
      // conjunction.
      if (!isOrWordToken(t, language)) continue;
      const evTok = arr[i + 1];
      const evNorm = (evTok.normalized ?? evTok.value).toLowerCase();
      if (!KNOWN_EVENTS.has(evNorm)) break;
      // Optional trailing `[filter]` selector token (`keypress[key=="Enter"]`
      // tokenizes as `keypress` + `[key=="Enter"]`).
      let lastIdx = i + 1;
      const filterTok = arr[i + 2];
      if (filterTok && filterTok.kind === 'selector' && filterTok.value.startsWith('[')) {
        lastIdx = i + 2;
      }
      const exciseStart = arr[i].position.start;
      const exciseEnd = arr[lastIdx].position.end;
      const reduced = (
        parseInput.slice(0, exciseStart).trimEnd() +
        ' ' +
        parseInput.slice(exciseEnd).trimStart()
      ).trim();
      if (reduced && reduced !== parseInput) {
        try {
          const reparsed = state.parse(reduced, language);
          if (reparsed && reparsed.kind === 'event-handler') {
            // The filter stays glued to its leg, as the main event's does
            // (`keydown[key=="Escape"]`): it was excised with the leg and lost.
            (reparsed as { additionalEvents?: SemanticValue[] }).additionalEvents = [
              { type: 'literal', value: lastIdx > i + 1 ? evNorm + filterTok.value : evNorm },
            ];
            const result = modifiers
              ? applyModifiers(reparsed as EventHandlerSemanticNode, modifiers)
              : reparsed;
            return withDiagnostics(result, diagnostics);
          }
        } catch {
          // fall through to the normal stages unchanged
        }
      }
      break; // only the first or-clause in the head
    }
  }

  // Event-modifier phrase lift. The grammar transformer leaves the `once` /
  // `debounced|throttled at <duration>` handler-modifier phrase mid-clause
  // (SVO: after the event head; window-resize: clause-final after the body)
  // or renders `once` as a translated word (ru/uk/vi), so no event pattern
  // consumes it: the span drops as unconsumed junk — or worse, is silently
  // swallowed (it/th `once`) — and `eventModifiers` stays null in every one
  // of those languages, en included. The leading-position form (SOV/VSO
  // heads) is extractStandaloneModifiers' job above; this lift covers every
  // other position. Excise the phrase offset-exactly, re-parse the reduced
  // input — which parses clean by construction — and re-attach the captured
  // modifiers. Gated on the re-parse yielding an event-handler, so command
  // or expression inputs that merely contain these words fall through
  // byte-identical. Mid-stream phrases never default a missing duration
  // (unlike the leading path): a bare `debounced` with no `<n>ms` in reach
  // is left untouched.
  {
    const lift = findEventModifierPhrase(tokens.tokens as LanguageToken[]);
    if (lift) {
      const reduced = (
        parseInput.slice(0, lift.start).trimEnd() +
        ' ' +
        parseInput.slice(lift.end).trimStart()
      ).trim();
      if (reduced && reduced !== parseInput) {
        try {
          const reparsed = state.parse(reduced, language);
          if (reparsed && reparsed.kind === 'event-handler') {
            // (A dangling `from <source>` tail — the window-resize shape —
            // is reclaimed by the stage-2 hook in parse() once this result
            // surfaces at the top level carrying the lifted modifiers.)
            const result = applyModifiers(reparsed as EventHandlerSemanticNode, {
              ...(modifiers ?? {}),
              ...lift.modifiers,
            });
            return withDiagnostics(result, diagnostics);
          }
        } catch {
          // fall through to the normal stages unchanged
        }
      }
    }
  }

  // Stage 1: Try event handler patterns first (they wrap commands)
  const eventPatterns = sortedPatterns.filter(p => p.command === 'on');
  // matchBest re-consumes the winning match, leaving the stream past the event;
  // the bare-event guard below needs to rewind here to peek/re-run from the start.
  const eventStart = tokens.mark();
  const eventMatch = patternMatcher.matchBest(tokens, eventPatterns);

  if (eventMatch) {
    diagnostics.push(
      parseDiagnostic(
        `event pattern matched: ${eventMatch.pattern.id} (confidence: ${eventMatch.confidence.toFixed(2)})`,
        'info',
        'pattern-match'
      )
    );

    // Event-anchor guard. A bare-event pattern (`event-<lang>-bare`: a single
    // `{event}` token at position 0) anchors on whatever leads the stream — so a
    // SOV reorder that fronts an untranslated condition (`I match .disabled … क्लिक
    // पर जब तक नहीं`, hi unless-condition) makes it grab `I` as the event, burying
    // the real `<known-event> पर` trigger mid-body where it can't be recovered (the
    // toggle then mis-anchors on the fronted condition). When the bare capture is
    // NOT a known event AND SOV extraction can recover a real mid-stream event,
    // prefer that — it strips the true `<event> पर` and re-parses the body (where the
    // trailing-`unless` guard then fires). Additive: gated to a non-event bare
    // capture and only taken when trySOVEventExtraction actually succeeds, so a
    // genuine bare event (`क्लिक`) or a lang without SOV markers is byte-identical.
    let preferCommandStage = false;
    if (/^event-[a-z]+-bare$/.test(eventMatch.pattern.id)) {
      const ev = eventMatch.captured.get('event') as
        { type?: string; raw?: string; value?: string } | undefined;
      const evVal = (ev?.raw ?? ev?.value ?? '').toString().toLowerCase();
      const langEvents = eventNameTranslations[language];
      const evIsKnownEvent =
        KNOWN_EVENTS.has(evVal) ||
        (!!langEvents && Object.keys(langEvents).some(n => n.toLowerCase() === evVal));
      if (evVal && !evIsKnownEvent) {
        const sov = trySOVEventExtraction(state, parseInput, language, sortedPatterns);
        if (sov) {
          diagnostics.push(
            parseDiagnostic(
              `bare-event mis-anchor on "${evVal}" rejected; SOV extraction preferred`,
              'info',
              'stage-bare-event-guard'
            )
          );
          const guarded = modifiers
            ? applyModifiers(sov as EventHandlerSemanticNode, modifiers)
            : sov;
          return withDiagnostics(guarded, diagnostics);
        }
        // No real event to recover, but the bare-event pattern still anchored on a
        // `reference` lead — a `$variable`, which can NEVER be an event name (events
        // are bare identifiers like click/keyup). This is a bare COMMAND whose
        // fronted operand the bare-event pattern grabbed: the SOV `bind`
        // (`$greeting को #name-input में bind` → mis-anchors `$greeting` as the
        // event). Same for a non-event `expression` lead (`Draggable को इंस्टॉल`
        // mis-anchors `Draggable` as the event and the verb-anchoring fallback
        // fabricates a junk install body — phantom handler, R0-precision).
        // Prefer a full command parse when one exists; if no command
        // matches, keep the existing event-handler build (no parse-rate change).
        if (ev?.type === 'reference' || ev?.type === 'expression') {
          tokens.reset(eventStart); // rewind past the consumed bare event
          const commandPatterns = sortedPatterns.filter(p => p.command !== 'on');
          const cmdPeek = patternMatcher.matchBest(tokens, commandPatterns);
          tokens.reset(eventStart); // restore for Stage 2 (prefer) or event re-run (below)
          if (cmdPeek && (cmdPeek.pattern.command as string) !== 'on') {
            preferCommandStage = true;
            diagnostics.push(
              parseDiagnostic(
                `bare-event mis-anchor on reference "${evVal}" rejected; command ${cmdPeek.pattern.command} preferred`,
                'info',
                'stage-bare-event-guard'
              )
            );
          } else {
            // No command matched — keep the existing event-handler build. Re-run the
            // event match to restore the post-event stream position buildEventHandler
            // expects (matchBest is deterministic, so this re-consumes the same event).
            patternMatcher.matchBest(tokens, eventPatterns);
          }
        }
      }
    }

    if (!preferCommandStage) {
      const handler = buildEventHandler(state, eventMatch, tokens, language);
      const result = modifiers ? applyModifiers(handler, modifiers) : handler;
      return withDiagnostics(result, diagnostics);
    }
    // else: fall through to Stage 1.5 / Stage 2 (command), the stream rewound to
    // eventStart, where the real command (e.g. SOV bind) matches over the full stream.
  }
  diagnostics.push(
    parseDiagnostic(
      `event patterns: ${eventPatterns.length} tried, no match`,
      'info',
      'stage-event'
    )
  );

  // Stage 1.5: Trailing event clause wrapping a block/command body.
  // SVO/VSO grammar transforms put the event clause at the end
  // (`<body> عند <event>` / `<body> kapag <event>`). The per-command fused
  // event patterns (toggle-event-ar-vso-…) only cover simple bodies, so a
  // block body (e.g. `unless <cond> toggle …`) falls through to a hollow
  // standalone-command match. This generic wrapper recognizes the trailing
  // event and parses everything before it as the handler body. It runs only
  // after the dedicated event patterns failed, and returns null (falling
  // through to the command stage unchanged) unless it finds a genuine trailing
  // event whose preceding tokens parse as a body — so it can only add parses,
  // never break an existing one.
  const trailingResult = tryTrailingEventExtraction(state, parseInput, language, sortedPatterns);
  if (trailingResult) {
    diagnostics.push(
      parseDiagnostic('trailing event extraction succeeded', 'info', 'stage-trailing-event')
    );
    const result = modifiers
      ? applyModifiers(trailingResult as EventHandlerSemanticNode, modifiers)
      : trailingResult;
    return withDiagnostics(result, diagnostics);
  }

  // Stage 2: Try command patterns
  const commandPatterns = sortedPatterns.filter(p => p.command !== 'on');

  // A leading `unless` guard, STANDALONE (no handler around it). The clause
  // paths reach tryParseUnlessGuard on their own; a bare `unless <cond> <cmd>`
  // arrives here instead, where the flat `unless {condition}` pattern would
  // capture one value and truncate the guard. Same splitter, same flat shape —
  // see tryParseUnlessGuard. Returns null (stream reset) for anything that is
  // not a usable leading unless, so every other input is byte-identical.
  const standaloneUnless = tryParseUnlessGuard(state, tokens, commandPatterns, language);
  if (standaloneUnless && standaloneUnless.length > 0) {
    const unlessResult =
      standaloneUnless.length === 1
        ? standaloneUnless[0]
        : createCompoundNode(standaloneUnless, 'then', {
            sourceLanguage: language,
            confidence: 1,
          });
    return withDiagnostics(unlessResult, diagnostics);
  }

  const commandMatch = patternMatcher.matchBest(tokens, commandPatterns);

  if (commandMatch) {
    // A bare block/loop keyword (if/unless/while/repeat/for) can shadow the SOV
    // event + loop-body path. For SOV languages the grammar transformer surfaces
    // the loop keyword (反復/반복/পুনরাবৃত্তি) — or a leading `while`/`for` clause —
    // ahead of its body, so Stage 2 matches it as a *standalone* command and the
    // event + loop variant + body are all dropped (a degenerate parse). Korean is
    // hit hardest: with no event-marker particle, the Stage-1 fused event pattern
    // can't anchor, so the bare loop keyword always wins here. When the matched
    // action is a block/loop action, prefer the SOV event extraction (Stage 3),
    // which finds the (possibly mid-stream) event, strips it, and re-parses the
    // loop body — recovering the loop keyword + body commands. Gated to block/loop
    // actions and only taken when SOV extraction actually finds an event whose
    // body parses (it returns null otherwise — e.g. a genuine standalone loop with
    // no event), so it can only add parses, never break the counted/standalone
    // variants. Mirrors the if/else block-body fix (the parser was the real
    // blocker, capturing the block keyword as the action and dropping the body).
    if (BLOCK_BODY_ACTIONS.has(commandMatch.pattern.command)) {
      const sovLoop = trySOVEventExtraction(state, parseInput, language, sortedPatterns);
      if (sovLoop) {
        diagnostics.push(
          parseDiagnostic(
            `SOV event extraction preferred over bare ${commandMatch.pattern.command} command`,
            'info',
            'stage-sov-loop'
          )
        );
        const result = modifiers
          ? applyModifiers(sovLoop as EventHandlerSemanticNode, modifiers)
          : sovLoop;
        return withDiagnostics(result, diagnostics);
      }
      // VSO/SVO sibling: the event sits *mid-stream*, marked by an `on`-marker
      // right after the leading loop keyword (`كرر عند نقر …` / `ulitin kapag
      // click …` = `repeat on click …`). The trailing-event extractor (Stage 1.5)
      // can't see it (the event isn't last), so the bare loop keyword wins Stage 2
      // and the event + body drop. Strip the `<on-marker> <event>` pair and parse
      // the remainder (leading loop keyword + for/while clause + then-chain body)
      // as the loop body. Same guard shape as the SOV path: gated to block/loop
      // actions, fires only on a real on-marked event whose body parses.
      const midLoop = tryMidStreamEventExtraction(state, parseInput, language, sortedPatterns);
      if (midLoop) {
        diagnostics.push(
          parseDiagnostic(
            `mid-stream event extraction preferred over bare ${commandMatch.pattern.command} command`,
            'info',
            'stage-midstream-loop'
          )
        );
        const result = modifiers
          ? applyModifiers(midLoop as EventHandlerSemanticNode, modifiers)
          : midLoop;
        return withDiagnostics(result, diagnostics);
      }
    } else if (
      KNOWN_EVENTS.has(commandMatch.pattern.command) &&
      hasSOVEventMarkerHead(parseInput, language)
    ) {
      // SOV command-homonym event head (ko `window-scroll`): the handler's event
      // word is also a real command (`스크롤` = scroll event AND scroll command).
      // With no single-token event marker, ko's Stage-1 fused event pattern can't
      // anchor once a `from <source>` clause (`창 에서`) splits the head, so Stage 2
      // matches `스크롤` as the scroll command (absorbing `from window` as a role) and
      // returns before Stage 3. When the matched action is itself a known event AND
      // the input carries an SOV event-marker head (`스크롤 할 때` = "on scroll"),
      // prefer SOV extraction — it anchors the homonym as the event and re-parses the
      // body (the same path that already parses the non-homonym `클릭 … 창 에서 …`
      // faithfully). trySOVEventExtraction returns null for a genuine bare command
      // (no marker head / unparseable body), so this is additive. Mirrors the
      // BLOCK_BODY_ACTIONS guard above.
      const sovHomonym = trySOVEventExtraction(state, parseInput, language, sortedPatterns);
      if (sovHomonym) {
        diagnostics.push(
          parseDiagnostic(
            `SOV event extraction preferred over command-homonym event ${commandMatch.pattern.command}`,
            'info',
            'stage-sov-homonym'
          )
        );
        const result = modifiers
          ? applyModifiers(sovHomonym as EventHandlerSemanticNode, modifiers)
          : sovHomonym;
        return withDiagnostics(result, diagnostics);
      }
    } else if (tryGetProfile(language)?.wordOrder === 'VSO') {
      // VSO (verb-initial: ar, tl): a *plain* leading command (not a block/loop)
      // can be followed by a mid-stream event clause — `احذف .x من .y عند نقر ثم …`
      // / `alisin .x mula sa .y kapag click pagkatapos …` (= `remove .x from .y on
      // click then …`). The transformer fronts the verb and places the event after
      // the first command, so the bare command wins Stage 2 and the event + the
      // then-chain body drop (ar/tl `tabs-*`, `accordion-exclusive`, `halt-*`,
      // `copy-to-clipboard`, `form-submit-prevent`). Restricted to VSO: in
      // event-first SVO/SOV languages a plain command is never an event-mid-stream
      // form, and running the extractor there mis-fires on incidental `on`+event
      // token pairs. Same extractor as the loop path; it fires only on a real
      // on-marked event whose body parses (null otherwise), so within VSO it can
      // only add parses, never break the counted standalone-command variant.
      const midCmd = tryMidStreamEventExtraction(state, parseInput, language, sortedPatterns);
      if (midCmd) {
        diagnostics.push(
          parseDiagnostic(
            `mid-stream event extraction preferred over bare ${commandMatch.pattern.command} command`,
            'info',
            'stage-midstream-cmd'
          )
        );
        const result = modifiers
          ? applyModifiers(midCmd as EventHandlerSemanticNode, modifiers)
          : midCmd;
        return withDiagnostics(result, diagnostics);
      }
    }
    // SOV trailing-event guard: a fused SOV render is `<body> <event> <marker>`
    // (ja `… に 設定 クリック で`). When the plain command pattern can now match
    // the body AT POSITION 0 (e.g. the of-possessive destination made
    // set-ja-generated whole), it wins Stage 2 with the trailing event phrase
    // left unconsumed — and the handler wrapper silently drops (the event
    // extraction stages never run after a Stage-2 return). If the match left a
    // trailing remainder in an SOV language, prefer the event extraction; it
    // fires only on a real event whose body parses (null otherwise), so it can
    // only add the wrapper back, never break a genuine bare command.
    if (
      commandMatch.consumedTokens < tokens.tokens.length &&
      tryGetProfile(language)?.wordOrder === 'SOV'
    ) {
      const sovTrailing = trySOVEventExtraction(state, parseInput, language, sortedPatterns);
      if (sovTrailing) {
        diagnostics.push(
          parseDiagnostic(
            `SOV event extraction preferred over partial ${commandMatch.pattern.command} command (trailing remainder)`,
            'info',
            'stage-sov-trailing'
          )
        );
        const result = modifiers
          ? applyModifiers(sovTrailing as EventHandlerSemanticNode, modifiers)
          : sovTrailing;
        return withDiagnostics(result, diagnostics);
      }
    }
    // Top-level command SEQUENCE guard: `parseInternal` has no program layer for
    // plain commands, so a sequence is truncated to its first command at top
    // level while parsing correctly INSIDE any block:
    //
    //   add .a to #x then add .b to #y   handler: [on, add, add]   top: [add]
    //   bind $n to #a bind $n to #b      handler: [on, bind, bind] top: [bind]
    //
    // Stage 2 matches the first command and returns; the rest is dropped, and
    // the `unconsumed-input` diagnostic below is the only trace. Stage 4
    // (tryCompoundCommandParsing) can't help: it is only reached when Stage 2
    // finds NO match, and it requires a `then`/`else` keyword — but the English
    // form is JUXTAPOSED (only the translations insert a conjunction), so a
    // then-only fix would pass 23 languages and fail English. tryParseProgram
    // (Stage 0.5) bails unless every segment is an event-handler, by design.
    //
    // parseBodyWithClauses already handles both the then-chained and the
    // juxtaposed form — that is precisely why the same input parses inside a
    // handler. Route to it. Additive by the same discipline as every other
    // guard in this stage: it returns null unless the remainder genuinely
    // parses into a second command, so a real single command with an
    // unparseable tail (`set x to 5 +`, `fetch /api with { … }`) is byte-
    // identical to before and still reports `unconsumed-input`.
    //
    // Deliberately placed AFTER the SOV trailing-event guard above. A
    // multi-command SOV body with a fused trailing event
    // (`.active を 切り替え それから .b を 削除 クリック で`) parses here as a bare
    // two-command sequence, silently dropping the `on click` wrapper; the SOV
    // guard must claim it first. (The single-command SOV case does not
    // distinguish the two orderings — the >1 gate below is false either way.)
    //
    // Excluded for BLOCK_BODY_ACTIONS. A block command's body legitimately
    // trails its flat pattern match — `repeat 3 times toggle .x end` leaves
    // `toggle .x end` unconsumed — and the clause parser reads that body as a
    // SIBLING clause, yielding `compound[repeat, toggle]`: a loop with no body
    // beside a stray toggle. That is a worse parse, not a better one. Whether
    // the body should instead NEST into the block is a separate, pre-existing
    // defect of the same family as the feature blocks fixed in #628/#629; it
    // still reports `unconsumed-input` below, so it stays visible rather than
    // being papered over by a flatten.
    //
    // A LOOP now nests: the clause walker folds its body into a loop node,
    // so a top-level `repeat …`/`for …` routes to tryTopLevelLoop instead.
    if (
      commandMatch.consumedTokens < tokens.tokens.length &&
      BLOCK_HEAD_ACTIONS.has(commandMatch.pattern.command)
    ) {
      const loop = tryTopLevelLoop(state, tokens, commandPatterns, language);
      if (loop) {
        diagnostics.push(
          parseDiagnostic(`top-level loop: ${loop.kind}`, 'info', 'stage-top-level-loop')
        );
        return withDiagnostics(loop, diagnostics);
      }
    }
    if (
      commandMatch.consumedTokens < tokens.tokens.length &&
      !BLOCK_BODY_ACTIONS.has(commandMatch.pattern.command)
    ) {
      const sequence = tryTopLevelCommandSequence(state, tokens, commandPatterns, language);
      if (sequence) {
        diagnostics.push(
          parseDiagnostic(
            `top-level command sequence: ${sequence.statements.length} commands`,
            'info',
            'stage-top-level-sequence'
          )
        );
        return withDiagnostics(sequence, diagnostics);
      }
    }
    // A top-level conditional whose body trails it: the pattern stops after
    // the condition, so returning the match drops the body (bn `p যদি না তারপর
    // .selected কে টগল করুন` read as `unless p`). The compound stage reads
    // the conditional and its then-chain, as it did whenever the condition
    // was too long for the pattern to match at all.
    if (
      commandMatch.consumedTokens < tokens.tokens.length &&
      (commandMatch.pattern.command === 'if' || commandMatch.pattern.command === 'unless')
    ) {
      const compound = tryCompoundCommandParsing(
        state,
        tokens,
        commandPatterns,
        language,
        commandMatch.pattern.command === 'if'
      );
      if (compound) {
        diagnostics.push(
          parseDiagnostic('conditional with a trailing body', 'info', 'stage-compound')
        );
        return withDiagnostics(compound, diagnostics);
      }
    }
    diagnostics.push(
      parseDiagnostic(
        `command pattern matched: ${commandMatch.pattern.id} (confidence: ${commandMatch.confidence.toFixed(2)})`,
        'info',
        'pattern-match'
      )
    );
    // Input-coverage signal (diagnostic ONLY — it must not move the score).
    //
    // The confidence model scores how many of the PATTERN's roles were filled,
    // never how much of the INPUT was consumed. A short pattern that fills its
    // roles therefore reports confidence 1.0 while the unmatched tail is dropped
    // in silence — the defect behind `fetch … with { … }`, and the reason Stages
    // 0 and 0.5 above exist. Recording the dropped span makes that blindness
    // observable before anyone tries to price it into the score.
    const unconsumed = describeUnconsumedInput(commandMatch, tokens, parseInput);
    if (unconsumed) {
      diagnostics.push(parseDiagnostic(unconsumed, 'warning', 'unconsumed-input'));
    }
    return withDiagnostics(buildCommand(state, commandMatch, language), diagnostics);
  }
  diagnostics.push(
    parseDiagnostic(
      `command patterns: ${commandPatterns.length} tried, no match`,
      'info',
      'stage-command'
    )
  );

  // Stage 2.5 (VSO): mid-stream event with an UNMATCHED leading command.
  // The stage-midstream-cmd path above only runs when Stage 2 matched a
  // command — but the leading clause is often unmatchable (`itago
  // pinakamalapit .modal kapag click ثم …`: hide-closest has no tl pattern;
  // `breakpoint kapag click …`: breakpoint isn't a command keyword), so the
  // event + then-chain fell through to compound parsing and the handler was
  // lost (tl/ar modal-close-button, tl breakpoint-command). Same extractor,
  // same guard: fires only on a real on-marked event whose body parses, so
  // it can only add parses. Restricted to VSO like stage-midstream-cmd, and
  // to SINGLE-LINE input: a multi-line block (`behavior … init … on click …`)
  // legitimately contains an on-marked event in its body, and extracting it
  // would flatten the whole block into one handler (ar behavior-removable).
  if (!parseInput.includes('\n') && tryGetProfile(language)?.wordOrder === 'VSO') {
    const midNoCmd = tryMidStreamEventExtraction(state, parseInput, language, sortedPatterns);
    if (midNoCmd) {
      diagnostics.push(
        parseDiagnostic(
          'mid-stream event extraction succeeded with no leading command match',
          'info',
          'stage-midstream-nocmd'
        )
      );
      const result = modifiers
        ? applyModifiers(midNoCmd as EventHandlerSemanticNode, modifiers)
        : midNoCmd;
      return withDiagnostics(result, diagnostics);
    }
  }

  // Stage 3: Try SOV event trigger extraction
  const sovResult = trySOVEventExtraction(state, parseInput, language, sortedPatterns);
  if (sovResult) {
    diagnostics.push(parseDiagnostic('SOV event extraction succeeded', 'info', 'stage-sov'));
    const result = modifiers
      ? applyModifiers(sovResult as EventHandlerSemanticNode, modifiers)
      : sovResult;
    return withDiagnostics(result, diagnostics);
  }
  diagnostics.push(
    parseDiagnostic('SOV event extraction: no event keyword found', 'info', 'stage-sov')
  );

  // Stage 4: Fallback compound command parsing. A leading `if` whose condition
  // no pattern matched (`if true …`) is a conditional block all the same, with
  // or without a `then`. (A leading `unless` is core's, not upstream's, and its
  // clause reading runs the body unconditionally: it stays unread.)
  const compoundResult = tryCompoundCommandParsing(
    state,
    tokens,
    commandPatterns,
    language,
    isIfKeyword(tokens.tokens[0]?.value ?? '', language)
  );
  if (compoundResult) {
    diagnostics.push(
      parseDiagnostic('compound command parsing succeeded', 'info', 'stage-compound')
    );
    return withDiagnostics(compoundResult, diagnostics);
  }
  diagnostics.push(
    parseDiagnostic(
      'compound parsing: no then-keywords or no command matches',
      'info',
      'stage-compound'
    )
  );

  // Stage 5 (en): a bare pseudo-command (`click() me`) — the same rewrite the
  // clause parser applies inside a handler body.
  if (language === 'en') {
    const pseudoStream = tokenizeInternal(parseInput, language);
    const pseudo = tryParsePseudoCommand(state, pseudoStream, commandPatterns, language);
    if (pseudo && pseudoStream.isAtEnd()) {
      diagnostics.push(parseDiagnostic('pseudo-command parsed as call', 'info', 'stage-pseudo'));
      return withDiagnostics(pseudo, diagnostics);
    }
  }

  // All stages failed
  diagnostics.push(
    parseDiagnostic(`all parse stages exhausted for "${parseInput}"`, 'error', 'parse-failed')
  );

  throw new SemanticParseError(
    `Could not parse input in ${language}: ${parseInput}`,
    language,
    parseInput,
    diagnostics
  );
}

/**
 * A handler with `catch <name> …` / `finally …` after its commands: the
 * handler parsed without them, the clauses parsed as statement lists. Null
 * when the input has no such clause, or what precedes it is not a handler.
 */
export function tryParseErrorClauses(
  state: ParserState,
  input: string,
  language: string
): SemanticNode | null {
  const clauses = splitErrorClauses(input, language);
  if (!clauses || !clauses.main) return null;
  let handler: SemanticNode;
  try {
    handler = state.parse(clauses.main, language);
  } catch {
    return null;
  }
  if (handler.kind !== 'event-handler') return null;
  const parsers = {
    statement: (text: string, lang: string) => state.parse(text, lang),
    body: (text: string, lang: string) => parseStatements(state, text, lang),
  };
  return { ...handler, ...parseErrorClauses(clauses, language, parsers) };
}

/**
 * Parse a multi-command body/sequence into a flat list of statement nodes.
 * Unlike `parse()` (which returns on the first command match), this routes
 * through the clause splitter, so `add .a` newline `remove .b`, then-chains, and
 * nested if-blocks all yield every statement. Used by the structural layer for
 * `def` bodies and behavior `init` blocks.
 */
export function parseStatements(
  state: ParserState,
  input: string,
  language: string
): SemanticNode[] {
  const tokens = tokenizeInternal(input, language);
  const commandPatterns = getPatternsForLanguage(language)
    .filter(p => p.command !== 'on')
    .sort((a, b) => b.priority - a.priority);
  // Own coverage frame: drops recorded here attach to the LAST returned
  // statement (they describe trailing/interior body content), so a caller
  // that discards the statement list (a speculative block parse) discards
  // the records with it — same commit-with-the-node discipline as parse().
  state.coverageFrames.push([]);
  try {
    const nodes = parseBodyWithClauses(state, tokens, commandPatterns, language);
    const frame = state.coverageFrames[state.coverageFrames.length - 1];
    if (frame.length > 0 && nodes.length > 0) {
      const last = nodes[nodes.length - 1];
      nodes[nodes.length - 1] = withDiagnostics(last, [...(last.diagnostics ?? []), ...frame]);
    }
    return nodes;
  } finally {
    state.coverageFrames.pop();
  }
}
