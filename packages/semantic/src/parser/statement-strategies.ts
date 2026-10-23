/**
 * Whole-statement strategies `parseInternal` tries in turn: a top-level loop or
 * command sequence, a compound of commands, and an event found after, inside or
 * (SOV) before the body it wraps.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type { SemanticNode, CompoundSemanticNode, LanguagePattern, LanguageToken } from '../types';
import { createEventHandler, createCompoundNode, isBlockCommand } from '../types';
import { tokenize as tokenizeInternal, TokenStreamImpl } from '../tokenizers';
import { isElseKeyword, isIfKeyword, isThenKeyword } from './clause-keywords';
import { type ParserState } from './parser-state';
import { eventNameTranslations } from '../patterns/event-handler';
import { isAtEndPositionNoun } from '../patterns/put';
import { KNOWN_EVENTS, WAITABLE_EVENT_WORDS, matchEventParamPhrase } from './event-words';
import {
  SOV_EVENT_MARKERS,
  SOV_SOURCE_MARKERS,
  isEnEventKeyword,
  isEventWordObject,
  isStrippableSourceRef,
  matchEventMarkerPhrase,
} from './event-heads';
import { coverageMark, coverageRollback } from './coverage';
import { parseBodyWithClauses } from './clause-walk';
import { patternMatcher } from './pattern-matcher';

/** A node the walker nested: a loop, or a block command with its body. */
export function isNestedBlock(node: SemanticNode | undefined): boolean {
  return !!node && (node.kind === 'loop' || isBlockCommand(node));
}

/**
 * A custom event's name: a word (any script), then word characters and the
 * separators event names use (`draggable:start`, `my-event`, `a.b`).
 */
export const CUSTOM_EVENT_NAME = /^[\p{L}_$][\p{L}\p{N}_$:.\-]*$/u;

/**
 * How many tokens a loop's head (`for`, `repeat`) takes at the start of
 * `tokens`, or 0. Inside it, no name is a handler's event: bn `item এ items জন্য
 * …` and `পুনরাবৃত্তি item এ items …`, hi `item में items हेतु …` and sw `kwa
 * item ndani items …` put the loop's variable beside a word that is also their
 * `on`, and ko puts its collection right before its `for` word (`item 안에
 * items 각각 …`), where a marker-less custom event stands. Each read `for item
 * in items` at the top level as `on item`.
 */
export function loopHeadLength(
  tokens: readonly LanguageToken[],
  language: string,
  patterns: readonly LanguagePattern[]
): number {
  const loopPatterns = patterns.filter(p => p.command === 'for' || p.command === 'repeat');
  if (loopPatterns.length === 0) return 0;
  const match = patternMatcher.matchBest(
    new TokenStreamImpl([...tokens] as LanguageToken[], language),
    loopPatterns
  );
  return match?.consumedTokens ?? 0;
}

/**
 * Re-parse a Stage-2 loop head whose body trails it, through the clause
 * walker that nests loop bodies. Stage 2's pattern stops at the head, so a
 * top-level `repeat until event pointerup from document … end` kept the head
 * and dropped the body and everything after the loop. Returns the loop, or
 * a sequence that starts with one (`repeat … end remove .x from me`); null
 * leaves Stage 2's head-only parse, and its `unconsumed-input`, as before.
 */
export function tryTopLevelLoop(
  state: ParserState,
  tokens: ReturnType<typeof tokenizeInternal>,
  commandPatterns: LanguagePattern[],
  language: string
): SemanticNode | null {
  const bodyCoverageMark = coverageMark(state);
  let body: SemanticNode[];
  try {
    const freshStream = new TokenStreamImpl(tokens.tokens as LanguageToken[], language);
    body = parseBodyWithClauses(state, freshStream, commandPatterns, language);
  } catch {
    coverageRollback(state, bodyCoverageMark);
    return null;
  }
  const [first] = body;
  if (body.length === 1 && isNestedBlock(first)) return first;
  if (body.length === 1 && first.kind === 'compound') {
    const compound = first as CompoundSemanticNode;
    if (isNestedBlock(compound.statements[0])) {
      // Mean statement confidence, as tryTopLevelCommandSequence does.
      const confidences = compound.statements.map(s => s.metadata?.confidence ?? 0.75);
      return createCompoundNode(compound.statements, compound.chainType, {
        sourceLanguage: language,
        confidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
      });
    }
  }
  coverageRollback(state, bodyCoverageMark);
  return null;
}

/**
 * Re-parse a Stage-2 input that left a trailing remainder as a top-level
 * command SEQUENCE (`add .a to #x then add .b to #y`, `bind $n to #a bind $n
 * to #b`). Returns the compound node, or null to fall through to the
 * single-command path unchanged.
 *
 * Returns null unless the clause parser recovers **more than one** command —
 * that is the whole additive guarantee. A single command with an unparseable
 * tail yields one clause and falls through, so it still builds exactly as
 * before and still reports `unconsumed-input`.
 *
 * The stream is rebuilt from scratch: Stage 2's stream has already been
 * advanced past the first command by `matchBest`. Mirrors
 * {@link tryCompoundCommandParsing}, which does the same for its own re-parse.
 */
export function tryTopLevelCommandSequence(
  state: ParserState,
  tokens: ReturnType<typeof tokenizeInternal>,
  commandPatterns: LanguagePattern[],
  language: string
): CompoundSemanticNode | null {
  // Speculative: on any null return Stage 2 falls through to its own
  // `unconsumed-input` emission — keeping this parse's records would
  // double-count the same span.
  const bodyCoverageMark = coverageMark(state);
  let body: SemanticNode[];
  try {
    const freshStream = new TokenStreamImpl(tokens.tokens as LanguageToken[], language);
    body = parseBodyWithClauses(state, freshStream, commandPatterns, language);
  } catch {
    coverageRollback(state, bodyCoverageMark);
    return null;
  }

  // parseBodyWithClauses returns `[compound]` for >1 clause, else the clauses
  // themselves (0 or 1). Anything but the compound means there was no sequence.
  if (body.length !== 1 || body[0].kind !== 'compound') {
    coverageRollback(state, bodyCoverageMark);
    return null;
  }
  const compound = body[0] as CompoundSemanticNode;
  if (compound.statements.length < 2) {
    coverageRollback(state, bodyCoverageMark);
    return null;
  }

  // Carry a real confidence. `parseWithConfidence` reads
  // `node.metadata?.confidence ?? 0.8`, and createCompoundNode sets none — so
  // without this a faithful two-command sequence would report 0.8 and could
  // fall under the bridge's 0.5 threshold once a weak clause pulls the mean
  // down. Set it HERE rather than inside parseBodyWithClauses: that call is
  // shared with event-handler / `def` / behavior bodies, whose own confidence
  // is computed separately over the flattened statements.
  const confidences = compound.statements.map(s => s.metadata?.confidence ?? 0.75);
  const confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return createCompoundNode(compound.statements, compound.chainType, {
    sourceLanguage: language,
    confidence,
  });
}

/**
 * Try parsing input as a multi-command compound (no event wrapper).
 * Handles standalone command sequences separated by then-keywords.
 * Used as a last resort when no event trigger is detected.
 */
export function tryCompoundCommandParsing(
  state: ParserState,
  tokens: ReturnType<typeof tokenizeInternal>,
  commandPatterns: LanguagePattern[],
  language: string,
  conditionalHead = false
): SemanticNode | null {
  // Only try if the input has a clause-joining keyword (otherwise single-command
  // already tried). A then-keyword joins sequential commands; an else-keyword
  // joins an `if … else …` block whose branches carry no `then` between them
  // (the if/else block-mask transform emits `<thenBranch> else <elseBranch>`),
  // which would otherwise leave the whole handler unparsed when the event itself
  // isn't recognized. An `if` head needs neither: `if :x halt end` is one block,
  // whose body the clause parser folds into the conditional.
  const allTokens = tokens.tokens;
  const hasThenKeyword = allTokens.some(
    t => t.kind === 'conjunction' || (t.kind === 'keyword' && isThenKeyword(t.value, language))
  );
  const hasElseKeyword = allTokens.some(t => isElseKeyword(t.value, language));
  if (!conditionalHead && !hasThenKeyword && !hasElseKeyword) return null;

  // Reset token stream and parse using clause-based parsing
  const freshStream = new TokenStreamImpl(allTokens as LanguageToken[], language);
  const bodyCoverageMark = coverageMark(state);
  const body = parseBodyWithClauses(state, freshStream, commandPatterns, language);

  if (body.length === 0) {
    coverageRollback(state, bodyCoverageMark);
    return null;
  }

  // Always a single element: parseBodyWithClauses wraps >1 clause into ONE
  // compound and otherwise returns the lone clause. (A `createCompoundNode`
  // re-wrap used to sit here for a `body.length > 1` case that cannot occur.)
  return body[0];
}

/**
 * Try to extract a trailing event clause that wraps a block/command body.
 *
 * SVO/VSO grammar transforms emit the event clause at the very end:
 *   AR: "<body> عند <event>"   (e.g. "إلا I match .disabled بدل .selected عند نقر")
 *   TL: "<body> kapag <event>" (e.g. "maliban_kung … palitan .selected kapag click")
 *
 * The per-command fused event patterns only cover simple bodies, so a block
 * body (unless/if/…) isn't wrapped and degrades to a hollow standalone match.
 * This recognizes a trailing `<on-marker> <event>` (gated to a recognized
 * event keyword in the final position, so a trailing destination selector like
 * `على #button` is never mistaken for an event), strips it, and parses the
 * preceding tokens as the handler body. Returns null when there is no such
 * trailing event or the body doesn't parse — so the caller falls through to
 * the command stage unchanged.
 */
export function tryTrailingEventExtraction(
  state: ParserState,
  input: string,
  language: string,
  patterns: LanguagePattern[]
): SemanticNode | null {
  const tokens = tokenizeInternal(input, language).tokens;
  if (tokens.length < 3) return null;

  // Native event names for this language (e.g. ar نقر→click, tl native forms).
  const langEvents = eventNameTranslations[language];
  const nativeEventNames = new Set<string>();
  if (langEvents) {
    for (const native of Object.keys(langEvents)) nativeEventNames.add(native.toLowerCase());
  }

  // The event must be the final token; the on-marker the one before it.
  const markerIdx = tokens.length - 2;
  const marker = tokens[markerIdx];
  const isOnMarker = marker.kind === 'keyword' && marker.normalized?.toLowerCase() === 'on';
  if (!isOnMarker) return null;

  const evtToken = tokens[tokens.length - 1];
  const evtVal = evtToken.value.toLowerCase();
  const evtNorm = evtToken.normalized?.toLowerCase();
  const isKnownEvent =
    (!!evtNorm && KNOWN_EVENTS.has(evtNorm)) ||
    KNOWN_EVENTS.has(evtVal) ||
    nativeEventNames.has(evtVal);
  if (!isKnownEvent) return null;

  const eventName =
    evtNorm && KNOWN_EVENTS.has(evtNorm) ? evtNorm : (langEvents?.[evtVal] ?? evtVal);

  // Body = everything before the on-marker, parsed as command(s)/block.
  const bodyTokens = tokens.slice(0, markerIdx);
  if (bodyTokens.length === 0) return null;

  const commandPatterns = patterns.filter(p => p.command !== 'on');
  const bodyStream = new TokenStreamImpl(bodyTokens, language);
  const bodyCoverageMark = coverageMark(state);
  const body = parseBodyWithClauses(state, bodyStream, commandPatterns, language);
  if (body.length === 0) {
    coverageRollback(state, bodyCoverageMark);
    return null;
  }

  return createEventHandler({ type: 'literal', value: eventName }, body, undefined, {
    sourceLanguage: language,
    confidence: 0.75,
  });
}

/**
 * Try to extract a *mid-stream* `<on-marker> <event>` pair (VSO/SVO loops).
 *
 * For VSO/Austronesian the grammar transformer surfaces a block loop's keyword
 * first and places the event clause right after it, marked by an `on`-marker:
 *   AR: "كرر عند نقر item في .items ثم أضف …"   (repeat on click for … then add)
 *   TL: "ulitin kapag click item sa_loob .items pagkatapos idagdag …"
 *
 * Because the event isn't the final token, `tryTrailingEventExtraction` (Stage
 * 1.5) can't see it, so the bare loop keyword wins Stage 2 and the event + body
 * drop (degenerate). This scans for an `on`-marker (`normalized === 'on'`)
 * immediately followed by a known event keyword, strips that pair, and parses
 * everything else (the leading loop keyword + for/while clause + then-chain body)
 * as the handler body. Returns null when no on-marked event is found or the body
 * doesn't parse, so the caller falls through to the bare command unchanged. The
 * caller gates this to block/loop actions, so simple commands never reach it.
 */
export function tryMidStreamEventExtraction(
  state: ParserState,
  input: string,
  language: string,
  patterns: LanguagePattern[]
): SemanticNode | null {
  const tokens = tokenizeInternal(input, language).tokens;
  if (tokens.length < 3) return null;

  const langEvents = eventNameTranslations[language];
  const nativeEventNames = new Set<string>();
  if (langEvents) {
    for (const native of Object.keys(langEvents)) nativeEventNames.add(native.toLowerCase());
  }

  // Find an `on`-marker whose next token is a known event keyword.
  for (let i = 0; i < tokens.length - 1; i++) {
    const marker = tokens[i];
    const isOnMarker = marker.kind === 'keyword' && marker.normalized?.toLowerCase() === 'on';
    if (!isOnMarker) continue;

    const evtToken = tokens[i + 1];
    const evtVal = evtToken.value.toLowerCase();
    const evtNorm = evtToken.normalized?.toLowerCase();
    const isKnownEvent =
      (!!evtNorm && KNOWN_EVENTS.has(evtNorm)) ||
      KNOWN_EVENTS.has(evtVal) ||
      nativeEventNames.has(evtVal);
    if (!isKnownEvent) continue;

    const eventName =
      evtNorm && KNOWN_EVENTS.has(evtNorm) ? evtNorm : (langEvents?.[evtVal] ?? evtVal);

    // Body = every token except the on-marker + event pair, parsed as a block.
    const bodyTokens = tokens.filter((_, idx) => idx !== i && idx !== i + 1);
    if (bodyTokens.length === 0) return null;

    const commandPatterns = patterns.filter(p => p.command !== 'on');
    const bodyStream = new TokenStreamImpl(bodyTokens, language);
    const bodyCoverageMark = coverageMark(state);
    const body = parseBodyWithClauses(state, bodyStream, commandPatterns, language);
    if (body.length === 0) {
      coverageRollback(state, bodyCoverageMark);
      return null;
    }

    return createEventHandler({ type: 'literal', value: eventName }, body, undefined, {
      sourceLanguage: language,
      confidence: 0.75,
    });
  }

  return null;
}

/**
 * Try to extract an embedded event trigger from SOV grammar-transformed text.
 *
 * SOV languages embed the event trigger within the sentence:
 *   JA: ".active を クリック で 切り替え"  (patient event-marker action)
 *   KO: ".active 를 클릭 에 토글"          (patient event-marker action)
 *   TR: ".active i tıklama de değiştir"   (patient event-marker action)
 *
 * This method detects the [event_keyword] [event_particle] pair,
 * removes those tokens, and parses the remaining tokens as command body.
 */
export function trySOVEventExtraction(
  state: ParserState,
  input: string,
  language: string,
  patterns: LanguagePattern[]
): SemanticNode | null {
  const eventMarkers = SOV_EVENT_MARKERS[language];
  if (!eventMarkers) return null;

  const tokens = tokenizeInternal(input, language);
  const allTokens = tokens.tokens;
  // An input that opens with the language's `if` is a conditional block: its
  // last verb is a command, never a handler's event (ko `만약 … 을 포커스 …`,
  // focus, read as `on focus`). The renderer writes a handler's event first.
  if (isIfKeyword(allTokens[0]?.value ?? '', language)) return null;

  // Build a set of native event names for this language (from eventNameTranslations)
  const langEvents = eventNameTranslations[language];
  const nativeEventNames = new Set<string>();
  if (langEvents) {
    for (const native of Object.keys(langEvents)) {
      nativeEventNames.add(native.toLowerCase());
    }
  }

  // Source markers for "from window/elsewhere" stripping per language
  const sourceMarkers = SOV_SOURCE_MARKERS[language];

  // Scan for event keyword + optional event marker particle pattern
  let eventIndex = -1;
  let eventName = '';
  let keyFilter = '';
  let tokensToRemove = 1; // How many tokens to strip (1 = event only, 2 = event + marker)
  let parameterNames: string[] = [];

  for (let i = 0; i < allTokens.length; i++) {
    const token = allTokens[i];
    const tokenValue = token.value.toLowerCase();

    // Strip bracket key-filter from event token value for matching
    // e.g., "keydown[key==\"Escape\"]" → "keydown" (with filter extracted)
    let bareEventValue = tokenValue;
    let tokenKeyFilter = '';
    const bracketIdx = tokenValue.indexOf('[');
    if (bracketIdx > 0) {
      bareEventValue = tokenValue.slice(0, bracketIdx);
      tokenKeyFilter = token.value.slice(bracketIdx);
    }

    // Check if this token is a known event name (by normalized value, native
    // text, or bare value). WAITABLE_EVENT_WORDS is accepted alongside
    // KNOWN_EVENTS: the pointer/touch/transition families are real handler
    // triggers (`pointerdown(clientY) で` — behavior-sortable), untranslated
    // loanwords in every corpus language, and without them the first pass
    // never anchored a parameterized pointer event (the custom-event second
    // pass then matched the `)` as the event).
    const normalizedLower = token.normalized?.toLowerCase();
    const isEventByNormalized =
      normalizedLower &&
      (KNOWN_EVENTS.has(normalizedLower) || WAITABLE_EVENT_WORDS.has(normalizedLower));
    const isEventByNative =
      nativeEventNames.has(tokenValue) || nativeEventNames.has(bareEventValue);
    const isEventByBare =
      KNOWN_EVENTS.has(bareEventValue) || WAITABLE_EVENT_WORDS.has(bareEventValue);

    if (isEventByNormalized || isEventByNative || isEventByBare) {
      // An event name directly after the `event` KEYWORD is a loop/wait
      // phrase payload (`repeat until event pointerup from document` — ko
      // `까지 이벤트 pointerup 를 반복 …`), never a handler trigger: skip it
      // so the Stage-2 loop-head match stands. (Without the WAITABLE
      // family this could not trigger — pointerup wasn't recognized at all.)
      const prevTok = allTokens[i - 1];
      if (prevTok && (prevTok.normalized ?? prevTok.value).toLowerCase() === 'event') {
        continue;
      }
      // Resolve the English event name
      let resolvedName: string;
      if (isEventByNormalized) {
        resolvedName = normalizedLower!;
      } else if (isEventByNative) {
        resolvedName = langEvents?.[tokenValue] ?? langEvents?.[bareEventValue] ?? bareEventValue;
      } else {
        resolvedName = bareEventValue;
      }

      // A parameterized event (`pointerdown(clientY)`) tokenizes with its
      // param phrase between the event keyword and the marker — consume it
      // so the marker check still anchors (and the params don't leak into
      // the body as a keyword-led run that flushSkipped discards).
      const paramPhrase = matchEventParamPhrase(allTokens, i + 1);

      if (eventMarkers.size > 0) {
        // Languages with event markers (JA, TR): require marker after event keyword
        // The marker may be at i+1 (direct), or offset by a param phrase
        // and/or a bracket key-filter selector between.
        let markerOffset = 1 + paramPhrase.len;
        const nextToken = allTokens[i + markerOffset];
        // Skip over bracket selector token (e.g., [key=="Escape"]) between event and marker
        if (nextToken && nextToken.kind === 'selector' && nextToken.value.startsWith('[')) {
          markerOffset += 1;
        }
        const markerToken = allTokens[i + markerOffset];
        if (
          markerToken &&
          (markerToken.kind === 'particle' || markerToken.kind === 'keyword') &&
          eventMarkers.has(markerToken.value)
        ) {
          eventIndex = i;
          eventName = resolvedName;
          keyFilter =
            tokenKeyFilter ||
            (markerOffset === paramPhrase.len + 2 ? allTokens[i + markerOffset - 1].value : '');
          tokensToRemove = markerOffset + 1; // Remove event keyword + params + optional filter + marker
          parameterNames = paramPhrase.names;
          break;
        }
      } else {
        // Languages without single-token event markers (KO): event keyword
        // stands alone, or is followed by an optional param phrase and/or
        // marker phrase (할 때), consumed so they don't leak into the body parse.
        // Without the phrase, a word its verb's object particle follows is that
        // verb's object (`로드 를 대기`, wait for load): keep scanning.
        const markerLen = matchEventMarkerPhrase(allTokens, i + 1 + paramPhrase.len, language);
        if (markerLen === 0 && isEventWordObject(allTokens, i + 1 + paramPhrase.len, language)) {
          continue;
        }
        eventIndex = i;
        eventName = resolvedName;
        keyFilter = tokenKeyFilter;
        tokensToRemove = 1 + paramPhrase.len + markerLen;
        parameterNames = paramPhrase.names;
        break;
      }
    }
  }

  // Second pass: custom (non-keyword) event identifiers, e.g. `on hello …`.
  // Only runs when no built-in event keyword matched above. Custom events
  // keep their untranslated source identifier (`hello`), so they surface as a
  // bare `identifier` token rather than a normalized event keyword. To avoid
  // mistaking a stray content identifier for an event, this is gated by the
  // same structural cue the built-in path uses: the event-marker particle for
  // marker languages (ja/tr/qu/bn), or being immediately followed by the
  // body's command verb for marker-less Korean. The body re-parse further
  // below is the final guard — a wrong match yields no parseable body.
  if (eventIndex === -1) {
    const commandActions = new Set<string>(
      patterns.filter(p => p.command !== 'on').map(p => p.command)
    );
    const loopHead = loopHeadLength(allTokens, language, patterns);
    for (let i = loopHead; i < allTokens.length; i++) {
      const token = allTokens[i];
      if (token.kind !== 'identifier') continue;
      // A template literal tokenizes as an identifier and is never an event
      // name: ko read a bare `fetch <template URL> as json then …` as a
      // handler for the event named by the URL, because the "identifier
      // right before the body's verb" cue below held for it.
      if (token.value.startsWith('`')) continue;
      // Nor is anything that is not a name: ja reads the instrument `で` after
      // an options object (`"/x" {method:"POST"} で フェッチ`) as the event
      // marker, which made the object's `}` the event of a bare `js … end then
      // fetch …`.
      if (!CUSTOM_EVENT_NAME.test(token.value)) continue;

      if (eventMarkers.size > 0) {
        // Marker languages: the event-marker particle right after the
        // identifier (modulo a bracket key-filter selector) confirms the role.
        let markerOffset = 1;
        const nextToken = allTokens[i + 1];
        if (nextToken && nextToken.kind === 'selector' && nextToken.value.startsWith('[')) {
          markerOffset = 2;
        }
        const markerToken = allTokens[i + markerOffset];
        if (
          markerToken &&
          (markerToken.kind === 'particle' || markerToken.kind === 'keyword') &&
          eventMarkers.has(markerToken.value) &&
          // The marker is put's `at` word when the `end` noun and `of` word
          // follow (`response で 終わり の #results を 置く`): a patient, not an event.
          !isAtEndPositionNoun(
            language,
            allTokens[i + markerOffset + 1]?.value ?? '',
            markerToken.value,
            allTokens[i + markerOffset + 2]?.value
          )
        ) {
          eventIndex = i;
          eventName = token.value;
          keyFilter = markerOffset === 2 ? allTokens[i + 1].value : '';
          tokensToRemove = markerOffset + 1;
          break;
        }
      } else {
        // Korean: the 할 때 marker phrase confirms a custom event the way
        // ja's で does (`… success 할 때 넣다 …`)…
        const phraseLen = matchEventMarkerPhrase(allTokens, i + 1, language);
        if (phraseLen > 0) {
          eventIndex = i;
          eventName = token.value;
          keyFilter = '';
          tokensToRemove = 1 + phraseLen;
          break;
        }
        // …or, marker-less (pre-marker emissions, hand-written input), the
        // event identifier sits immediately before the body's command verb
        // (e.g. `… hello 넣다 …`).
        const nextToken = allTokens[i + 1];
        if (
          nextToken &&
          nextToken.kind === 'keyword' &&
          nextToken.normalized != null &&
          commandActions.has(nextToken.normalized)
        ) {
          eventIndex = i;
          eventName = token.value;
          keyFilter = '';
          tokensToRemove = 1;
          break;
        }
      }
    }
  }

  if (eventIndex === -1) return null;

  // Build the list of indices to remove: event keyword + marker
  const removeIndices = new Set<number>();
  for (let i = eventIndex; i < eventIndex + tokensToRemove; i++) {
    removeIndices.add(i);
  }

  // Strip "from window/elsewhere" source modifiers near the event
  // Pattern: [source-marker] appears after event marker (JA: から, KO: 에서, TR: den/dan/ten/tan)
  // Or the source element (window/ウィンドウ/창/pencere) may appear before the event
  if (sourceMarkers) {
    const afterEventEnd = eventIndex + tokensToRemove;

    // Check for source marker right after event+marker (e.g., "keydown で から")
    if (afterEventEnd < allTokens.length) {
      const afterToken = allTokens[afterEventEnd];
      if (
        (afterToken.kind === 'particle' || afterToken.kind === 'keyword') &&
        sourceMarkers.markers.has(afterToken.value)
      ) {
        removeIndices.add(afterEventEnd);
      } else if (isStrippableSourceRef(afterToken, sourceMarkers.windowTokens)) {
        // Rendered `from me` pair right after event+marker (ja `私 から`,
        // ko `나 에서`, tr `ben den`, bn `আমি থেকে`, hi `मैं से`). Left in
        // place it heads the body as a KEYWORD-led run that flushSkipped
        // discards — taking the first real body command with it
        // (behavior-sortable's `set item to …`). The en reference drops the
        // handler's from-phrase entirely, so stripping the pair matches it.
        const markerAfterRef = allTokens[afterEventEnd + 1];
        if (
          markerAfterRef &&
          (markerAfterRef.kind === 'particle' || markerAfterRef.kind === 'keyword') &&
          sourceMarkers.markers.has(markerAfterRef.value)
        ) {
          removeIndices.add(afterEventEnd);
          removeIndices.add(afterEventEnd + 1);
        }
      }
    }

    // Fronted `from me` pair immediately BEFORE the event (qu renders the
    // source phrase first: `noqa manta pointerdown(clientY) pi`). Same
    // strippable-reference gate as the trailing pair.
    if (eventIndex >= 2) {
      const frontMarker = allTokens[eventIndex - 1];
      if (
        (frontMarker.kind === 'particle' || frontMarker.kind === 'keyword') &&
        sourceMarkers.markers.has(frontMarker.value) &&
        isStrippableSourceRef(allTokens[eventIndex - 2], sourceMarkers.windowTokens)
      ) {
        removeIndices.add(eventIndex - 2);
        removeIndices.add(eventIndex - 1);
      }
    }

    // Check for source element (window token) before the event
    // It could be immediately before, or earlier in the stream
    for (let i = 0; i < eventIndex; i++) {
      const t = allTokens[i];
      const tLower = t.value.toLowerCase();
      const tNorm = t.normalized?.toLowerCase();
      if (
        sourceMarkers.windowTokens.has(tLower) ||
        (tNorm && sourceMarkers.windowTokens.has(tNorm))
      ) {
        removeIndices.add(i);
        break;
      }
    }
  }

  // Remove marked tokens from the array
  const bodyTokens = allTokens.filter((_, idx) => !removeIndices.has(idx));

  if (bodyTokens.length === 0) return null;

  // Parse body tokens as command(s)
  const commandPatterns = patterns.filter(p => p.command !== 'on');
  const bodyStream = new TokenStreamImpl(bodyTokens, language);

  // Use clause-based parsing to handle then-chains
  const bodyCoverageMark = coverageMark(state);
  const body = parseBodyWithClauses(state, bodyStream, commandPatterns, language);

  if (body.length === 0) {
    coverageRollback(state, bodyCoverageMark);
    return null;
  }

  // Build event metadata including key filter and source info
  const metadata: Record<string, unknown> = {
    sourceLanguage: language,
    confidence: 0.75,
  };
  if (keyFilter) {
    metadata.keyFilter = keyFilter;
  }

  return createEventHandler(
    // Typed the way English types a handler event — by the token KIND of its
    // name. See `isEnEventKeyword` and the alignment in buildEventHandler:
    // this extraction is a separate construction site and had the same
    // unconditional-literal bug (ko eventsource-basic / socket-basic, whose
    // `message` head is an identifier in English and so an EXPRESSION there).
    isEnEventKeyword(eventName)
      ? { type: 'literal', value: eventName }
      : { type: 'expression', raw: eventName },
    body,
    undefined,
    metadata,
    parameterNames
  );
}
