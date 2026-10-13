/**
 * Semantic Parser
 *
 * The main parser that converts natural language hyperscript to semantic nodes.
 * Combines tokenization and pattern matching.
 */

import type {
  SemanticNode,
  EventHandlerSemanticNode,
  SemanticParser as ISemanticParser,
  SemanticValue,
  SemanticRole,
  ActionType,
} from '../types';
import {
  tokenize as tokenizeInternal,
  getSupportedLanguages as getTokenizerLanguages,
} from '../tokenizers';
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getSchema } from '../generators/command-schemas';
import { blankComments } from './utils/comments';
import { GRAMMAR_WORDS } from './utils/grammar-words';
import { createParserState, type ParserState } from './parser-state';
import { SemanticParseError } from './parse-error';
import {
  NODE_CHILD_FIELDS,
  hoistUnconsumedDiagnostics,
  withDiagnostics,
} from './parse-diagnostics';
import {
  reclaimCapturedDestinationTail,
  reclaimDanglingFromTail,
  reclaimEventCompoundTail,
  reclaimResponseTypeTail,
} from './tail-reclaim';
import { eventNameTranslations, normalizeEventName } from '../patterns/event-handler';
import { render as renderExplicitFn } from '../explicit/verified-render';
import { parseExplicit as parseExplicitFn } from '../explicit/parser';
import { WAITABLE_EVENT_WORDS } from './event-words';
import { readNativeDirection, readNativeElsewhere } from './command-rescues';
import { SOV_EVENT_MARKERS, SOV_EVENT_MARKER_PHRASES } from './event-heads';
import { parseInternal, parseStatements as parseStatementsWith } from './parse-internal';

// Read from here by the renderer and tests.
export { WAITABLE_EVENT_WORDS };
// Public: thrown by `parse`, exported from here.
export { SemanticParseError };




// =============================================================================
// Parse Error with Diagnostics (Phase 3.4)
// =============================================================================



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

/**
 * Whether a go destination, as written, is the language's own `back`: the word,
 * or its word before a trailing marker the destination took (ko `뒤로`).
 */
function isNativeBack(raw: string, language: string): boolean {
  const native = GRAMMAR_WORDS[language]?.back;
  if (!native) return false;
  const word = raw.trim().toLowerCase();
  if (word === native.toLowerCase()) return true;
  const tokens = tokenizeInternal(native, language).tokens;
  const head = tokens.filter(t => t.kind !== 'particle').map(t => t.value.toLowerCase());
  return head.length > 0 && head.length < tokens.length && word === head.join(' ');
}

function normalizeCommandRoles(
  node: SemanticNode,
  boundIdentifiers?: Set<string>,
  language?: string
): SemanticNode {
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

    // `go back` in the language's own word (grammar-words.ts): go's own pattern
    // reads it (go-back.ts), but a handler's body can read `ir atrás` through
    // go's generated patterns, whose destination is the word as written (ko's
    // `뒤로` as `뒤` with its marker `로`).
    if (node.action === 'go' && language) {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const dest = roles.get('destination');
      if (dest?.type === 'expression' && isNativeBack(dest.raw, language)) {
        roles.set('destination', { ...dest, raw: 'back' });
      }
    }

    // tell: the generated marker extraction bound tell's element to the
    // generic `patient` (tell has NO patient role) and the trailing verb of a
    // `to <command>` body to `destination` as a literal — schema-invalid, a
    // tell destination is selector/reference (`decir #modal a mostrar` →
    // patient:selector="#modal", destination:literal="show"). Relabel
    // patient→destination and drop the junk literal. Since a bare show/hide
    // parses and tryTellTo reads the `to`, neither the corpus nor that example
    // reaches this (measured); it stays for input that does. Cluster-B
    // precedent: the schema-invalid-destination relabel (ko `json 로`).
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

    // scroll's by-form on a handler's fused path, which reads the schema's main
    // pattern with the destination's marker optional: a bare amount is the
    // destination (`클릭 할 때 200px 스크롤`), and a chain's first command reads an
    // element before an amount as the destination (`прокрутити мене 50 потім …`).
    // Upstream's `scroll … by` has no destination: a numeric or length
    // destination is the amount, and an element beside an amount is the patient
    // (the element scrolled).
    if (node.action === 'scroll') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const dest = roles.get('destination');
      const text = !dest ? '' : 'raw' in dest ? dest.raw : 'value' in dest ? String(dest.value) : '';
      if (dest && !roles.has('quantity') && /^-?\d/.test(text.trim())) {
        roles.delete('destination');
        roles.set('quantity', dest);
      } else if (dest && roles.has('quantity') && !roles.has('patient')) {
        roles.delete('destination');
        roles.set('patient', dest);
      }
    }

    // transition: a goal-less surface (`transition *max-height over 300ms` →
    // hi `*max-height को 300ms संक्रमण`) reaches the generated-simple pattern,
    // whose REQUIRED {goal} slot swallows the time literal — goal:literal
    // dataType=duration with the duration role empty. No legitimate
    // transition has a duration-typed goal while its own duration slot is
    // vacant (a real goal is a CSS value; the schema's duration slot is where
    // a time literal belongs), so shift goal→duration
    // (tell/fetch relabel precedent above; slide-toggle hi, both allowlists).
    if (node.action === 'transition') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const goal = roles.get('goal') as { type?: string; dataType?: string } | undefined;
      if (
        goal &&
        goal.type === 'literal' &&
        goal.dataType === 'duration' &&
        !roles.has('duration')
      ) {
        roles.delete('goal');
        roles.set('duration', goal as SemanticValue);
      }
    }

    // fetch: the Slavic with/from preposition collision (pl `z`, ru `с`, uk
    // `з` — the profile's source AND style markers share a surface). The
    // fused generic VSO event pattern (fetch-event-{pl,ru,uk}-vso) binds the
    // leading URL to {patient} — fetch has NO patient role — and its
    // source-marked group reads the with-OPTIONS head as `source`
    // (`pobierz /api/form z method:"POST" …` → patient="/api/form",
    // source="method"; en: source="/api/form", style="method"). The generic
    // primary-role relabel above cannot fire because `source` is occupied.
    // A patient + expression-typed source + empty style IS that mis-parse —
    // no legitimate fetch form produces it — so shift source→style and
    // patient→source (tell/transition relabel precedent).
    if (node.action === 'fetch') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const pat = roles.get('patient');
      const src = roles.get('source');
      if (
        pat &&
        src &&
        (pat.type === 'literal' || pat.type === 'expression') &&
        src.type === 'expression' &&
        !roles.has('style')
      ) {
        roles.delete('patient');
        roles.set('style', src);
        roles.set('source', pat);
      }
    }

    // transition: the SOV body-walker's verb-anchoring binds the postposed
    // goal phrase (`0 に` / `0 에`) to `destination` — に/에 is the generic
    // destination particle — as a LITERAL, which is schema-invalid (a
    // transition destination is a selector/reference element) while the real
    // `goal` stays empty; and it types the bare CSS-property patient as
    // `literal` where matchBest (and the en reference) type the identifier as
    // `expression`. Both shapes reach this path only from in-branch sub-parses
    // (behavior-removable's if-branch transition — the fused-event reclaim
    // site never sees them). Relabel the junk literal destination → goal (the
    // tell/#564 schema-invalid-destination precedent) and retype a bare
    // identifier patient literal → expression. Gated to `transition` and to
    // the exact invalid shapes, so a marker-language matchBest capture
    // (goal already bound, destination a real selector/reference) is untouched.
    if (node.action === 'transition') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const dest = roles.get('destination');
      if (dest && dest.type === 'literal' && !roles.has('goal')) {
        roles.delete('destination');
        roles.set('goal', dest);
      }
      const pat = roles.get('patient');
      if (
        pat &&
        pat.type === 'literal' &&
        typeof pat.value === 'string' &&
        /^[A-Za-z_][A-Za-z0-9_-]*$/.test(pat.value)
      ) {
        roles.set('patient', { type: 'expression', raw: pat.value } as SemanticValue);
      }
    }

    // morph: the SOV verb-anchoring path fuses a positional word with a tag
    // selector and types the patient as one bare literal (ja `最も近い<form/>`,
    // tr `enyakın<form/>`) where matchBest — and the en reference — type the
    // spaced form (`closest <form/>`) as `expression`. A patient literal
    // embedding a `<tag/>` shape is an element expression, not a string.
    // Gated to `morph` and to values containing a tag selector, so a real
    // string-content patient is never touched (transition-retype precedent).
    if (node.action === 'morph') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const pat = roles.get('patient');
      if (
        pat &&
        pat.type === 'literal' &&
        typeof pat.value === 'string' &&
        /<[a-zA-Z][^>]*\/?>/.test(pat.value)
      ) {
        roles.set('patient', { type: 'expression', raw: pat.value } as SemanticValue);
      }
    }

    // wait: a duration that IS a known waitable event name is an EVENT wait —
    // `wait for transitionend` (en `wait-en-for-event` head) vs the
    // marker-less translations (`esperar transitionend`), whose generated
    // `wait {duration}` pattern binds the event name as
    // duration:expression. Relabel duration→event:literal so both shapes
    // align and the waitMapper emits the runtime's event wait. Gated on
    // WAITABLE_EVENT_WORDS so a time-variable wait (`wait delay`, `wait 2s`)
    // is never touched. A native name the handler head reads (es
    // `ratónmover`, ko `마우스무브`) is one too, under its English name: its
    // tokenizer does not know it, so it reached here as a duration, and the
    // wait rendered `wait ratónmover`.
    if (node.action === 'wait') {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      if (!roles.has('event')) {
        const dur = roles.get('duration') as
          { type: string; raw?: unknown; value?: unknown } | undefined;
        const word =
          dur?.type === 'expression' ? dur.raw : dur?.type === 'literal' ? dur.value : undefined;
        const native =
          typeof word === 'string' && language ? normalizeEventName(word, language) : '';
        // A word the event table reads is an event under any name it maps to,
        // waitable or not: es `esperar descargar` waits for unload (P50).
        const tableHit =
          typeof word === 'string' && !!language && !!eventNameTranslations[language]?.[word];
        if (typeof word === 'string' && WAITABLE_EVENT_WORDS.has(word.toLowerCase())) {
          roles.delete('duration');
          roles.set('event', { type: 'literal', value: word, dataType: 'string' });
        } else if (tableHit || WAITABLE_EVENT_WORDS.has(native)) {
          roles.delete('duration');
          roles.set('event', { type: 'literal', value: native, dataType: 'string' });
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
    // A native name the handler head reads (es `dobleclic`, ko `리사이즈`) is
    // that event under its English name in a command or a loop too: a
    // tokenizer that does not know the name left it a word, and `send
    // dobleclic` sent an event named `dobleclic` (was OPEN_ITEMS P50).
    if ((node.kind === 'command' || node.kind === 'loop') && node.action !== 'on' && language) {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      const ev = roles.get('event');
      const word =
        ev?.type === 'expression' ? ev.raw : ev?.type === 'literal' ? ev.value : undefined;
      const english =
        typeof word === 'string' ? eventNameTranslations[language]?.[word] : undefined;
      if (english) roles.set('event', { type: 'literal', value: english, dataType: 'string' });
    }
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

    // Canonicalize a destination/source holding a locally-BOUND identifier (a
    // loop binding or set variable — see registerBoundIdentifiers) to
    // `expression`: it is a variable read, and that is how the en reference
    // types it (`add .processed to item` → destination:expression; `remove
    // .done from item` → source:expression). Which type the marked capture got
    // is tokenizer-incidental — ja/ko typed the untranslated `item` as a bare
    // literal (behavior-sortable's remove.source across the SOV group).
    if (boundIdentifiers?.size) {
      const roles = node.roles as Map<SemanticRole, SemanticValue>;
      for (const role of ['destination', 'source'] as SemanticRole[]) {
        const val = roles.get(role);
        if (
          val &&
          val.type === 'literal' &&
          typeof val.value === 'string' &&
          boundIdentifiers.has(val.value)
        ) {
          roles.set(role, { type: 'expression', raw: val.value } as SemanticValue);
        }
      }
    }
  }

  const rec = node as unknown as Record<string, unknown>;
  for (const field of NODE_CHILD_FIELDS) {
    const child = rec[field];
    if (Array.isArray(child)) {
      for (const c of child) normalizeCommandRoles(c as SemanticNode, boundIdentifiers, language);
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
          roles.set(spec.role, { ...spec.default, implicit: true } as SemanticValue);
        }
      }
    }
  }

  const rec = node as unknown as Record<string, unknown>;
  for (const field of NODE_CHILD_FIELDS) {
    const child = rec[field];
    if (Array.isArray(child)) {
      for (const c of child) fillSchemaDefaults(c as SemanticNode);
    }
  }
  return node;
}

export class SemanticParserImpl implements ISemanticParser {
  /** Each SOV language's event marker particles (public: callers read it here). */
  static readonly SOV_EVENT_MARKERS = SOV_EVENT_MARKERS;

  /** The parse in progress: its source, depth, coverage frames and bound names. */
  private readonly state: ParserState = createParserState((text, lang) => this.parse(text, lang));

  /**
   * Parse input in the specified language to a semantic node, then apply the R1
   * role-fidelity normalization (see {@link normalizeCommandRoles}) once on the
   * assembled tree. Every public + recursive parse path funnels through here, so
   * the normalization reaches body commands built by any sub-parser.
   */
  parse(input: string, language: string): SemanticNode {
    // Locally-bound identifiers are scoped to one top-level parse; recursive
    // sub-parses (behavior handlers, block bodies) inherit the outer scope.
    // A comment is read as the engine reads it: not at all (blanked, so every
    // offset into the input holds).
    if (this.state.parseDepth === 0) {
      this.state.boundIdentifiers.clear();
      input = readNativeDirection(readNativeElsewhere(blankComments(input), language), language);
    }
    this.state.parseDepth++;
    this.state.coverageFrames.push([]);
    try {
      let node = normalizeCommandRoles(
        parseInternal(this.state, input, language),
        this.state.boundIdentifiers,
        language
      );
      // Per-segment input-coverage drops recorded during THIS parse attach to
      // its returned node — so they ride a committed node and die with a
      // discarded one. The outermost parse then hoists descendants' firings to
      // the top node, the only diagnostics surface the sweep and compile read.
      const frame = this.state.coverageFrames[this.state.coverageFrames.length - 1];
      if (frame.length > 0) {
        node = withDiagnostics(node, [...(node.diagnostics ?? []), ...frame]);
      }
      if (this.state.parseDepth === 1) {
        node = hoistUnconsumedDiagnostics(node);
        // Arc F stage 2: an event handler that carries a lifted/stripped
        // once/debounce/throttle modifier is this family's shape — when its
        // parse also left spans dangling, reclaim what they demonstrably
        // mean: a floated `from <source>` phrase → eventModifiers.from; an
        // event-word fragment the tokenizer split off its compound →
        // rebound event; a stranded `as <type>` phrase → the body fetch's
        // responseType; a span whose content the tree ALREADY captured →
        // the false-positive record dropped. Gated on the modifiers so
        // ordinary handler parses never enter; runs after hoisting so the
        // dropped spans are visible on the top node. Each reclaim either
        // consumes its span or returns null, so the chain converges.
        if (node.kind === 'event-handler') {
          let cur = { node: node as EventHandlerSemanticNode, input };
          const em = cur.node.eventModifiers;
          if (em && (em.once || em.debounce !== undefined || em.throttle !== undefined)) {
            for (let round = 0; round < 4; round++) {
              const next =
                reclaimDanglingFromTail(cur.node, cur.input, language, this.state.parse) ??
                reclaimEventCompoundTail(cur.node, cur.input, language) ??
                reclaimResponseTypeTail(cur.node, cur.input, language, this.state.parse) ??
                reclaimCapturedDestinationTail(cur.node, cur.input, language);
              if (!next) break;
              cur = next;
            }
          }
          // The event-compound rebind alone is NOT family-gated: any handler
          // whose multi-word event name shattered deserves the join, with no
          // modifier in sight (a hand-written name the tokenizer splits: ar
          // `تمرير الماوس` is mouseover, not its first word's `scroll`; every
          // name the renderer writes is read whole, which
          // event-name-translation.test holds). It only fires on an exact
          // compound-key hit adjacent to the very word the current event was
          // canonicalized from. Runs AFTER the family loop so the from-tail
          // reclaim keeps first claim on its span: once the compound has
          // retired its words, the from-tail's improvement check (fewer
          // dropped tokens after re-parse) can no longer pass.
          const compound = reclaimEventCompoundTail(cur.node, cur.input, language);
          if (compound) cur = compound;
          node = cur.node;
        }
      }
      return node;
    } finally {
      this.state.coverageFrames.pop();
      this.state.parseDepth--;
    }
  }

  /**
   * Parse a multi-command body/sequence into a flat list of statement nodes
   * (see `parseStatements` in parse-internal.ts).
   */
  parseStatements(input: string, language: string): SemanticNode[] {
    return parseStatementsWith(this.state, input, language);
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

  // ==========================================================================
  // SOV Verb-Anchored Clause Parsing
  // ==========================================================================

  // ==========================================================================
  // Multi-Command Compound Fallback
  // ==========================================================================

  // ==========================================================================
  // SOV Event Trigger Extraction
  // ==========================================================================

  /**
   * Known event names for detection (common DOM events).
   */
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

/**
 * Surface #6 for the vocab-consistency tool (testing-framework src/vocab):
 * the hardcoded SOV event markers — parse-side event-marker knowledge that
 * lives in this parser rather than in profiles/schemas/grammar profiles.
 * Single-token markers and multi-token phrases are merged (phrases joined
 * with a space, plus their fused single-token forms as authored).
 */
export function getSOVEventMarkers(): Record<string, readonly string[]> {
  const merged: Record<string, string[]> = {};
  for (const [lang, set] of Object.entries(SOV_EVENT_MARKERS)) {
    merged[lang] = [...set];
  }
  for (const [lang, phrases] of Object.entries(SOV_EVENT_MARKER_PHRASES)) {
    merged[lang] = [...(merged[lang] ?? []), ...phrases.map(p => p.join(' '))];
  }
  return merged;
}
