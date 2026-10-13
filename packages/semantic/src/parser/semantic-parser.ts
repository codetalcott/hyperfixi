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
  ConditionalSemanticNode,
  EventHandlerSemanticNode,
  SemanticParser as ISemanticParser,
  SemanticValue,
  SemanticRole,
  ActionType,
  LanguagePattern,
  LanguageToken,
  TokenStream,
  PatternMatchResult,
  Diagnostic,
  BlockCommandSemanticNode,
} from '../types';
import {
  createCommandNode,
  createEventHandler,
  createCompoundNode,
  createConditionalNode,
  BLOCK_COMMAND_ACTIONS,
  isBlockCommand,
} from '../types';
import {
  tokenize as tokenizeInternal,
  getSupportedLanguages as getTokenizerLanguages,
  TokenStreamImpl,
} from '../tokenizers';
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getPatternsForLanguage, tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import {
  endWordIsValue,
  endWordPlace,
} from './utils/expression-lexicon';
import { blankComments } from './utils/comments';
import { isOrWordToken } from './utils/or-words';
import { GRAMMAR_WORDS } from './utils/grammar-words';
import { ROLE_MARKER_CONCEPTS } from './utils/marker-resolution';
import { patternMatcher } from './pattern-matcher';
import { CONDITION_PREDICATES, copulaHoldsCondition } from './value-reading';
import {
  isBlockEndToken,
  isElseKeyword,
  isEndKeyword,
  isIfKeyword,
  isThenAt,
  isThenKeyword,
  isUnlessKeyword,
} from './clause-keywords';
import { consumeJsBlock, consumeVerbFinalJsBlock } from './js-block';
import type { ParseFn } from './parse-fn';
import {
  MAX_UNCONSUMED_SPAN_CHARS,
  NODE_CHILD_FIELDS,
  describeUnconsumedInput,
  hoistUnconsumedDiagnostics,
  parseDiagnostic,
  withDiagnostics,
} from './parse-diagnostics';
import { RESPONSE_TYPE_WORDS } from './response-type-words';
import {
  reclaimCapturedDestinationTail,
  reclaimDanglingFromTail,
  reclaimEventCompoundTail,
  reclaimResponseTypeTail,
} from './tail-reclaim';
import {
  parseErrorClauses,
  splitErrorClauses,
  tryParseBlock,
  tryParseFeatureBlock,
  tryParseProgram,
} from './block-parser';
import {
  eventNameTranslations,
  nativeEventNames,
  normalizeEventName,
} from '../patterns/event-handler';
import { isAtEndPositionNoun } from '../patterns/put';
import { rewritePseudoCommand } from './pseudo-command';
import { findEventModifierPhrase } from './event-modifier-lift';
import { render as renderExplicitFn } from '../explicit/verified-render';
import { parseExplicit as parseExplicitFn } from '../explicit/parser';
import { KNOWN_EVENTS, WAITABLE_EVENT_WORDS, matchEventParamPhrase } from './event-words';
import {
  readNativeDirection,
  readNativeElsewhere,
  stripDoNotThrowModifier,
  tryDoNotThrow,
  tryLoopIndex,
  tryScrollModifiers,
  tryTellTo,
  tryWaitAlternatives,
} from './command-rescues';
import { joinTokenText } from './value-from-tokens';
import {
  tryAttachNewWindow,
  tryAttachTrailingDuration,
  tryAttachTrailingExpressionRole,
  tryAttachTrailingRole,
  tryAttachTrailingStyle,
} from './trailing-roles';
import {
  LOOP_CLOSE,
  LOOP_FORMS,
  bareRepeatHead,
  buildLoopNode,
  foldFrontedWhileIntoRepeat,
  isBottomTest,
  isLoopClose,
  loopHeadReadsBody,
  takeRepeatCount,
  type WalkEntry,
} from './loop-heads';
import {
  buildVerbLookup,
  consumeForPostposition,
  isBodyCommandWord,
  parseSOVClauseByVerbAnchoring,
  sovCommandStartsAt,
  tokensBeginCommand,
} from './sov-clause';
import {
  SOV_EVENT_MARKERS,
  SOV_EVENT_MARKER_PHRASES,
  SOV_SOURCE_MARKERS,
  applyModifiers,
  extractOrConjunctionEvents,
  extractStandaloneModifiers,
  hasSOVEventMarkerHead,
  isEnEventKeyword,
  isStrippableSourceRef,
  matchEventMarkerPhrase,
  stripAsyncModifier,
} from './event-heads';

// Read from here by the renderer and tests.
export { WAITABLE_EVENT_WORDS };

/**
 * Block-introducing command actions: their tokens are a condition/clause plus a
 * branch body, not a flat argument list. When a fused event pattern captures one
 * of these as the handler action, the trailing body must be parsed separately
 * (see `buildEventHandler`).
 */
const BLOCK_BODY_ACTIONS = new Set(['if', 'unless', 'while', 'repeat', 'for']);

/**
 * Heads whose body the clause walker nests under them: the loop heads, folded
 * into a {@link LoopSemanticNode}, and `tell`'s and `start view transition`'s,
 * which keep theirs as a {@link BlockCommandSemanticNode}. `while` is not one: a standalone
 * `while` node is the SOV fronted while-phrase that
 * {@link foldFrontedWhileIntoRepeat} merges into its `repeat`,
 * never a loop of its own.
 */
const BLOCK_HEAD_ACTIONS = new Set(['repeat', 'for', ...BLOCK_COMMAND_ACTIONS]);

/**
 * A block head the walker emitted flat: a `repeat`/`for` command with no body,
 * or a `tell`'s or view transition's head with none attached (an empty body is a
 * block its own `end` closed: `tell #x end`).
 */
function isOpenLoopHead(entry: WalkEntry): entry is CommandSemanticNode {
  if (isLoopClose(entry) || entry.kind !== 'command' || !BLOCK_HEAD_ACTIONS.has(entry.action)) {
    return false;
  }
  const body = (entry as { body?: unknown }).body;
  if (BLOCK_COMMAND_ACTIONS.has(entry.action)) return body === undefined;
  return !(Array.isArray(body) && body.length > 0);
}

/** A node the walker nested: a loop, or a block command with its body. */
function isNestedBlock(node: SemanticNode | undefined): boolean {
  return !!node && (node.kind === 'loop' || isBlockCommand(node));
}

/** Two role values that read the same: the same type and the same surface. */
function sameSemanticValue(a: SemanticValue, b: SemanticValue): boolean {
  const surface = (v: SemanticValue): unknown => {
    const { position: _position, ...rest } = v as SemanticValue & { position?: unknown };
    return JSON.stringify(rest);
  };
  return a.type === b.type && surface(a) === surface(b);
}

/**
 * The last token before `end` in `list` that is not a particle: the word a
 * role marker follows (he `repeat את כל עוד …`, zh `重复 把 …`).
 */
function wordBefore(list: readonly LanguageToken[], end: number): LanguageToken | undefined {
  for (let k = end - 1; k >= 0; k--) if (list[k].kind !== 'particle') return list[k];
  return undefined;
}

/**
 * A `repeat` word: the keyword, or the English `repeat` a render left
 * untranslated (es `repeat mientras …`, ja `3 times を repeat`), which
 * tokenizes as an identifier.
 */
function isRepeatToken(token: LanguageToken): boolean {
  if (token.kind !== 'keyword' && token.kind !== 'identifier') return false;
  return (token.normalized ?? token.value).toLowerCase() === 'repeat';
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
function frontPostfixGuards(commands: SemanticNode[]): SemanticNode[] {
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
function openLoopCount(entries: readonly WalkEntry[]): number {
  let open = 0;
  for (const entry of entries) {
    if (isOpenLoopHead(entry)) open++;
    else if (isLoopClose(entry) && open > 0) open--;
  }
  return open;
}



const COMMAND_WORDS = new Map<string, ReadonlySet<string>>();

/** The command actions a language's patterns parse (not `on`), memoized. */
function commandWordsFor(language: string): ReadonlySet<string> {
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

/**
 * The repeat HEAD patterns: each stops before the loop body (see
 * patterns/repeat.ts), so a fused handler's re-parse can swap one in without
 * swallowing a body command. The until-condition head joined late (PR 123):
 * without it a fused `al {event} ripetere {loopType}` took the language's own
 * `until` word alone for the loop's form (it `ripetere fino x > 3`), and the
 * loop lost its condition, while its `while` twin was swapped in.
 */
const HEAD_ONLY_REPEAT = /^repeat-.*-(times|for-in|while-head|until-head|until-condition-head)$/;

/** Command verbs that also open a clause (`when it matches .x`, `take … for #t`). */
const CLAUSE_OPENERS: ReadonlySet<string> = new Set(['when', 'for']);

/**
 * A word of the language a token was read in: one it knows (a keyword with
 * its English form, a particle), or a name outside ASCII.
 */
function isOwnWord(t: LanguageToken): boolean {
  if (t.normalized || t.kind === 'particle') return true;
  return t.kind === 'identifier' && /[^\x00-\x7f]/.test(t.value);
}

/** The token before a run in the tokens it was taken from. */
function tokenBefore(
  tokens: readonly LanguageToken[],
  run: readonly LanguageToken[]
): LanguageToken | undefined {
  const at = run[0] ? tokens.indexOf(run[0]) : -1;
  return at > 0 ? tokens[at - 1] : undefined;
}

/** Commands a clause never follows: a block's head, or a guard. */
const CLAUSE_LESS: ReadonlySet<string> = new Set([
  ...BLOCK_HEAD_ACTIONS,
  'if',
  'unless',
  'while',
  'else',
]);

/**
 * The words that open what upstream's `on` reads between the event and the
 * body (besides a count): `elsewhere`, `in #d1`, `of attributes` (mutation),
 * `or click from #d2`, `queue first`, `having threshold 0.1`.
 */
const HEAD_OPENERS: ReadonlySet<string> = new Set([
  'elsewhere',
  'in',
  'of',
  'or',
  'queue',
  'having',
]);

/** The most words a head clause holds: upstream's are short (`of attributes from #d1`). */
const HEAD_CLAUSE_WORDS = 8;

/** Words that end a command's clause: a block's structure, or a feature's head. */
const CLAUSE_BOUNDARIES: ReadonlySet<string> = new Set([
  'else',
  'otherwise',
  'catch',
  'finally',
  'on',
]);

/**
 * Normalized keyword forms that are legitimate skip-residue for the per-segment
 * coverage check (Arc C): role markers the matcher deliberately leaves
 * unconsumed (qu `hina`→as, hi `में`→in), connectives, and structural glue.
 * A dropped run counts as a genuine drop only if a token OUTSIDE this set (and
 * outside the particle/conjunction/boundary classes) survives — see
 * {@link SemanticParserImpl.recordDroppedTokens}.
 */
const COVERAGE_RESIDUE_NORMALIZED = new Set([
  'to',
  'from',
  'into',
  'onto',
  'with',
  'as',
  'at',
  'of',
  'in',
  'on',
  'by',
  'and',
  'or',
  'then',
  'end',
  'else',
  'the',
  'a',
  'an',
  'async',
]);


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
 * A custom event's name: a word (any script), then word characters and the
 * separators event names use (`draggable:start`, `my-event`, `a.b`).
 */
const CUSTOM_EVENT_NAME = /^[\p{L}_$][\p{L}\p{N}_$:.\-]*$/u;

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

  /** Source text the current token stream's positions index into. */
  private positionSource: string | undefined;

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
    if (this.parseDepth === 0) {
      this.boundIdentifiers.clear();
      input = readNativeDirection(readNativeElsewhere(blankComments(input), language), language);
    }
    this.parseDepth++;
    this.coverageFrames.push([]);
    try {
      let node = normalizeCommandRoles(
        this.parseInternal(input, language),
        this.boundIdentifiers,
        language
      );
      // Per-segment input-coverage drops recorded during THIS parse attach to
      // its returned node — so they ride a committed node and die with a
      // discarded one. The outermost parse then hoists descendants' firings to
      // the top node, the only diagnostics surface the sweep and compile read.
      const frame = this.coverageFrames[this.coverageFrames.length - 1];
      if (frame.length > 0) {
        node = withDiagnostics(node, [...(node.diagnostics ?? []), ...frame]);
      }
      if (this.parseDepth === 1) {
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
                reclaimDanglingFromTail(cur.node, cur.input, language, this.parseBack) ??
                reclaimEventCompoundTail(cur.node, cur.input, language) ??
                reclaimResponseTypeTail(cur.node, cur.input, language, this.parseBack) ??
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
      this.coverageFrames.pop();
      this.parseDepth--;
    }
  }

  /** Re-entrancy depth of {@link parse} — see boundIdentifiers scoping. */
  private parseDepth = 0;

  /** {@link parse}, for the moved-out functions that re-parse part of their input. */
  private readonly parseBack: ParseFn = (text, lang) => this.parse(text, lang);

  /**
   * Input-coverage frames (Arc C), one per active {@link parse} /
   * {@link parseStatements} invocation. The per-segment body parsers record a
   * dropped token run into the CURRENT frame; the frame owner attaches the
   * records to the node(s) it returns. Speculative parse attempts roll back to
   * a mark when their result is discarded, so only committed parses fire.
   */
  private coverageFrames: Diagnostic[][] = [];

  /** Current record count of the active coverage frame (for rollback). */
  private coverageMark(): number {
    const frame = this.coverageFrames[this.coverageFrames.length - 1];
    return frame ? frame.length : 0;
  }

  /** Discard coverage records made after `mark` (a speculative parse was rejected). */
  private coverageRollback(mark: number): void {
    const frame = this.coverageFrames[this.coverageFrames.length - 1];
    if (frame && frame.length > mark) frame.length = mark;
  }

  /** Per-language cache of role-marker surface forms (see residue filter). */
  private static coverageMarkerSurfaces = new Map<string, Set<string>>();

  /**
   * Rendered marker words the i18n transformer emits that the semantic profile
   * does not model as roleMarkers, left unconsumed BY DESIGN after their value
   * is reclaimed (the trailing responseType reclaim's as-postpositions: hi
   * `के रूप में`, tr `olarak`, qu `hina` — see the reclaim note in
   * buildEventHandler). Pure marker residue; a dropped VALUE next to them
   * (id `sebagai json`) still fires via the value token.
   */
  private static readonly LEAKED_RENDER_MARKERS: Record<string, readonly string[]> = {
    hi: ['के', 'रूप', 'में'],
    tr: ['olarak'],
    qu: ['hina'],
  };

  private static getCoverageMarkerSurfaces(language: string): Set<string> {
    let surfaces = SemanticParserImpl.coverageMarkerSurfaces.get(language);
    if (!surfaces) {
      surfaces = new Set<string>();
      const markers = tryGetProfile(language)?.roleMarkers;
      if (markers) {
        for (const marker of Object.values(markers)) {
          if (!marker) continue;
          // Multi-word marker surfaces are tokenized word-by-word — admit each
          // constituent so a phrase marker strips the same as a one-word one.
          if (marker.primary) {
            for (const w of marker.primary.toLowerCase().split(/\s+/)) surfaces.add(w);
          }
          for (const alt of marker.alternatives ?? []) {
            for (const w of alt.toLowerCase().split(/\s+/)) surfaces.add(w);
          }
        }
      }
      for (const w of SemanticParserImpl.LEAKED_RENDER_MARKERS[language] ?? []) {
        surfaces.add(w.toLowerCase());
      }
      SemanticParserImpl.coverageMarkerSurfaces.set(language, surfaces);
    }
    return surfaces;
  }

  /**
   * Whether a skipped token is legitimate matcher residue rather than dropped
   * content: particles, conjunctions, block boundaries (`end`/`fin`/`tukuy`,
   * including the `closesTrackedBlock`-annotated closers), and role-marker
   * words (normalized or language-surface forms). See NEXT_STEPS § "Input
   * coverage" step 3 — residue must not fire the diagnostic.
   */
  private isCoverageResidueToken(t: LanguageToken, language: string): boolean {
    if (t.kind === 'particle' || t.kind === 'conjunction') return true;
    if ((t.metadata as { closesTrackedBlock?: boolean } | undefined)?.closesTrackedBlock) {
      return true;
    }
    if (
      isThenKeyword(t.value, language) ||
      isEndKeyword(t.value, language) ||
      isElseKeyword(t.value, language)
    ) {
      return true;
    }
    const norm = ((t as { normalized?: string }).normalized ?? t.value).toLowerCase();
    if (COVERAGE_RESIDUE_NORMALIZED.has(norm)) return true;
    return SemanticParserImpl.getCoverageMarkerSurfaces(language).has(t.value.toLowerCase());
  }

  /**
   * Record a token run a body/segment parser discarded without producing a
   * command (diagnostic ONLY — never touches scores or parse outcomes; the
   * scoring penalty is Arc D). Fires only when at least one non-residue token
   * survives the filter, so connectives/boundary markers/role particles the
   * matcher legitimately skips stay silent.
   */
  private recordDroppedTokens(
    run: readonly LanguageToken[],
    language: string,
    context: string
  ): void {
    if (run.length === 0) return;
    const frame = this.coverageFrames[this.coverageFrames.length - 1];
    if (!frame) return;
    if (!run.some(t => !this.isCoverageResidueToken(t, language))) return;
    const text = run
      .map(t => t.value)
      .join(' ')
      .trim();
    if (!text) return;
    const shown =
      text.length > MAX_UNCONSUMED_SPAN_CHARS
        ? `${text.slice(0, MAX_UNCONSUMED_SPAN_CHARS)}…`
        : text;
    frame.push(
      parseDiagnostic(
        `${context} left ${run.length} token(s) unconsumed: "${shown}"`,
        'warning',
        'unconsumed-input'
      )
    );
  }

  /**
   * Keep a run the clause walker would drop as the clause of the command before
   * it (`add .foo to .bar when it matches .doh`): its pattern does not model the
   * clause, so it is kept as written and written back as written (M1 phase 3,
   * group 3) in place of dropping it. A run that holds a command verb or a
   * structure word (`otherwise`, `on`) is an unread command, not a clause, and
   * stays dropped, and so does one glued to the command.
   */
  private keepVerbatimClause(
    owner: WalkEntry | undefined,
    run: readonly LanguageToken[],
    before: LanguageToken | undefined,
    language: string
  ): boolean {
    const first = run[0];
    if (!owner || owner.kind !== 'command' || !first) return false;
    // What follows a block's head is its body (`repeat 3 times xyzzy end`).
    if (CLAUSE_LESS.has((owner as CommandSemanticNode).action)) return false;
    // Residue alone (`and` between two commands) is dropped by design.
    if (run.every(t => this.isCoverageResidueToken(t, language))) return false;
    // In another language the clause is the English a translation wrote: a run
    // that holds a word of the language itself is that language unread.
    if (language !== 'en' && run.some(t => isOwnWord(t))) return false;
    // Glued to the command, the run splits a value the pattern read part of
    // (`the event` + `'s bubbling`): what was read is wrong, not incomplete. A
    // comma only separates (`log me, my`).
    if (before && before.position.end === first.position.start && first.value !== ',') {
      return false;
    }
    const unread = run.some((t, i) => {
      const words = [t.value.toLowerCase(), (t.normalized ?? t.value).toLowerCase()];
      if (i === 0 && words.some(w => CLAUSE_OPENERS.has(w))) return false;
      return (
        words.some(w => CLAUSE_BOUNDARIES.has(w)) ||
        isThenKeyword(t.value, language) ||
        isEndKeyword(t.value, language) ||
        isElseKeyword(t.value, language) ||
        (t.kind === 'keyword' && words.some(w => !!getSchema(w as ActionType)))
      );
    });
    if (unread) return false;
    let text = '';
    run.forEach((t, i) => {
      const prev = run[i - 1];
      text += !prev || prev.position.end === t.position.start ? t.value : ` ${t.value}`;
    });
    const node = owner as { verbatimClause?: string };
    node.verbatimClause = node.verbatimClause ? `${node.verbatimClause} ${text}` : text;
    // No role reads it: a tool that checks a script (validate, a fidelity
    // score) still sees the part no pattern models. Translation does not.
    this.coverageFrames[this.coverageFrames.length - 1]?.push(
      parseDiagnostic(
        `clause kept as written, read by no role: "${text}"`,
        'warning',
        'verbatim-clause'
      )
    );
    return true;
  }

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
    // Stage −1: a PROGRAM of features (`def a … end def b … end`, `init … end
    // on click …`, `bind … end live …`): split before the block layers below,
    // each of which reads its own feature and dropped whatever came after it.
    // Returns null (fast) unless every top-level segment reads as a feature.
    const programFirst = tryParseProgram(input, language, {
      statement: (text, lang) => this.parse(text, lang),
      body: (text, lang) => this.parseStatements(text, lang),
    });
    if (programFirst) return programFirst;

    // Stage −0.5: a handler's error clauses (`on click … catch e … finally …`).
    // The handler patterns read its commands and left `catch e …` unread, or
    // ran the clauses as more commands. A def reads its own (parseDefBlock).
    const withClauses = this.tryParseErrorClauses(input, language);
    if (withClauses) return withClauses;

    const blockNode = tryParseBlock(input, language, {
      statement: (text, lang) => this.parse(text, lang),
      body: (text, lang) => this.parseStatements(text, lang),
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
      statement: (text, lang) => this.parse(text, lang),
      body: (text, lang) => this.parseStatements(text, lang),
    });
    if (featureNode) return featureNode;

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
    this.positionSource = parseInput;

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
      const bareJs = consumeJsBlock(tokens, language, this.positionSource);
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
              const reparsed = this.parse(reduced, language);
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
      const flagged = tryDoNotThrow(tokens.tokens as LanguageToken[], parseInput, language, this.parseBack);
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
      const told = tryTellTo(tokens.tokens as LanguageToken[], parseInput, language, this.parseBack);
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
        this.parseBack
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
      const indexed = tryLoopIndex(tokens.tokens as LanguageToken[], parseInput, language, this.parseBack);
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
        this.parseBack
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
          let reparsed = this.parse(reduced, language);
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
            const reparsed = this.parse(reduced, language);
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
            const reparsed = this.parse(reduced, language);
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
        const handler = this.buildEventHandler(eventMatch, tokens, language);
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
    const trailingResult = this.tryTrailingEventExtraction(parseInput, language, sortedPatterns);
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
    const standaloneUnless = this.tryParseUnlessGuard(tokens, commandPatterns, language);
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
        const sovTrailing = this.trySOVEventExtraction(parseInput, language, sortedPatterns);
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
        const loop = this.tryTopLevelLoop(tokens, commandPatterns, language);
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
        const sequence = this.tryTopLevelCommandSequence(tokens, commandPatterns, language);
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
        const compound = this.tryCompoundCommandParsing(
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
          ? applyModifiers(midNoCmd as EventHandlerSemanticNode, modifiers)
          : midNoCmd;
        return withDiagnostics(result, diagnostics);
      }
    }

    // Stage 3: Try SOV event trigger extraction
    const sovResult = this.trySOVEventExtraction(parseInput, language, sortedPatterns);
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
    const compoundResult = this.tryCompoundCommandParsing(
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
      const pseudo = this.tryParsePseudoCommand(pseudoStream, commandPatterns, language);
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
  private tryParseErrorClauses(input: string, language: string): SemanticNode | null {
    const clauses = splitErrorClauses(input, language);
    if (!clauses || !clauses.main) return null;
    let handler: SemanticNode;
    try {
      handler = this.parse(clauses.main, language);
    } catch {
      return null;
    }
    if (handler.kind !== 'event-handler') return null;
    const parsers = {
      statement: (text: string, lang: string) => this.parse(text, lang),
      body: (text: string, lang: string) => this.parseStatements(text, lang),
    };
    return { ...handler, ...parseErrorClauses(clauses, language, parsers) };
  }

  /**
   * An English pseudo-command at the stream's position, parsed as its `call`
   * equivalent (see `./pseudo-command`). The rewrite is matched by the ordinary
   * `call` patterns and must be consumed in full, so the node is exactly what
   * `call <target>.<method>(<args>)` parses to — renders and round-trips
   * included. Advances `stream` only on success.
   */
  private tryParsePseudoCommand(
    stream: TokenStream,
    commandPatterns: LanguagePattern[],
    language: string
  ): CommandSemanticNode | null {
    if (language !== 'en') return null;
    const rewrite = rewritePseudoCommand(
      stream.tokens,
      stream.position(),
      tryGetProfile(language),
      t => !!getSchema((t.normalized ?? t.value).toLowerCase() as ActionType)
    );
    if (!rewrite) return null;
    const rewritten = tokenizeInternal(rewrite.text, language);
    const match = patternMatcher.matchBest(
      rewritten,
      commandPatterns.filter(p => p.command === 'call')
    );
    if (!match || !rewritten.isAtEnd()) return null;
    for (let n = 0; n < rewrite.consumed; n++) stream.advance();
    return this.buildCommand(match, language);
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
    // Own coverage frame: drops recorded here attach to the LAST returned
    // statement (they describe trailing/interior body content), so a caller
    // that discards the statement list (a speculative block parse) discards
    // the records with it — same commit-with-the-node discipline as parse().
    this.coverageFrames.push([]);
    try {
      const nodes = this.parseBodyWithClauses(tokens, commandPatterns, language);
      const frame = this.coverageFrames[this.coverageFrames.length - 1];
      if (frame.length > 0 && nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        nodes[nodes.length - 1] = withDiagnostics(last, [...(last.diagnostics ?? []), ...frame]);
      }
      return nodes;
    } finally {
      this.coverageFrames.pop();
    }
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
        } else if (
          eventValue.type === 'expression' &&
          KNOWN_EVENTS.has(word.toLowerCase())
        ) {
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

    // Extract "or" conjunction events (e.g., "click or keydown")
    // Combines into event value string for AST builder compatibility.
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
    let resolvedEventValue = eventValue;
    if (additionalEvents.length > 0 && eventValue.type === 'literal') {
      const allEvents = [
        String(eventValue.value),
        ...additionalEvents.map(e => String('value' in e ? e.value : '')),
      ];
      resolvedEventValue = { type: 'literal', value: allEvents.join(' or ') };
    }

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
        const foldCoverageMark = this.coverageMark();
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
        // Fold discarded — its coverage records describe a parse that never
        // happened; the flat path below does its own accounting.
        this.coverageRollback(foldCoverageMark);
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
              if (
                !t ||
                t.kind === 'conjunction' ||
                (t.kind === 'keyword' &&
                  (isThenKeyword(t.value, language) || isEndKeyword(t.value, language)))
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
      if (
        !BLOCK_BODY_ACTIONS.has(actionName) ||
        actionName === 'repeat' ||
        actionName === 'while'
      ) {
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
            // isBlockEndToken: not a variable spelled like it (C3), and not the
            // noun of `at end of` (ms `letak x di tamat daripada saya`, he `at
            // סוף of`), which ended a loop body's clause inside its put.
            (isEndKeyword(t.value, language) && isBlockEndToken(t, place, language))
          );
        };
        // A loop head's clause also stops at the loop's own `end` where
        // isEndKeyword cannot list it (bn শেষ, also `last`): read past, the
        // `end` was swallowed as a stray terminator and the loop lost its extent.
        const loopHeadAction = actionName === 'repeat' || actionName === 'while';
        const endsClause = (k: number): boolean =>
          isClauseBoundary(k) ||
          (loopHeadAction && isBlockEndToken(all[k], endWordPlace(all, k), language));
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
              !this.isElseIfChain(t, before, language)
            ) {
              nested++;
            } else if (nested > 0) {
              if (isBlockEndToken(t, endWordPlace(all, clauseEnd), language)) nested--;
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
            const reparseCoverageMark = this.coverageMark();
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
              (first as { metadata?: { patternId?: string } } | undefined)?.metadata?.patternId ??
              '';
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
              this.coverageRollback(reparseCoverageMark);
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
        tryAttachTrailingRole(tokens, commandNode as CommandSemanticNode, language, this.boundIdentifiers);

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
      const hasBlockBody =
        isBlockBodyAction && !!nextToken && !isEndKeyword(nextToken.value, language);

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
      const hasTrailingBody = !!nextToken && !isEndKeyword(nextToken.value, language);

      // The captured command can be a LOOP head (`repeat-event-es-vso` fuses
      // `al clic repetir 3 times`), whose body the re-parse above recovered.
      // Its `end` closes the loop, not the handler: when more body follows it,
      // consume the `end` as the loop's and walk on. The body walker never sees
      // the head, so it is handed the leading nodes to count open loops from.
      const leading: WalkEntry[] = [commandNode, ...reparsedTail];
      const closesLeadingLoop =
        !!nextToken &&
        isEndKeyword(nextToken.value, language) &&
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

        const remainingCommands = this.parseBodyWithGrammarPatterns(
          tokens,
          commandPatterns,
          grammarContinuationPatterns,
          language,
          leading
        );

        // Combine the first command with the remaining commands, nesting loops.
        body = this.foldLoopBlocks([...leading, ...remainingCommands]);
      } else {
        body = this.foldLoopBlocks(leading);
        // No trailing-body walk ran (next token is an `end` or the stream is
        // exhausted) — anything left past here is dropped. The residue filter
        // silences the bare block terminator(s), so only real content fires.
        if (!tokens.isAtEnd()) {
          this.recordDroppedTokens(
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
        headClause = this.takeHeadClause(bodyStream, commandPatterns, language);
        body = this.parseBodyWithClauses(bodyStream, commandPatterns, language);
        while (!tokens.isAtEnd()) tokens.advance();
      } else {
        headClause = this.takeHeadClause(tokens, commandPatterns, language);
        // Use parseBodyWithClauses() to properly handle multi-clause then-chains
        body = this.parseBodyWithClauses(tokens, commandPatterns, language);
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

    const handler = createEventHandler(resolvedEventValue, foldedBody, eventModifiers, {
      sourceLanguage: language,
      patternId: match.pattern.id,
      confidence: match.confidence,
    });
    return headClause ? { ...handler, headClause } : handler;
  }

  /**
   * What upstream's `on` reads between the event and the body and no event
   * pattern models (`on click elsewhere`, `on click 1 to 2`, `on mutation of
   * attributes`, `on foo queue first`, `on x having threshold 0.1`), taken as
   * the handler's head clause, kept as written (M1 phase 3). It opens with a
   * word of upstream's `on` grammar or a count, and runs to the first command;
   * the guards of a command's clause apply (keepVerbatimClause).
   */
  private takeHeadClause(
    tokens: TokenStream,
    commandPatterns: LanguagePattern[],
    language: string
  ): string | undefined {
    const all = tokens.tokens as LanguageToken[];
    const start = tokens.position();
    const first = all[start];
    if (!first) return undefined;
    const opens = HEAD_OPENERS.has(first.value.toLowerCase()) || /^\d+$/.test(first.value);
    if (!opens) return undefined;
    let end = start + 1;
    while (end < all.length && end - start <= HEAD_CLAUSE_WORDS) {
      if (tokensBeginCommand(all.slice(end), commandPatterns, language)) break;
      end++;
    }
    if (end >= all.length || end - start > HEAD_CLAUSE_WORDS) return undefined;
    const run = all.slice(start, end);
    // A count is upstream's `1` or `1 to 2`, where no command begins at the
    // number: a body can open with one where the head ends (ja `2 is in [1, 2]
    // を #out に 置く`, an SOV loop's `3 + 3 times`), and it is the body's there.
    // `クリックで 1 xを 10に 設定` is the count, then the body.
    const words = run.map(t => t.value).join(' ');
    if (/^\d/.test(first.value)) {
      if (!/^\d+(?: to \d+)?$/.test(words)) return undefined;
      if (tokensBeginCommand(all.slice(start), commandPatterns, language)) return undefined;
    }
    const holder = { kind: 'command', action: 'on' } as unknown as SemanticNode;
    if (!this.keepVerbatimClause(holder, run, all[start - 1], language)) return undefined;
    while (tokens.position() < end) tokens.advance();
    return (holder as { verbatimClause?: string }).verbatimClause;
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
          consumeJsBlock(tokens, language, this.positionSource) ?? consumeVerbFinalJsBlock(tokens, language, this.positionSource);
        if (jsNode) {
          clauses.push(jsNode);
          continue;
        }

        const conditional = this.tryParseConditionalBlock(tokens, commandPatterns, language);
        if (conditional) {
          clauses.push(conditional);
          continue;
        }

        // Leading `unless` — same splitter, flat shape (see tryParseUnlessGuard).
        const unlessGuard = this.tryParseUnlessGuard(tokens, commandPatterns, language);
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

      // Check if this is an 'end' keyword (terminates block). The English
      // positional-put phrase `at end of <target>` contains the literal word
      // `end` — when the pending clause ends with `at` and the next token is
      // `of`, this `end` is the position noun, not a block terminator
      // (`put it at end of body`, make-toast-element). The sandwich check is
      // value-based and language-safe: no other language's end keyword sits
      // between literal `at`/`of` tokens.
      const prevClauseToken = currentClauseTokens[currentClauseTokens.length - 1];
      const followingToken = tokens.peek(1);
      const beforePrevClauseToken = currentClauseTokens[currentClauseTokens.length - 2];
      const isPositionalEndNoun =
        (followingToken?.value.toLowerCase() === 'of' &&
          (prevClauseToken?.value.toLowerCase() === 'at' ||
            // `at the end of`, which upstream reads too.
            (prevClauseToken?.value.toLowerCase() === 'the' &&
              beforePrevClauseToken?.value.toLowerCase() === 'at'))) ||
        // Per-language `at end of` phrase (zh `在 结束 的`, id `di akhir dari`, …):
        // the `end` noun tokenizes as a keyword in some languages and would
        // otherwise chop make-toast's trailing `put it at end of body` clause.
        isAtEndPositionNoun(language, current.value, prevClauseToken?.value, followingToken?.value);
      const isEnd =
        current.kind === 'keyword' &&
        isEndKeyword(current.value, language) &&
        !isPositionalEndNoun &&
        // An end word where a value stands is a variable spelled like it (C3).
        !endWordIsValue(endWordPlace(tokens.tokens, tokens.position()), language);

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
      // bn's শেষ is `end` AND the positional `last`, so isEndKeyword cannot list
      // it and it never terminates a body; it can still close an open loop, by
      // the conditional fold's test (a keyword normalized `end`, not before a
      // selector). closeLoopAtEnd declines unless a loop is open.
      const closesBlock =
        isEnd ||
        (!isPositionalEndNoun &&
          isBlockEndToken(current, endWordPlace(tokens.tokens, tokens.position()), language));
      // A `while` no `repeat` claimed, last in a loop, is that loop's bottom
      // test (`repeat … while x < 3 end`): the `end` is the loop's. An SOV
      // while-phrase is claimed by the `repeat` verb after it before any `end`.
      const kinds = pendingOpenerKinds;
      const bottomWhile =
        kinds.length >= 2 &&
        kinds[kinds.length - 1] === 'while' &&
        kinds.slice(0, -1).every(kind => kind === 'loop');
      if (closesBlock && (kinds.every(kind => kind === 'loop') || bottomWhile)) {
        if (this.closeLoopAtEnd(tokens, currentClauseTokens, clauses, commandPatterns, language)) {
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
          const clauseNodes = this.parseClause(currentClauseTokens, commandPatterns, language);
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
              (isThenKeyword(t.value, language) || isEndKeyword(t.value, language)));
          if (tIsBoundary) break;
          trailingTokens.push(t);
          tokens.advance();
        }

        if (trailingTokens.length > 0) {
          const preParseMark = this.coverageMark();
          const preNodes =
            currentClauseTokens.length > 0
              ? this.parseClause(currentClauseTokens, commandPatterns, language)
              : [];
          if (preNodes.length === 0 && currentClauseTokens.length > 0) {
            // Pre-`end` tokens parsed to nothing — a stranded argument (e.g. `200ms`)
            // whose verb sits after `end`. Merge so the verb reclaims its argument.
            // The discarded first parse's coverage records are superseded by the
            // merged parse's own accounting.
            this.coverageRollback(preParseMark);
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
        } else if (isIf && this.isElseIfChain(current, prev, language)) {
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
      const clauseNodes = this.parseClause(currentClauseTokens, commandPatterns, language);
      clauses.push(...clauseNodes);
    }

    // Stream remainder after the walk ended at a depth-0 `end`: tokens this
    // body parse will never read. Per sub-stream by construction — SOV/VSO
    // extraction passes a re-tokenized segment, so the accounting is
    // per-segment, never against the outer stream.
    if (!tokens.isAtEnd()) {
      this.recordDroppedTokens(
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

    const statements = this.foldLoopBlocks(clauses);

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
  private closeLoopAtEnd(
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
    const mark = this.coverageMark();
    const nodes = this.parseClause([...pending], commandPatterns, language);
    // Nothing parsed: a stranded fragment whose verb follows the `end` (the SOV
    // `… 200ms 終わり を 待つ` shape). The caller's handling reunites the two.
    if (nodes.length === 0 || openBefore + nodes.filter(isOpenLoopHead).length === 0) {
      this.coverageRollback(mark);
      return false;
    }
    clauses.push(...nodes, LOOP_CLOSE);
    tokens.advance();
    return true;
  }

  /**
   * Nest each loop's body under it. The walker emits a loop head FLAT, followed
   * by its body and — where it consumed the loop's `end` — a LOOP_CLOSE; this
   * turns every head … close span into a {@link LoopSemanticNode}. A loop still
   * open at the end of the list closes there, which is what the flat list
   * meant (the renderer used to close every loop at the tail). A head with no
   * body stays the flat head it was, unless its own `end` closed it.
   */
  private foldLoopBlocks(entries: readonly WalkEntry[]): SemanticNode[] {
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
      else if (this.bottomTestTokens.has(entry)) {
        // An `until` that ends no loop: its words are unread, as they were.
        const language = entry.metadata?.sourceLanguage ?? 'en';
        this.recordDroppedTokens(this.bottomTestTokens.get(entry)!, language, 'body clause');
      } else append(entry);
    });
    while (open.length > 0) close(false);
    return out;
  }

  /**
   * Re-parse a Stage-2 loop head whose body trails it, through the clause
   * walker that nests loop bodies. Stage 2's pattern stops at the head, so a
   * top-level `repeat until event pointerup from document … end` kept the head
   * and dropped the body and everything after the loop. Returns the loop, or
   * a sequence that starts with one (`repeat … end remove .x from me`); null
   * leaves Stage 2's head-only parse, and its `unconsumed-input`, as before.
   */
  private tryTopLevelLoop(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode | null {
    const bodyCoverageMark = this.coverageMark();
    let body: SemanticNode[];
    try {
      const freshStream = new TokenStreamImpl(tokens.tokens as LanguageToken[], language);
      body = this.parseBodyWithClauses(freshStream, commandPatterns, language);
    } catch {
      this.coverageRollback(bodyCoverageMark);
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
    this.coverageRollback(bodyCoverageMark);
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
  private tryTopLevelCommandSequence(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
  ): CompoundSemanticNode | null {
    // Speculative: on any null return Stage 2 falls through to its own
    // `unconsumed-input` emission — keeping this parse's records would
    // double-count the same span.
    const bodyCoverageMark = this.coverageMark();
    let body: SemanticNode[];
    try {
      const freshStream = new TokenStreamImpl(tokens.tokens as LanguageToken[], language);
      body = this.parseBodyWithClauses(freshStream, commandPatterns, language);
    } catch {
      this.coverageRollback(bodyCoverageMark);
      return null;
    }

    // parseBodyWithClauses returns `[compound]` for >1 clause, else the clauses
    // themselves (0 or 1). Anything but the compound means there was no sequence.
    if (body.length !== 1 || body[0].kind !== 'compound') {
      this.coverageRollback(bodyCoverageMark);
      return null;
    }
    const compound = body[0] as CompoundSemanticNode;
    if (compound.statements.length < 2) {
      this.coverageRollback(bodyCoverageMark);
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
   * A bare `repeat` before its body (`repeat set x to x + 1 until x is 3 end`,
   * upstream's bottom-tested loop): the loop pattern took the body's first
   * command for the loop's form, and its words for the count (`repeat set x`
   * read `repeat x times`). A form that is no loop form, where a command
   * begins, is the body's; SOV is loopHeadReadsBody's.
   */
  private repeatOpensOnItsBody(
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
   * The words of each `until` test taken by {@link takeBottomUntil}: one that
   * closes no loop gives them back as unread (foldLoopBlocks).
   */
  private readonly bottomTestTokens = new WeakMap<SemanticNode, LanguageToken[]>();

  /**
   * A loop's bottom test, `until <condition>` after its body (`repeat set x to
   * x + 1 until x is 3 end`): the rest of the clause is the condition, up to
   * the loop's `end`. No pattern reads a bare `until`, so its words were
   * dropped and the loop ran forever. foldLoopBlocks attaches the test to the
   * loop it ends. (`while` has a pattern of its own.) After a `toggle`, the
   * `until` is the toggle's (`toggle .x until transitionend`).
   */
  private takeBottomUntil(
    stream: TokenStreamImpl | ReturnType<typeof tokenizeInternal>,
    before: readonly WalkEntry[],
    language: string
  ): SemanticNode | null {
    const tok = stream.peek();
    if (!tok || (tok.kind !== 'keyword' && tok.kind !== 'particle')) return null;
    // The word, or a particle marking the role (ja `まで`).
    const word = (tok.normalized ?? tok.value).toLowerCase();
    if (word !== 'until' && tok.metadata?.role !== 'until') return null;
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
      if (isBlockEndToken(t, place, language) || isThenAt(t, place, language)) break;
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
    this.bottomTestTokens.set(node, words);
    return node;
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
          if (
            action &&
            !SemanticParserImpl.CONDITION_OPERATORS.has(action) &&
            getSchema(action as ActionType)
          ) {
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
    const clauseCoverageMark = this.coverageMark();

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
        this.keepVerbatimClause(
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
        this.recordDroppedTokens(run, language, 'body clause');
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
      this.recordDroppedTokens(run, language, 'body clause');
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
          this.repeatOpensOnItsBody(
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
        const conditional = this.tryParseConditionalBlock(clauseStream, commandPatterns, language);
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
        tryAttachTrailingRole(clauseStream, cmd, language, this.boundIdentifiers);
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
            ? this.tryParsePseudoCommand(clauseStream, commandPatterns, language)
            : null;
        if (pseudo) {
          flushSkipped();
          commands.push(pseudo);
          directHits++;
          continue;
        }
        const bottom =
          skipped.length === 0 ? this.takeBottomUntil(clauseStream, commands, language) : null;
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
        this.coverageRollback(clauseCoverageMark);
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

  // ==========================================================================
  // SOV Verb-Anchored Clause Parsing
  // ==========================================================================

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
  private parseBodyWithGrammarPatterns(
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
      return this.keepVerbatimClause(owner, run, all[at - 1], language);
    };
    const flushClause = () => {
      if (!clauseHadMatch && skippedClauseTokens.length > 0) {
        const recovered = parseSOVClauseByVerbAnchoring(skippedClauseTokens, language);
        commands.push(...recovered);
        if (recovered.length === 0 && !keepAsClause()) {
          this.recordDroppedTokens(skippedClauseTokens, language, 'fused body walk');
        }
      } else if (skippedClauseTokens.length > 0 && !keepAsClause()) {
        // A clause that DID match a pattern also silently discards its skipped
        // tokens (the recovery is gated on !clauseHadMatch) — record them.
        this.recordDroppedTokens(skippedClauseTokens, language, 'fused body walk');
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
      // bn's শেষ (`end` AND the positional `last`) is no isEndKeyword; it closes
      // an open loop all the same, by the conditional fold's test — see the
      // matching note in parseBodyWithClauses.
      if (
        current &&
        openLoops() > 0 &&
        !isEndKeyword(current.value, language) &&
        isBlockEndToken(current, endWordPlace(tokens.tokens, tokens.position()), language) &&
        !isAtEndPositionNoun(language, current.value, tokens.peek(-1)?.value, tokens.peek(1)?.value)
      ) {
        flushClause();
        commands.push(LOOP_CLOSE);
        tokens.advance();
        continue;
      }
      if (current && isEndKeyword(current.value, language)) {
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
      if (
        current &&
        !clauseHadMatch &&
        isIfKeyword((current.normalized ?? current.value).toLowerCase(), language)
      ) {
        flushClause();
        const conditional = this.tryParseConditionalBlock(tokens, commandPatterns, language);
        if (conditional) {
          commands.push(conditional);
          clauseHadMatch = true;
          continue;
        }
      }

      // A loop's bottom test (`… hasta x es 3 fin`), as parseClause reads it.
      const bottom =
        skippedClauseTokens.length === 0 ? this.takeBottomUntil(tokens, commands, language) : null;
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
          tryAttachTrailingRole(tokens, cmd, language, this.boundIdentifiers);
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
      this.recordDroppedTokens(
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
      t =>
        t.kind === 'conjunction' || (t.kind === 'keyword' && isThenKeyword(t.value, language))
    );
    const hasElseKeyword = allTokens.some(t => isElseKeyword(t.value, language));
    if (!conditionalHead && !hasThenKeyword && !hasElseKeyword) return null;

    // Reset token stream and parse using clause-based parsing
    const freshStream = new TokenStreamImpl(allTokens as LanguageToken[], language);
    const bodyCoverageMark = this.coverageMark();
    const body = this.parseBodyWithClauses(freshStream, commandPatterns, language);

    if (body.length === 0) {
      this.coverageRollback(bodyCoverageMark);
      return null;
    }

    // Always a single element: parseBodyWithClauses wraps >1 clause into ONE
    // compound and otherwise returns the lone clause. (A `createCompoundNode`
    // re-wrap used to sit here for a `body.length > 1` case that cannot occur.)
    return body[0];
  }

  // ==========================================================================
  // SOV Event Trigger Extraction
  // ==========================================================================

  /**
   * Known event names for detection (common DOM events).
   */

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
      (!!evtNorm && KNOWN_EVENTS.has(evtNorm)) ||
      KNOWN_EVENTS.has(evtVal) ||
      nativeEventNames.has(evtVal);
    if (!isKnownEvent) return null;

    const eventName =
      evtNorm && KNOWN_EVENTS.has(evtNorm)
        ? evtNorm
        : (langEvents?.[evtVal] ?? evtVal);

    // Body = everything before the on-marker, parsed as command(s)/block.
    const bodyTokens = tokens.slice(0, markerIdx);
    if (bodyTokens.length === 0) return null;

    const commandPatterns = patterns.filter(p => p.command !== 'on');
    const bodyStream = new TokenStreamImpl(bodyTokens, language);
    const bodyCoverageMark = this.coverageMark();
    const body = this.parseBodyWithClauses(bodyStream, commandPatterns, language);
    if (body.length === 0) {
      this.coverageRollback(bodyCoverageMark);
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
        (!!evtNorm && KNOWN_EVENTS.has(evtNorm)) ||
        KNOWN_EVENTS.has(evtVal) ||
        nativeEventNames.has(evtVal);
      if (!isKnownEvent) continue;

      const eventName =
        evtNorm && KNOWN_EVENTS.has(evtNorm)
          ? evtNorm
          : (langEvents?.[evtVal] ?? evtVal);

      // Body = every token except the on-marker + event pair, parsed as a block.
      const bodyTokens = tokens.filter((_, idx) => idx !== i && idx !== i + 1);
      if (bodyTokens.length === 0) return null;

      const commandPatterns = patterns.filter(p => p.command !== 'on');
      const bodyStream = new TokenStreamImpl(bodyTokens, language);
      const bodyCoverageMark = this.coverageMark();
      const body = this.parseBodyWithClauses(bodyStream, commandPatterns, language);
      if (body.length === 0) {
        this.coverageRollback(bodyCoverageMark);
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
  private trySOVEventExtraction(
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
        (KNOWN_EVENTS.has(normalizedLower) ||
          WAITABLE_EVENT_WORDS.has(normalizedLower));
      const isEventByNative =
        nativeEventNames.has(tokenValue) || nativeEventNames.has(bareEventValue);
      const isEventByBare =
        KNOWN_EVENTS.has(bareEventValue) ||
        WAITABLE_EVENT_WORDS.has(bareEventValue);

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
          eventIndex = i;
          eventName = resolvedName;
          keyFilter = tokenKeyFilter;
          tokensToRemove =
            1 +
            paramPhrase.len +
            matchEventMarkerPhrase(allTokens, i + 1 + paramPhrase.len, language);
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
      for (let i = 0; i < allTokens.length; i++) {
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
    const bodyCoverageMark = this.coverageMark();
    const body = this.parseBodyWithClauses(bodyStream, commandPatterns, language);

    if (body.length === 0) {
      this.coverageRollback(bodyCoverageMark);
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
  private tryParseUnlessGuard(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] | null {
    const head = tokens.peek();
    if (!head) return null;
    if (!isUnlessKeyword((head.normalized ?? head.value).toLowerCase(), language)) return null;

    const mark = tokens.mark();
    const folded = this.tryParseConditionalBlock(tokens, commandPatterns, language, true);
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

  /**
   * Does this `if` continue an `else if` chain? Only on the `else`'s line, as
   * upstream reads it: an `if` on the next line opens a block of its own, with
   * its own `end`, and the else branch runs on after it. Read as a chain, the
   * commands after that block left the else branch and ran either way.
   */
  private isElseIfChain(
    t: LanguageToken,
    prev: LanguageToken | undefined,
    language: string
  ): boolean {
    return !!prev && isElseKeyword(prev.value, language) && !t.metadata?.lineStart;
  }

  /**
   * A token opening a block whose own `end` the conditional fold must skip: a
   * nested `if`/`unless`, or a loop head (`repeat`, `for`). Counting only the
   * conditionals let a loop's `end` close the `if` around it, and the `if`'s
   * own `end` then ended the enclosing body: `if x repeat 3 times … end end
   * then remove .b from me` lost the `remove`. A `for` right after `repeat`
   * names the loop's form (`repeat for …`) and opens nothing. The English
   * `repeat` counts in every language, as `end` does in isEndKeyword: the SOV
   * counted-loop head keeps it untranslated (ja/ko/tr `3 times を repeat`),
   * where it tokenizes as an identifier.
   *
   * An `if` right after `else`, on its line, opens nothing: it continues the chain, which one
   * `end` closes, as upstream reads it. Counted as a nested `if`, the chain
   * wanted a second `end`, and `if a … else if b … end then c` put `c` in the
   * else branch, running only when `a` was false.
   */
  private opensNestedBlock(
    t: LanguageToken,
    prev: LanguageToken | undefined,
    language: string
  ): boolean {
    const tv = (t.normalized ?? t.value).toLowerCase();
    if (isIfKeyword(tv, language)) return !this.isElseIfChain(t, prev, language);
    if (isUnlessKeyword(tv, language)) return true;
    if (tv === 'repeat') return t.kind === 'keyword' || t.kind === 'identifier';
    if (tv !== 'for' || t.kind !== 'keyword') return false;
    return !(prev && isRepeatToken(prev));
  }

  private tryParseConditionalBlock(
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
    if (
      !isIfKeyword(headVal, language) &&
      !(allowUnless && isUnlessKeyword(headVal, language))
    ) {
      return null;
    }

    const startMark = tokens.mark();
    // Speculative: a failed fold rewinds the stream, so any coverage records
    // its branch parses made describe a parse that never happened.
    const foldCoverageMark = this.coverageMark();
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
        this.opensNestedBlock(t, wordBefore(blockTokens, blockTokens.length), language)
      ) {
        depth++;
        blockTokens.push(t);
        tokens.advance();
        continue;
      }
      if (isBlockEndToken(t, endWordPlace(tokens.tokens, tokens.position()), language)) {
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
      this.coverageRollback(foldCoverageMark);
      return null;
    }

    // Split blockTokens into condition / then-branch / else-branch. The condition
    // ends at the first depth-0 `then` keyword, or at the first depth-0 token that
    // begins a command (copula-guarded). then/else are split at depth-0 `else`.
    // For SOV, also recognise a verb-medial command head (matchBest can't — A2a).
    const sovProfile = tryGetProfile(language);
    const sovVerbLookup =
      sovProfile?.wordOrder === 'SOV' ? buildVerbLookup(sovProfile) : null;
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
      } else if (isBlockEndToken(t, endWordPlace(all, blockStart + i), language)) bodyDepth--;
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
          !SemanticParserImpl.CONDITION_OPERATORS.has(cur) &&
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
      this.coverageRollback(foldCoverageMark);
      return null;
    }

    // Partition the remaining tokens into then- / else-branch at the depth-0 else.
    const thenTokens: LanguageToken[] = [];
    const elseTokens: LanguageToken[] = [];
    let inElse = false;
    let branchDepth = 0;
    for (; i < blockTokens.length; i++) {
      const t = blockTokens[i];
      if (this.opensNestedBlock(t, wordBefore(blockTokens, i), language)) branchDepth++;
      else if (isBlockEndToken(t, endWordPlace(all, blockStart + i), language)) branchDepth--;
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

    const thenBranch = this.parseBranch(thenTokens, commandPatterns, language);
    const elseBranch =
      elseTokens.length > 0 ? this.parseBranch(elseTokens, commandPatterns, language) : undefined;

    // Nothing parsed in either branch — not a usable conditional; fall through so
    // the existing per-clause path can try (e.g. a stray `if` token). Unless the
    // block is empty as written, `if x then end`: read flat, it lost its `end`,
    // and the commands after it fell into its body.
    const writtenEmpty = closed && sawThen && thenTokens.length === 0 && elseTokens.length === 0;
    if (thenBranch.length === 0 && (!elseBranch || elseBranch.length === 0) && !writtenEmpty) {
      tokens.reset(startMark);
      this.coverageRollback(foldCoverageMark);
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
