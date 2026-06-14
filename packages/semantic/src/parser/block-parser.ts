/**
 * Structural / block layer.
 *
 * The single-statement semantic parser cannot parse multi-line BLOCK constructs
 * (`behavior Name(params) … end`): it matches the leading keyword and drops the
 * whole body, returning a degenerate `command` node at confidence 1.0. This module
 * adds the missing layer. It does NOT re-implement statement parsing — it
 * decomposes a block into its sub-blocks (event handlers, init) using the
 * already-translated `behavior`/`on`/`init`/`end` keywords + depth-aware `end`
 * matching, slices each sub-block's ORIGINAL source text by token position (so it
 * works for space-less scripts like ja/zh), and feeds each to the ordinary
 * single-statement engine. The results are re-assembled into a `BehaviorSemanticNode`.
 *
 * See docs-internal/MULTILINGUAL_BEHAVIORS_PLAN.md Phase 3.
 */

import type { LanguageToken, SemanticNode, EventHandlerSemanticNode } from '../types';
import { createBehaviorNode } from '../types';
import { tryGetProfile } from '../registry';
import { tokenize } from '../tokenizers';

/**
 * NESTED block-opening keywords balanced by a matching `end`. Deliberately
 * excludes the handler-level trigger (`on`) and `init`: those are the sub-blocks
 * we are splitting INTO, and the trigger surface form is unreliable across
 * languages (de renders `wenn`/when, zh the `一…就` idiom, SOV puts the marker
 * mid-clause). Only these reliably-keyworded constructs nest inside a handler
 * body, so counting just them keeps the depth tracking trigger-agnostic.
 */
const OPENER_ACTIONS = ['if', 'unless', 'repeat', 'for', 'while'] as const;

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
 * Attempt to parse `input` as a `behavior … end` block. Returns null (fast) when
 * the input is not a behavior block, so the caller falls through to ordinary
 * single-statement parsing.
 *
 * @param parseStatement the single-statement parser (injected to avoid a circular
 *   import with semantic-parser; sub-blocks are parsed through it).
 */
export function tryParseBehaviorBlock(
  input: string,
  language: string,
  parseStatement: (text: string, lang: string) => SemanticNode
): SemanticNode | null {
  const profile = tryGetProfile(language);
  if (!profile) return null;

  // Cheap pre-guard: skip the tokenize on the overwhelming majority of parses
  // (ordinary statements) — only inputs mentioning the `behavior` keyword can be
  // a behavior block.
  const behaviorForms = keywordForms(language, 'behavior');
  const lowerInput = input.toLowerCase();
  if (![...behaviorForms].some(f => lowerInput.includes(f))) return null;

  const stream = tokenize(input, language);
  const tokens = stream.tokens as readonly LanguageToken[];
  if (tokens.length < 2) return null;

  const initForms = keywordForms(language, 'init');
  const endForms = keywordForms(language, 'end');
  const openerSets = OPENER_ACTIONS.map(a => keywordForms(language, a));

  const isOpener = (tok: LanguageToken): boolean => openerSets.some(s => tokenMatches(tok, s));
  const isEnd = (tok: LanguageToken): boolean => tokenMatches(tok, endForms);

  // 1. Must start with the `behavior` keyword.
  if (!tokenMatches(tokens[0], behaviorForms)) return null;

  // 2. Behavior name — the next token, required PascalCase to avoid false positives.
  const nameToken = tokens[1];
  const name = nameToken.value;
  if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) return null;

  // 3. Header: `behavior <Name>` + optional `(params)`. Found by source position
  //    (not by scanning for `on`, which fails in SOV where the handler starts with
  //    the event, e.g. `click を で …`). The body begins after the parameter list.
  const parameters: string[] = [];
  let headerEnd = nameToken.position.end;
  const afterName = input.slice(nameToken.position.end);
  const paren = afterName.match(/^\s*\(([^)]*)\)/);
  if (paren) {
    headerEnd = nameToken.position.end + paren[0].length;
    for (const raw of paren[1].split(/[,،、]/)) {
      const p = raw.trim();
      if (p) parameters.push(p);
    }
  }
  let bodyStart = tokens.findIndex(t => t.position.start >= headerEnd);
  if (bodyStart < 2) bodyStart = 2;

  // 4. Split the body into sub-blocks by depth-aware `end` matching. Segmentation
  //    is END-delimited, not opener-prefixed: a sub-block runs until the `end` that
  //    returns depth to 0. This works for SVO (handler starts with `on`), SOV
  //    (handler starts with the event, `on`-marker mid-clause), and VSO alike. The
  //    behavior's own closing `end` is the one reached while depth is already 0.
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
      // depth === 0: this `end` closes a handler/init sub-block — unless no content
      // has accumulated since the last sub-block, in which case it is the
      // behavior's own closing `end`.
      if (j === segStart) {
        sawClosingEnd = true;
        break;
      }
      const isInitBlock = tokenMatches(tokens[segStart], initForms);
      if (isInitBlock) {
        // Drop the leading `init` keyword; parse the remaining commands.
        const initText = input.slice(tokens[segStart].position.end, tok.position.start).trim();
        if (initText) {
          try {
            const node = parseStatement(initText, language);
            initCommands.push(node);
            confidences.push(node.metadata?.confidence ?? 0.75);
          } catch {
            confidences.push(0);
          }
        }
      } else {
        const handlerText = input.slice(tokens[segStart].position.start, tok.position.start).trim();
        try {
          const parsed = parseStatement(handlerText, language);
          if (parsed && parsed.kind === 'event-handler') {
            const handler = parsed as EventHandlerSemanticNode;
            eventHandlers.push(handler);
            // An empty handler body means the sub-parse silently dropped the
            // commands. Don't inherit its (often misleadingly high) confidence —
            // score it low so the block can't report a false success.
            const bodyEmpty = !handler.body || handler.body.length === 0;
            confidences.push(bodyEmpty ? 0.2 : (handler.metadata?.confidence ?? 0.75));
          } else {
            confidences.push(0); // parsed, but not a handler — structural miss
          }
        } catch {
          confidences.push(0); // sub-block failed to parse
        }
      }
      segStart = j + 1;
    } else if (isOpener(tok)) {
      depth++;
    }
  }

  // Nothing recognizable parsed — not a behavior block we can represent.
  if (eventHandlers.length === 0 && initCommands.length === 0) return null;

  // Confidence reflects how faithfully the sub-blocks parsed — a dropped or failed
  // handler pulls it down, so a partial parse no longer reports a false 1.0.
  const avgConfidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  // A missing closing `end` means the block was malformed/truncated.
  const confidence = sawClosingEnd ? avgConfidence : avgConfidence * 0.8;

  return createBehaviorNode(
    name,
    parameters,
    eventHandlers,
    initCommands.length > 0 ? initCommands : undefined,
    { sourceLanguage: language, confidence, sourceText: input }
  );
}
