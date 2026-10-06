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
 * `BehaviorSemanticNode` / `DefSemanticNode` (or a `FeatureSemanticNode` for the
 * feature blocks, including the reactive `when <expr> changes … end`).
 *
 * See docs-internal/MULTILINGUAL_BEHAVIORS_PLAN.md Phase 3.
 */

import type {
  ActionType,
  LanguageToken,
  PatternToken,
  SemanticNode,
  SemanticValue,
  CompoundSemanticNode,
  EventHandlerSemanticNode,
  DefSemanticNode,
  FeatureAction,
} from '../types';
import { createBehaviorNode, createDefNode, createCompoundNode, createFeatureNode } from '../types';
import { getPatternsForLanguage, tryGetProfile } from '../registry';
import { tokenize } from '../tokenizers';
import { commandSchemas } from '../generators/command-schemas';
import { joinExpressionTokens } from './utils/expression-lexicon';
import { isOrWordToken } from './utils/or-words';

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
 * Block NAME form. Required for `behavior` and for the named features
 * (`eventsource`/`socket`), where it is what distinguishes a real block head
 * from an incidental keyword token.
 */
const PASCAL_CASE_NAME = /^[A-Z][A-Za-z0-9_]*$/;

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

type OpenerAction = (typeof OPENER_ACTIONS)[number];

/** A language's surface forms for the opener words and the words the rules below read. */
interface OpenerForms {
  readonly byAction: ReadonlyArray<readonly [OpenerAction, Set<string>]>;
  readonly elseForms: Set<string>;
  readonly inForms: Set<string>;
  readonly tellForms: Set<string>;
  readonly endForms: Set<string>;
  readonly onForms: Set<string>;
  /** `def`, `init`, `behavior`: words that start a feature, which closes an open `tell`. */
  readonly featureForms: Set<string>;
  /** The `on` marker precedes its event (SVO/VSO/V2), so `on <event>` can be read forward. */
  readonly onLeads: boolean;
}

function openerForms(language: string): OpenerForms {
  return {
    byAction: OPENER_ACTIONS.map(a => [a, keywordForms(language, a)] as const),
    elseForms: keywordForms(language, 'else'),
    inForms: keywordForms(language, 'in'),
    tellForms: keywordForms(language, 'tell'),
    endForms: keywordForms(language, 'end'),
    onForms: keywordForms(language, 'on'),
    featureForms: new Set(
      ['def', 'init', 'behavior'].flatMap(action => [...keywordForms(language, action)])
    ),
    onLeads: tryGetProfile(language)?.wordOrder !== 'SOV',
  };
}

/**
 * The opener action a token names (if/unless/repeat/for/while), if any — NOT a
 * plain `tokenMatches` against the opener forms, because some languages reuse a
 * block-keyword's surface form for a role marker: Portuguese `para` is BOTH the
 * `for` loop keyword AND the dative "to" marker, so `set X to Y` → `definir X
 * para Y` had its marker `para` mis-counted as a `for` opener, corrupting the
 * behavior-body depth split (the init segment swallowed the whole handler —
 * pt/sw behavior-removable lost on/remove/trigger). The tokenizer already
 * resolved the ambiguity: it normalizes the marker to its ROLE (`destination`),
 * not to `for`. So when a token carries a normalized form, trust it — it names
 * an opener only if that normalized form IS an opener action. A token with NO
 * normalized form (e.g. a raw js-body `if`) falls back to the surface match,
 * preserving the existing js-block depth balance.
 */
function openerActionOf(
  tok: LanguageToken | undefined,
  forms: OpenerForms
): OpenerAction | undefined {
  if (!tok) return undefined;
  const norm = tok.normalized?.toLowerCase();
  if (norm) return OPENER_NORMS.has(norm) ? (norm as OpenerAction) : undefined;
  return forms.byAction.find(([, set]) => tokenMatches(tok, set))?.[0];
}

/**
 * `start [a] view transition`, the head of a view-transition block, whose `end`
 * closes it. Its words are English in every language (patterns/view-transition.ts),
 * so they are matched as written.
 */
function opensViewTransition(tokens: readonly LanguageToken[], j: number): boolean {
  const word = (k: number): string | undefined => tokens[k]?.value.toLowerCase();
  if (word(j) !== 'start') return false;
  const view = word(j + 1) === 'a' ? j + 2 : j + 1;
  return word(view) === 'view' && word(view + 1) === 'transition';
}

/** A `tell` keyword: the tokenizer's normalized form, or the language's own word. */
function isTellWord(tok: LanguageToken | undefined, forms: OpenerForms): boolean {
  if (!tok) return false;
  const norm = tok.normalized?.toLowerCase();
  return norm ? norm === 'tell' : tokenMatches(tok, forms.tellForms);
}

/**
 * Whether the `tell` at `j` is closed by an `end`, as the engine reads it: the
 * body runs to an `end`, a new feature (`on <event>`, `def`, `init`, `behavior`)
 * or the end of input, and only an `end` is the tell's own. So a tell opens a
 * block for depth tracking only when an `end` comes first; counted always, a tell
 * written without one (`on click tell #x add .a on keyup …`) would take the next
 * handler's `end` and merge the two handlers. A forward `on <event>` is read only
 * where the marker leads its event (the program split's own rule).
 */
function tellTakesAnEnd(tokens: readonly LanguageToken[], j: number, forms: OpenerForms): boolean {
  let depth = 0;
  for (let k = j + 1; k < tokens.length; k++) {
    const tok = tokens[k];
    if (tokenMatches(tok, forms.endForms)) {
      if (depth === 0) return true;
      depth--;
      continue;
    }
    if (depth === 0) {
      if (tokenMatches(tok, forms.featureForms)) return false;
      if (forms.onLeads && tokenMatches(tok, forms.onForms) && looksLikeEvent(tokens[k + 1])) {
        return false;
      }
    }
    if (opensBlock(tokens, k, forms)) depth++;
  }
  return false;
}

/**
 * Whether `tokens[j]` opens a nested block for depth tracking. One word per
 * block does, though several opener words can head one: counting each gave a
 * behavior's handler an extra depth, so its `end` closed nothing and every
 * later handler landed inside it (their heads lost, in English and so in every
 * translation).
 * - A while-word never opens one. Upstream has no bare `while` loop: a while
 *   loop is `repeat while`, and its `repeat` opens the block, before the
 *   while-word (SVO `repeat while`) or after the condition (ja `の間 x < 3
 *   繰り返し`). ja `間` and ko `동안` also mark toggle's duration.
 * - `for` right after `repeat` is that repeat's head (`repeat for x in`).
 * - English `for` is a marker too (`wait for`, `take … for me`, `toggle … for
 *   2s`): it opens a loop only as `for <x> in`.
 * - `if` right after `else` continues its chain, which one `end` closes, as
 *   upstream reads it.
 */
function opensBlock(tokens: readonly LanguageToken[], j: number, forms: OpenerForms): boolean {
  if (opensViewTransition(tokens, j)) return true;
  if (isTellWord(tokens[j], forms)) return tellTakesAnEnd(tokens, j, forms);
  const tok = tokens[j];
  const action = openerActionOf(tok, forms);
  if (!action || action === 'while') return false;
  const prev = tokens[j - 1];
  if (action === 'for') {
    if (openerActionOf(prev, forms) === 'repeat') return false;
    if (tok.value.toLowerCase() === 'for') {
      const after = tokens[j + 2];
      return !!after && (tokenMatches(after, forms.inForms) || after.normalized === 'in');
    }
  }
  if (action === 'if' && prev && tokenMatches(prev, forms.elseForms)) return false;
  return true;
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

const isAction = (word: string): word is ActionType =>
  Object.prototype.hasOwnProperty.call(commandSchemas, word);

/**
 * The commands that take an `on` target (`toggle .a on el`, `trigger foo on
 * el`). Both engines consume the phrase after their `on`: in `on click toggle
 * .a on keyup log 1` the `log` runs on click, and no keyup handler exists.
 * Every other command leaves a following `on` to open a handler on both
 * engines, set's core-only `on` scope included.
 */
const TAKES_ON_TARGET: ReadonlySet<string> = new Set(['toggle', 'trigger']);

/** A literal of a pattern, its groups' inline, in order: its spellings and the role it introduces. */
interface LiteralSlot {
  readonly words: readonly string[];
  readonly role: string | undefined;
}

function literalSlots(tokens: readonly PatternToken[]): LiteralSlot[] {
  return tokens.flatMap((t, i): LiteralSlot[] => {
    if (t.type === 'group') return literalSlots(t.tokens);
    if (t.type !== 'literal') return [];
    const next = tokens[i + 1];
    return [
      {
        words: [t.value, ...(t.alternatives ?? [])].map(w => w.toLowerCase()),
        role: next?.type === 'role' ? next.role : undefined,
      },
    ];
  });
}

/**
 * Does the pattern still owe `surface`, after its verb and the words `written`
 * since? It writes `surface` for a role the command requires, and every marker
 * written since the verb is one of an earlier literal, in order. An optional
 * role leaves the `on` to open a handler: ar `أضف .active على keyup` (add
 * .active, on keyup) is two, and so is every role English marks with `on`
 * (set's scope, toggle's target), all of them optional.
 */
function owesMarker(
  slots: readonly LiteralSlot[],
  surface: string,
  written: readonly string[],
  required: ReadonlySet<string>
): boolean {
  return slots.some((slot, at) => {
    if (!slot.words.includes(surface) || !slot.role || !required.has(slot.role)) return false;
    let from = 0;
    for (const word of written) {
      const k = slots.findIndex((s, i) => i >= from && i < at && s.words.includes(word));
      if (k < 0) return false;
      from = k + 1;
    }
    return true;
  });
}

/**
 * Is the `on`-marker at `j` the preceding command's own? The trigger split read
 * the `on el` of `toggle .a on el log 1` as a second handler, and the commands
 * after it moved there, in English and so in every translation. So an
 * on-marker is the command's when the nearest command before it, in the same
 * clause, takes an `on` target, writes that marker in its own patterns (vi's
 * toggle reads `trên` only in its handcrafted one; a handler's fused patterns
 * are registered as `on`'s), and has not used it already (`toggle .a on #x on
 * keyup …` splits at the second `on`).
 *
 * It is also the command's when the language spells another of the command's
 * markers like `on`, and the command still owes it (owesMarker): de `auf` is
 * `on`, and set's and put's `to`, so `setze x auf n + 3` (set x to n + 3)
 * after a `dann` read as a handler for an event `n`, and he `ב` is also put's
 * `into` (PR 110). Not a role the command can do without (add's destination;
 * set's `on` scope, which leaves a following `on` to open a handler on both
 * engines), and not once the command has passed that marker's place (es
 * `establecer x a 5 en keyup` has written its `a`, `en`'s alternative).
 */
function isPrecedingCommandMarker(
  tokens: readonly LanguageToken[],
  segStart: number,
  j: number,
  language: string,
  endsClause: (tok: LanguageToken) => boolean
): boolean {
  const surface = tokens[j].value.toLowerCase();
  for (let k = j - 1; k > segStart; k--) {
    const t = tokens[k];
    if (endsClause(t) || t.value.toLowerCase() === surface) return false;
    const action = (t.normalized ?? t.value).toLowerCase();
    // Not `on`: a handler is not the command before its own marker, and vi's
    // toggle target `trên` normalizes to `on` (`chuyển đổi .a trên #x khi keyup`).
    if (!isAction(action) || action === 'on') continue;
    const patterns = getPatternsForLanguage(language).filter(p => p.command === action);
    if (TAKES_ON_TARGET.has(action)) {
      // Its own only while the slot that marker writes is empty: he's toggle
      // writes its target with `על` or `ב`, and once `על #x` is written the `ב`
      // of `ב keyup` opens a handler.
      const since = tokens.slice(k + 1, j).map(u => u.value.toLowerCase());
      return patterns.some(p =>
        literalSlots(p.template.tokens).some(
          slot => slot.words.includes(surface) && !since.some(w => slot.words.includes(w))
        )
      );
    }
    const required = new Set(
      (commandSchemas[action]?.roles ?? []).filter(r => r.required).map(r => r.role as string)
    );
    return patterns.some(p => {
      const slots = literalSlots(p.template.tokens);
      const words = new Set(slots.flatMap(slot => slot.words));
      const written = tokens
        .slice(k + 1, j)
        .map(u => u.value.toLowerCase())
        .filter(w => words.has(w));
      return owesMarker(slots, surface, written, required);
    });
  }
  return false;
}

/** Lowercased native surface forms (primary + alternatives) of a marker spec. */
function markerSurfaceForms(
  spec: { primary?: string; alternatives?: readonly string[] } | undefined
): Set<string> {
  const set = new Set<string>();
  if (spec?.primary) set.add(spec.primary.toLowerCase());
  for (const alt of spec?.alternatives ?? []) set.add(alt.toLowerCase());
  return set;
}

// =============================================================================
// Handler heads: where the next handler of a chain starts
// =============================================================================

/**
 * How a language writes a handler's head, for finding where the next handler of
 * a chain starts when the handlers have no `end` of their own: upstream ends a
 * handler's commands at the next feature, so `on click add .a on keyup log 1` is
 * two. Read from the profile and the language's `on` patterns, once per language.
 */
interface HandlerHeads {
  readonly sov: boolean;
  /**
   * Words that open a handler AHEAD of its event, read with a forward event
   * lookahead. Outside SOV: `on`'s forms and the `when` word, which is what the
   * renderer writes in de/fr/id (`wenn`, `quand`, `ketika`). Not every word an
   * `on` pattern leads with: those include `if` words (fr `si`, id `jika`, de
   * `falls`) and a destination marker (fr `à`). In SOV only the `when` word, and
   * only where it leads (qu `maykama`); the postpositional `on` (hi `पर`, ja `で`)
   * is also the locative marker.
   */
  readonly leading: Set<string>;
  /** `<lead> <event> <trail>` heads: zh `一 点击 就`, `当 点击 时`. */
  readonly circumfix: ReadonlyArray<readonly [Set<string>, Set<string>]>;
  /**
   * SOV: two or more words after the event (ja `を で`, ko `할 때` and `을 에`, tr
   * `i üzerinde`), distinctive enough to open a handler wherever they appear.
   */
  readonly trailing: ReadonlyArray<readonly string[]>;
  /**
   * SOV: a one-word `on` after the event (hi `पर`, bn `তে`). It is also the
   * destination marker, which nearly every hi/bn command may write first, so
   * after a command written without `then` (`… जोड़ें input पर .b को टॉगल`) it
   * may open a handler or a command on `input`, even when the name is a DOM
   * event's. It splits only where the previous command has ended
   * (afterCommand), and never for certain.
   */
  readonly afterClause: Set<string>;
  /** The patient marker (hi `को`): a value it marks still owes its verb. */
  readonly patient: Set<string>;
  /** A fronted event source (`#btn から keyup を で …`) belongs to its handler. */
  readonly source: Set<string>;
  /** Words a chain writes once per handler: two of them gate the tokenize. */
  readonly anchors: readonly string[];
}

const handlerHeadsCache = new Map<string, HandlerHeads>();

/** The literal's spellings, each split into its words (ko `할 때`). */
function spellings(token: PatternToken): string[][] {
  if (token.type !== 'literal') return [];
  return [token.value, ...(token.alternatives ?? [])].map(w => w.toLowerCase().split(/\s+/));
}

/**
 * The word sequences an `on` pattern writes right after its event, an optional
 * group of literals both taken and skipped (tr `(i|ı|u|ü)? üzerinde`). Stops at a
 * literal that introduces a role.
 */
function wordsAfterEvent(tokens: readonly PatternToken[], eventAt: number): string[][] {
  let sequences: string[][] = [[]];
  for (let i = eventAt + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'literal') {
      if (tokens[i + 1]?.type === 'role') break;
      sequences = sequences.flatMap(seq => spellings(t).map(words => [...seq, ...words]));
    } else if (t.type === 'group' && t.optional && t.tokens.every(g => g.type === 'literal')) {
      const taken = t.tokens.reduce<string[][]>(
        (acc, g) => acc.flatMap(seq => spellings(g).map(words => [...seq, ...words])),
        [[]]
      );
      sequences = sequences.flatMap(seq => [seq, ...taken.map(words => [...seq, ...words])]);
    } else {
      break;
    }
  }
  return sequences.filter(seq => seq.length > 0);
}

function handlerHeads(language: string): HandlerHeads {
  const cached = handlerHeadsCache.get(language);
  if (cached) return cached;
  const profile = tryGetProfile(language);
  const sov = profile?.wordOrder === 'SOV';

  const circumfix: Array<readonly [Set<string>, Set<string>]> = [];
  const trailing = new Map<string, string[]>();
  const oneWordAfter = new Set<string>();
  for (const pattern of getPatternsForLanguage(language)) {
    // The fused `<command>-event-*` patterns lead with a command verb (ar `اضبط`).
    if (pattern.command !== 'on' || /-event-/i.test(pattern.id)) continue;
    const tokens = pattern.template.tokens;
    const eventAt = tokens.findIndex(t => t.type === 'role' && t.role === 'event');
    if (eventAt < 0) continue;
    // A circumfix leads the pattern: hi `{source} से {event} पर` is a source
    // phrase, not a head word.
    const after = tokens[eventAt + 1];
    if (eventAt === 1 && after?.type === 'literal' && tokens[eventAt + 2]?.type !== 'role') {
      circumfix.push([new Set(spellings(tokens[0]).flat()), new Set(spellings(after).flat())]);
    }
    if (!sov || eventAt > 0) continue;
    for (const words of wordsAfterEvent(tokens, eventAt)) {
      if (words.length > 1) trailing.set(words.join(' '), words);
      else oneWordAfter.add(words[0]);
    }
  }

  const afterWords = new Set([...oneWordAfter, ...[...trailing.values()].flat()]);
  const whenWords = markerSurfaceForms(profile?.keywords?.when);
  const leading = sov
    ? new Set([...whenWords].filter(w => !afterWords.has(w)))
    : new Set([...keywordForms(language, 'on'), ...whenWords]);
  const afterClause = sov
    ? new Set([...markerSurfaceForms(profile?.keywords?.on)].filter(w => oneWordAfter.has(w)))
    : new Set<string>();

  const heads: HandlerHeads = {
    sov,
    leading,
    circumfix,
    trailing: [...trailing.values()],
    afterClause,
    patient: markerSurfaceForms(profile?.roleMarkers?.patient),
    source: markerSurfaceForms(profile?.roleMarkers?.source),
    anchors: [
      ...leading,
      ...circumfix.flatMap(([lead]) => [...lead]),
      ...[...trailing.values()].map(words => words[words.length - 1]),
      ...afterClause,
    ].filter(w => w.length > 0),
  };
  handlerHeadsCache.set(language, heads);
  return heads;
}

/** Do `words` appear in order from token `at`? */
function wordsAt(tokens: readonly LanguageToken[], at: number, words: readonly string[]): boolean {
  return words.every((word, k) => tokens[at + k]?.value.toLowerCase() === word);
}

/** Where a new handler starts, and whether its head is unambiguous. */
interface HandlerStart {
  readonly at: number;
  readonly certain: boolean;
}

/**
 * Does a new handler start at token `j` of the handler that began at `segStart`
 * (both at depth 0)? At `j` for a head that leads with its word; at the event,
 * or its fronted source, for one written after it.
 */
function handlerStartAt(
  tokens: readonly LanguageToken[],
  j: number,
  segStart: number,
  language: string,
  heads: HandlerHeads,
  thenForms: Set<string>,
  endsClause: (tok: LanguageToken) => boolean
): HandlerStart | null {
  const tok = tokens[j];
  const word = tok.value.toLowerCase();

  const leads =
    j > segStart &&
    looksLikeEvent(tokens[j + 1]) &&
    ((tokenMatches(tok, heads.leading) &&
      // A handler's event is never followed by `then` (both engines reject
      // `on click then …`): es/pt/he `poner 2 en item entonces …`, whose
      // `en` is put's `into` and also es's `on`, stays one handler.
      !(tokens[j + 2] && tokenMatches(tokens[j + 2], thenForms)) &&
      !isPrecedingCommandMarker(tokens, segStart, j, language, endsClause)) ||
      heads.circumfix.some(
        ([lead, trail]) => lead.has(word) && closesCircumfix(tokens, j, trail, heads)
      ));
  if (leads) return withFrontedSource(tokens, j, segStart, heads, true);

  // Written after the event: the event is at j - 1, and the handler that began
  // at segStart has its own head before it.
  const eventAt = j - 1;
  const event = tokens[eventAt];
  if (eventAt <= segStart || !looksLikeEvent(event)) return null;
  if (heads.trailing.some(words => wordsAt(tokens, j, words))) {
    return withFrontedSource(tokens, eventAt, segStart, heads, true);
  }
  if (
    heads.afterClause.has(word) &&
    (event.kind === 'keyword' || event.kind === 'identifier') &&
    afterCommand(tokens, eventAt, heads)
  ) {
    // The likely reading, but not a certain one: the caller says so, and the
    // adapter will not run it.
    return withFrontedSource(tokens, eventAt, segStart, heads, false);
  }
  return null;
}

/**
 * Does the circumfix led at `j` close after its event, or after the event's
 * source (zh `一 keyup 从 #b 就`)?
 */
function closesCircumfix(
  tokens: readonly LanguageToken[],
  j: number,
  trail: Set<string>,
  heads: HandlerHeads
): boolean {
  const at = (k: number): string | undefined => tokens[k]?.value.toLowerCase();
  const closes = (k: number): boolean => trail.has(at(k) ?? '');
  return (
    closes(j + 2) ||
    (tokens[j + 2] !== undefined && tokenMatches(tokens[j + 2], heads.source) && closes(j + 4))
  );
}

/**
 * A handler that starts at `at` with a fronted source (`#btn から keyup を で`,
 * qu `#b manta maykama click`) starts at the source; and when that source is
 * where the current handler began, it is that handler's own head (null).
 */
function withFrontedSource(
  tokens: readonly LanguageToken[],
  at: number,
  segStart: number,
  heads: HandlerHeads,
  certain: boolean
): HandlerStart | null {
  if (heads.sov && at - 2 >= segStart && tokenMatches(tokens[at - 1], heads.source)) {
    return at - 2 === segStart ? null : { at: at - 2, certain };
  }
  return { at, certain };
}

/**
 * The confidence a chain gets when one of its handlers starts at a head that may
 * be a destination instead (hi `पर`, bn `তে`): below the
 * adapter's default threshold (0.5), so the adapter leaves the script as written
 * and the engine reports it, rather than running a reading that may be wrong.
 */
const UNSURE_SPLIT_CONFIDENCE = 0.4;

/**
 * Has the SOV command before token `at` ended? Its verb (a command keyword) or
 * an `end` comes right before, or a role it writes after its verb (hi `1 को
 * रखें #out में`, put's destination); not a patient (`.a को input पर टॉगल`), which
 * still owes its verb.
 */
function afterCommand(tokens: readonly LanguageToken[], at: number, heads: HandlerHeads): boolean {
  const ends = (tok: LanguageToken | undefined): boolean => {
    if (!tok || tok.kind !== 'keyword') return false;
    const norm = (tok.normalized ?? tok.value).toLowerCase();
    return norm === 'end' || isAction(norm);
  };
  const before = tokens[at - 1];
  if (ends(before)) return true;
  return (
    before !== undefined &&
    before.kind === 'particle' &&
    !tokenMatches(before, heads.patient) &&
    ends(tokens[at - 3])
  );
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
    for (const raw of paren[1].split(/[,\u060c\u3001]/)) {
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

/** Identifier form of a `def` name (optionally namespaced, e.g. `utils.calc`). */
const DEF_NAME = /^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/;

/**
 * Where an SOV verb-final keyword must sit for `<name>[(params)] <patient-marker>
 * <keyword>` to be the block's head: immediately after the name, its balanced
 * parameter list (if any), and exactly one marker. Returns -1 on an unbalanced list.
 */
function sovHeadKeywordIndex(tokens: readonly LanguageToken[]): number {
  let afterName = 1;
  if (tokens[1]?.value === '(') {
    let depth = 0;
    let j = 1;
    for (; j < tokens.length; j++) {
      if (tokens[j].value === '(') depth++;
      else if (tokens[j].value === ')' && --depth === 0) break;
    }
    if (j >= tokens.length) return -1;
    afterName = j + 1;
  }
  return afterName + 1; // skip the single patient marker
}

/**
 * Is `keywordIdx` an SOV verb-final block head — `<name>[(params)] <patient-marker>
 * <keyword>`?
 *
 * The head must be CONTIGUOUS. Requiring only "a patient marker sits before the
 * keyword" is not enough: `worker`'s own ja body is `Calculator を worker … add(a,
 * b) を def …`, whose *body-level* `def` is also marker-preceded, so a loose guard
 * makes `tryParseBlock` claim the whole worker block as a `def` named `Calculator`.
 * Pinning the keyword to the position right after the name + params + one marker
 * rejects that (expected index 2, actual 10) while still accepting the real def
 * sub-block once `worker` hands it over as its own segment.
 */
function isSovVerbFinalHead(
  tokens: readonly LanguageToken[],
  keywordIdx: number,
  language: string
): boolean {
  const profile = tryGetProfile(language);
  if (profile?.wordOrder !== 'SOV') return false;
  if (!DEF_NAME.test(tokens[0].value)) return false;
  if (keywordIdx !== sovHeadKeywordIndex(tokens)) return false;
  const patientForms = markerSurfaceForms(profile.roleMarkers?.patient);
  if (patientForms.size === 0) return false;
  return tokenMatches(tokens[keywordIdx - 1], patientForms);
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
    return parseBehaviorBlock(input, language, tokens, parsers, 0);
  }
  // SOV verb-final declaration: the `behavior` keyword is reordered AFTER the
  // name + its object marker (ja `Foo(params) を behavior`, ko `를`, qu `ta`,
  // tr `i`), so it never lands at index 0 and the keyword-led check above misses
  // it. Detect a `behavior` keyword token past index 0 with a PascalCase name at
  // index 0 (the declaration head is `<Name>(params) <marker> behavior …`).
  const sovKeywordIdx = tokens.findIndex((t, i) => i > 0 && tokenMatches(t, behaviorForms));
  if (sovKeywordIdx > 0 && PASCAL_CASE_NAME.test(tokens[0].value)) {
    return parseBehaviorBlock(input, language, tokens, parsers, sovKeywordIdx);
  }
  if (tokenMatches(tokens[0], defForms)) {
    return parseDefBlock(input, language, tokens, parsers, 0);
  }
  // SOV verb-final `def`, the same reorder as `behavior` above (ja `add(a, b) を
  // def`, ko `를`, hi `को`, bn `কে`, tr `i`, qu `ta`). It cannot reuse the
  // PascalCase guard — function names are lowercase (`parseDefBlock` accepts any
  // identifier) — so the head is identified structurally instead: the token
  // immediately before the keyword must be the language's patient marker, which is
  // exactly what the transformer emits between the name and the displaced verb.
  // Reached via `worker`'s body segments, which route through `parsers.statement`
  // (→ Stage 0), the only path that sees this layer.
  const sovDefIdx = tokens.findIndex((t, i) => i > 0 && tokenMatches(t, defForms));
  if (sovDefIdx > 0 && isSovVerbFinalHead(tokens, sovDefIdx, language)) {
    return parseDefBlock(input, language, tokens, parsers, sovDefIdx);
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
 *  - **head-delimited** — a depth-0 handler head starts a new segment, for the
 *    no-`end` chain (`on click … on keyup …`, which upstream reads as two). The
 *    head is the language's own ({@link handlerHeads}): a word ahead of the event
 *    (en `on`, es `al`, de `wenn`, qu `maykama`), a circumfix (zh `一 … 就`), or
 *    words after it (ja `を で`, ko `할 때`, tr `i üzerinde`); a destination `on`
 *    (`toggle .x on me`) is told apart by event-name lookahead and by the command
 *    before it ({@link isPrecedingCommandMarker}). hi `पर` and bn `তে` are also
 *    the destination marker, so a chain split there is never trusted: its
 *    confidence is capped below the adapter's threshold.
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
  return splitProgram(input, language, parsers)?.node ?? null;
}

/**
 * {@link tryParseProgram}, saying also whether a handler started at a head that
 * may be a destination instead (the chain's confidence is capped then).
 */
function splitProgram(
  input: string,
  language: string,
  parsers: BlockParsers
): { node: CompoundSemanticNode; unsure: boolean } | null {
  const profile = tryGetProfile(language);
  if (!profile) return null;
  const heads = handlerHeads(language);

  // Cheap pre-guard: a multi-handler program needs either ≥1 `end` keyword (the
  // end-delimited form) or ≥2 handler-head words (the no-`end` chain writes one
  // per handler). Skip the tokenize for the overwhelming majority of
  // single-statement inputs that have neither. Over-counting only costs a
  // tokenize that then yields <2 segments → null; under-counting would miss a
  // real program, so this errs toward proceeding.
  const endForms = keywordForms(language, 'end');
  const thenForms = keywordForms(language, 'then');
  const lower = input.toLowerCase();
  const hasEnd = [...endForms].some(f => lower.includes(f));
  const hasMultiTrigger = (() => {
    let hits = 0;
    for (const f of heads.anchors) {
      for (let i = lower.indexOf(f); i >= 0; i = lower.indexOf(f, i + f.length)) {
        if (++hits >= 2) return true;
      }
    }
    return false;
  })();
  if (!hasEnd && !hasMultiTrigger) return null;

  const tokens = tokenize(input, language).tokens as readonly LanguageToken[];
  if (tokens.length < 2) return null;

  const forms = openerForms(language);
  const isOpener = (j: number): boolean => opensBlock(tokens, j, forms);
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);
  const endsClause = (t: LanguageToken): boolean => isEnd(t) || tokenMatches(t, thenForms);

  // Split into top-level handler segments. At depth 0, a `end` closes the current
  // handler (end-delimited form), and a handler head starts a new one
  // (handlerStartAt: the no-`end` chain). A `end` at depth > 0 closes a NESTED
  // if/repeat (decrement only). A final handler with no trailing `end` is the tail.
  const segments: string[] = [];
  let unsure = false;
  let depth = 0;
  let segStart = 0;
  for (let j = 0; j < tokens.length; j++) {
    const tok = tokens[j];
    if (isEnd(tok)) {
      if (depth > 0) {
        depth--;
        continue;
      }
      // A handler's `end` is never followed by `then` (both engines reject
      // `on click … end then …`), so this `end` closes a block the opener count
      // does not track — a `js … end` — and the handler goes on. Splitting here
      // left `then <rest>` as a segment, which SOV can read as a handler: ja's
      // `それから "/x" {method:"POST"} で フェッチ` became `on }` (its `で` is
      // both the event marker and the instrument marker).
      if (tokens[j + 1] && tokenMatches(tokens[j + 1], thenForms)) continue;
      const text = input.slice(tokens[segStart].position.start, tok.position.start).trim();
      if (text) segments.push(text);
      segStart = j + 1;
    } else if (isOpener(j)) {
      depth++;
    } else if (depth === 0) {
      const start = handlerStartAt(tokens, j, segStart, language, heads, thenForms, endsClause);
      if (!start) continue;
      if (!start.certain) unsure = true;
      const text = input
        .slice(tokens[segStart].position.start, tokens[start.at].position.start)
        .trim();
      if (text) segments.push(text);
      segStart = start.at;
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
    // A handler with NO commands is not a handler in a chain — it is the tell of
    // a mis-split. ko renders `transition opacity to 0` as `opacity 을 에 0`,
    // which carries the same `<x> <event-marker> <on-marker>` signature the SOV
    // split keys on, and splitting there leaves a bodiless `클릭 을 에` ahead of
    // it. Reject rather than merely distrust: the single-statement path parses
    // the line correctly, so a low-confidence compound is strictly worse.
    if (!handler.body || handler.body.length === 0) return null;
    confidences.push(handler.metadata?.confidence ?? 0.75);
  }

  const confidence = meanConfidence(confidences);
  const node = createCompoundNode(handlers, 'then', {
    sourceLanguage: language,
    confidence: unsure ? Math.min(confidence, UNSURE_SPLIT_CONFIDENCE) : confidence,
    sourceText: input,
  });
  return { node, unsure };
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

/**
 * Parse a `behavior Name(params) … end` block into a BehaviorSemanticNode.
 *
 * `keywordIdx` is the token index of the `behavior` keyword: 0 for the normal
 * keyword-led form (en/SVO/VSO/V2), or > 0 for the SOV verb-final form where the
 * keyword is reordered after the name + object marker (`Foo(params) を behavior`).
 */
function parseBehaviorBlock(
  input: string,
  language: string,
  tokens: readonly LanguageToken[],
  parsers: BlockParsers,
  keywordIdx: number
): SemanticNode | null {
  const sovFinal = keywordIdx > 0;
  // Behavior name — required PascalCase to avoid false positives. For the
  // SOV verb-final form the name leads the line (index 0); otherwise it follows
  // the keyword, skipping a leading object marker (he `behavior את Foo`, zh
  // `behavior 把 Foo`).
  const nameIdx = sovFinal ? 0 : resolveNameTokenIndex(tokens, keywordIdx, language);
  if (nameIdx < 0) return null;
  const nameToken = tokens[nameIdx];
  const name = nameToken.value;
  if (!PASCAL_CASE_NAME.test(name)) return null;

  const { parameters, headerEnd } = parseHeader(input, nameToken);
  // Body begins after the header for the keyword-led form. For the SOV verb-final
  // form the keyword (and its preceding object marker) sit between the header and
  // the body, so start past the keyword token instead.
  let bodyStart = sovFinal ? keywordIdx + 1 : tokens.findIndex(t => t.position.start >= headerEnd);
  if (bodyStart <= nameIdx) bodyStart = nameIdx + 1;

  const initForms = keywordForms(language, 'init');
  const endForms = keywordForms(language, 'end');
  const forms = openerForms(language);
  const isOpener = (j: number): boolean => opensBlock(tokens, j, forms);
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);
  // Where the handler after an `init` with no `end` starts: the same heads the
  // top-level split reads (handlerStartAt), in every word order.
  const heads = handlerHeads(language);
  const thenForms = keywordForms(language, 'then');
  const endsClause = (t: LanguageToken): boolean => isEnd(t) || tokenMatches(t, thenForms);

  /** Parse the `init` segment `tokens[segStart] … tokens[stop - 1]` into initCommands. */
  const takeInit = (stop: number): void => {
    const initText = input.slice(tokens[segStart].position.end, tokens[stop].position.start).trim();
    if (!initText) return;
    try {
      const stmts = flattenStatements(parsers.body(initText, language));
      initCommands.push(...stmts);
      confidences.push(meanConfidence(stmts.map(s => s.metadata?.confidence ?? 0.75)));
    } catch {
      confidences.push(0);
    }
  };

  // Split the body into sub-blocks by depth-aware `end` matching. Segmentation is
  // END-delimited, not opener-prefixed: a sub-block runs until the `end` that
  // returns depth to 0. Works for SVO (handler starts with `on`), SOV (handler
  // starts with the event), and VSO alike. The behavior's own closing `end` is the
  // one reached while depth is already 0 with no content accumulated.
  const eventHandlers: EventHandlerSemanticNode[] = [];
  const initCommands: SemanticNode[] = [];
  const confidences: number[] = [];
  let sawClosingEnd = false;
  // A handler started at a head that may be a destination (handlerStartAt).
  let unsure = false;

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
        takeInit(j);
        segStart = j + 1;
        continue;
      }
      const handlerText = input.slice(tokens[segStart].position.start, tok.position.start).trim();
      // A handler's own `end` is optional, as upstream's is: its command list
      // ends at the next feature. So `on click add .a on keyup log 1 end` is two
      // handlers this split reads as one segment, and parsing it as one handler
      // failed the whole behavior (English wrote `behavior F then add .a then
      // log 1`). The top-level splitter finds the boundary, and declines unless
      // every piece is a handler with a body.
      const chain = splitProgram(handlerText, language, parsers);
      if (chain) {
        if (chain.unsure) unsure = true;
        for (const handler of chain.node.statements as EventHandlerSemanticNode[]) {
          eventHandlers.push(handler);
          confidences.push(handler.metadata?.confidence ?? 0.75);
        }
      } else {
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
    } else if (isOpener(j)) {
      depth++;
    } else if (depth === 0 && tokenMatches(tokens[segStart], initForms)) {
      // `init`'s command list ends at the next feature, as upstream's does: its
      // own `end` is optional. So in `init if no h set h to me end on pointerdown
      // … end`, the `end` belongs to the one-line `if`, and the end split read
      // it as init's: the handler's header and body became init commands
      // (behavior-draggable lost its whole `on pointerdown(…) from dragHandle`).
      const start = handlerStartAt(tokens, j, segStart, language, heads, thenForms, endsClause);
      if (!start) continue;
      if (!start.certain) unsure = true;
      takeInit(start.at);
      segStart = start.at;
    }
  }

  if (eventHandlers.length === 0 && initCommands.length === 0) return null;

  const mean = (sawClosingEnd ? 1 : 0.8) * meanConfidence(confidences);
  const confidence = unsure ? Math.min(mean, UNSURE_SPLIT_CONFIDENCE) : mean;
  return createBehaviorNode(
    name,
    parameters,
    eventHandlers,
    initCommands.length > 0 ? initCommands : undefined,
    { sourceLanguage: language, confidence, sourceText: input }
  );
}

/**
 * Parse a `def name(params) … end` block into a DefSemanticNode.
 *
 * `keywordIdx` is the token index of the `def` keyword: 0 for the keyword-led form,
 * or > 0 for the SOV verb-final form where it is reordered after the name + its
 * object marker (`add(a, b) を def`) — mirroring `parseBehaviorBlock`.
 */
function parseDefBlock(
  input: string,
  language: string,
  tokens: readonly LanguageToken[],
  parsers: BlockParsers,
  keywordIdx: number
): SemanticNode | null {
  const sovFinal = keywordIdx > 0;
  // Function name — any identifier (optionally namespaced, e.g. `utils.calc`).
  // The SOV verb-final form leads with the name; otherwise it follows the keyword,
  // skipping a leading object marker (he `def את foo`, zh `def 把 foo`).
  const nameIdx = sovFinal ? 0 : resolveNameTokenIndex(tokens, keywordIdx, language);
  if (nameIdx < 0) return null;
  const nameToken = tokens[nameIdx];
  const name = nameToken.value;
  if (!DEF_NAME.test(name)) return null;

  const { parameters, headerEnd } = parseHeader(input, nameToken);
  // Body begins after the header for the keyword-led form. For the SOV verb-final
  // form the keyword (and its preceding object marker) sit between the header and
  // the body, so start past the keyword token instead.
  let bodyStart = sovFinal ? keywordIdx + 1 : tokens.findIndex(t => t.position.start >= headerEnd);
  if (bodyStart <= nameIdx) bodyStart = nameIdx + 1;

  const endForms = keywordForms(language, 'end');
  const forms = openerForms(language);
  const isOpener = (j: number): boolean => opensBlock(tokens, j, forms);
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
    } else if (isOpener(j)) {
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

// =============================================================================
// Feature blocks (`live` / `eventsource` / `socket` / `intercept`)
// =============================================================================

/**
 * Feature actions handled by {@link tryParseFeatureBlock}.
 *
 * Each declares `roles: []` + `bareKeyword: true` in its command schema, so the
 * generated pattern is a lone keyword literal. Without this layer they match
 * that pattern at Stage 2 and their entire body is dropped — at a *vacuous*
 * confidence 1.0, because `scoreRoleCoverage` returns 1 when a pattern declares
 * no roles.
 *
 * Each body family is handled differently — see {@link parseFeatureBlock}.
 */
const FEATURE_ACTIONS = ['live', 'eventsource', 'socket', 'worker', 'intercept'] as const;

/** Features whose body is a configuration DSL rather than hyperscript commands. */
const OPAQUE_BODY_FEATURES: ReadonlySet<string> = new Set(['intercept']);

/** Features that declare a PascalCase name adjacent to the keyword. */
const NAMED_FEATURES: ReadonlySet<string> = new Set(['eventsource', 'socket', 'worker']);

/** Features whose body is a sequence of `on <event> … end` handler blocks. */
const HANDLER_BODY_FEATURES: ReadonlySet<string> = new Set(['eventsource', 'socket']);

/** Features whose body is a sequence of `def name(params) … end` sub-blocks. */
const DEF_BODY_FEATURES: ReadonlySet<string> = new Set(['worker']);

/**
 * How far into the token stream an SOV verb-final feature keyword can sit. The
 * longest real head is Quechua's `ChatStream ta /events manta eventsource`
 * (keyword at index 4) — the source clause precedes the verb there, whereas
 * ja/ko/hi/bn/tr place it after (`ChatStream を eventsource /events から`, index
 * 2). Bounding the scan keeps an incidental body-level keyword from being read
 * as a block head.
 */
const SOV_KEYWORD_SEARCH_LIMIT = 6;

/** `intercept`'s SOV head is just `<scope> <marker>` (`/ を intercept`). */
const INTERCEPT_SOV_KEYWORD_LIMIT = 2;

/**
 * Locate the feature keyword and identify which feature it opens, or null.
 *
 * Keyword-initial in SVO/VSO/V2 (`eventsource ChatStream …`, ar `مقبس …`, zh
 * `socket 把 …`). SOV reorders the verb after its head, so the keyword lands past
 * index 0 — gated on an SOV profile plus (for named features) a PascalCase name
 * leading the line, mirroring the `behavior` verb-final guard.
 */
function locateFeatureKeyword(
  tokens: readonly LanguageToken[],
  language: string
): { action: FeatureAction; keywordIdx: number } | null {
  for (const action of FEATURE_ACTIONS) {
    if (tokenMatches(tokens[0], keywordForms(language, action))) {
      return { action, keywordIdx: 0 };
    }
  }

  if (tryGetProfile(language)?.wordOrder !== 'SOV') return null;

  const limit = Math.min(tokens.length, SOV_KEYWORD_SEARCH_LIMIT);
  for (let i = 1; i < limit; i++) {
    for (const action of FEATURE_ACTIONS) {
      // `live` leads its block in every language (ja ライブ, ko 라이브, tr canlı):
      // it has no head to reorder around, so it never goes verb-final.
      if (action === 'live') continue;
      if (!tokenMatches(tokens[i], keywordForms(language, action))) continue;
      if (NAMED_FEATURES.has(action) && !PASCAL_CASE_NAME.test(tokens[0].value)) continue;
      if (action === 'intercept' && i > INTERCEPT_SOV_KEYWORD_LIMIT) continue;
      return { action, keywordIdx: i };
    }
  }
  return null;
}

/**
 * Length of an optional `from <url>` source clause at `i` — 2 tokens whether the
 * language marks it prepositionally (en `from /events`, zh `从 /events`) or
 * postpositionally (ja `/events から`, ko `/events 에서`), 0 when absent
 * (`eventsource Name on message …`, or qu where the clause precedes the verb and
 * has already been consumed by the keyword scan).
 */
function sourceClauseLength(tokens: readonly LanguageToken[], i: number, language: string): number {
  const forms = markerSurfaceForms(tryGetProfile(language)?.roleMarkers?.source);
  if (forms.size === 0 || i + 1 >= tokens.length) return 0;
  if (tokenMatches(tokens[i], forms)) return 2; // <marker> <url>
  if (tokenMatches(tokens[i + 1], forms)) return 2; // <url> <marker>
  return 0;
}

/**
 * Every surface a handler inside a feature block can OPEN with, in this language.
 *
 * `keywords.on` alone is too narrow, because it is not where the renderer gets
 * the head word: `findBestPattern` picks the language's own event-handler
 * pattern, and in de/fr/id/qu that is the temporal conjunction (`wenn`, `quand`,
 * `ketika`, `maykama` — all normalized to `when`), while zh emits the
 * correlative `一 … 就`. A head the scan does not recognize is not a parse
 * error: the body simply comes back EMPTY, so `eventsource`/`socket` blocks lost
 * their whole handler in silence in six languages.
 *
 * The profile's own `eventHandler` block is the authority for these — its
 * `eventMarker` and `temporalMarkers` are the surfaces the generated and
 * handcrafted handler patterns are built from — plus the normalized `when`,
 * which is how the four conjunction languages tokenize.
 */
function eventHandlerHeadForms(language: string): Set<string> {
  const forms = keywordForms(language, 'on');
  forms.add('when');
  const eventHandler = tryGetProfile(language)?.eventHandler;
  if (eventHandler?.keyword) {
    forms.add(eventHandler.keyword.primary.toLowerCase());
    for (const alt of eventHandler.keyword.alternatives ?? []) forms.add(alt.toLowerCase());
  }
  for (const marker of eventHandler?.temporalMarkers ?? []) forms.add(marker.toLowerCase());
  return forms;
}

/**
 * Length, in tokens, of a MULTI-WORD handler head form whose last word is at
 * `endIdx` — ko's `할 때`, and any other phrase a profile declares.
 *
 * `eventHandlerHeadForms` is a set of whole strings matched one token at a time,
 * so a two-word phrase only ever matches on its LAST word. That is enough to
 * FIND the head, and not enough to know where it starts: the single-token
 * postpositional rule then claims the phrase's first word (`할`) as the event.
 * Returns 1 when nothing multi-word matches, so the caller's arithmetic is
 * unchanged for every language that has no such phrase.
 */
function multiWordHeadFormLength(
  tokens: readonly LanguageToken[],
  endIdx: number,
  language: string
): number {
  const eventHandler = tryGetProfile(language)?.eventHandler;
  const phrases = [
    eventHandler?.eventMarker?.primary,
    ...(eventHandler?.eventMarker?.alternatives ?? []),
    ...(eventHandler?.temporalMarkers ?? []),
  ].filter((p): p is string => !!p && /\s/.test(p));

  let best = 1;
  for (const phrase of phrases) {
    const words = phrase.toLowerCase().split(/\s+/);
    const start = endIdx - words.length + 1;
    if (start < 0) continue;
    if (words.every((w, k) => tokens[start + k]?.value.toLowerCase() === w)) {
      best = Math.max(best, words.length);
    }
  }
  return best;
}

/**
 * Token index where the feature's body begins, or -1 when the head is malformed.
 * `blockEnd` bounds the head scan (-1 when the block is unterminated).
 *
 * The two word-order families need different rules, because the handler trigger
 * marker sits on opposite sides of its event:
 *
 * - **Keyword-led** (SVO/VSO/V2) — the marker is PREPOSITIONAL, so the head ends
 *   at the first `<on-marker> <event>` pair. Scan for it rather than counting head
 *   tokens: a url is not one token (`ws://localhost:8080` lexes as `ws` `:`
 *   `//localhost:8080`), so arithmetic lands mid-url. A head with no such pair is
 *   a handler-less feature (`socket Name url end`) whose body starts at its `end`.
 * - **SOV verb-final** — the marker is POSTPOSITIONAL (`message で`), so the same
 *   forward scan would overshoot the event by one. The head is bounded by the verb
 *   instead: everything up to the keyword, plus `eventsource`'s source clause where
 *   the transformer places it after the verb (`… eventsource /events から`).
 *
 * `worker` sits outside both: its head is just `<kw> <Name>` (no url, no trigger),
 * and its body opens with `def`, so the on-marker scan would run to the block's
 * `end` and report an empty body.
 */
function featureBodyStart(
  action: FeatureAction,
  tokens: readonly LanguageToken[],
  keywordIdx: number,
  language: string,
  blockEnd: number
): number {
  if (action === 'live') return keywordIdx + 1;

  if (keywordIdx > 0) {
    // SOV verb-final.
    let i = keywordIdx + 1;
    if (action === 'eventsource') i += sourceClauseLength(tokens, i, language);
    return i;
  }

  const nameIdx = resolveNameTokenIndex(tokens, keywordIdx, language);
  if (nameIdx < 0) return -1;
  if (action === 'worker') return nameIdx + 1;

  const onForms = eventHandlerHeadForms(language);
  const eventForms = markerSurfaceForms(tryGetProfile(language)?.roleMarkers?.event);
  const limit = blockEnd >= 0 ? blockEnd : tokens.length;
  for (let j = nameIdx + 1; j < limit; j++) {
    if (!tokenMatches(tokens[j], onForms)) continue;
    // Prepositional: `<on> <event>` (en `on message`, de `wenn message`).
    if (looksLikeEvent(tokens[j + 1])) return j;
    // Postpositional with a separate EVENT-role marker between the two
    // (ko `message 을 에`, the SOV trigger signature). Checked BEFORE the plain
    // postpositional case: a bare particle satisfies `looksLikeEvent`, so the
    // shorter rule would otherwise claim the marker itself as the event.
    if (
      j > nameIdx + 2 &&
      eventForms.size > 0 &&
      tokenMatches(tokens[j - 1], eventForms) &&
      looksLikeEvent(tokens[j - 2])
    ) {
      return j - 2;
    }
    // Postpositional MULTI-WORD marker: ko `message 할 때`. Checked before the
    // single-token rule, which would otherwise claim the phrase's own first word
    // (`할`) as the event — a bare identifier satisfies `looksLikeEvent`.
    const phraseLen = multiWordHeadFormLength(tokens, j, language);
    if (phraseLen > 1 && j - phraseLen > nameIdx && looksLikeEvent(tokens[j - phraseLen])) {
      return j - phraseLen;
    }
    // Postpositional: `<event> <on>` (hi `message पर`, bn `message তে`).
    if (j > nameIdx + 1 && looksLikeEvent(tokens[j - 1])) return j - 1;
  }
  return limit;
}

/** The feature's declared name, or undefined for the unnamed features. */
function featureName(
  action: FeatureAction,
  tokens: readonly LanguageToken[],
  keywordIdx: number,
  language: string
): string | undefined {
  if (!NAMED_FEATURES.has(action)) return undefined;
  const nameIdx = keywordIdx > 0 ? 0 : resolveNameTokenIndex(tokens, keywordIdx, language);
  if (nameIdx < 0) return undefined;
  return tokens[nameIdx].value;
}

/**
 * Attempt to parse `input` as a feature block (`live`/`eventsource`/`socket`/
 * `intercept`). Returns null (fast) for anything else so the caller falls through
 * to the ordinary parse stages unchanged.
 *
 * Called from Stage 0 *after* {@link tryParseBlock}, so a `behavior`/`def` block
 * whose body happens to contain a feature keyword is still claimed by the
 * behavior layer.
 */
export function tryParseFeatureBlock(
  input: string,
  language: string,
  parsers: BlockParsers
): SemanticNode | null {
  if (!tryGetProfile(language)) return null;

  // Cheap pre-guard: skip the tokenize on the overwhelming majority of parses.
  // The reactive `when` is gated on its `changes` word, not its head word: the
  // head is the corpus-hot handler connective in several languages.
  const lower = input.toLowerCase();
  let might = false;
  for (const action of [...FEATURE_ACTIONS, 'changes']) {
    for (const form of keywordForms(language, action)) {
      if (form && lower.includes(form)) {
        might = true;
        break;
      }
    }
    if (might) break;
  }
  if (!might) return null;

  const tokens = tokenize(input, language).tokens as readonly LanguageToken[];
  if (tokens.length < 2) return null;

  const changesIdx = locateReactiveWhenHead(tokens, language);
  if (changesIdx >= 0) {
    return parseReactiveWhenBlock(input, language, tokens, parsers, changesIdx);
  }

  const located = locateFeatureKeyword(tokens, language);
  if (!located) return null;

  return parseFeatureBlock(input, language, tokens, parsers, located.action, located.keywordIdx);
}

/**
 * Parse a located feature block into a {@link FeatureSemanticNode}.
 *
 * Body handling is per-family:
 * - **opaque** (`intercept`) — consumed up to its closing `end` and left
 *   unparsed. Its body is a config DSL (`precache …`, `on /api/* use
 *   network-first`, `offline fallback …`), not commands: parsing it would mint a
 *   phantom `on` event-handler and junk `use` actions in every language.
 * - **handler bodies** (`eventsource`, `socket`) — segmented at depth-0 `end`s and
 *   each segment parsed as an event handler, exactly as `parseBehaviorBlock` does.
 * - **command bodies** (`live`) — the whole region parsed as a flat statement list.
 */
function parseFeatureBlock(
  input: string,
  language: string,
  tokens: readonly LanguageToken[],
  parsers: BlockParsers,
  action: FeatureAction,
  keywordIdx: number
): SemanticNode | null {
  const endForms = keywordForms(language, 'end');
  const forms = openerForms(language);
  const isOpener = (j: number): boolean => opensBlock(tokens, j, forms);
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);

  const name = featureName(action, tokens, keywordIdx, language);
  if (NAMED_FEATURES.has(action) && (!name || !PASCAL_CASE_NAME.test(name))) return null;

  const meta = (confidence: number): Parameters<typeof createFeatureNode>[3] => ({
    sourceLanguage: language,
    confidence,
    sourceText: input,
  });

  const blockEnd = findBlockEnd(tokens, keywordIdx + 1, isEnd, isOpener);

  if (OPAQUE_BODY_FEATURES.has(action)) {
    // Content after the closing `end` means this is not a self-contained feature
    // block (a mangled single-line translation strands the terminator mid-stream).
    // Bail rather than consume it and silently drop the remainder.
    if (blockEnd >= 0 && blockEnd !== tokens.length - 1) return null;
    return createFeatureNode(action, [], name, meta(blockEnd >= 0 ? 1 : 0.8));
  }

  const bodyStart = featureBodyStart(action, tokens, keywordIdx, language, blockEnd);
  if (bodyStart < 0 || bodyStart > tokens.length) return null;

  const children: SemanticNode[] = [];
  const confidences: number[] = [];
  let sawClosingEnd = false;

  const isDefBody = DEF_BODY_FEATURES.has(action);
  if (isDefBody || HANDLER_BODY_FEATURES.has(action)) {
    // Segment the body END-delimited, as parseBehaviorBlock does. `eventsource`
    // closes each handler with its own `end` plus a final one for the feature;
    // `socket`'s single `end` closes both. Treating any depth-0 `end` as "the body
    // was properly terminated" covers both without an off-by-one confidence penalty.
    //
    // A `def` sub-block owns its `end` (`parseDefBlock` looks for it and applies a
    // ×0.8 penalty when missing), so its segment must be sliced THROUGH the
    // terminator; a handler's `on …` pattern must not see one.
    const expectedKind = isDefBody ? 'def' : 'event-handler';
    let depth = 0;
    let segStart = bodyStart;
    for (let j = bodyStart; j < tokens.length; j++) {
      const tok = tokens[j];
      if (isEnd(tok)) {
        if (depth > 0) {
          depth--; // closes a nested if/repeat inside the current segment
          continue;
        }
        sawClosingEnd = true;
        if (j === segStart) break; // the feature's own closing `end`
        const segEnd = isDefBody ? tok.position.end : tok.position.start;
        const segText = input.slice(tokens[segStart].position.start, segEnd).trim();
        try {
          const parsed = parsers.statement(segText, language);
          if (parsed && parsed.kind === expectedKind) {
            const child = parsed as EventHandlerSemanticNode | DefSemanticNode;
            children.push(child);
            // An empty sub-block body means the sub-parse silently dropped the
            // commands — don't inherit its misleadingly high confidence.
            const bodyEmpty = !child.body || child.body.length === 0;
            confidences.push(bodyEmpty ? 0.2 : (child.metadata?.confidence ?? 0.75));
          } else {
            confidences.push(0); // parsed, but wrong kind — structural miss
          }
        } catch {
          confidences.push(0);
        }
        segStart = j + 1;
      } else if (isOpener(j)) {
        depth++;
      }
    }
  } else {
    // `live`: a flat command sequence up to the matching depth-0 `end`.
    const endIdx = findBlockEnd(tokens, bodyStart, isEnd, isOpener);
    sawClosingEnd = endIdx >= 0;
    const bodyEnd = endIdx >= 0 ? tokens[endIdx].position.start : input.length;
    const bodyText = input.slice(tokens[bodyStart].position.start, bodyEnd).trim();
    if (!bodyText) return null;
    try {
      children.push(...flattenStatements(parsers.body(bodyText, language)));
    } catch {
      return null;
    }
    if (children.length === 0) return null; // a `live` block with no body is meaningless
    confidences.push(...children.map(c => c.metadata?.confidence ?? 0.75));
  }

  // A handler-less `socket Name url end` / `eventsource Name end` is legal — an
  // empty body is only a structural miss when nothing terminated the block either.
  if (children.length === 0 && !sawClosingEnd) return null;

  const base = sawClosingEnd ? 1 : 0.8;
  const confidence = confidences.length > 0 ? base * meanConfidence(confidences) : base;
  const source = featureSource(action, input, tokens, keywordIdx, bodyStart, language);
  return createFeatureNode(
    action,
    children,
    name,
    meta(confidence),
    source ? new Map([['source', source]]) : undefined
  );
}

/**
 * The URL a feature header names: `eventsource Name from /events`, `socket Name
 * ws://localhost:8080`. featureBodyStart skips to the first handler, and nothing
 * kept what it skipped, so the URL was lost in every language. It is the text
 * between the name and the body, less eventsource's source marker (before the
 * URL, or after it where the language's marker follows its noun), sliced from
 * the input: the tokenizers split `ws://…` at its colons. Head-first headers
 * only, the order every render writes.
 */
function featureSource(
  action: FeatureAction,
  input: string,
  tokens: readonly LanguageToken[],
  keywordIdx: number,
  bodyStart: number,
  language: string
): SemanticValue | undefined {
  if ((action !== 'eventsource' && action !== 'socket') || keywordIdx !== 0) return undefined;
  const nameIdx = resolveNameTokenIndex(tokens, keywordIdx, language);
  if (nameIdx < 0) return undefined;
  let first = nameIdx + 1;
  let last = Math.min(bodyStart, tokens.length) - 1;
  if (action === 'eventsource') {
    const forms = markerSurfaceForms(tryGetProfile(language)?.roleMarkers?.source);
    const isMarker = (t: LanguageToken | undefined) =>
      !!t && (tokenMatches(t, forms) || (t.normalized ?? '').toLowerCase() === 'source');
    if (isMarker(tokens[first])) first++;
    else if (isMarker(tokens[last])) last--;
  }
  if (first > last) return undefined;
  const raw = input.slice(tokens[first].position.start, tokens[last].position.end).trim();
  return raw ? ({ type: 'expression', raw } as SemanticValue) : undefined;
}

// =============================================================================
// Reactive `when <expr> changes … end` blocks
// =============================================================================

/**
 * Command verbs and clause connectives, by NORMALIZED form. A would-be watched
 * expression that contains one of these is not a reactive head — it is a
 * handler body that happens to contain a `changes` word later on
 * (`on click set x to changes`), and must fall through untouched.
 */
const WATCHED_EXPRESSION_STOP_WORDS: ReadonlySet<string> = new Set([
  ...Object.keys(commandSchemas),
  'then',
  'else',
]);

/**
 * Every surface a reactive `when` can OPEN with in this language.
 *
 * The profile's `when` keyword alone is not enough: the corpus rows were
 * written by the i18n transformer from its OWN dictionary's when-word, which in
 * ar/ja/ms/th/tl/vi/zh is the language's handler-opener connective and
 * tokenizes as `on` (ja `時`, zh `当`, vi `khi`, …). That is exactly the set
 * {@link eventHandlerHeadForms} already computes for the feature-body scan, so
 * reuse it. Accepting a handler opener here is safe because the head is
 * DISCRIMINATED by its `changes` word, never by its first token — see
 * {@link locateReactiveWhenHead}.
 */
function reactiveWhenHeadForms(language: string): Set<string> {
  const forms = keywordForms(language, 'when');
  for (const form of eventHandlerHeadForms(language)) forms.add(form);
  return forms;
}

/**
 * Locate a reactive-`when` head — `<when-word> <expr…> <changes-word>` — and
 * return the index of its `changes` token, or -1.
 *
 * WHY THIS EXISTS. `when <expr> [or <expr>]* changes <body> [end]` is canonical
 * _hyperscript (0.9.93 verified): `or` is the only separator, `changes` is a
 * REQUIRED literal, `end` optional. Before this layer nothing modelled it. The
 * temporal `when {event} {body}` handler patterns (`event-en-when` and its 8
 * translations) claimed it instead and kept the FIRST token as the event:
 *
 *   when $firstName or $lastName changes put … end  -> on { event: $firstName }
 *   when (#price's value * #qty's value) changes …  -> on { event: "(" }
 *
 * — the rest of the watched expression and the `changes` word silently gone,
 * in English first. Because all 24 languages are scored against the English
 * reference, every translation then scored CLEAN by reproducing that
 * truncation.
 *
 * The `changes` literal is the discriminator, in both directions: a `when` head
 * with no `changes` word is the temporal handler (untouched here), and a head
 * whose expression span contains a command verb or clause connective is a
 * handler body that merely mentions the word (`on click set x to changes`).
 * String literals never count as the word (`put "changes" into me`), nor does
 * anything after an `end`. Matched by SURFACE as well as by normalized form,
 * because in several languages the dictionary's changes-word also reads as the
 * `change` event (id/ms `berubah`, vi `thay đổi`, fr `change`). A normalized
 * form counts only when it is `changes` itself: fr's `change` event is
 * `changement`, normalized `change`, which is fr's spelling of `changes`, so
 * `quand clic repeat jusquà événement changement …` read as a reactive head
 * (was OPEN_ITEMS P50).
 */
function locateReactiveWhenHead(tokens: readonly LanguageToken[], language: string): number {
  if (tokens.length < 3) return -1;
  if (!tokenMatches(tokens[0], reactiveWhenHeadForms(language))) return -1;
  const changesForms = keywordForms(language, 'changes');
  const isChangesWord = (tok: LanguageToken): boolean =>
    changesForms.has(tok.value.toLowerCase()) || tok.normalized?.toLowerCase() === 'changes';
  const endForms = keywordForms(language, 'end');
  // From index 2: the watched expression is never empty (`when changes …` is
  // not a reactive head).
  for (let j = 2; j < tokens.length; j++) {
    const tok = tokens[j];
    if (tok.kind === 'literal') continue;
    if (isChangesWord(tok)) return j;
    if (tokenMatches(tok, endForms)) return -1;
    const norm = (tok.normalized ?? tok.value).toLowerCase();
    if (tok.kind === 'keyword' && WATCHED_EXPRESSION_STOP_WORDS.has(norm)) return -1;
  }
  return -1;
}

/**
 * The watched expression as a `condition` value.
 *
 * English source is kept BYTE-FAITHFUL by slicing the input between the head
 * word and the `changes` word: `raw` is what the core runtime evaluates. Every
 * other language is re-joined from the tokens' NORMALIZED forms (the same seam
 * the conditional fold uses) — the or-conjunction normalized by surface where
 * the tokenizer leaves it a bare identifier (de `oder`, fr `ou`), genitives
 * rewritten to English (`#priceの 値` / `valor de #price` → `value of #price`,
 * `#price's wartość` → `#price's value`) — so the head renders back to English
 * the real engine accepts. The decision is by LANGUAGE, not by "did any token
 * normalize": a foreign span of bare particles and nouns (`(#priceর মান * …)`)
 * normalizes nothing and still needs every one of those rewrites.
 */
function watchedExpressionValue(
  input: string,
  span: readonly LanguageToken[],
  language: string
): SemanticValue {
  if (language === 'en') {
    const first = span[0];
    const last = span[span.length - 1];
    return { type: 'expression', raw: input.slice(first.position.start, last.position.end).trim() };
  }
  const normalized = span.map(tok =>
    isOrWordToken(tok, language) ? { ...tok, kind: 'keyword' as const, normalized: 'or' } : tok
  );
  return { type: 'expression', raw: joinExpressionTokens(normalized, tryGetProfile(language)) };
}

/**
 * Parse a located reactive `when` block into a `when` feature node: the
 * watched expression in `roles.condition`, the body (everything after the
 * `changes` word up to the matching depth-0 `end`, or end of input — `end` is
 * optional on the engine) parsed as a flat statement list exactly as `live`'s
 * is. Declines — leaving the previous parse untouched — when the body is
 * empty, unparseable, or when content trails the closing `end` (the block is
 * then not self-contained, and consuming it would drop the remainder).
 */
function parseReactiveWhenBlock(
  input: string,
  language: string,
  tokens: readonly LanguageToken[],
  parsers: BlockParsers,
  changesIdx: number
): SemanticNode | null {
  const endForms = keywordForms(language, 'end');
  const forms = openerForms(language);
  const isOpener = (j: number): boolean => opensBlock(tokens, j, forms);
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);

  const bodyStart = changesIdx + 1;
  if (bodyStart >= tokens.length) return null;
  const endIdx = findBlockEnd(tokens, bodyStart, isEnd, isOpener);
  const sawClosingEnd = endIdx >= 0;
  if (sawClosingEnd && endIdx !== tokens.length - 1) return null;
  const bodyEnd = sawClosingEnd ? tokens[endIdx].position.start : input.length;
  const bodyText = input.slice(tokens[bodyStart].position.start, bodyEnd).trim();
  if (!bodyText) return null;

  let children: SemanticNode[];
  try {
    children = flattenStatements(parsers.body(bodyText, language));
  } catch {
    return null;
  }
  if (children.length === 0) return null;

  const condition = watchedExpressionValue(input, tokens.slice(1, changesIdx), language);
  const base = sawClosingEnd ? 1 : 0.8;
  const confidence = base * meanConfidence(children.map(c => c.metadata?.confidence ?? 0.75));
  return createFeatureNode(
    'when',
    children,
    undefined,
    { sourceLanguage: language, confidence, sourceText: input },
    new Map([['condition', condition]])
  );
}

/**
 * Index of the depth-0 `end` that closes the block starting at `from`, or -1 when
 * the block is unterminated. Nested `if`/`repeat`/… openers raise the depth so
 * their own `end` never terminates the outer block.
 */
function findBlockEnd(
  tokens: readonly LanguageToken[],
  from: number,
  isEnd: (tok: LanguageToken) => boolean,
  isOpener: (j: number) => boolean
): number {
  let depth = 0;
  for (let j = from; j < tokens.length; j++) {
    if (isEnd(tokens[j])) {
      if (depth === 0) return j;
      depth--;
    } else if (isOpener(j)) {
      depth++;
    }
  }
  return -1;
}
