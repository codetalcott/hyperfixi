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
 * handler segments using the SAME end-delimited, trigger-AGNOSTIC technique as
 * {@link parseBehaviorBlock}'s body split: depth counts only nested openers
 * (if/unless/repeat/for/while), the handler trigger is never counted, so it works
 * regardless of how a language surfaces the trigger (`on`, de `wenn`, zh idiom,
 * SOV mid-clause marker). Each segment is parsed by the ordinary single-statement
 * engine and the handlers are re-assembled into a `compound` (which buildAST maps
 * to a core `Program`, so the runtime registers each handler).
 *
 * Returns null (fast) unless it finds ≥2 segments that ALL parse as event
 * handlers — so single handlers, single commands, and conditionals fall straight
 * through to single-statement parsing unchanged.
 *
 * NOTE: the no-`end` feature chain (`on click … on keyup …`, no delimiters) is
 * deliberately NOT split here. Distinguishing a trigger `on` from a target `on`
 * (`toggle .x on me`) needs event-name lookahead and is language-sensitive — a
 * separate follow-up. The end-delimited form is the common, unambiguous case.
 */
export function tryParseProgram(
  input: string,
  language: string,
  parsers: BlockParsers
): SemanticNode | null {
  if (!tryGetProfile(language)) return null;

  // Cheap pre-guard: the end-delimited multi-handler form needs ≥1 `end`
  // keyword. Skip the tokenize for the overwhelming majority of single-statement
  // inputs that contain no `end` form at all. (A substring hit on `end` inside
  // `append`/`send` only costs a tokenize that then yields <2 segments → null.)
  const endForms = keywordForms(language, 'end');
  const lower = input.toLowerCase();
  if (![...endForms].some(f => lower.includes(f))) return null;

  const tokens = tokenize(input, language).tokens as readonly LanguageToken[];
  if (tokens.length < 2) return null;

  const openerSets = OPENER_ACTIONS.map(a => keywordForms(language, a));
  const isOpener = (tok: LanguageToken): boolean => openerSets.some(s => tokenMatches(tok, s));
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);

  // Split into top-level handler segments by depth-aware `end` matching: a `end`
  // at depth > 0 closes a NESTED if/repeat (decrement only); a depth-0 `end`
  // closes a handler segment. A final handler with no trailing `end` is the tail.
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
  // Behavior name — required PascalCase to avoid false positives.
  const nameToken = tokens[1];
  const name = nameToken.value;
  if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) return null;

  const { parameters, headerEnd } = parseHeader(input, nameToken);
  let bodyStart = tokens.findIndex(t => t.position.start >= headerEnd);
  if (bodyStart < 2) bodyStart = 2;

  const initForms = keywordForms(language, 'init');
  const endForms = keywordForms(language, 'end');
  const openerSets = OPENER_ACTIONS.map(a => keywordForms(language, a));
  const isOpener = (tok: LanguageToken): boolean => openerSets.some(s => tokenMatches(tok, s));
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
  const nameToken = tokens[1];
  const name = nameToken.value;
  if (!/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/.test(name)) return null;

  const { parameters, headerEnd } = parseHeader(input, nameToken);
  let bodyStart = tokens.findIndex(t => t.position.start >= headerEnd);
  if (bodyStart < 2) bodyStart = 2;

  const endForms = keywordForms(language, 'end');
  const openerSets = OPENER_ACTIONS.map(a => keywordForms(language, a));
  const isOpener = (tok: LanguageToken): boolean => openerSets.some(s => tokenMatches(tok, s));
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
