/**
 * Semantic Parser
 *
 * The main parser that converts natural language hyperscript to semantic nodes.
 * Combines tokenization and pattern matching.
 */

import type {
  SemanticNode,
  CommandSemanticNode,
  CompoundSemanticNode,
  EventHandlerSemanticNode,
  SemanticParser as ISemanticParser,
  SemanticValue,
  SemanticRole,
  ActionType,
  LanguagePattern,
  LanguageToken,
  TokenStream,
  Diagnostic,
} from '../types';
import {
  createCommandNode,
  createEventHandler,
  createCompoundNode,
  createConditionalNode,
  createSelector,
  createLiteral,
  createReference,
} from '../types';
import {
  tokenize as tokenizeInternal,
  getSupportedLanguages as getTokenizerLanguages,
  TokenStreamImpl,
} from '../tokenizers';
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getPatternsForLanguage, tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { patternMatcher } from './pattern-matcher';
import { tryParseBlock, tryParseProgram } from './block-parser';
import { eventNameTranslations } from '../patterns/event-handler';
import { isAtEndPositionNoun } from '../patterns/put';
import { render as renderExplicitFn } from '../explicit/renderer';
import { parseExplicit as parseExplicitFn } from '../explicit/parser';

/**
 * Block-introducing command actions: their tokens are a condition/clause plus a
 * branch body, not a flat argument list. When a fused event pattern captures one
 * of these as the handler action, the trailing body must be parsed separately
 * (see `buildEventHandler`).
 */
const BLOCK_BODY_ACTIONS = new Set(['if', 'unless', 'while', 'repeat', 'for']);

/**
 * Control-flow / structural keywords that tokenize as identifiers in some
 * languages but can never be a trailing role value (source/destination). Guards
 * tryAttachTrailingRole against capturing a block terminator (`put … end`) or a
 * branch keyword (`… else …`) as a destination.
 */
const NON_VALUE_KEYWORDS = new Set([
  'then',
  'end',
  'else',
  'if',
  'unless',
  'while',
  'for',
  'repeat',
  'and',
]);

/**
 * Positional keywords that lead a positional-phrase role value (`closest .card`,
 * `next .panel`). tryAttachTrailingRole uses these to reclaim a trailing
 * `<positional> <selector> <marker>` destination as the `{ type: 'expression' }`
 * shape the core runtime evaluates — matching the English reference parse.
 */
const POSITIONAL_VALUE_KEYWORDS = new Set([
  'first',
  'last',
  'next',
  'previous',
  'random',
  'closest',
]);

/**
 * Known WAITABLE event names — the gate for treating a `wait` argument as an
 * event wait rather than a time wait. `wait for transitionend` (en head) and
 * the marker-less translations (`esperar transitionend`) both put the event
 * name where a duration would sit; a bare identifier is otherwise ambiguous
 * with a time-variable wait (`wait delay`), so the relabel/reclaim fires ONLY
 * on names in this set. Event names are untranslated loanwords in every corpus
 * language (the RESPONSE_TYPE_WORDS precedent), so a value-set gate is
 * language-invariant. Superset of the handler-side KNOWN_EVENTS plus the
 * transition/animation/pointer/touch/drag families that waits actually target.
 */
const WAITABLE_EVENT_WORDS = new Set([
  // handler-side KNOWN_EVENTS
  'click',
  'dblclick',
  'input',
  'change',
  'submit',
  'keydown',
  'keyup',
  'keypress',
  'mouseover',
  'mouseout',
  'mousedown',
  'mouseup',
  'focus',
  'blur',
  'load',
  'scroll',
  'resize',
  'contextmenu',
  // transition / animation
  'transitionend',
  'transitionstart',
  'transitionrun',
  'transitioncancel',
  'animationend',
  'animationstart',
  'animationiteration',
  'animationcancel',
  // pointer / touch / mouse movement
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointerenter',
  'pointerleave',
  'pointercancel',
  'pointerover',
  'pointerout',
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',
  'mousemove',
  'mouseenter',
  'mouseleave',
  'wheel',
  // drag & drop
  'dragstart',
  'dragend',
  'dragover',
  'dragenter',
  'dragleave',
  'drop',
  'drag',
  // lifecycle / misc
  'loadend',
  'loadstart',
  'error',
  'abort',
  'close',
  'open',
  'message',
  'popstate',
  'hashchange',
  'storage',
  'online',
  'offline',
  'visibilitychange',
]);

// =============================================================================
// Parse Error with Diagnostics (Phase 3.4)
// =============================================================================

/**
 * Error thrown when semantic parsing fails.
 * Contains structured diagnostics from each fallback stage.
 */
export class SemanticParseError extends Error {
  readonly diagnostics: readonly Diagnostic[];
  readonly language: string;
  readonly input: string;

  constructor(
    message: string,
    language: string,
    input: string,
    diagnostics: readonly Diagnostic[]
  ) {
    super(message);
    this.name = 'SemanticParseError';
    this.language = language;
    this.input = input;
    this.diagnostics = diagnostics;
  }
}

/** Helper to create a parse diagnostic */
function parseDiagnostic(
  message: string,
  severity: 'error' | 'warning' | 'info',
  code?: string
): Diagnostic {
  return { message, severity, source: 'semantic-parser', ...(code && { code }) };
}

/** Attach diagnostics to a semantic node */
function withDiagnostics<T extends SemanticNode>(node: T, diagnostics: Diagnostic[]): T {
  if (diagnostics.length === 0) return node;
  return { ...node, diagnostics } as T;
}

/**
 * Strip a symmetric pair of surrounding quote characters from a string
 * literal token's raw value. Unbalanced values are returned unchanged.
 */
function stripQuotes(val: string): string {
  if (val.length >= 2) {
    const first = val[0];
    if ((first === '"' || first === "'") && val.endsWith(first)) {
      return val.slice(1, -1);
    }
  }
  return val;
}

// =============================================================================
// Semantic Parser Implementation
// =============================================================================

/**
 * R1 primary-role relabel (Arc 4 — SOV event-anchor role mistype). Applied once on
 * the final tree (outside the hot matching loop) to every parse. When an SOV/V2
 * reorder fronts a command's leading object, the fused-event / generic match paths
 * bind it to the generic `patient` role. But many commands have NO `patient` role and
 * a distinct `primaryRole` — `fetch`→source, `wait`→duration, `send`/`trigger`→event,
 * `bind`/`tell`→destination. The fronted URL/duration/event then parses as
 * `<cmd>.patient` instead of `<cmd>.<primaryRole>`: a role MISTYPE (command + value
 * TYPE correct, role NAME wrong). Relabelled iff the schema lists no `patient` role
 * (so any `patient` is spurious) and the `primaryRole` slot is empty (never clobbers a
 * real value — a `fetch` with both a source URL and a `body` patient keeps the
 * patient). `fetch.patient:literal` → `fetch.source:literal`.
 *
 * This fires ONLY on a spurious `patient` (a mis-parse), so clean en / round-trip
 * nodes are untouched and rendering is unaffected. (Contrast {@link fillSchemaDefaults},
 * which touches clean nodes and so is a measurement-only pass, NOT applied in `parse()`.)
 *
 * Recurses into every body node; idempotent.
 */
const NORMALIZE_CHILD_FIELDS = [
  'body',
  'statements',
  'thenBranch',
  'elseBranch',
  'eventHandlers',
  'initBlock',
] as const;

function normalizeCommandRoles(node: SemanticNode, boundIdentifiers?: Set<string>): SemanticNode {
  if (!node || typeof node !== 'object') return node;

  if (node.action && node.roles instanceof Map) {
    const schema = getSchema(node.action);
    const primary = schema?.primaryRole;
    if (
      schema &&
      primary &&
      primary !== 'patient' &&
      !schema.roles.some(r => r.role === 'patient') &&
      node.roles.has('patient') &&
      !node.roles.has(primary)
    ) {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const value = roles.get('patient');
      if (value !== undefined) {
        roles.delete('patient');
        roles.set(primary, value);
      }
    }

    // tell: the generated marker extraction binds tell's element to the
    // generic `patient` (tell has NO patient role) and the trailing verb of
    // the dropped `to <command>` body to `destination` as a literal —
    // schema-invalid, a tell destination is selector/reference (`decir #modal
    // a mostrar` → patient:selector="#modal", destination:literal="show").
    // Relabel patient→destination and drop the junk literal so translations
    // align with the en reference (`tell #modal to show` →
    // destination:selector="#modal"; the body verb is dropped in the en
    // reference too — equal lossiness, no phantom). Cluster-B precedent: the
    // schema-invalid-destination relabel (ko `json 로`).
    if (node.action === 'tell') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const pat = roles.get('patient');
      const dest = roles.get('destination');
      if (
        pat &&
        (pat.type === 'selector' || pat.type === 'reference') &&
        (!dest || dest.type === 'literal')
      ) {
        roles.delete('patient');
        roles.set('destination', pat);
      }
    }

    // wait: a duration that IS a known waitable event name is an EVENT wait —
    // `wait for transitionend` (en `wait-en-for-event` head) vs the
    // marker-less translations (`esperar transitionend`), whose generated
    // `wait {duration}` pattern binds the event name as
    // duration:expression. Relabel duration→event:literal so both shapes
    // align and the waitMapper emits the runtime's `modifiers.for` event
    // wait. Gated on WAITABLE_EVENT_WORDS so a time-variable wait
    // (`wait delay`, `wait 2s`) is never touched.
    if (node.action === 'wait') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      if (!roles.has('event')) {
        const dur = roles.get('duration') as
          | { type: string; raw?: unknown; value?: unknown }
          | undefined;
        const word =
          dur?.type === 'expression' ? dur.raw : dur?.type === 'literal' ? dur.value : undefined;
        if (typeof word === 'string' && WAITABLE_EVENT_WORDS.has(word.toLowerCase())) {
          roles.delete('duration');
          roles.set('event', { type: 'literal', value: word, dataType: 'string' });
        }
      }
    }

    // Canonicalize a COMMAND's `event` role: an event NAME types as `literal`,
    // not `expression`. The type an event name gets is tokenizer-incidental —
    // en `trigger init` captured `event:literal` only because `init` happens to
    // be an en KEYWORD (the init-block head), while every language whose
    // tokenizer doesn't know the untranslated name captured `event:expression`
    // (trigger-event R1 miss in 15 languages); namespaced `behavior:phase`
    // names (`sortable:start`) split at the colon in several tokenizers, so the
    // translation held a bare fragment while en kept the fused form. An event
    // name is a name, not an evaluable — and the `on`-handler convention is
    // `event:literal` everywhere. Command nodes only (`kind: 'command'`):
    // handler nodes keep their own event typing, and a parenthesized/dotted/
    // spaced raw stays `expression` (a real evaluable, e.g. `click(x)`).
    if (node.kind === 'command' && node.action !== 'on') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const ev = roles.get('event');
      if (ev && ev.type === 'expression') {
        const raw = (ev as { raw?: unknown }).raw;
        if (typeof raw === 'string' && /^[A-Za-z_][A-Za-z0-9_-]*(:[A-Za-z0-9_-]+)?$/.test(raw)) {
          roles.set('event', { type: 'literal', value: raw, dataType: 'string' });
        }
      }
    }

    // Canonicalize a destination holding a locally-BOUND identifier (a loop
    // binding or set variable — see registerBoundIdentifiers) to `expression`:
    // it is a variable read, and that is how the en reference types it (`add
    // .processed to item` → destination:expression). Which type the marked
    // capture got is tokenizer-incidental — ja/ko typed the untranslated `item`
    // as a bare literal.
    if (boundIdentifiers?.size) {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const dest = roles.get('destination');
      if (
        dest &&
        dest.type === 'literal' &&
        typeof dest.value === 'string' &&
        boundIdentifiers.has(dest.value)
      ) {
        roles.set('destination', { type: 'expression', raw: dest.value } as SemanticValue);
      }
    }
  }

  const rec = node as unknown as Record<string, unknown>;
  for (const field of NORMALIZE_CHILD_FIELDS) {
    const child = rec[field];
    if (Array.isArray(child)) {
      for (const c of child) normalizeCommandRoles(c as SemanticNode, boundIdentifiers);
    }
  }
  return node;
}

/**
 * R1 default-role fill (Tier 2b) — a **fidelity-MEASUREMENT** normalization, NOT part
 * of `parse()`. Generated SVO patterns apply a schema role's `default` when the role
 * is absent (`toggle`/`add` destination → me, `remove`/`take` source → me,
 * `increment`/`decrement` quantity → 1), so the en parse materializes it; the SOV
 * fused-event / extraction paths don't, so an SOV parse drops it (en
 * `increment.quantity:literal` vs SOV nothing). At RUNTIME both default identically,
 * so that "gap" is a false-positive in R1 role-recall.
 *
 * This mutates the node IN PLACE, filling any absent role the schema declares a
 * `default` for (shallow-copied so nodes never share the schema's object). It is
 * deliberately NOT called from `parse()`: applying it there would make the RENDERER
 * emit the materialized defaults (phantom tokens) and break round-trips. Instead the
 * fidelity harness calls it on its own throwaway parse before collecting the role
 * signature, uniformly on the en reference AND every translation — so it only ever
 * removes the false-positive, never introduces an asymmetry. Recurses; idempotent.
 */
export function fillSchemaDefaults(node: SemanticNode): SemanticNode {
  if (!node || typeof node !== 'object') return node;

  if (node.action && node.roles instanceof Map) {
    const schema = getSchema(node.action);
    if (schema) {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      for (const spec of schema.roles) {
        if (spec.default !== undefined && !roles.has(spec.role)) {
          roles.set(spec.role, { ...spec.default } as SemanticValue);
        }
      }
    }
  }

  const rec = node as unknown as Record<string, unknown>;
  for (const field of NORMALIZE_CHILD_FIELDS) {
    const child = rec[field];
    if (Array.isArray(child)) {
      for (const c of child) fillSchemaDefaults(c as SemanticNode);
    }
  }
  return node;
}

export class SemanticParserImpl implements ISemanticParser {
  /**
   * Parse input in the specified language to a semantic node, then apply the R1
   * role-fidelity normalization (see {@link normalizeCommandRoles}) once on the
   * assembled tree. Every public + recursive parse path funnels through here, so
   * the normalization reaches body commands built by any sub-parser.
   */
  parse(input: string, language: string): SemanticNode {
    // Locally-bound identifiers are scoped to one top-level parse; recursive
    // sub-parses (behavior handlers, block bodies) inherit the outer scope.
    if (this.parseDepth === 0) this.boundIdentifiers.clear();
    this.parseDepth++;
    try {
      return normalizeCommandRoles(this.parseInternal(input, language), this.boundIdentifiers);
    } finally {
      this.parseDepth--;
    }
  }

  /** Re-entrancy depth of {@link parse} — see boundIdentifiers scoping. */
  private parseDepth = 0;

  /**
   * Identifiers BOUND earlier in the current top-level parse: a loop binding
   * variable (`repeat for item in .items` — repeat.patient) or a set variable
   * (`set item to …` — set.destination). The strict trailing-`destination`
   * reclaim (see {@link tryAttachTrailingRole}) rejects arbitrary bare
   * identifiers by design, but an identifier the SAME input just bound is a
   * legitimate destination (`add .processed to item` inside the loop body —
   * the en reference captures it as destination:expression since the schema
   * admits expression; without this the SOV trailing `item に` reclaim
   * defaulted the destination to `me`).
   */
  private boundIdentifiers = new Set<string>();

  /** Record identifiers a just-built command binds (repeat/for patient, set destination). */
  private registerBoundIdentifiers(node: CommandSemanticNode): void {
    const role =
      node.action === 'repeat' || node.action === 'for'
        ? 'patient'
        : node.action === 'set'
          ? 'destination'
          : null;
    if (!role) return;
    const v = node.roles.get(role as SemanticRole) as { type?: string; raw?: unknown } | undefined;
    if (v?.type === 'expression' && typeof v.raw === 'string' && /^[A-Za-z_]\w*$/.test(v.raw)) {
      this.boundIdentifiers.add(v.raw);
    }
  }

  /**
   * Parse input in the specified language to a semantic node.
   * Accumulates diagnostics from each fallback stage (Phase 3.4).
   */
  private parseInternal(input: string, language: string): SemanticNode {
    // Stage 0: structural / block layer. A `behavior … end` block is decomposed
    // into its handlers (each parsed by the single-statement path below) and
    // re-assembled — otherwise the leading keyword matches and the whole body is
    // dropped at a false confidence 1.0. Returns null (fast) for non-block input.
    const blockNode = tryParseBlock(input, language, {
      statement: (text, lang) => this.parse(text, lang),
      body: (text, lang) => this.parseStatements(text, lang),
    });
    if (blockNode) return blockNode;

    // Stage 0.5: multi-handler PROGRAM layer. A top-level script with ≥2 event
    // handlers (`on click … end on keyup … end`) otherwise matches only the first
    // handler at Stage 1 and silently absorbs the rest into its body. This splits
    // the input into top-level handler segments (end-delimited, trigger-agnostic)
    // and re-assembles them. Returns null (fast) unless ≥2 segments all parse as
    // handlers, so single statements fall through unchanged.
    const programNode = tryParseProgram(input, language, {
      statement: (text, lang) => this.parse(text, lang),
      body: (text, lang) => this.parseStatements(text, lang),
    });
    if (programNode) return programNode;

    // Extract standalone event modifiers (once, debounced, throttled) from input
    const { modifiers, remainingInput } = this.extractStandaloneModifiers(input, language);
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
    const asyncStrip = this.stripAsyncModifier(modInput, language);
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
    const dntStrip = this.stripDoNotThrowModifier(asyncInput, language);
    const parseInput = dntStrip.remainingInput ?? asyncInput;

    // Diagnostics accumulator (Phase 3.4)
    const diagnostics: Diagnostic[] = [];

    // Tokenize the input
    const tokens = tokenizeInternal(parseInput, language);

    // Get patterns for this language
    const patterns = getPatternsForLanguage(language);

    if (patterns.length === 0) {
      throw new SemanticParseError(
        `No patterns available for language: ${language}`,
        language,
        parseInput,
        [
          parseDiagnostic(
            `No patterns registered for language '${language}'`,
            'error',
            'no-patterns'
          ),
        ]
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
              const reparsed = this.parse(reordered, language);
              if (reparsed && reparsed.kind === 'event-handler') {
                const result = modifiers
                  ? this.applyModifiers(reparsed as EventHandlerSemanticNode, modifiers)
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
      for (let i = 1; i < arr.length - 1; i++) {
        const t = arr[i];
        const surface = t.value;
        const norm = (t.normalized ?? t.value).toLowerCase();
        const isOr =
          norm === 'or' ||
          SemanticParserImpl.OR_KEYWORDS.has(surface) ||
          SemanticParserImpl.OR_KEYWORDS.has(norm);
        if (!isOr) continue;
        const evTok = arr[i + 1];
        const evNorm = (evTok.normalized ?? evTok.value).toLowerCase();
        if (!SemanticParserImpl.KNOWN_EVENTS.has(evNorm)) break;
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
            const reparsed = this.parse(reduced, language);
            if (reparsed && reparsed.kind === 'event-handler') {
              (reparsed as { additionalEvents?: SemanticValue[] }).additionalEvents = [
                { type: 'literal', value: evNorm },
              ];
              const result = modifiers
                ? this.applyModifiers(reparsed as EventHandlerSemanticNode, modifiers)
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
          | { type?: string; raw?: string; value?: string }
          | undefined;
        const evVal = (ev?.raw ?? ev?.value ?? '').toString().toLowerCase();
        const langEvents = eventNameTranslations[language];
        const evIsKnownEvent =
          SemanticParserImpl.KNOWN_EVENTS.has(evVal) ||
          (!!langEvents && Object.keys(langEvents).some(n => n.toLowerCase() === evVal));
        if (evVal && !evIsKnownEvent) {
          const sov = this.trySOVEventExtraction(parseInput, language, sortedPatterns);
          if (sov) {
            diagnostics.push(
              parseDiagnostic(
                `bare-event mis-anchor on "${evVal}" rejected; SOV extraction preferred`,
                'info',
                'stage-bare-event-guard'
              )
            );
            const guarded = modifiers
              ? this.applyModifiers(sov as EventHandlerSemanticNode, modifiers)
              : sov;
            return withDiagnostics(guarded, diagnostics);
          }
          // No real event to recover, but the bare-event pattern still anchored on a
          // `reference` lead — a `$variable`, which can NEVER be an event name (events
          // are bare identifiers like click/keyup). This is a bare COMMAND whose
          // fronted operand the bare-event pattern grabbed: the SOV `bind`
          // (`$greeting को #name-input में bind` → mis-anchors `$greeting` as the
          // event). Prefer a full command parse when one exists; if no command
          // matches, keep the existing event-handler build (no parse-rate change).
          if (ev?.type === 'reference') {
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
        const handler = this.buildEventHandler(eventMatch, tokens, language);
        const result = modifiers ? this.applyModifiers(handler, modifiers) : handler;
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
    const trailingResult = this.tryTrailingEventExtraction(parseInput, language, sortedPatterns);
    if (trailingResult) {
      diagnostics.push(
        parseDiagnostic('trailing event extraction succeeded', 'info', 'stage-trailing-event')
      );
      const result = modifiers
        ? this.applyModifiers(trailingResult as EventHandlerSemanticNode, modifiers)
        : trailingResult;
      return withDiagnostics(result, diagnostics);
    }

    // Stage 2: Try command patterns
    const commandPatterns = sortedPatterns.filter(p => p.command !== 'on');
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
        const sovLoop = this.trySOVEventExtraction(parseInput, language, sortedPatterns);
        if (sovLoop) {
          diagnostics.push(
            parseDiagnostic(
              `SOV event extraction preferred over bare ${commandMatch.pattern.command} command`,
              'info',
              'stage-sov-loop'
            )
          );
          const result = modifiers
            ? this.applyModifiers(sovLoop as EventHandlerSemanticNode, modifiers)
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
        const midLoop = this.tryMidStreamEventExtraction(parseInput, language, sortedPatterns);
        if (midLoop) {
          diagnostics.push(
            parseDiagnostic(
              `mid-stream event extraction preferred over bare ${commandMatch.pattern.command} command`,
              'info',
              'stage-midstream-loop'
            )
          );
          const result = modifiers
            ? this.applyModifiers(midLoop as EventHandlerSemanticNode, modifiers)
            : midLoop;
          return withDiagnostics(result, diagnostics);
        }
      } else if (
        SemanticParserImpl.KNOWN_EVENTS.has(commandMatch.pattern.command) &&
        this.hasSOVEventMarkerHead(parseInput, language)
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
        const sovHomonym = this.trySOVEventExtraction(parseInput, language, sortedPatterns);
        if (sovHomonym) {
          diagnostics.push(
            parseDiagnostic(
              `SOV event extraction preferred over command-homonym event ${commandMatch.pattern.command}`,
              'info',
              'stage-sov-homonym'
            )
          );
          const result = modifiers
            ? this.applyModifiers(sovHomonym as EventHandlerSemanticNode, modifiers)
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
        const midCmd = this.tryMidStreamEventExtraction(parseInput, language, sortedPatterns);
        if (midCmd) {
          diagnostics.push(
            parseDiagnostic(
              `mid-stream event extraction preferred over bare ${commandMatch.pattern.command} command`,
              'info',
              'stage-midstream-cmd'
            )
          );
          const result = modifiers
            ? this.applyModifiers(midCmd as EventHandlerSemanticNode, modifiers)
            : midCmd;
          return withDiagnostics(result, diagnostics);
        }
      }
      diagnostics.push(
        parseDiagnostic(
          `command pattern matched: ${commandMatch.pattern.id} (confidence: ${commandMatch.confidence.toFixed(2)})`,
          'info',
          'pattern-match'
        )
      );
      return withDiagnostics(this.buildCommand(commandMatch, language), diagnostics);
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
      const midNoCmd = this.tryMidStreamEventExtraction(parseInput, language, sortedPatterns);
      if (midNoCmd) {
        diagnostics.push(
          parseDiagnostic(
            'mid-stream event extraction succeeded with no leading command match',
            'info',
            'stage-midstream-nocmd'
          )
        );
        const result = modifiers
          ? this.applyModifiers(midNoCmd as EventHandlerSemanticNode, modifiers)
          : midNoCmd;
        return withDiagnostics(result, diagnostics);
      }
    }

    // Stage 3: Try SOV event trigger extraction
    const sovResult = this.trySOVEventExtraction(parseInput, language, sortedPatterns);
    if (sovResult) {
      diagnostics.push(parseDiagnostic('SOV event extraction succeeded', 'info', 'stage-sov'));
      const result = modifiers
        ? this.applyModifiers(sovResult as EventHandlerSemanticNode, modifiers)
        : sovResult;
      return withDiagnostics(result, diagnostics);
    }
    diagnostics.push(
      parseDiagnostic('SOV event extraction: no event keyword found', 'info', 'stage-sov')
    );

    // Stage 4: Fallback compound command parsing
    const compoundResult = this.tryCompoundCommandParsing(tokens, commandPatterns, language);
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
   * Parse a multi-command body/sequence into a flat list of statement nodes.
   * Unlike `parse()` (which returns on the first command match), this routes
   * through the clause splitter, so `add .a` newline `remove .b`, then-chains, and
   * nested if-blocks all yield every statement. Used by the structural layer for
   * `def` bodies and behavior `init` blocks.
   */
  parseStatements(input: string, language: string): SemanticNode[] {
    const tokens = tokenizeInternal(input, language);
    const commandPatterns = getPatternsForLanguage(language)
      .filter(p => p.command !== 'on')
      .sort((a, b) => b.priority - a.priority);
    return this.parseBodyWithClauses(tokens, commandPatterns, language);
  }

  /**
   * Check if input can be parsed in the specified language.
   */
  canParse(input: string, language: string): boolean {
    try {
      this.parse(input, language);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported languages.
   */
  supportedLanguages(): string[] {
    return getTokenizerLanguages();
  }

  /**
   * Build a command semantic node from a pattern match.
   */
  private buildCommand(
    match: ReturnType<typeof patternMatcher.matchPattern>,
    language: string
  ): CommandSemanticNode {
    if (!match) {
      throw new Error('No match to build command from');
    }

    const roles: Record<string, SemanticValue> = {};
    for (const [role, value] of match.captured) {
      roles[role] = value;
    }

    const node = createCommandNode(match.pattern.command, roles, {
      sourceLanguage: language,
      patternId: match.pattern.id,
      confidence: match.confidence,
    });
    this.registerBoundIdentifiers(node);
    return node;
  }

  /**
   * Build an event handler semantic node from a pattern match.
   */
  private buildEventHandler(
    match: ReturnType<typeof patternMatcher.matchPattern>,
    tokens: ReturnType<typeof tokenizeInternal>,
    language: string
  ): EventHandlerSemanticNode {
    if (!match) {
      throw new Error('No match to build event handler from');
    }

    // Extract the event name
    const eventValue = match.captured.get('event');
    if (!eventValue) {
      throw new Error('Event handler pattern matched but no event captured');
    }

    // Extract event modifiers (.once, .debounce(), .throttle(), etc.)
    const eventModifiers = patternMatcher.extractEventModifiers(tokens);

    // Extract "or" conjunction events (e.g., "click or keydown")
    // Combines into event value string for AST builder compatibility
    const additionalEvents = this.extractOrConjunctionEvents(tokens, language);
    let resolvedEventValue = eventValue;
    if (additionalEvents.length > 0 && eventValue.type === 'literal') {
      const allEvents = [
        String(eventValue.value),
        ...additionalEvents.map(e => String('value' in e ? e.value : '')),
      ];
      resolvedEventValue = { type: 'literal', value: allEvents.join(' or ') };
    }

    let body: SemanticNode[];

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
        if (this.isIfKeyword(kv, language)) {
          ifIdx = k;
          break;
        }
      }
      if (ifIdx >= 0) {
        const commandPatterns = getPatternsForLanguage(language)
          .filter(p => p.command !== 'on')
          .sort((a, b) => b.priority - a.priority);
        const bodyStream = new TokenStreamImpl(all.slice(ifIdx), language);
        const folded = this.parseBodyWithClauses(bodyStream, commandPatterns, language);
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
          return createEventHandler(resolvedEventValue, folded, eventModifiers, {
            sourceLanguage: language,
            patternId: match.pattern.id,
            confidence: match.confidence,
          });
        }
      }
    }

    if (actionValue && actionValue.type === 'literal') {
      // Create a command node directly from captured roles
      const actionName = actionValue.value as string;
      const roles: Record<string, SemanticValue> = {};

      // Copy relevant roles (excluding event, action, and continues which are structural)
      for (const [role, value] of match.captured) {
        if (role !== 'event' && role !== 'action' && role !== 'continues') {
          roles[role] = value;
        }
      }

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
              if (
                !t ||
                t.kind === 'conjunction' ||
                (t.kind === 'keyword' &&
                  (this.isThenKeyword(t.value, language) || this.isEndKeyword(t.value, language)))
              ) {
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
      this.registerBoundIdentifiers(commandNode);

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
      if (!BLOCK_BODY_ACTIONS.has(actionName) || actionName === 'repeat') {
        const isVerbFirst = match.pattern.id.includes('verb-first');
        const all = tokens.tokens;
        const pos = tokens.position();
        const isClauseBoundary = (t: LanguageToken): boolean =>
          t.kind === 'conjunction' ||
          (t.kind === 'keyword' &&
            (this.isThenKeyword(t.value, language) || this.isEndKeyword(t.value, language)));
        let verbIdx = -1;
        for (let k = pos - 1; k >= 0; k--) {
          const t = all[k];
          if (isClauseBoundary(t)) break; // don't cross into a previous clause
          const tn = ((t as { normalized?: string }).normalized ?? t.value).toLowerCase();
          if (tn === actionName) {
            verbIdx = k;
            break;
          }
        }
        if (verbIdx >= 0) {
          // Clause runs from the verb to the next boundary at/after the unconsumed
          // tail (the verb..pos span is already consumed by the fused match; the
          // tail pos..clauseEnd holds the dropped secondary clause).
          let clauseEnd = pos;
          while (clauseEnd < all.length && !isClauseBoundary(all[clauseEnd])) clauseEnd++;
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
              t =>
                ((t as { normalized?: string }).normalized ?? t.value).toLowerCase() === eventNorm
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
            const reparsed = this.parseClause(reparseTokens, commandPatterns, language);
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
            const preservesFused =
              !!first &&
              first.kind === 'command' &&
              Object.entries(roles).every(([role, val]) => {
                if (isIgnorableFusedRole(role, val)) return true;
                const rv = (first as CommandSemanticNode).roles.get(mapRole(role));
                return rv !== undefined && valType(rv) === valType(val);
              });
            // For a block-body action (only `repeat` reaches here) the swap is
            // additionally gated on the re-parse matching a HEAD-ONLY counted-loop
            // pattern (`repeat-<lang>-times`): it stops after the count word so no
            // body is swallowed. The body-swallowing generated repeat (matching
            // `repetir forever alternar …` → quantity:literal="toggle") is NOT a
            // `-times` pattern, so the #530 repeat-forever hazard stays excluded.
            const reparsePid =
              (first as { metadata?: { patternId?: string } } | undefined)?.metadata?.patternId ??
              '';
            const headOnlyOk =
              !BLOCK_BODY_ACTIONS.has(actionName) ||
              // All four repeat HEAD families are HEAD-ONLY by construction
              // (they stop before the loop body — see patterns/repeat.ts), so
              // the swap can never swallow a body command. The body-swallowing
              // generated repeat matches none of these ids.
              /^repeat-.*-(times|for-in|while-head|until-head)$/.test(reparsePid);
            if (
              reparsed.length === 1 &&
              first &&
              first.kind === 'command' &&
              first.action === actionName &&
              preservesFused &&
              headOnlyOk &&
              (first as CommandSemanticNode).roles.size > Object.keys(roles).length
            ) {
              commandNode = first as CommandSemanticNode;
              while (tokens.position() < clauseEnd) tokens.advance();
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
          const trailing = tokens.peek();
          if (trailing && /^\d+(\.\d+)?(ms|s)$/i.test(trailing.value)) {
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
            tokens.advance();
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
            typeof w === 'string' && SemanticParserImpl.RESPONSE_TYPE_WORDS.has(w.toLowerCase());
          const rebuildWithResponseType = (word: string, dropDestination: boolean): void => {
            const roles = Object.fromEntries(rNode.roles) as Record<string, SemanticValue>;
            if (dropDestination) delete roles.destination;
            roles.responseType = { type: 'expression', raw: word } as SemanticValue;
            commandNode = createCommandNode(actionName as ActionType, roles, rNode.metadata);
          };
          const dest = rNode.roles.get('destination') as
            | { type: string; raw?: unknown; value?: unknown }
            | undefined;
          const destSpec = rSchema?.roles.find(r => r.role === 'destination');
          const destWord = dest?.raw ?? dest?.value;
          if (
            dest &&
            destSpec &&
            !destSpec.expectedTypes.includes(
              dest.type as (typeof destSpec.expectedTypes)[number]
            ) &&
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
            if (trailing && WAITABLE_EVENT_WORDS.has(trailing.value.toLowerCase())) {
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
              // phantom bare `for` command in the remaining body tokens. জন্য
              // tokenizes as a PARTICLE (no `normalized`), so also match the
              // profile's for-keyword surface form.
              const post = tokens.peek();
              if (post) {
                const postNorm = (post.normalized ?? '').toLowerCase();
                const forKw = tryGetProfile(language)?.keywords?.for;
                const isForWord =
                  postNorm === 'for' ||
                  post.value === forKw?.primary ||
                  (forKw?.alternatives ?? []).includes(post.value);
                if (isForWord) tokens.advance();
              }
            }
          }
        }
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
      const hasTrailingThenChain = !!nextToken && this.isThenKeyword(nextToken.value, language);

      // A fused VSO/SVO event pattern can capture a *block* command (if/unless/
      // while/repeat/for) as the action but leave the block's condition and branch
      // body unconsumed — and, unlike a simple command, those trailing tokens are
      // *not* bridged by a then-marker (`on click if <cond> show … else … end`).
      const isBlockBodyAction = BLOCK_BODY_ACTIONS.has(actionName);
      const hasBlockBody =
        isBlockBodyAction && !!nextToken && !this.isEndKeyword(nextToken.value, language);

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
      const hasTrailingBody = !!nextToken && !this.isEndKeyword(nextToken.value, language);

      if (hasContinuesMarker || hasTrailingThenChain || hasBlockBody || hasTrailingBody) {
        // Parse remaining tokens as additional commands
        const commandPatterns = getPatternsForLanguage(language)
          .filter(p => p.command !== 'on')
          .sort((a, b) => b.priority - a.priority);

        // Include grammar-transformed continuation patterns (these have specific command types)
        // Continuation patterns have command !== 'on' and id includes 'continuation'
        const grammarContinuationPatterns = getPatternsForLanguage(language)
          .filter(p => p.id.startsWith('grammar-') && p.id.includes('-continuation'))
          .sort((a, b) => b.priority - a.priority);

        const remainingCommands = this.parseBodyWithGrammarPatterns(
          tokens,
          commandPatterns,
          grammarContinuationPatterns,
          language
        );

        if (remainingCommands.length > 0) {
          // Combine first command with remaining commands
          body = [commandNode, ...remainingCommands];
        } else {
          body = [commandNode];
        }
      } else {
        body = [commandNode];
      }
    } else {
      // Traditional parsing: parse remaining tokens as body commands
      const commandPatterns = getPatternsForLanguage(language)
        .filter(p => p.command !== 'on')
        .sort((a, b) => b.priority - a.priority);

      // Use parseBodyWithClauses() to properly handle multi-clause then-chains
      body = this.parseBodyWithClauses(tokens, commandPatterns, language);
    }

    return createEventHandler(resolvedEventValue, body, eventModifiers, {
      sourceLanguage: language,
      patternId: match.pattern.id,
      confidence: match.confidence,
    });
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
  private parseBodyWithClauses(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] {
    const clauses: SemanticNode[] = [];
    const currentClauseTokens: LanguageToken[] = [];
    // Nesting depth of block openers (`if`/`unless`/`while`/`for`/`repeat`)
    // accumulated into the pending clause — see the depth-aware `end` note below.
    let pendingBlockDepth = 0;

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
        const jsNode = this.consumeJsBlock(tokens, language);
        if (jsNode) {
          clauses.push(jsNode);
          continue;
        }

        const conditional = this.tryParseConditionalBlock(tokens, commandPatterns, language);
        if (conditional) {
          clauses.push(conditional);
          continue;
        }
      }

      // Check if this is a conjunction token (clause boundary)
      const isConjunction =
        current.kind === 'conjunction' ||
        (current.kind === 'keyword' && this.isThenKeyword(current.value, language));

      // Check if this is an 'end' keyword (terminates block). The English
      // positional-put phrase `at end of <target>` contains the literal word
      // `end` — when the pending clause ends with `at` and the next token is
      // `of`, this `end` is the position noun, not a block terminator
      // (`put it at end of body`, make-toast-element). The sandwich check is
      // value-based and language-safe: no other language's end keyword sits
      // between literal `at`/`of` tokens.
      const prevClauseToken = currentClauseTokens[currentClauseTokens.length - 1];
      const followingToken = tokens.peek(1);
      const isPositionalEndNoun =
        (prevClauseToken?.value.toLowerCase() === 'at' &&
          followingToken?.value.toLowerCase() === 'of') ||
        // Per-language `at end of` phrase (zh `在 结束 的`, id `di akhir dari`, …):
        // the `end` noun tokenizes as a keyword in some languages and would
        // otherwise chop make-toast's trailing `put it at end of body` clause.
        isAtEndPositionNoun(language, current.value, prevClauseToken?.value, followingToken?.value);
      const isEnd =
        current.kind === 'keyword' &&
        this.isEndKeyword(current.value, language) &&
        !isPositionalEndNoun;

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
      if (isEnd && pendingBlockDepth > 0) {
        pendingBlockDepth--;
        currentClauseTokens.push(current);
        tokens.advance();
        continue;
      }

      if (isConjunction) {
        // We've reached a clause boundary - parse accumulated tokens
        if (currentClauseTokens.length > 0) {
          const clauseNodes = this.parseClause(currentClauseTokens, commandPatterns, language);
          clauses.push(...clauseNodes);
          currentClauseTokens.length = 0; // Clear for next clause
          pendingBlockDepth = 0;
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
              (this.isThenKeyword(t.value, language) || this.isEndKeyword(t.value, language)));
          if (tIsBoundary) break;
          trailingTokens.push(t);
          tokens.advance();
        }

        if (trailingTokens.length > 0) {
          const preNodes =
            currentClauseTokens.length > 0
              ? this.parseClause(currentClauseTokens, commandPatterns, language)
              : [];
          if (preNodes.length === 0 && currentClauseTokens.length > 0) {
            // Pre-`end` tokens parsed to nothing — a stranded argument (e.g. `200ms`)
            // whose verb sits after `end`. Merge so the verb reclaims its argument.
            clauses.push(
              ...this.parseClause(
                [...currentClauseTokens, ...trailingTokens],
                commandPatterns,
                language
              )
            );
          } else {
            // Pre-`end` tokens were already a complete clause (or empty); the
            // trailing tokens are a distinct sibling command — parse separately.
            clauses.push(...preNodes);
            clauses.push(...this.parseClause(trailingTokens, commandPatterns, language));
          }
        } else if (currentClauseTokens.length > 0) {
          const clauseNodes = this.parseClause(currentClauseTokens, commandPatterns, language);
          clauses.push(...clauseNodes);
        }
        currentClauseTokens.length = 0;
        break;
      }

      // Accumulate token for current clause. Count nested-block openers so the
      // depth-aware `end` check above knows when an `end` closes a nested block
      // rather than the body itself. (Openers reached at a clause boundary are
      // consumed by the fold guards instead and never get here.)
      if (current.kind === 'keyword') {
        const cv = (current.normalized ?? current.value).toLowerCase();
        if (
          this.isIfKeyword(cv, language) ||
          this.isUnlessKeyword(cv, language) ||
          cv === 'while' ||
          cv === 'for' ||
          cv === 'repeat'
        ) {
          pendingBlockDepth++;
        }
      }
      currentClauseTokens.push(current);
      tokens.advance();
    }

    // Parse any remaining tokens as final clause
    if (currentClauseTokens.length > 0) {
      const clauseNodes = this.parseClause(currentClauseTokens, commandPatterns, language);
      clauses.push(...clauseNodes);
    }

    this.foldFrontedWhileIntoRepeat(clauses, language);

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

    // If we have multiple clauses, wrap in CompoundSemanticNode
    if (clauses.length > 1) {
      return [createCompoundNode(clauses, 'then', { sourceLanguage: language })];
    }

    return clauses;
  }

  /**
   * Merge a fronted `while {condition}` clause into the adjacent `repeat` head.
   *
   * The SOV reorder fronts a repeat-while's while-phrase BEFORE the event phrase
   * (hi `जब तक #counter.innerText < 10 को क्लिक पर दोहराएं …`, ko `동안 … 반복 …`),
   * so the body splits into a standalone `while{condition}` node followed by a
   * bare `repeat` — while the en reference (cluster D, #567) canonicalizes the
   * same head as ONE `repeat{loopType:"while", condition}` node. The split costs
   * both recall (repeat.condition/loopType missing) and precision (the standalone
   * `while` is spurious vs the en reference). Re-associate them, mirroring the
   * trailing-`unless` guard recovery in parseClause.
   *
   * Conservative: fires only when a flat `while` COMMAND node carrying a
   * condition is immediately followed by a flat `repeat` command that has no
   * condition of its own and no attached body. A ko/ja/tr `repeat` that grabbed a
   * junk numeric loopType from the fronted condition's comparison tail
   * (`loopType:10` from `< 10 를`) is overwritten — the fronted while-phrase IS
   * the loop head, so `loopType` is `"while"` by construction. Loop nodes with
   * bodies (`kind: 'loop'`) and conditionals never enter the fold.
   */
  private foldFrontedWhileIntoRepeat(clauses: SemanticNode[], language: string): void {
    for (let i = 0; i + 1 < clauses.length; i++) {
      const whileNode = clauses[i] as CommandSemanticNode & { body?: unknown };
      const repeatNode = clauses[i + 1] as CommandSemanticNode & { body?: unknown };
      if (whileNode.kind !== 'command' || whileNode.action !== 'while') continue;
      if (repeatNode.kind !== 'command' || repeatNode.action !== 'repeat') continue;
      const condition = whileNode.roles.get('condition');
      if (!condition) continue;
      if (repeatNode.roles.has('condition')) continue;
      if (Array.isArray(whileNode.body) || Array.isArray(repeatNode.body)) continue;

      const roles = new Map(repeatNode.roles);
      roles.set('condition', condition);
      roles.set('loopType', { type: 'literal', value: 'while', dataType: 'string' });
      clauses.splice(i, 2, {
        ...repeatNode,
        roles,
        metadata: {
          ...repeatNode.metadata,
          sourceLanguage: language,
          patternId: `repeat-${language}-fronted-while-fold`,
          confidence: Math.max(
            repeatNode.metadata?.confidence ?? 0,
            whileNode.metadata?.confidence ?? 0
          ),
        },
      });
    }
  }

  /**
   * Parse a single clause (sequence of tokens between conjunctions).
   * Returns array of semantic nodes parsed from the clause.
   */
  private parseClause(
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
      if (this.isUnlessKeyword(lv, language)) {
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
      const verbLookup = profile ? SemanticParserImpl.buildVerbLookup(profile) : null;
      if (verbLookup) {
        for (let i = 1; i < bodyTokens.length - 1; i++) {
          const t = bodyTokens[i];
          const action =
            verbLookup.get(t.value.toLowerCase()) ??
            (t.normalized ? verbLookup.get(t.normalized.toLowerCase()) : undefined);
          if (action && !SemanticParserImpl.CONDITION_OPERATORS.has(action)) {
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
      if (!headIsValue) return;
      // Verb-anchoring on a *fragment* can still mis-fire on a stray marker/keyword
      // (`from`/`into`/`or`/`until`). Keep only well-formed recoveries: a real
      // command schema with at least one captured role.
      for (const node of this.parseSOVClauseByVerbAnchoring(run, language)) {
        const action = (node as { action?: string }).action;
        const roles = (node as { roles?: unknown }).roles;
        if (action && getSchema(action as ActionType) && roles instanceof Map && roles.size > 0) {
          commands.push(node);
        }
      }
    };

    while (!clauseStream.isAtEnd()) {
      // Try to match as a command
      const startTok = clauseStream.peek();
      const startIsRepeatKw = !!startTok && startTok.normalized?.toLowerCase() === 'repeat';
      const startMark = clauseStream.mark();
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
      // `repeat` variant (`repeat N times`/`repeat for …`) keeps its full match.
      if (
        startIsRepeatKw &&
        commandMatch &&
        (commandMatch.pattern.command as string) !== 'repeat'
      ) {
        clauseStream.reset(startMark);
        flushSkipped();
        commands.push(
          createCommandNode(
            'repeat' as ActionType,
            {},
            { sourceLanguage: language, confidence: 0.6 }
          )
        );
        directHits++;
        clauseStream.advance(); // consume only the repeat keyword
        continue;
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
          if (!h || this.isIfKeyword((h.normalized ?? h.value).toLowerCase(), language)) break;
          skipped.push(h);
          clauseStream.advance();
        }
        const conditional = this.tryParseConditionalBlock(clauseStream, commandPatterns, language);
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
        const cmd = this.buildCommand(commandMatch, language);
        commands.push(cmd);
        directHits++;
        this.tryAttachTrailingRole(clauseStream, cmd, language);
      } else {
        // A `for`-binding loop (`repeat for <var> in <coll>`) loses its `for`
        // binder keyword in transit (the i18n transformer emits `repeat <var> in
        // <coll>`), so the bare `repeat` keyword carries no matchable variant
        // (`forever`/`while`/`N times`/`for`) and matchBest can't anchor it — the
        // `repeat` action is silently dropped (ar/tl/zh `repeat-for-each` residue;
        // ko escapes only because its SOV order puts the keyword last where it
        // matches). When matchBest fails on a token whose normalized form is the
        // `repeat` loop keyword, emit the loop action directly so it survives.
        const tok = clauseStream.peek();
        if (tok && tok.normalized?.toLowerCase() === 'repeat') {
          flushSkipped();
          commands.push(
            createCommandNode(
              'repeat' as ActionType,
              {},
              { sourceLanguage: language, confidence: 0.6 }
            )
          );
          directHits++;
        } else if (tok) {
          skipped.push(tok);
        }
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
      const sovCommands = this.parseSOVClauseByVerbAnchoring(bodyTokens, language);
      if (sovCommands.length > 0) {
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
        { condition: { type: 'expression', raw: this.joinTokenText(cond) } },
        {
          sourceLanguage: language,
          patternId: `${trailingGuard}-${language}-trailing-guard`,
          confidence: 0.85,
        }
      );
      // Mirror en's flat `[unless(cond), toggle]` order: guard first, then body.
      return [guardNode, ...bodyCommands];
    }

    return bodyCommands;
  }

  /**
   * Reclaim a trailing post-verb role phrase (`source` or `destination`) that the
   * per-command pattern left unconsumed. The grammar transformer emits a
   * command's `from <source>` / `to <destination>` phrase AFTER the verb:
   *   remove .x from body → `.x を 削除 ボディ から` (modal-close-button)
   *   add .x to body      → `.x を 追加 ボディ に`   (modal-open)
   * The per-command pattern ends at the verb, so the trailing `<value> <marker>`
   * (postpositional, SOV) or `<marker> <value>` (prepositional, SVO th) is skipped
   * and the role defaults to `me` — the effect lands on the clicked element
   * instead of the document body. Body-clause twin of the #379 event-wrapper
   * trailing role groups.
   *
   * Conservative by construction: for each of source/destination the command's
   * schema declares and that is currently absent or the defaulted `me`, fires
   * only when the very next tokens form a clean marker+value pair in that
   * marker's position order. So it can neither overwrite a genuinely captured
   * role (accordion's `remove .open from .accordion-item` keeps its source),
   * steal a following command's tokens (a trailing `then add …` has no role
   * marker adjacent), nor touch a positional-phrase destination (`add .open to
   * closest .accordion-item` — the leading token is the `closest` keyword, which
   * isValue rejects, so that phrase is left for the positional path).
   *
   * The `destination` marker is matched by its PRIMARY surface form only: several
   * profiles list dangerous destination *alternatives* that belong to other roles
   * (ko `에서` is the source marker, hi `को` the object marker), so admitting them
   * would mis-capture a source phrase as a destination. The shipped `source`
   * reclaim keeps its broader primary+alternatives+normalized match.
   */
  private tryAttachTrailingRole(
    stream: TokenStream,
    command: CommandSemanticNode,
    language: string
  ): void {
    const schema = getSchema(command.action as ActionType);
    if (!schema) return;
    const profile = tryGetProfile(language);
    if (!profile) return;
    const roles = command.roles as Map<SemanticRole, SemanticValue>;

    // What counts as a trailing role value. A control-flow keyword never does
    // (`end`/`else`/`then` tokenize as identifiers in some languages and must not
    // be captured). The `strict` variant — used for `destination` — admits only
    // selectors and known DOM reference words; a bare identifier is rejected
    // because the `to`-markers (ja に, ko 에, …) are common enough that admitting
    // arbitrary identifiers makes the reclaim consume tokens a later command
    // needed, cascading into different parses. The non-strict variant — used for
    // `source`, matching the shipped #379/#408 behavior — also admits bare
    // identifiers (the `from`-markers are rarer and were verified safe).
    const isValue = (t: LanguageToken | null, strict: boolean): boolean => {
      if (!t) return false;
      if (t.kind === 'selector') return true;
      const norm = (t.normalized ?? t.value).toLowerCase();
      if (NON_VALUE_KEYWORDS.has(norm)) return false;
      if (
        norm === 'body' ||
        norm === 'it' ||
        norm === 'you' ||
        norm === 'result' ||
        norm === 'document' ||
        norm === 'window'
      )
        return true;
      // A bare identifier the current parse BOUND (a loop binding variable or a
      // set variable — see registerBoundIdentifiers) is a legitimate strict
      // destination (`add .processed to item` in a for-body); arbitrary
      // identifiers stay rejected per the over-capture rationale above.
      if (this.boundIdentifiers.has(t.value)) return true;
      if (strict) return false;
      return t.kind === 'identifier' || (t.kind as string) === 'reference';
    };

    // remove→source, add/put→destination. A command declares at most one of
    // these trailing markers, so the loop never double-fires for one clause.
    const trailingRoles: ReadonlyArray<{ role: SemanticRole; strict: boolean }> = [
      { role: 'source', strict: false },
      { role: 'destination', strict: true },
    ];
    for (const { role, strict } of trailingRoles) {
      if (!schema.roles.some(r => r.role === role)) continue;
      const marker = profile.roleMarkers?.[role];
      if (!marker) continue;
      const existing = roles.get(role);
      // Only fill a missing role or override the schema's `me` default — never a
      // genuinely captured one.
      if (existing && !(existing.type === 'reference' && existing.value === 'me')) continue;

      const isMarker = (t: LanguageToken | null): boolean => {
        if (!t || (t.kind !== 'particle' && t.kind !== 'keyword')) return false;
        const v = t.value.toLowerCase();
        if (marker.primary?.toLowerCase() === v) return true;
        if (strict) return false;
        if ((t.normalized ?? '').toLowerCase() === role) return true;
        return !!marker.alternatives?.some(a => a.toLowerCase() === v);
      };

      const tok0 = stream.peek();
      const tok1 = stream.peek(1);
      if (!tok0 || !tok1) return;

      // Positional-phrase value: `<closest|next|…> <selector> <marker>`
      // (accordion `add .open to closest .accordion-item` → SOV `… 最も近い
      // .accordion-item に`). Only meaningful for the strict (destination) role and
      // only postpositional — the only corpus shape. Built as the same
      // `{ type: 'expression', raw: 'closest .accordion-item' }` the English
      // reference produces (normalized positional keyword + selector surface), so
      // the core's positional evaluator resolves it identically.
      if (strict && marker.position === 'after') {
        const tok2 = stream.peek(2);
        const pos = (tok0.normalized ?? tok0.value).toLowerCase();
        if (POSITIONAL_VALUE_KEYWORDS.has(pos) && tok1.kind === 'selector' && isMarker(tok2)) {
          roles.set(role, { type: 'expression', raw: `${pos} ${tok1.value}` } as SemanticValue);
          stream.advance();
          stream.advance();
          stream.advance();
          return;
        }
      }

      if (marker.position === 'after') {
        // Postpositional `<value> <marker>` (SOV: ja から/に, ko 에서/에, …).
        if (isValue(tok0, strict) && isMarker(tok1)) {
          const v = this.tokenToSemanticValue(tok0);
          stream.advance();
          stream.advance();
          if (v) roles.set(role, v);
          return;
        }
      } else {
        // Prepositional `<marker> <value>` (SVO th: จาก/ใน body).
        if (isMarker(tok0) && isValue(tok1, strict)) {
          stream.advance();
          const v = this.tokenToSemanticValue(stream.advance());
          if (v) roles.set(role, v);
          return;
        }
      }
    }
  }

  // ==========================================================================
  // SOV Verb-Anchored Clause Parsing
  // ==========================================================================

  /**
   * Build a lookup from native verb keywords to action names for a language profile.
   */
  private static buildVerbLookup(profile: {
    keywords: Record<string, { primary: string; alternatives?: string[]; normalized?: string }>;
  }): Map<string, string> {
    const lookup = new Map<string, string>();
    for (const [action, kw] of Object.entries(profile.keywords)) {
      // Skip non-command keywords (on, if, else, etc.). `for` is deliberately
      // NOT skipped: the SOV grammar transforms put the for-loop keyword
      // clause-FINAL (`item の中 $items を ために` / `item içinde $items i için`)
      // — an order no generated pattern covers — so the verb-anchoring fallback
      // is exactly where it must anchor. This path only runs when nothing else
      // in the clause matched, so a `for` in an otherwise-parseable clause is
      // untouched.
      if (['on', 'if', 'else', 'when', 'where', 'while', 'end', 'then', 'and'].includes(action)) {
        continue;
      }
      lookup.set(kw.primary.toLowerCase(), action);
      if (kw.alternatives) {
        for (const alt of kw.alternatives) {
          lookup.set(alt.toLowerCase(), action);
        }
      }
    }
    return lookup;
  }

  /**
   * Build a lookup from role marker strings to role names.
   */
  private static buildMarkerToRoleLookup(profile: {
    roleMarkers: Record<string, { primary: string; alternatives?: string[] }>;
  }): Map<string, string> {
    const lookup = new Map<string, string>();
    for (const [role, marker] of Object.entries(profile.roleMarkers)) {
      if (!marker) continue;
      // The `event` role reuses a value role's particle in most SOV profiles
      // (ja event を = patient を, bn event তে = destination তে, tr event i =
      // patient i, ko event 을 = patient 을). This lookup only feeds BODY-clause
      // role extraction (parseSOVClauseByVerbAnchoring), where the event phrase
      // has already been stripped — so letting `event` clobber a value role's
      // marker mis-labels the fronted value as `event` and the role is dropped
      // downstream (ja/tr append-content "append requires content", bn silent
      // no-op; ko survived only because its corpus form uses the 를 ALTERNATIVE,
      // which never clobbered). Event markers may only fill gaps (qu `pi` keeps
      // its entry — no collision — preserving the not-a-verb shield).
      const overwrite = role !== 'event';
      if (overwrite || !lookup.has(marker.primary)) {
        lookup.set(marker.primary, role);
      }
      if (marker.alternatives) {
        for (const alt of marker.alternatives) {
          // Avoid overwriting more specific roles with generic ones
          if (!lookup.has(alt)) {
            lookup.set(alt, role);
          }
        }
      }
    }
    return lookup;
  }

  /**
   * Parse an SOV clause by finding command verbs and extracting roles from surrounding tokens.
   *
   * The grammar transformer often produces "verb-in-middle" order for two-role commands:
   *   "[role1] [marker1] [verb] [role2] [marker2]"
   *
   * This method:
   * 1. Scans for recognized command verbs in the token stream
   * 2. For each verb, extracts pre-verb and post-verb tokens as roles
   * 3. Uses marker tokens to determine which semantic role each value belongs to
   */
  private parseSOVClauseByVerbAnchoring(
    clauseTokens: LanguageToken[],
    language: string
  ): SemanticNode[] {
    const profile = tryGetProfile(language);
    if (!profile || profile.wordOrder !== 'SOV') return [];

    const verbLookup = SemanticParserImpl.buildVerbLookup(profile);
    const markerToRole = SemanticParserImpl.buildMarkerToRoleLookup(profile);
    const commands: SemanticNode[] = [];

    let pos = 0;

    while (pos < clauseTokens.length) {
      // Find the next verb token
      let verbIdx = -1;
      let verbAction = '';

      for (let i = pos; i < clauseTokens.length; i++) {
        const token = clauseTokens[i];
        // A known postpositional ROLE MARKER (を/に/를/에/i/কে/…) is NEVER a command
        // verb, even when its surface form doubles as a verb keyword alternative:
        // ja's `に` is both the `set`-value destination marker AND an `into`
        // alternative, so anchoring the trailing `それ に` of `set $users to it`
        // emitted a phantom `into` command (R0-precision). Gate on markerToRole,
        // NOT on `kind==='particle'`: a clause-final loop keyword like tr `için` /
        // bn `জন্য` (`for`) also tokenizes as a particle but is NOT a role marker,
        // and the verb-anchoring fallback must still find it as the `for` verb (else
        // template-literal-list-build drops its loop). See buildVerbLookup's `for` note.
        if (markerToRole.has(token.value)) continue;
        const byValue = verbLookup.get(token.value.toLowerCase());
        const byNormalized = token.normalized
          ? verbLookup.get(token.normalized.toLowerCase())
          : undefined;
        const action = byValue || byNormalized;

        if (action) {
          verbIdx = i;
          verbAction = action;
          break;
        }
      }

      if (verbIdx === -1) break; // No more verbs found

      // Tokens before verb = pre-verb arguments
      const preVerbTokens = clauseTokens.slice(pos, verbIdx);

      // Find end of this command: next verb, then-keyword, or end of tokens
      let endIdx = clauseTokens.length;
      for (let i = verbIdx + 1; i < clauseTokens.length; i++) {
        const t = clauseTokens[i];
        // Stop at then-keywords
        if (t.kind === 'conjunction' || this.isThenKeyword(t.value, language)) {
          endIdx = i;
          break;
        }
        // Stop at the next verb (start of new command) — but only if preceded by a marker
        // This prevents stopping at "value" tokens that happen to match a verb name.
        // A known role marker is not a verb (see the verb-find guard above): without
        // this exclusion `に` (set's value marker, also an `into` alt) ends the `set`
        // clause one token early, stranding its `it` patient. A non-marker loop
        // keyword (tr `için` / bn `জন্য`) still legitimately stops the clause.
        if (i > verbIdx + 1 && !markerToRole.has(t.value)) {
          const nextAction =
            verbLookup.get(t.value.toLowerCase()) ||
            (t.normalized ? verbLookup.get(t.normalized.toLowerCase()) : undefined);
          if (nextAction) {
            endIdx = i;
            break;
          }
        }
      }

      // Tokens after verb = post-verb arguments
      const postVerbTokens = clauseTokens.slice(verbIdx + 1, endIdx);

      // Extract roles from pre-verb and post-verb tokens using markers
      const roles = this.extractRolesFromMarkedTokens(
        preVerbTokens,
        postVerbTokens,
        markerToRole,
        verbAction,
        language
      );

      commands.push(
        createCommandNode(verbAction as ActionType, roles, {
          sourceLanguage: language,
          confidence: 0.7,
        })
      );

      pos = endIdx;
      // Skip conjunction/then-keyword if present
      if (pos < clauseTokens.length) {
        const t = clauseTokens[pos];
        if (t.kind === 'conjunction' || this.isThenKeyword(t.value, language)) {
          pos++;
        }
      }
    }

    return commands;
  }

  /**
   * Extract semantic roles from pre-verb and post-verb token groups using marker analysis.
   *
   * Recognizes patterns like:
   *   pre-verb:  [expr] [を]   → patient (obj marker)
   *   post-verb: [expr] [に]   → destination (to marker)
   *   pre-verb:  [expr] [から] → source (from marker)
   */
  private extractRolesFromMarkedTokens(
    preVerbTokens: LanguageToken[],
    postVerbTokens: LanguageToken[],
    markerToRole: Map<string, string>,
    action: string,
    _language: string
  ): Record<string, SemanticValue> {
    const roles: Record<string, SemanticValue> = {};

    // Process a group of tokens: collect value tokens until a marker is found
    const processGroup = (tokens: LanguageToken[]) => {
      let valueTokens: LanguageToken[] = [];

      for (const token of tokens) {
        const role = markerToRole.get(token.value);
        if (role && token.kind === 'particle' && valueTokens.length > 0) {
          // This is a marker — assign the preceding value tokens to this role
          const value = this.tokensToSemanticValue(valueTokens);
          if (value) {
            // Map the role name, avoiding overwrites of existing roles
            const roleKey = this.mapRoleForCommand(role, action, roles);
            if (roleKey) {
              roles[roleKey] = value;
            }
          }
          valueTokens = [];
        } else {
          valueTokens.push(token);
        }
      }

      // Remaining tokens without a following marker
      if (valueTokens.length > 0) {
        const value = this.tokensToSemanticValue(valueTokens);
        if (value) {
          // Unmarked trailing tokens: assign based on what's missing
          if (!roles.patient) {
            roles.patient = value;
          } else if (!roles.destination) {
            roles.destination = value;
          }
        }
      }
    };

    processGroup(preVerbTokens);
    processGroup(postVerbTokens);

    return roles;
  }

  /**
   * Map a marker-derived role name to the appropriate semantic role for a command,
   * handling cases where marker roles overlap (e.g., both patient and destination
   * use similar particles in some languages).
   */
  private mapRoleForCommand(
    markerRole: string,
    _action: string,
    existingRoles: Record<string, SemanticValue>
  ): string | null {
    // Direct mapping — if the role isn't taken yet, use it
    if (!existingRoles[markerRole]) {
      return markerRole;
    }

    // If the marker role is already taken, try to assign to a related role
    // For "set" and "put": patient marker (を/i) is the destination, dest marker (に/e) is the patient value
    if (markerRole === 'patient' && !existingRoles.destination) {
      return 'destination';
    }
    if (markerRole === 'destination' && !existingRoles.patient) {
      return 'patient';
    }
    if (markerRole === 'source' && !existingRoles.source) {
      return 'source';
    }

    return null; // Can't assign
  }

  /**
   * Convert a sequence of tokens into a single SemanticValue.
   */
  private tokensToSemanticValue(tokens: LanguageToken[]): SemanticValue | null {
    if (tokens.length === 0) return null;

    // Filter out noise tokens (whitespace, etc.)
    const meaningful = tokens.filter(t => (t.kind as string) !== 'whitespace');
    if (meaningful.length === 0) return null;

    // Single token — use its type directly
    if (meaningful.length === 1) {
      return this.tokenToSemanticValue(meaningful[0]);
    }

    // Multiple tokens — concatenate values and infer type from the first token
    const combined = meaningful.map(t => t.value).join('');
    const first = meaningful[0];

    if (
      first.kind === 'selector' ||
      first.value.startsWith('#') ||
      first.value.startsWith('.') ||
      first.value.startsWith('@') ||
      first.value.startsWith('*')
    ) {
      return createSelector(combined);
    }
    if (first.kind === 'literal' || first.value.startsWith('"') || first.value.startsWith("'")) {
      return createLiteral(stripQuotes(combined), 'string');
    }
    if ((first.kind as string) === 'reference') {
      return createReference(combined as 'me' | 'it' | 'you' | 'result');
    }

    return createLiteral(combined);
  }

  /**
   * Convert a single token to a SemanticValue.
   */
  private tokenToSemanticValue(token: LanguageToken): SemanticValue {
    const val = token.value;

    // Selectors: #id, .class, @attr, *cssProperty
    if (
      token.kind === 'selector' ||
      val.startsWith('#') ||
      val.startsWith('.') ||
      val.startsWith('@') ||
      val.startsWith('*')
    ) {
      return createSelector(val);
    }

    // String literals — strip the quote characters like the pattern-matcher
    // path does (parseLiteralValue); keeping them put literal `"Done!"`
    // (quotes and all) into the DOM at runtime in the particle-based parse
    // path while en wrote `Done!`.
    if (val.startsWith('"') || val.startsWith("'")) {
      return createLiteral(stripQuotes(val), 'string');
    }

    // Numbers
    if (/^-?\d+(\.\d+)?$/.test(val)) {
      return createLiteral(parseFloat(val));
    }

    // Booleans (including translated forms)
    if (val === 'true' || val === '真' || val === '참' || val === 'doğru') {
      return createLiteral(true);
    }
    if (val === 'false' || val === '偽' || val === '거짓' || val === 'yanlış') {
      return createLiteral(false);
    }

    // References: me, it, you (check normalized form)
    const ref = token.normalized?.toLowerCase();
    if (ref === 'me' || ref === 'it' || ref === 'you' || ref === 'result' || ref === 'body') {
      return createReference(ref as 'me' | 'it' | 'you' | 'result');
    }
    if ((token.kind as string) === 'reference') {
      return createReference((token.normalized as 'me' | 'it' | 'you') || 'me');
    }

    // Default to literal
    return createLiteral(val);
  }

  /**
   * Parse body commands with support for grammar-transformed patterns.
   * Used after a grammar-transformed pattern with continuation marker.
   */
  private parseBodyWithGrammarPatterns(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    grammarPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] {
    const commands: SemanticNode[] = [];

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
    const flushClause = () => {
      if (!clauseHadMatch && skippedClauseTokens.length > 0) {
        commands.push(...this.parseSOVClauseByVerbAnchoring(skippedClauseTokens, language));
      }
      skippedClauseTokens = [];
      clauseHadMatch = false;
    };

    while (!tokens.isAtEnd()) {
      const current = tokens.peek();

      // Check for 'then' keyword - skip it and continue parsing
      if (current && this.isThenKeyword(current.value, language)) {
        flushClause();
        tokens.advance();
        continue;
      }

      // Check for 'end' keyword - terminates block. But an `end` keyword that is
      // the position NOUN of an `at end of` phrase (qu `… pi tukuy pa kurku ta
      // churay`, where `tukuy` = end) is not a block terminator — the same guard
      // parseBodyWithClauses applies, now mirrored on this fused-body path so a
      // make-event's trailing at-end put (make-toast) isn't chopped.
      if (current && this.isEndKeyword(current.value, language)) {
        const prevTok = tokens.peek(-1);
        const nextTok = tokens.peek(1);
        const isPositionalEnd = isAtEndPositionNoun(
          language,
          current.value,
          prevTok?.value,
          nextTok?.value
        );
        if (!isPositionalEnd) {
          flushClause();
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
      if (
        current &&
        !clauseHadMatch &&
        this.isIfKeyword((current.normalized ?? current.value).toLowerCase(), language)
      ) {
        flushClause();
        const conditional = this.tryParseConditionalBlock(tokens, commandPatterns, language);
        if (conditional) {
          commands.push(conditional);
          clauseHadMatch = true;
          continue;
        }
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
              if (!h || this.isIfKeyword((h.normalized ?? h.value).toLowerCase(), language)) break;
              tokens.advance();
            }
            const conditional = this.tryParseConditionalBlock(tokens, commandPatterns, language);
            if (conditional) {
              flushClause();
              commands.push(conditional);
              clauseHadMatch = true;
              continue;
            }
            tokens.reset(afterMatch);
          }
          const cmd = this.buildCommand(commandMatch, language);
          commands.push(cmd);
          // Reclaim a trailing post-verb source/destination phrase the matched
          // pattern left unconsumed (`remove .x from body` → `.x を 削除 ボディ から`,
          // `add .x to body` → `.x を 追加 ボディ に`); without this the SOV grammar
          // body walker skips the trailing `<value> <marker>` and the role stays
          // the `me` default. Same guard as the parseClause call site.
          this.tryAttachTrailingRole(tokens, cmd, language);
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
    return commands;
  }

  // ==========================================================================
  // Multi-Command Compound Fallback
  // ==========================================================================

  /**
   * Try parsing input as a multi-command compound (no event wrapper).
   * Handles standalone command sequences separated by then-keywords.
   * Used as a last resort when no event trigger is detected.
   */
  private tryCompoundCommandParsing(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode | null {
    // Only try if the input has a clause-joining keyword (otherwise single-command
    // already tried). A then-keyword joins sequential commands; an else-keyword
    // joins an `if … else …` block whose branches carry no `then` between them
    // (the if/else block-mask transform emits `<thenBranch> else <elseBranch>`),
    // which would otherwise leave the whole handler unparsed when the event itself
    // isn't recognized.
    const allTokens = tokens.tokens;
    const hasThenKeyword = allTokens.some(
      t =>
        t.kind === 'conjunction' || (t.kind === 'keyword' && this.isThenKeyword(t.value, language))
    );
    const hasElseKeyword = allTokens.some(t => this.isElseKeyword(t.value, language));
    if (!hasThenKeyword && !hasElseKeyword) return null;

    // Reset token stream and parse using clause-based parsing
    const freshStream = new TokenStreamImpl(allTokens as LanguageToken[], language);
    const body = this.parseBodyWithClauses(freshStream, commandPatterns, language);

    if (body.length === 0) return null;

    // Return the compound node (or single command if only one clause parsed)
    if (body.length === 1) {
      return body[0];
    }
    return createCompoundNode(body, 'then', {
      sourceLanguage: language,
      confidence: 0.65,
    });
  }

  // ==========================================================================
  // SOV Event Trigger Extraction
  // ==========================================================================

  /**
   * Known event names for detection (common DOM events).
   */
  private static readonly KNOWN_EVENTS = new Set([
    'click',
    'dblclick',
    'input',
    'change',
    'submit',
    'keydown',
    'keyup',
    'keypress',
    'mouseover',
    'mouseout',
    'mousedown',
    'mouseup',
    'focus',
    'blur',
    'load',
    'scroll',
    'resize',
    'contextmenu',
  ]);

  /**
   * SOV event marker particles per language (postpositions that mark the event role).
   * Korean has no event marker particle -- the event keyword stands alone.
   */
  /**
   * Known `fetch … as <type>` response-type words. Untranslated loanwords in
   * every corpus language (the transformer localizes the `as` marker, never the
   * word), so a value-set gate is language-invariant. Used by the trailing
   * response-type reclaim in {@link buildEventHandler} — mirrors core's
   * supported conversions (json/text/html/response + binary forms).
   */
  private static readonly RESPONSE_TYPE_WORDS = new Set([
    'json',
    'text',
    'html',
    'xml',
    'blob',
    'arraybuffer',
    'formdata',
    'response',
  ]);

  private static readonly SOV_EVENT_MARKERS: Record<string, Set<string>> = {
    ja: new Set(['で']),
    ko: new Set(), // ko's marker is the two-token 할 때 phrase — see SOV_EVENT_MARKER_PHRASES
    tr: new Set(['de', 'da', 'te', 'ta']),
    bn: new Set(['এ']),
    qu: new Set(['pi']),
    // hi's event-on marker (`क्लिक पर` = "on click"). hi was the only priority SOV
    // language WITHOUT a Stage-3 SOV event-extraction fallback, so an event handler
    // whose generated pattern doesn't cover the emitted role order — notably the
    // patient-first 2-role shape `{patient} को {event} पर {verb} {destination} में`
    // (append-content) — used to survive only via the bare-event mis-anchor (the
    // fronted patient grabbed as a degenerate "event"). With the event-anchor guard
    // rejecting that, this fallback recovers the real `<known-event> पर` trigger and
    // re-parses the body. Stage 3 runs only when Stages 1–2 fail, and the known-event
    // gate + body re-parse keep it additive (NULL → parse, never overriding a match).
    hi: new Set(['पर']),
  };

  /**
   * OPTIONAL multi-token event-marker phrases consumed after the event token.
   * The ko i18n profile emits 할 때 after the event role; it tokenizes as TWO
   * tokens (할 identifier + 때 keyword), invisible to the single-token marker
   * check above. Unlike SOV_EVENT_MARKERS these never gate event detection —
   * ko events still anchor bare (pre-marker emissions, hand-written input) —
   * the phrase is just consumed when present so it doesn't leak into the body,
   * and it CONFIRMS a custom (identifier) event the way ja's で does.
   */
  private static readonly SOV_EVENT_MARKER_PHRASES: Record<string, string[][]> = {
    ko: [['할', '때'], ['할때']],
  };

  /** Length (in tokens) of an event-marker phrase starting at startIdx, or 0. */
  private matchEventMarkerPhrase(
    allTokens: readonly LanguageToken[],
    startIdx: number,
    language: string
  ): number {
    const phrases = SemanticParserImpl.SOV_EVENT_MARKER_PHRASES[language];
    if (!phrases) return 0;
    for (const phrase of phrases) {
      if (phrase.every((w, j) => allTokens[startIdx + j]?.value === w)) return phrase.length;
    }
    return 0;
  }

  /**
   * Does the input carry an SOV event-handler head — a known-event token
   * immediately followed by this language's single-token event marker (ja で,
   * tr de/da/te/ta, …) or multi-token marker phrase (ko 할 때)?
   *
   * Used to distinguish a genuine standalone command from an event handler whose
   * verb is a command-homonym event word (scroll/resize/focus/…). With no
   * single-token event marker (ko), the Stage-1 fused event pattern can't anchor
   * once a `from <source>` clause (`창 에서`) splits the head, so Stage 2 matches the
   * homonym as its literal command and returns before the SOV extraction stage. This
   * structural cue (`<event> <marker>`) gates the Stage-2 preference for SOV
   * extraction, so a real bare command (`스크롤 #panel` — no marker) is untouched.
   * Returns false for languages with no SOV event-marker config.
   */
  private hasSOVEventMarkerHead(input: string, language: string): boolean {
    const eventMarkers = SemanticParserImpl.SOV_EVENT_MARKERS[language];
    if (eventMarkers === undefined) return false;

    const { tokens } = tokenizeInternal(input, language);
    const langEvents = eventNameTranslations[language];
    const nativeEventNames = new Set<string>();
    if (langEvents) {
      for (const native of Object.keys(langEvents)) nativeEventNames.add(native.toLowerCase());
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const value = token.value.toLowerCase();
      const normalized = token.normalized?.toLowerCase();
      const isEvent =
        (!!normalized && SemanticParserImpl.KNOWN_EVENTS.has(normalized)) ||
        SemanticParserImpl.KNOWN_EVENTS.has(value) ||
        nativeEventNames.has(value);
      if (!isEvent) continue;

      const next = tokens[i + 1];
      if (
        next &&
        (next.kind === 'particle' || next.kind === 'keyword') &&
        eventMarkers.has(next.value)
      ) {
        return true;
      }
      if (this.matchEventMarkerPhrase(tokens, i + 1, language) > 0) return true;
    }
    return false;
  }

  /**
   * SOV source markers ("from" equivalents) and window tokens per language.
   * Used to strip "from window/elsewhere" event modifiers.
   */
  private static readonly SOV_SOURCE_MARKERS: Record<
    string,
    { markers: Set<string>; windowTokens: Set<string> }
  > = {
    ja: {
      markers: new Set(['から']),
      windowTokens: new Set(['ウィンドウ', 'ドキュメント', 'window', 'document']),
    },
    ko: {
      markers: new Set(['에서']),
      windowTokens: new Set(['창', '윈도우', '문서', 'window', 'document']),
    },
    tr: {
      markers: new Set(['den', 'dan', 'ten', 'tan']),
      windowTokens: new Set(['pencere', 'belge', 'window', 'document']),
    },
    bn: {
      markers: new Set(['থেকে', 'মধ্যে']),
      windowTokens: new Set(['উইন্ডো', 'ডকুমেন্ট', 'window', 'document']),
    },
    qu: {
      markers: new Set(['manta']),
      windowTokens: new Set(['k_iri', 'ventana', 'window', 'document']),
    },
  };

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
  private tryTrailingEventExtraction(
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
      (!!evtNorm && SemanticParserImpl.KNOWN_EVENTS.has(evtNorm)) ||
      SemanticParserImpl.KNOWN_EVENTS.has(evtVal) ||
      nativeEventNames.has(evtVal);
    if (!isKnownEvent) return null;

    const eventName =
      evtNorm && SemanticParserImpl.KNOWN_EVENTS.has(evtNorm)
        ? evtNorm
        : (langEvents?.[evtVal] ?? evtVal);

    // Body = everything before the on-marker, parsed as command(s)/block.
    const bodyTokens = tokens.slice(0, markerIdx);
    if (bodyTokens.length === 0) return null;

    const commandPatterns = patterns.filter(p => p.command !== 'on');
    const bodyStream = new TokenStreamImpl(bodyTokens, language);
    const body = this.parseBodyWithClauses(bodyStream, commandPatterns, language);
    if (body.length === 0) return null;

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
  private tryMidStreamEventExtraction(
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
        (!!evtNorm && SemanticParserImpl.KNOWN_EVENTS.has(evtNorm)) ||
        SemanticParserImpl.KNOWN_EVENTS.has(evtVal) ||
        nativeEventNames.has(evtVal);
      if (!isKnownEvent) continue;

      const eventName =
        evtNorm && SemanticParserImpl.KNOWN_EVENTS.has(evtNorm)
          ? evtNorm
          : (langEvents?.[evtVal] ?? evtVal);

      // Body = every token except the on-marker + event pair, parsed as a block.
      const bodyTokens = tokens.filter((_, idx) => idx !== i && idx !== i + 1);
      if (bodyTokens.length === 0) return null;

      const commandPatterns = patterns.filter(p => p.command !== 'on');
      const bodyStream = new TokenStreamImpl(bodyTokens, language);
      const body = this.parseBodyWithClauses(bodyStream, commandPatterns, language);
      if (body.length === 0) return null;

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
  private trySOVEventExtraction(
    input: string,
    language: string,
    patterns: LanguagePattern[]
  ): SemanticNode | null {
    const eventMarkers = SemanticParserImpl.SOV_EVENT_MARKERS[language];
    if (!eventMarkers) return null;

    const tokens = tokenizeInternal(input, language);
    const allTokens = tokens.tokens;

    // Build a set of native event names for this language (from eventNameTranslations)
    const langEvents = eventNameTranslations[language];
    const nativeEventNames = new Set<string>();
    if (langEvents) {
      for (const native of Object.keys(langEvents)) {
        nativeEventNames.add(native.toLowerCase());
      }
    }

    // Source markers for "from window/elsewhere" stripping per language
    const sourceMarkers = SemanticParserImpl.SOV_SOURCE_MARKERS[language];

    // Scan for event keyword + optional event marker particle pattern
    let eventIndex = -1;
    let eventName = '';
    let keyFilter = '';
    let tokensToRemove = 1; // How many tokens to strip (1 = event only, 2 = event + marker)

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

      // Check if this token is a known event name (by normalized value, native text, or bare value)
      const normalizedLower = token.normalized?.toLowerCase();
      const isEventByNormalized =
        normalizedLower && SemanticParserImpl.KNOWN_EVENTS.has(normalizedLower);
      const isEventByNative =
        nativeEventNames.has(tokenValue) || nativeEventNames.has(bareEventValue);
      const isEventByBare = SemanticParserImpl.KNOWN_EVENTS.has(bareEventValue);

      if (isEventByNormalized || isEventByNative || isEventByBare) {
        // Resolve the English event name
        let resolvedName: string;
        if (isEventByNormalized) {
          resolvedName = normalizedLower!;
        } else if (isEventByNative) {
          resolvedName = langEvents?.[tokenValue] ?? langEvents?.[bareEventValue] ?? bareEventValue;
        } else {
          resolvedName = bareEventValue;
        }

        if (eventMarkers.size > 0) {
          // Languages with event markers (JA, TR): require marker after event keyword
          // The marker may be at i+1 (direct) or i+2 (if there's a bracket key-filter selector between)
          let markerOffset = 1;
          const nextToken = allTokens[i + 1];
          // Skip over bracket selector token (e.g., [key=="Escape"]) between event and marker
          if (nextToken && nextToken.kind === 'selector' && nextToken.value.startsWith('[')) {
            markerOffset = 2;
          }
          const markerToken = allTokens[i + markerOffset];
          if (
            markerToken &&
            (markerToken.kind === 'particle' || markerToken.kind === 'keyword') &&
            eventMarkers.has(markerToken.value)
          ) {
            eventIndex = i;
            eventName = resolvedName;
            keyFilter = tokenKeyFilter || (markerOffset === 2 ? allTokens[i + 1].value : '');
            tokensToRemove = markerOffset + 1; // Remove event keyword + optional filter + marker
            break;
          }
        } else {
          // Languages without single-token event markers (KO): event keyword
          // stands alone, or is followed by an optional marker phrase (할 때),
          // consumed so it doesn't leak into the body parse.
          eventIndex = i;
          eventName = resolvedName;
          keyFilter = tokenKeyFilter;
          tokensToRemove = 1 + this.matchEventMarkerPhrase(allTokens, i + 1, language);
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
      for (let i = 0; i < allTokens.length; i++) {
        const token = allTokens[i];
        if (token.kind !== 'identifier') continue;

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
            eventMarkers.has(markerToken.value)
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
          const phraseLen = this.matchEventMarkerPhrase(allTokens, i + 1, language);
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
    const body = this.parseBodyWithClauses(bodyStream, commandPatterns, language);

    if (body.length === 0) return null;

    // Build event metadata including key filter and source info
    const metadata: Record<string, unknown> = {
      sourceLanguage: language,
      confidence: 0.75,
    };
    if (keyFilter) {
      metadata.keyFilter = keyFilter;
    }

    return createEventHandler({ type: 'literal', value: eventName }, body, undefined, metadata);
  }

  /**
   * Match a token value against a language profile's keyword (primary +
   * alternatives) for the given key. Used by the then/end/else recognizers to
   * cover languages absent from their curated keyword maps — every profile
   * carries `then`/`end`/`else`, so this generalizes recognition to all 24
   * languages without hand-maintaining each map.
   */
  private profileKeywordMatches(language: string, key: string, value: string): boolean {
    const kw = (
      tryGetProfile(language)?.keywords as
        | Record<string, { primary?: string; alternatives?: string[] }>
        | undefined
    )?.[key];
    if (!kw) return false;
    if (kw.primary?.toLowerCase() === value) return true;
    return !!kw.alternatives?.some(a => a.toLowerCase() === value);
  }

  /**
   * Check if a token is a 'then' keyword in the given language.
   */
  private isThenKeyword(value: string, language: string): boolean {
    const v = value.toLowerCase();
    const thenKeywords: Record<string, Set<string>> = {
      en: new Set(['then']),
      ja: new Set(['それから', '次に', 'そして']),
      ar: new Set(['ثم', 'بعدها', 'ثمّ']),
      es: new Set(['entonces', 'luego', 'después']),
      ko: new Set(['그다음', '그리고', '그런후', '그러면']),
      // 之后 is deliberately ABSENT: the zh transformer emits it as positional
      // `after` (`放置 把 X 之后 Y`, put-after) and emits 那么 for then — keeping
      // it here split the put clause at 之后 and dropped the put.
      zh: new Set(['然后', '接着', '那么']),
      // 'sonra' is deliberately ABSENT (mirrors zh dropping 之后): the tr
      // transformer emits it as positional `after` (`{patient} sonra {dest} … koy`,
      // put-after); keeping it here split the put clause at sonra and dropped the
      // put. then-chains use ardından (the i18n dict's then emission).
      tr: new Set(['ardından', 'daha sonra', 'ardindan']),
      pt: new Set(['então', 'depois', 'logo']),
      fr: new Set(['puis', 'ensuite', 'alors']),
      de: new Set(['dann', 'danach', 'anschließend']),
      id: new Set(['lalu', 'kemudian', 'setelah itu']),
      tl: new Set(['pagkatapos', 'tapos']),
      // 'পরে' is deliberately ABSENT (mirrors tr dropping 'sonra' / zh dropping
      // 之后): the bn transformer emits it as positional `after` (`{patient} পরে
      // {dest} … রাখুন`, put-after); keeping it here split the put clause at পরে and
      // dropped the put. then-chains use তারপর (the bn dict's then emission).
      bn: new Set(['তারপর']),
      qu: new Set(['chaymantataq', 'hinaspa', 'chaymanta', 'chayqa']),
      sw: new Set(['kisha', 'halafu', 'baadaye']),
    };
    // Languages with a curated map keep their exact (colloquial-rich) behavior.
    // Languages absent from it (it/ru/th/vi/he/hi/ms/pl/uk) fall back to the
    // profile's `then` form + the English literal the transformer passes through —
    // without this their multi-command then-chains collapsed to the first command.
    const curated = thenKeywords[language];
    if (curated) return curated.has(v);
    return v === 'then' || this.profileKeywordMatches(language, 'then', v);
  }

  /**
   * Check if a token is an 'else' keyword in the given language. Derived from the
   * language profile (primary + alternatives), with the English literal always
   * accepted (the grammar transformer leaves `else` verbatim for profiles without
   * an else form). Used to let the compound fallback recognize an `if … else …`
   * block whose branches are joined by `else` rather than a then-keyword.
   */
  private isElseKeyword(value: string, language: string): boolean {
    const v = value.toLowerCase();
    if (v === 'else') return true;
    return this.profileKeywordMatches(language, 'else', v);
  }

  /**
   * Check if a token is an 'end' keyword in the given language.
   */
  private isEndKeyword(value: string, language: string): boolean {
    const v = value.toLowerCase();
    const endKeywords: Record<string, Set<string>> = {
      en: new Set(['end']),
      // 終了 is deliberately ABSENT: it is the i18n dict's `exit` emission
      // (`exit: 終了`, ja.ts), and listing it as an `end` alternative made the
      // body parser count an `exit` inside an `if … exit … end` block as the
      // block terminator — so the real 終わり closed the whole handler body,
      // dropping every command after the block (behavior-sortable degenerate).
      // 終わり is the dict's `end` emission; おわり is the kana variant.
      ja: new Set(['終わり', 'おわり']),
      // ar آخر is deliberately ABSENT: it is the positional `last` keyword;
      // listing it here chopped clauses at every positional last (ar focus-trap
      // lost its if-branch body). النهاية is what the i18n dict emits for end.
      ar: new Set(['نهاية', 'انتهى', 'النهاية']),
      es: new Set(['fin', 'final', 'terminar']),
      // 종료 is deliberately ABSENT — same exit/end collision as ja above
      // (`exit: 종료`, ko.ts). 끝 is the dict's `end` emission; 마침 a variant.
      ko: new Set(['끝', '마침']),
      zh: new Set(['结束', '终止', '完']),
      tr: new Set(['son', 'bitiş', 'bitti']),
      pt: new Set(['fim', 'final', 'término']),
      fr: new Set(['fin', 'terminer', 'finir']),
      // beenden is deliberately ABSENT — same exit/end collision as ja above
      // (`exit: beenden`, de.ts; the de profile's `end` alternatives are only
      // ['ende', 'fertig'], so this hardcoded set was the lone offender).
      de: new Set(['ende', 'fertig']),
      id: new Set(['selesai', 'akhir', 'tamat']),
      tl: new Set(['wakas', 'tapos']),
      bn: new Set(['সমাপ্ত']),
      qu: new Set(['tukukuy', 'tukuy', 'puchukay']),
      sw: new Set(['mwisho', 'maliza', 'tamati']),
    };
    // The English literal `end` is accepted in EVERY language, not just the
    // profile-fallback ones: hyperscript keywords that pass through a translation
    // untouched keep their English form, and crucially a masked `js(…) … end`
    // block restores its terminator as the English `end`. If a curated language
    // (es `fin`, ja `終わり`, …) rejected that literal, the depth tracker in
    // `tryParseConditionalBlock` would count the js body's `if` (+1) but never the
    // js block's `end` (−1) — leaving depth unbalanced so the conditional
    // over-consumes the rest of the handler body (the removable/sortable
    // command-drop: `trigger`, `remove`, … vanish after the js-bearing `if`).
    // en already works because `end` is in its curated set; this aligns the rest.
    const curated = endKeywords[language];
    if (curated) return v === 'end' || curated.has(v);
    return v === 'end' || this.profileKeywordMatches(language, 'end', v);
  }

  /**
   * Whether a token opens a `js` block. The `js` command keyword survives
   * translation verbatim (the i18n transformer masks the whole block, so the
   * keyword stays English), so the English literal is the reliable signal; the
   * profile form is also accepted for completeness.
   */
  private isJsKeyword(token: LanguageToken): boolean {
    const v = (token.normalized ?? token.value).toLowerCase();
    return v === 'js' || this.profileKeywordMatches('en', 'js', v);
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
  private consumeJsBlock(
    tokens: ReturnType<typeof tokenizeInternal>,
    language: string
  ): SemanticNode | null {
    const head = tokens.peek();
    if (!head || !this.isJsKeyword(head)) return null;

    const startMark = tokens.mark();
    const bodyTokens: LanguageToken[] = [];
    tokens.advance(); // consume `js`

    let sawEnd = false;
    while (!tokens.isAtEnd()) {
      const t = tokens.peek();
      if (!t) break;
      tokens.advance();
      if (this.isEndKeyword(t.value, language)) {
        sawEnd = true;
        break;
      }
      bodyTokens.push(t);
    }

    if (!sawEnd) {
      tokens.reset(startMark);
      return null;
    }

    const raw = bodyTokens
      .map(t => t.value)
      .join(' ')
      .trim();
    return createCommandNode(
      'js' as ActionType,
      { patient: { type: 'expression', raw: raw || '()' } },
      { sourceLanguage: language, patternId: `js-opaque-${language}`, confidence: 1 }
    );
  }

  /**
   * Check if a token value is an `if` keyword in the given language (profile
   * primary + alternatives, with the English literal always accepted).
   */
  private isIfKeyword(value: string, language: string): boolean {
    const v = value.toLowerCase();
    if (v === 'if') return true;
    return this.profileKeywordMatches(language, 'if', v);
  }

  /**
   * Check if a token value is an `unless` keyword (negated conditional).
   */
  private isUnlessKeyword(value: string, language: string): boolean {
    const v = value.toLowerCase();
    if (v === 'unless') return true;
    return this.profileKeywordMatches(language, 'unless', v);
  }

  /**
   * Copula / negation words that, when they immediately precede a token, keep that
   * token inside the condition even if it doubles as a command verb. `empty` is
   * both the `empty` command and the predicate adjective in `is empty`; without
   * this guard `if my value is empty add …` would truncate the condition at
   * `empty` and treat it as the then-branch's first command.
   */
  private static readonly CONDITION_COPULAS = new Set([
    'is',
    'am',
    'are',
    'be',
    'was',
    'were',
    'not',
    'no',
  ]);

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
  private static readonly CONDITION_OPERATORS = new Set([
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
  private tryParseConditionalBlock(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
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
    if (!this.isIfKeyword(headVal, language)) return null;

    const startMark = tokens.mark();
    tokens.advance(); // consume if/unless

    // Collect the whole block from the stream: every token up to the matching
    // depth-0 `end` (or the stream end). Nested `if`/`unless` raise the depth; a
    // nested `end` lowers it — so an inner conditional's `end` never terminates
    // the outer block.
    const blockTokens: LanguageToken[] = [];
    let depth = 0;
    while (!tokens.isAtEnd()) {
      const t = tokens.peek();
      if (!t) break;
      const tv = (t.normalized ?? t.value).toLowerCase();
      if (this.isIfKeyword(tv, language) || this.isUnlessKeyword(tv, language)) {
        depth++;
        blockTokens.push(t);
        tokens.advance();
        continue;
      }
      if (this.isEndKeyword(t.value, language)) {
        if (depth === 0) {
          tokens.advance(); // consume the terminating `end`
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
      return null;
    }

    // Split blockTokens into condition / then-branch / else-branch. The condition
    // ends at the first depth-0 `then` keyword, or at the first depth-0 token that
    // begins a command (copula-guarded). then/else are split at depth-0 `else`.
    // For SOV, also recognise a verb-medial command head (matchBest can't — A2a).
    const sovProfile = tryGetProfile(language);
    const sovVerbLookup =
      sovProfile?.wordOrder === 'SOV' ? SemanticParserImpl.buildVerbLookup(sovProfile) : null;
    let i = 0;
    let bodyDepth = 0;
    const condTokens: LanguageToken[] = [];
    let sawThen = false;
    for (; i < blockTokens.length; i++) {
      const t = blockTokens[i];
      const tv = (t.normalized ?? t.value).toLowerCase();
      if (this.isIfKeyword(tv, language) || this.isUnlessKeyword(tv, language)) bodyDepth++;
      else if (this.isEndKeyword(t.value, language)) bodyDepth--;
      if (bodyDepth === 0 && this.isThenKeyword(t.value, language)) {
        sawThen = true;
        i++; // skip the `then`
        break;
      }
      if (bodyDepth === 0 && condTokens.length > 0) {
        const prev = (blockTokens[i - 1].normalized ?? blockTokens[i - 1].value).toLowerCase();
        const cur = (t.normalized ?? t.value).toLowerCase();
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
        // (if-empty/input-validation ko, fid 0.75). ja/bn escape only because their
        // copula isn't lexed as a single `is` token, so the split already fires there.
        // Allow the split after a copula when a real SOV command-VERB keyword opens
        // here — gated to SOV (verb lookup present) and an actual verb-lookup hit, so
        // SVO `X is empty <cmd>` (a predicate, not a verb, after the copula) is
        // byte-identical to before.
        const curIsSovCommandVerb =
          sovVerbLookup !== null && sovVerbLookup.has(t.value.toLowerCase());
        if (
          !SemanticParserImpl.CONDITION_OPERATORS.has(cur) &&
          (!SemanticParserImpl.CONDITION_COPULAS.has(prev) || curIsSovCommandVerb) &&
          (this.tokensBeginCommand(blockTokens.slice(i), commandPatterns, language) ||
            this.sovCommandStartsAt(blockTokens.slice(i), sovVerbLookup))
        ) {
          break; // this token starts the then-branch
        }
      }
      condTokens.push(t);
    }

    if (condTokens.length === 0) {
      tokens.reset(startMark);
      return null;
    }
    void sawThen;

    // Partition the remaining tokens into then- / else-branch at the depth-0 else.
    const thenTokens: LanguageToken[] = [];
    const elseTokens: LanguageToken[] = [];
    let inElse = false;
    let branchDepth = 0;
    for (; i < blockTokens.length; i++) {
      const t = blockTokens[i];
      const tv = (t.normalized ?? t.value).toLowerCase();
      if (this.isIfKeyword(tv, language) || this.isUnlessKeyword(tv, language)) branchDepth++;
      else if (this.isEndKeyword(t.value, language)) branchDepth--;
      if (branchDepth === 0 && !inElse && this.isElseKeyword(t.value, language)) {
        inElse = true;
        continue; // skip the `else`
      }
      (inElse ? elseTokens : thenTokens).push(t);
    }

    const conditionValue = { type: 'expression' as const, raw: this.joinTokenText(condTokens) };

    const thenBranch = this.parseBranch(thenTokens, commandPatterns, language);
    const elseBranch =
      elseTokens.length > 0 ? this.parseBranch(elseTokens, commandPatterns, language) : undefined;

    // Nothing parsed in either branch — not a usable conditional; fall through so
    // the existing per-clause path can try (e.g. a stray `if` token).
    if (thenBranch.length === 0 && (!elseBranch || elseBranch.length === 0)) {
      tokens.reset(startMark);
      return null;
    }

    return createConditionalNode(conditionValue, thenBranch, elseBranch, {
      sourceLanguage: language,
      patternId: `conditional-${language}-folded`,
      confidence: 1,
    });
  }

  /**
   * Reconstruct source-ish text from a token slice for an expression value.
   * Keyword tokens contribute their NORMALIZED (English) form: the condition
   * raw string is evaluated by the core expression parser, which only reads
   * English operator words — a translated condition (`#modal 存在する`,
   * `#modal existe`) is unevaluable as-is, while its normalized join
   * (`#modal exists`) runs. Non-keyword tokens (identifiers, selectors,
   * literals) keep their surface value; for en the two are identical.
   */
  private joinTokenText(toks: readonly LanguageToken[]): string {
    return toks
      .map(t =>
        t.kind === 'keyword' ? ((t as { normalized?: string }).normalized ?? t.value) : t.value
      )
      .join(' ')
      .trim();
  }

  /** Whether a command pattern matches at the head of the given token slice. */
  private tokensBeginCommand(
    toks: LanguageToken[],
    commandPatterns: LanguagePattern[],
    language: string
  ): boolean {
    if (toks.length === 0) return false;
    const stream = new TokenStreamImpl(toks, language);
    return patternMatcher.matchBest(stream, commandPatterns) !== null;
  }

  /**
   * Whether the token slice begins an SOV *verb-medial* command
   * (`{value} {marker} … {verb} …`, e.g. `triggerEl を 設定 私 に` = `set triggerEl
   * to me`). matchBest can't recognise these — it anchors on a selector/typed
   * role — so the conditional split's {@link tokensBeginCommand} misses a
   * verb-medial then-branch head and folds it into the condition (the A2a
   * behavior-`init` `set` drop: the then-branch parser handles `set` fine once it
   * *receives* it; only the boundary detection was blind to it).
   *
   * Mirrors the recognition {@link parseSOVClauseByVerbAnchoring} relies on: one
   * or more `{value}{particle-marker}` role pairs followed by a command verb
   * keyword. Conservative by construction — a bare-verb command (no leading role)
   * already matches via matchBest, and a condition predicate (`X is empty`,
   * `X exists`) carries copulas/operators rather than a `{value}{marker}{verb}`
   * head, so it can't spuriously trip this.
   */
  private sovCommandStartsAt(
    toks: LanguageToken[],
    verbLookup: Map<string, string> | null
  ): boolean {
    if (!verbLookup) return false;
    const isVerb = (t: LanguageToken): boolean =>
      verbLookup.has(t.value.toLowerCase()) ||
      (!!t.normalized && verbLookup.has(t.normalized.toLowerCase()));
    const isValue = (t: LanguageToken): boolean =>
      t.kind === 'identifier' ||
      t.kind === 'selector' ||
      t.kind === 'literal' ||
      (t.kind as string) === 'reference';
    let i = 0;
    let pairs = 0;
    while (i + 1 < toks.length) {
      const val = toks[i];
      const mark = toks[i + 1];
      if (!isValue(val) || mark.kind !== 'particle') break;
      pairs += 1;
      i += 2;
      const next = toks[i];
      if (pairs >= 1 && next && isVerb(next)) return true;
    }
    return false;
  }

  /**
   * Parse a conditional branch's tokens into a flat list of statements. Reuses
   * `parseBodyWithClauses` (so then-chains, juxtaposed commands, and nested
   * conditionals inside the branch all work), then unwraps a single top-level
   * compound into its statements so the branch array is flat.
   */
  private parseBranch(
    toks: LanguageToken[],
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] {
    if (toks.length === 0) return [];
    const stream = new TokenStreamImpl(toks, language);
    const parsed = this.parseBodyWithClauses(stream, commandPatterns, language);
    if (parsed.length === 1 && parsed[0]?.kind === 'compound') {
      return (parsed[0] as CompoundSemanticNode).statements;
    }
    return parsed;
  }

  /**
   * Standalone event modifier keywords (loanwords used across languages).
   * Pattern: `[modifier] [preposition?] [duration?] [rest...]`
   */
  private static readonly STANDALONE_MODIFIERS: Record<string, 'once' | 'debounce' | 'throttle'> = {
    once: 'once',
    debounced: 'debounce',
    debounce: 'debounce',
    throttled: 'throttle',
    throttle: 'throttle',
  };

  /**
   * "Or" conjunction keywords across languages for multiple events.
   * Maps lowercase keyword → true. Used to detect "click or keydown" patterns.
   */
  private static readonly OR_KEYWORDS = new Set([
    'or', // EN
    'أو', // AR
    'o', // ES, TL
    'ou', // PT, FR
    'oder', // DE
    'atau', // ID
    'atau', // MS (same as ID)
    '或', // ZH
    'または', // JA
    '또는', // KO
    'veya', // TR
    'অথবা', // BN
    'utaq', // QU
    'au', // SW
    'або', // UK
    'или', // RU
    'hoặc', // VI
    'lub', // PL
    'או', // HE
    'หรือ', // TH
    'o', // IT
    'या', // HI (tokenizes as a bare identifier; matched here by surface form)
    'অথবা', // BN (idem)
  ]);

  /**
   * Extract standalone event modifiers from the beginning of input.
   * Returns the modifiers (if any) and the remaining input string.
   */
  private extractStandaloneModifiers(
    input: string,
    _language: string
  ): {
    modifiers: { once?: boolean; debounce?: number; throttle?: number } | null;
    remainingInput: string | null;
  } {
    const tokens = tokenizeInternal(input, _language);
    const allTokens = tokens.tokens;

    if (allTokens.length === 0) return { modifiers: null, remainingInput: null };

    const firstToken = allTokens[0];
    const firstLower = firstToken.value.toLowerCase();
    const modType = SemanticParserImpl.STANDALONE_MODIFIERS[firstLower];

    if (!modType) return { modifiers: null, remainingInput: null };

    const modifiers: { once?: boolean; debounce?: number; throttle?: number } = {};
    let tokensToSkip = 1; // At least the modifier keyword

    if (modType === 'once') {
      modifiers.once = true;
    } else {
      // debounce/throttle: look for optional preposition + duration
      let nextIdx = 1;

      // Skip preposition tokens (sa, عند, at, etc.)
      if (nextIdx < allTokens.length) {
        const nextToken = allTokens[nextIdx];
        // Skip keyword/particle tokens that are prepositions (not selectors, literals, etc.)
        if (nextToken.kind === 'keyword' || nextToken.kind === 'particle') {
          nextIdx++;
          tokensToSkip++;
        }
      }

      // Look for duration (number with unit like "100ms", "300ms")
      if (nextIdx < allTokens.length) {
        const durToken = allTokens[nextIdx];
        if (durToken.kind === 'literal') {
          const match = durToken.value.match(/^(\d+)(ms|s|m)?$/);
          if (match) {
            let ms = parseInt(match[1], 10);
            const unit = match[2] || 'ms';
            if (unit === 's') ms *= 1000;
            else if (unit === 'm') ms *= 60000;
            modifiers[modType] = ms;
            tokensToSkip = nextIdx + 1;
          }
        }
      }

      // If no duration found, use default
      if (!modifiers[modType]) {
        modifiers[modType] = modType === 'debounce' ? 300 : 100;
      }
    }

    // Reconstruct remaining input from the tokens after the modifier
    const remainingTokens = allTokens.slice(tokensToSkip);
    if (remainingTokens.length === 0) return { modifiers: null, remainingInput: null };

    // Use position data to extract the remaining input string
    const startPos = remainingTokens[0].position.start;
    const remainingInput = input.slice(startPos);

    return { modifiers, remainingInput };
  }

  /**
   * Remove a transparent `async` command-modifier keyword from the input so the
   * following command (not `async`) is parsed as the action. The async keyword is
   * found anywhere in the stream (the grammar transformer relocates it by word
   * order — leading in VSO, after the event in SVO, verb-final in SOV) and matched
   * against the language profile's `async` form (primary + alternatives) plus the
   * English literal the transformer passes through for profiles without a native
   * form. Returns `remainingInput: null` when there's no async keyword, so the
   * normal path is byte-identical.
   */
  private stripAsyncModifier(input: string, language: string): { remainingInput: string | null } {
    const kw = tryGetProfile(language)?.keywords?.async;
    const forms = new Set<string>(['async']);
    if (kw?.primary) forms.add(kw.primary.toLowerCase());
    kw?.alternatives?.forEach(a => forms.add(a.toLowerCase()));

    const allTokens = tokenizeInternal(input, language).tokens;
    const idx = allTokens.findIndex(t => forms.has(t.value.toLowerCase()));
    if (idx === -1) return { remainingInput: null };

    const tok = allTokens[idx];
    const stripped = (input.slice(0, tok.position.start) + input.slice(tok.position.end))
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (stripped.length === 0) return { remainingInput: null };
    return { remainingInput: stripped };
  }

  /**
   * Strip the `do [not] throw` fetch-error modifier (see the call site for why).
   * Anchored on the leaked English `do` literal — present in every SOV translation
   * of the phrase — followed within two tokens by a `throw`-normalized verb (a
   * negation may sit between: ja `ではない`, ko `아니`, hi `नहीं`, tr `değil`, bn
   * `না`, en `not`). Removes the `do … throw` span from the source string. Returns
   * `{ remainingInput: null }` when no such span exists, so the caller leaves the
   * input untouched.
   */
  private stripDoNotThrowModifier(
    input: string,
    language: string
  ): {
    remainingInput: string | null;
  } {
    const allTokens = tokenizeInternal(input, language).tokens;
    for (let i = 0; i < allTokens.length - 1; i++) {
      if (allTokens[i].value.toLowerCase() !== 'do') continue;
      // Scan a small window for the throw verb. The negation between `do` and
      // `throw` may be one token (en `not`, tr `değil`) or several (ja `ではない`
      // shatters into `で`/`は`/`ない` particles), so a 2-token window misses ja.
      // Stop at a value / conjunction — only negation filler may separate them.
      let throwIdx = -1;
      for (let j = i + 1; j <= i + 5 && j < allTokens.length; j++) {
        const tj = allTokens[j];
        if (tj.normalized?.toLowerCase() === 'throw') {
          throwIdx = j;
          break;
        }
        const k = tj.kind as string;
        if (k === 'selector' || k === 'literal' || k === 'reference' || k === 'conjunction') {
          break;
        }
      }
      if (throwIdx === -1) continue;
      const start = allTokens[i].position.start;
      const end = allTokens[throwIdx].position.end;
      const stripped = (input.slice(0, start) + input.slice(end)).replace(/\s{2,}/g, ' ').trim();
      if (stripped.length === 0) return { remainingInput: null };
      return { remainingInput: stripped };
    }
    return { remainingInput: null };
  }

  /**
   * Apply standalone modifiers to an event handler node.
   */
  private applyModifiers(
    node: EventHandlerSemanticNode,
    modifiers: { once?: boolean; debounce?: number; throttle?: number }
  ): EventHandlerSemanticNode {
    return {
      ...node,
      eventModifiers: {
        ...node.eventModifiers,
        ...modifiers,
      },
    };
  }

  /**
   * Extract "or" conjunction events from the token stream.
   * If the next tokens follow the pattern "or EVENT [or EVENT ...]",
   * consume them and return the additional event values.
   *
   * The token stream is advanced past any consumed "or EVENT" tokens.
   */
  private extractOrConjunctionEvents(
    tokens: Pick<ReturnType<typeof tokenizeInternal>, 'peek' | 'advance' | 'mark' | 'reset'>,
    _language: string
  ): SemanticValue[] {
    const additionalEvents: SemanticValue[] = [];

    while (true) {
      const mark = tokens.mark();
      const orToken = tokens.peek();
      if (!orToken) break;

      const orLower = (orToken.normalized || orToken.value).toLowerCase();
      if (!SemanticParserImpl.OR_KEYWORDS.has(orLower)) {
        tokens.reset(mark);
        break;
      }

      // Consume the "or" token
      tokens.advance();

      // Next token should be the event name
      const eventToken = tokens.peek();
      if (!eventToken) {
        // "or" at end of input — revert
        tokens.reset(mark);
        break;
      }

      // Normalize event name using shared translations
      const eventLower = (eventToken.normalized || eventToken.value).toLowerCase();

      // Accept it as an event (could be native or English event name)
      tokens.advance();
      additionalEvents.push({ type: 'literal', value: eventLower });
    }

    return additionalEvents;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Singleton parser instance.
 */
export const semanticParser = new SemanticParserImpl();

/**
 * Parse input in the specified language.
 */
export function parse(input: string, language: string): SemanticNode {
  return semanticParser.parse(input, language);
}

/**
 * Check if input can be parsed.
 */
export function canParse(input: string, language: string): boolean {
  return semanticParser.canParse(input, language);
}

/**
 * Parse and return command type if parseable.
 */
export function getCommandType(input: string, language: string): ActionType | null {
  try {
    const node = semanticParser.parse(input, language);
    return node.action;
  } catch {
    return null;
  }
}

// =============================================================================
// Additional Public API Functions
// =============================================================================

/**
 * Tokenize input for a specific language.
 */
export function tokenize(input: string, language: string) {
  return tokenizeInternal(input, language);
}

/**
 * Get list of supported languages.
 */
export function getSupportedLanguages(): string[] {
  return getTokenizerLanguages();
}

/**
 * Translate hyperscript between languages.
 */
export function translate(input: string, sourceLang: string, targetLang: string): string {
  const node = parse(input, sourceLang);
  return render(node, targetLang);
}

/**
 * Get translations for all supported languages.
 */
export function getAllTranslations(input: string, sourceLang: string): Record<string, string> {
  const node = parse(input, sourceLang);
  const result: Record<string, string> = {};
  for (const lang of getSupportedLanguages()) {
    try {
      result[lang] = render(node, lang);
    } catch {
      // Skip languages that can't render this command
    }
  }
  return result;
}

/**
 * Create a semantic analyzer for parsing with confidence scores.
 */
export function createSemanticAnalyzer() {
  return {
    analyze(input: string, language: string) {
      try {
        const node = parse(input, language);
        return { node, confidence: 1.0, success: true };
      } catch (error) {
        return { node: null, confidence: 0, success: false, error };
      }
    },
  };
}

/**
 * Render a SemanticNode to hyperscript in a specific language.
 */
export function render(node: SemanticNode, language: string): string {
  return renderExplicitFn(node, language);
}

/**
 * Render a SemanticNode in explicit syntax format.
 */
export function renderExplicit(node: SemanticNode): string {
  return renderExplicitFn(node, 'explicit');
}

/**
 * Parse explicit syntax format.
 */
export function parseExplicit(input: string): SemanticNode {
  return parseExplicitFn(input);
}

/**
 * Convert natural language to explicit syntax.
 */
export function toExplicit(input: string, language: string): string {
  const node = parse(input, language);
  return renderExplicit(node);
}

/**
 * Convert explicit syntax to natural language.
 */
export function fromExplicit(input: string, targetLang: string): string {
  const node = parseExplicit(input);
  return render(node, targetLang);
}

/**
 * Round-trip conversion for testing.
 */
export function roundTrip(input: string, language: string): string {
  const explicit = toExplicit(input, language);
  return fromExplicit(explicit, language);
}

// =============================================================================
// Language Auto-Detection (Phase 5.1)
// =============================================================================

import { detectLanguage, type LanguageDetectionResult } from './language-detector';

export interface AutoDetectParseResult {
  /** The parsed semantic node */
  readonly node: SemanticNode;
  /** The detected language code */
  readonly language: string;
  /** Detection confidence (0-1) */
  readonly confidence: number;
  /** Full detection result */
  readonly detection: LanguageDetectionResult;
}

/**
 * Parse hyperscript input with automatic language detection.
 *
 * Uses Nearley-based detection (Phase 5.1) to determine the input
 * language, then parses with the detected language.
 *
 * @param input - Hyperscript code in any supported language
 * @param registeredLanguages - Optional set of languages to limit detection to
 * @returns Parsed node with detected language metadata
 */
export function parseAutoDetect(
  input: string,
  registeredLanguages?: ReadonlySet<string>
): AutoDetectParseResult {
  const detection = detectLanguage(input, registeredLanguages);
  const node = parse(input, detection.language);
  return {
    node,
    language: detection.language,
    confidence: detection.confidence,
    detection,
  };
}
