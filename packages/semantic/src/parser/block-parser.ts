/**
 * Structural / block layer.
 *
 * The single-statement semantic parser cannot parse multi-line BLOCK constructs
 * (`behavior Name(params) … end`, `def name(params) … end`): it matches the
 * leading keyword and drops the whole body, returning a degenerate node. This
 * module adds the missing layer. It does NOT re-implement statement parsing — it
 * decomposes a block into its sub-blocks using the already-translated keywords +
 * depth-aware `end` matching, slices each sub-block's ORIGINAL source text by
 * token position (so it works for space-less scripts like ja/zh), and feeds each
 * to the ordinary single-statement engine. The results are re-assembled into a
 * `BehaviorSemanticNode` / `DefSemanticNode`.
 *
 * See docs-internal/MULTILINGUAL_BEHAVIORS_PLAN.md Phase 3.
 */

import type { LanguageToken, SemanticNode, EventHandlerSemanticNode } from '../types';
import { createBehaviorNode, createDefNode, createCompoundNode } from '../types';
import { tryGetProfile } from '../registry';
import { tokenize } from '../tokenizers';

/**
 * NESTED block-opening keywords balanced by a matching `end`. Deliberately
 * excludes the handler-level trigger (`on`) and `init`: those are the sub-blocks
 * we are splitting INTO, and the trigger surface form is unreliable across
 * languages (de renders `wenn`/when, zh the `一…就` idiom, SOV puts the marker
 * mid-clause). Only these reliably-keyworded constructs nest inside a body, so
 * counting just them keeps the depth tracking trigger-agnostic.
 */
const OPENER_ACTIONS = ['if', 'unless', 'repeat', 'for', 'while'] as const;

/**
 * Parsers injected to avoid a circular import with semantic-parser.
 * - `statement` parses one statement (an `on …` clause → an event-handler node).
 * - `body` parses a multi-command sequence into a flat statement list (def bodies,
 *   behavior `init` blocks) — the path that splits then-chains / newlines / nested
 *   blocks, which `statement` alone does not for a bare command sequence.
 */
interface BlockParsers {
  statement: (text: string, lang: string) => SemanticNode;
  body: (text: string, lang: string) => SemanticNode[];
}

/**
 * Build the set of surface forms (native primary + alternatives, plus the English
 * normalized form) a keyword can take in a language, for keyword matching.
 */
function keywordForms(language: string, action: string): Set<string> {
  const set = new Set<string>([action]); // English normalized form
  const profile = tryGetProfile(language);
  const entry = profile?.keywords?.[action];
  if (entry) {
    if (entry.primary) set.add(entry.primary.toLowerCase());
    for (const alt of entry.alternatives ?? []) set.add(alt.toLowerCase());
  }
  return set;
}

/** Does a token match any surface form in `forms` (by value or normalized form)? */
function tokenMatches(tok: LanguageToken, forms: Set<string>): boolean {
  if (forms.has(tok.value.toLowerCase())) return true;
  return tok.normalized ? forms.has(tok.normalized.toLowerCase()) : false;
}

/** The block-opener actions whose `end` participates in depth tracking. */
const OPENER_NORMS: ReadonlySet<string> = new Set(OPENER_ACTIONS);

/**
 * Whether a token opens a nested block (if/unless/repeat/for/while) for depth
 * tracking — NOT a plain `tokenMatches` against the opener forms, because some
 * languages reuse a block-keyword's surface form for a role marker: Portuguese
 * `para` is BOTH the `for` loop keyword AND the dative "to" marker, so
 * `set X to Y` → `definir X para Y` had its marker `para` mis-counted as a `for`
 * opener, corrupting the behavior-body depth split (the init segment swallowed the
 * whole handler — pt/sw behavior-removable lost on/remove/trigger). The tokenizer
 * already resolved the ambiguity: it normalizes the marker to its ROLE
 * (`destination`), not to `for`. So when a token carries a normalized form, trust
 * it — count it as an opener only if that normalized form IS an opener action. A
 * token with NO normalized form (e.g. a raw js-body `if`) falls back to the surface
 * match, preserving the existing js-block depth balance.
 */
function isBlockOpener(tok: LanguageToken, openerSets: ReadonlyArray<Set<string>>): boolean {
  const norm = tok.normalized?.toLowerCase();
  if (norm) return OPENER_NORMS.has(norm);
  return openerSets.some(s => tokenMatches(tok, s));
}

/**
 * Target/reference words that follow a destination `on` (`toggle .x on me`),
 * never a handler trigger. Used to tell a trigger `on` (`on click`, followed by
 * an EVENT) from a target `on` (followed by one of these or a selector). Listed
 * by their NORMALIZED form — non-English tokenizers normalize the native word
 * (es `me`, ja `自分`, ko `나`) to these English bases.
 */
const TARGET_REFERENCES = new Set([
  'me',
  'it',
  'you',
  'the',
  'body',
  'window',
  'document',
  'its',
  'event',
  'result',
  'target',
  'self',
  'this',
  'them',
  'parent',
  'next',
  'previous',
  'closest',
  'first',
  'last',
]);

/** Role-concept normalized forms a token can carry — markers, not event names. */
const ROLE_CONCEPTS = new Set(['destination', 'source', 'style', 'patient', 'on', 'from', 'to']);

/**
 * Does `tok` look like an EVENT name — meaning the `on`-marker before it begins a
 * handler TRIGGER — as opposed to a target reference/selector that makes the
 * `on` a destination marker (`toggle .x on me`)? Selectors (`.x`/`#y`/`<…>`),
 * known reference words (me/it/the/…), and role-marker concepts are targets;
 * anything else (click, keyup, a custom event name) reads as an event.
 */
function looksLikeEvent(tok: LanguageToken | undefined): boolean {
  if (!tok) return false;
  if (tok.kind === 'selector') return false;
  const norm = (tok.normalized ?? tok.value).toLowerCase();
  const val = tok.value.toLowerCase();
  if (TARGET_REFERENCES.has(norm) || TARGET_REFERENCES.has(val)) return false;
  if (ROLE_CONCEPTS.has(norm)) return false;
  return true;
}

/**
 * SOV languages whose no-`end` handler chain (`click を で … keyup を で …`) can be
 * split by the trigger SIGNATURE — the event-marker immediately followed by the
 * on-marker (ja `を で`, ko `을 에`). The forward `<on> <event>` lookahead used for
 * SVO/VSO does NOT work here (SOV is postpositional and the `on` marker is
 * homonymous with the locative), but these two languages have a DISTINCT,
 * separable event-marker and on-marker, so the adjacent pair uniquely identifies
 * a trigger: the patient marker (also `を`/`을`) is followed by a verb/value, never
 * by the on-marker. hi/bn are excluded — their event-marker and on-marker are the
 * SAME surface form (`पर`/`তে`), so no two-token signature exists; tr (agglutinative
 * suffixes) and qu (non-priority, unverified) are deferred. Such chains keep using
 * the word-order-agnostic end-delimited form there.
 */
const TRIGGER_SIGNATURE_LANGS = new Set(['ja', 'ko']);

/** Lowercased native surface forms (primary + alternatives) of a marker spec. */
function markerSurfaceForms(
  spec: { primary?: string; alternatives?: readonly string[] } | undefined
): Set<string> {
  const set = new Set<string>();
  if (spec?.primary) set.add(spec.primary.toLowerCase());
  for (const alt of spec?.alternatives ?? []) set.add(alt.toLowerCase());
  return set;
}

/**
 * Parse the block header (`<keyword> <Name>` + optional `(params)`) from source
 * position — NOT by scanning for `on`, which fails in SOV where the handler starts
 * with the event (`click を で …`). Returns the declared parameters and the source
 * offset where the body begins.
 */
function parseHeader(
  input: string,
  nameToken: LanguageToken
): { parameters: string[]; headerEnd: number } {
  const parameters: string[] = [];
  let headerEnd = nameToken.position.end;
  const paren = input.slice(nameToken.position.end).match(/^\s*\(([^)]*)\)/);
  if (paren) {
    headerEnd = nameToken.position.end + paren[0].length;
    for (const raw of paren[1].split(/[,،、]/)) {
      const p = raw.trim();
      if (p) parameters.push(p);
    }
  }
  return { parameters, headerEnd };
}

/**
 * Resolve the block NAME token that follows the `behavior`/`def` keyword at
 * `keywordIdx`. Normally the name is the very next token (`behavior Foo`), but
 * languages with a PRE-positioned object/patient marker emit it between the
 * keyword and the name when the declaration line is (mis-)translated as a
 * markable command: he `behavior את Foo`, zh `behavior 把 Foo`. That spurious
 * marker is not part of the name, so skip a single leading patient-marker token
 * before reading the name. Returns the name token index, or -1 if none follows.
 */
function resolveNameTokenIndex(
  tokens: readonly LanguageToken[],
  keywordIdx: number,
  language: string
): number {
  let idx = keywordIdx + 1;
  if (idx >= tokens.length) return -1;
  const patientForms = markerSurfaceForms(tryGetProfile(language)?.roleMarkers?.patient);
  if (patientForms.size > 0 && tokenMatches(tokens[idx], patientForms)) {
    idx++; // skip the spurious leading object marker (he את / zh 把)
  }
  return idx < tokens.length ? idx : -1;
}

/**
 * Attempt to parse `input` as a block construct (`behavior`/`def`). Returns null
 * (fast) for non-block input so the caller falls through to single-statement
 * parsing. `parseStatement` parses each sub-block.
 */
export function tryParseBlock(
  input: string,
  language: string,
  parsers: BlockParsers
): SemanticNode | null {
  if (!tryGetProfile(language)) return null;

  // Cheap pre-guard: skip the tokenize on the overwhelming majority of parses.
  const behaviorForms = keywordForms(language, 'behavior');
  const defForms = keywordForms(language, 'def');
  const lower = input.toLowerCase();
  const mightBehavior = [...behaviorForms].some(f => lower.includes(f));
  const mightDef =
    /\bdef\b/.test(lower) || [...defForms].some(f => f !== 'def' && lower.includes(f));
  if (!mightBehavior && !mightDef) return null;

  const tokens = tokenize(input, language).tokens as readonly LanguageToken[];
  if (tokens.length < 2) return null;

  if (tokenMatches(tokens[0], behaviorForms)) {
    return parseBehaviorBlock(input, language, tokens, parsers);
  }
  if (tokenMatches(tokens[0], defForms)) {
    return parseDefBlock(input, language, tokens, parsers);
  }
  return null;
}

/**
 * Attempt to parse `input` as a multi-handler PROGRAM — a top-level "feature"
 * script with two or more event handlers (`on click … end on keyup … end`).
 *
 * The single-statement parser matches only the FIRST handler and absorbs the
 * rest into its body (the trailing `on keyup …` is swallowed as a compound
 * command), so a script with N>1 top-level handlers silently loses all but the
 * first — broken in every language. This splits the input into its top-level
 * handler segments by two complementary boundaries, both at depth 0 (depth counts
 * only nested if/unless/repeat/for/while openers, never the handler trigger):
 *
 *  - **end-delimited** (Phase A) — a depth-0 `end` closes a handler. Trigger-
 *    AGNOSTIC, so it works however a language surfaces the trigger (`on`, de
 *    `wenn`, zh idiom, SOV mid-clause marker). This is the common, unambiguous
 *    form (`on click … end on keyup … end`).
 *  - **trigger-delimited** (Phase B) — a depth-0 `on`-marker that begins a NEW
 *    handler starts a segment, for the no-`end` feature chain (`on click … on
 *    keyup …`). The `on` marker is matched by its surface form (en `on`, es `al`,
 *    …) and disambiguated from a destination `on` (`toggle .x on me`) by event-
 *    name lookahead: the next token must look like an EVENT, not a target
 *    reference/selector. This forward lookahead assumes a PREPOSITIONAL `on`
 *    (SVO/VSO/V2); SOV is postpositional, so it is gated off there.
 *  - **signature-delimited** (Phase B, SOV) — for the no-`end` chain in ja/ko
 *    ({@link TRIGGER_SIGNATURE_LANGS}), a depth-0 trigger SIGNATURE — the event-
 *    marker immediately followed by the on-marker (ja `を で`, ko `을 에`) — starts
 *    a new handler at the event token that precedes it. Their patient marker is
 *    the same particle (`を`/`을`) but is followed by a verb, never the on-marker,
 *    so the adjacent pair is an unambiguous trigger anchor. SOV languages without
 *    a distinct two-token signature (hi/bn) still rely on the end-delimited form.
 *
 * Each segment is parsed by the ordinary single-statement engine and re-assembled
 * into a `compound` (which buildAST maps to a core `Program`, so the runtime
 * registers each handler).
 *
 * Returns null (fast) unless it finds ≥2 segments that ALL parse as event
 * handlers — so single handlers, single commands, and conditionals fall straight
 * through to single-statement parsing unchanged.
 */
export function tryParseProgram(
  input: string,
  language: string,
  parsers: BlockParsers
): SemanticNode | null {
  const profile = tryGetProfile(language);
  if (!profile) return null;

  // The no-`end` trigger split uses FORWARD event-name lookahead (`<on> <event>`),
  // which only holds where the `on` marker PRECEDES the event — SVO/VSO/V2 (en
  // `on click`, es `al click`, ar `على click`, de `bei click`). SOV languages are
  // POSTPOSITIONAL: the marker follows the event (`click पर`, `click を で`) and
  // is typically homonymous with the locative/destination marker (hi `पर`, ja
  // `で`), so a forward lookahead both misses the real boundary and mis-fires on
  // `<target> <marker> <verb>`. SOV no-`end` chains are therefore NOT trigger-
  // split; they rely on the end-delimited form (Phase A), which is word-order
  // agnostic. (The end split below still runs for SOV.)
  const triggerSplit = profile.wordOrder !== 'SOV';

  // ja/ko no-`end` chains are split by the trigger SIGNATURE (event-marker
  // immediately followed by on-marker) instead — see TRIGGER_SIGNATURE_LANGS.
  const eventMarkerForms = TRIGGER_SIGNATURE_LANGS.has(language)
    ? markerSurfaceForms(profile.roleMarkers?.event)
    : new Set<string>();
  const onMarkerForms = TRIGGER_SIGNATURE_LANGS.has(language)
    ? markerSurfaceForms(profile.keywords?.on)
    : new Set<string>();
  const signatureSplit = eventMarkerForms.size > 0 && onMarkerForms.size > 0;

  // Cheap pre-guard: a multi-handler program needs either ≥1 `end` keyword (the
  // end-delimited form) or — for trigger/signature-split languages — ≥2 `on`-marker
  // surface forms (the no-`end` chain has one per handler). Skip the tokenize for
  // the overwhelming majority of single-statement inputs that have neither. Over-
  // counting only costs a tokenize that then yields <2 segments → null; under-
  // counting would miss a real program, so this errs toward proceeding.
  const endForms = keywordForms(language, 'end');
  const onForms = keywordForms(language, 'on');
  const lower = input.toLowerCase();
  const hasEnd = [...endForms].some(f => lower.includes(f));
  const hasMultiTrigger =
    (triggerSplit || signatureSplit) &&
    (() => {
      let hits = 0;
      for (const f of onForms) {
        if (!f) continue;
        for (let i = lower.indexOf(f); i >= 0; i = lower.indexOf(f, i + f.length)) {
          if (++hits >= 2) return true;
        }
      }
      return false;
    })();
  if (!hasEnd && !hasMultiTrigger) return null;

  const tokens = tokenize(input, language).tokens as readonly LanguageToken[];
  if (tokens.length < 2) return null;

  const openerSets = OPENER_ACTIONS.map(a => keywordForms(language, a));
  const isOpener = (tok: LanguageToken): boolean => isBlockOpener(tok, openerSets);
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);

  // Split into top-level handler segments. At depth 0: a `end` closes the current
  // handler (end-delimited form); a prepositional `on`-marker that BEGINS a new
  // handler (its lookahead is an event, not a target) starts a new segment (no-`end`
  // chain, SVO/VSO); or a ja/ko trigger signature (event-marker + on-marker) starts
  // a new segment at the event token before it. A `end` at depth > 0 closes a NESTED
  // if/repeat (decrement only). A final handler with no trailing `end` is the tail.
  const segments: string[] = [];
  let depth = 0;
  let segStart = 0;
  for (let j = 0; j < tokens.length; j++) {
    const tok = tokens[j];
    if (isEnd(tok)) {
      if (depth > 0) {
        depth--;
        continue;
      }
      const text = input.slice(tokens[segStart].position.start, tok.position.start).trim();
      if (text) segments.push(text);
      segStart = j + 1;
    } else if (isOpener(tok)) {
      depth++;
    } else if (
      triggerSplit &&
      depth === 0 &&
      j > segStart &&
      tokenMatches(tok, onForms) &&
      looksLikeEvent(tokens[j + 1])
    ) {
      // A new handler trigger at top level ends the previous (un-`end`ed) handler.
      const text = input.slice(tokens[segStart].position.start, tok.position.start).trim();
      if (text) segments.push(text);
      segStart = j;
    } else if (
      signatureSplit &&
      depth === 0 &&
      j - 1 > segStart &&
      tokenMatches(tok, eventMarkerForms) &&
      tokens[j + 1] !== undefined &&
      tokenMatches(tokens[j + 1], onMarkerForms)
    ) {
      // ja/ko trigger signature `<event> <event-marker> <on-marker>` (`keyup を で`,
      // `keyup 을 에`): the marker pair at j / j+1 means the token at j-1 is the new
      // handler's event. The previous handler ends just before it. The patient
      // marker is the same particle but is followed by a verb (not the on-marker),
      // so this pair only matches a real trigger.
      const eventTok = tokens[j - 1];
      const text = input.slice(tokens[segStart].position.start, eventTok.position.start).trim();
      if (text) segments.push(text);
      segStart = j - 1;
    }
  }
  if (segStart < tokens.length) {
    const text = input.slice(tokens[segStart].position.start).trim();
    if (text) segments.push(text);
  }

  if (segments.length < 2) return null;

  // Every segment must parse as an event handler; otherwise this isn't a
  // multi-handler program (it may be a single conditional, a command sequence, a
  // mixed init/def program) and we defer to the existing single-statement path.
  const handlers: SemanticNode[] = [];
  const confidences: number[] = [];
  for (const seg of segments) {
    let parsed: SemanticNode;
    try {
      parsed = parsers.statement(seg, language);
    } catch {
      return null;
    }
    if (!parsed || parsed.kind !== 'event-handler') return null;
    const handler = parsed as EventHandlerSemanticNode;
    handlers.push(handler);
    // An empty handler body means the sub-parse silently dropped its commands —
    // don't inherit a misleadingly high confidence (mirrors parseBehaviorBlock).
    const bodyEmpty = !handler.body || handler.body.length === 0;
    confidences.push(bodyEmpty ? 0.2 : (handler.metadata?.confidence ?? 0.75));
  }

  return createCompoundNode(handlers, 'then', {
    sourceLanguage: language,
    confidence: meanConfidence(confidences),
    sourceText: input,
  });
}

/** Mean of a confidence list (0 when empty). */
function meanConfidence(confidences: number[]): number {
  return confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
}

/**
 * Flatten a single wrapping `compound` (the body parser groups a then-chain /
 * juxtaposed sequence under one node) into its statements, so a `def` body and an
 * `init` block are flat command lists rather than `[CommandSequence]`.
 */
function flattenStatements(stmts: SemanticNode[]): SemanticNode[] {
  const out: SemanticNode[] = [];
  for (const s of stmts) {
    const inner = (s as { statements?: SemanticNode[] }).statements;
    if (s.kind === 'compound' && Array.isArray(inner)) out.push(...inner);
    else out.push(s);
  }
  return out;
}

/** Parse a `behavior Name(params) … end` block into a BehaviorSemanticNode. */
function parseBehaviorBlock(
  input: string,
  language: string,
  tokens: readonly LanguageToken[],
  parsers: BlockParsers
): SemanticNode | null {
  // Behavior name — required PascalCase to avoid false positives. Skip a
  // leading object marker (he `behavior את Foo`, zh `behavior 把 Foo`) first.
  const nameIdx = resolveNameTokenIndex(tokens, 0, language);
  if (nameIdx < 0) return null;
  const nameToken = tokens[nameIdx];
  const name = nameToken.value;
  if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) return null;

  const { parameters, headerEnd } = parseHeader(input, nameToken);
  let bodyStart = tokens.findIndex(t => t.position.start >= headerEnd);
  if (bodyStart <= nameIdx) bodyStart = nameIdx + 1;

  const initForms = keywordForms(language, 'init');
  const endForms = keywordForms(language, 'end');
  const openerSets = OPENER_ACTIONS.map(a => keywordForms(language, a));
  const isOpener = (tok: LanguageToken): boolean => isBlockOpener(tok, openerSets);
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);

  // Split the body into sub-blocks by depth-aware `end` matching. Segmentation is
  // END-delimited, not opener-prefixed: a sub-block runs until the `end` that
  // returns depth to 0. Works for SVO (handler starts with `on`), SOV (handler
  // starts with the event), and VSO alike. The behavior's own closing `end` is the
  // one reached while depth is already 0 with no content accumulated.
  const eventHandlers: EventHandlerSemanticNode[] = [];
  const initCommands: SemanticNode[] = [];
  const confidences: number[] = [];
  let sawClosingEnd = false;

  let depth = 0;
  let segStart = bodyStart;
  for (let j = bodyStart; j < tokens.length; j++) {
    const tok = tokens[j];
    if (isEnd(tok)) {
      if (depth > 0) {
        depth--; // closes a NESTED block (if/repeat/…) inside the current handler
        continue;
      }
      if (j === segStart) {
        sawClosingEnd = true; // behavior's own closing `end`
        break;
      }
      if (tokenMatches(tokens[segStart], initForms)) {
        const initText = input.slice(tokens[segStart].position.end, tok.position.start).trim();
        if (initText) {
          try {
            const stmts = flattenStatements(parsers.body(initText, language));
            initCommands.push(...stmts);
            confidences.push(meanConfidence(stmts.map(s => s.metadata?.confidence ?? 0.75)));
          } catch {
            confidences.push(0);
          }
        }
      } else {
        const handlerText = input.slice(tokens[segStart].position.start, tok.position.start).trim();
        try {
          const parsed = parsers.statement(handlerText, language);
          if (parsed && parsed.kind === 'event-handler') {
            const handler = parsed as EventHandlerSemanticNode;
            eventHandlers.push(handler);
            // An empty handler body means the sub-parse silently dropped the
            // commands. Don't inherit its (often misleadingly high) confidence.
            const bodyEmpty = !handler.body || handler.body.length === 0;
            confidences.push(bodyEmpty ? 0.2 : (handler.metadata?.confidence ?? 0.75));
          } else {
            confidences.push(0); // parsed, but not a handler — structural miss
          }
        } catch {
          confidences.push(0);
        }
      }
      segStart = j + 1;
    } else if (isOpener(tok)) {
      depth++;
    }
  }

  if (eventHandlers.length === 0 && initCommands.length === 0) return null;

  const confidence = (sawClosingEnd ? 1 : 0.8) * meanConfidence(confidences);
  return createBehaviorNode(
    name,
    parameters,
    eventHandlers,
    initCommands.length > 0 ? initCommands : undefined,
    { sourceLanguage: language, confidence, sourceText: input }
  );
}

/** Parse a `def name(params) … end` block into a DefSemanticNode. */
function parseDefBlock(
  input: string,
  language: string,
  tokens: readonly LanguageToken[],
  parsers: BlockParsers
): SemanticNode | null {
  // Function name — any identifier (optionally namespaced, e.g. `utils.calc`).
  // Skip a leading object marker (he `def את foo`, zh `def 把 foo`) first.
  const nameIdx = resolveNameTokenIndex(tokens, 0, language);
  if (nameIdx < 0) return null;
  const nameToken = tokens[nameIdx];
  const name = nameToken.value;
  if (!/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/.test(name)) return null;

  const { parameters, headerEnd } = parseHeader(input, nameToken);
  let bodyStart = tokens.findIndex(t => t.position.start >= headerEnd);
  if (bodyStart <= nameIdx) bodyStart = nameIdx + 1;

  const endForms = keywordForms(language, 'end');
  const openerSets = OPENER_ACTIONS.map(a => keywordForms(language, a));
  const isOpener = (tok: LanguageToken): boolean => isBlockOpener(tok, openerSets);
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);

  // The def body is a flat command sequence (no event handlers). Find the def's
  // own closing `end` via depth-aware matching (nested if/repeat have their own
  // ends), slice the body text, and parse it as one statement.
  let depth = 0;
  let endIdx = -1;
  for (let j = bodyStart; j < tokens.length; j++) {
    if (isEnd(tokens[j])) {
      if (depth === 0) {
        endIdx = j;
        break;
      }
      depth--;
    } else if (isOpener(tokens[j])) {
      depth++;
    }
  }

  const bodyStartPos = tokens[bodyStart]?.position.start ?? headerEnd;
  const bodyEndPos = endIdx >= 0 ? tokens[endIdx].position.start : input.length;
  const bodyText = input.slice(bodyStartPos, bodyEndPos).trim();
  if (!bodyText) return null;

  let body: SemanticNode[];
  try {
    body = flattenStatements(parsers.body(bodyText, language));
  } catch {
    return null;
  }
  if (body.length === 0) return null;
  let confidence = meanConfidence(body.map(s => s.metadata?.confidence ?? 0.75));
  if (endIdx < 0) confidence *= 0.8; // missing closing `end`

  return createDefNode(name, parameters, body, {
    sourceLanguage: language,
    confidence,
    sourceText: input,
  });
}
