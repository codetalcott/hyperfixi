/**
 * Hyperscript English Renderer
 *
 * Purpose-built renderer that converts SemanticNodes to standard English
 * _hyperscript syntax. Unlike the semantic package's renderer (which uses
 * pattern matching and requires English patterns/tokenizer/profile),
 * this is a deterministic mapping — no registry lookups needed.
 *
 * This eliminates ~35 KB of English language data from per-language bundles.
 */

import type {
  SemanticNode,
  SemanticValue,
  SemanticRole,
  EventHandlerSemanticNode,
  CompoundSemanticNode,
} from '@lokascript/semantic/core';

// ---------------------------------------------------------------------------
// Per-command syntax: ordered [role, preposition] tuples.
// Empty string = no preposition (direct object).
//
// Generated from command schemas. Do not edit manually.
// Regenerate with: npm run generate:syntax
// ---------------------------------------------------------------------------

import { SYNTAX } from './generated/syntax-table';
export { SYNTAX };

// ---------------------------------------------------------------------------
// Statement-join rules. Mirrors the semantic package's renderer
// (explicit/renderer.ts) — the slim path has to reach the same English, and a
// chain word in the wrong seam is a hard parse error on the real engine, not a
// style difference.
// ---------------------------------------------------------------------------

/**
 * Block-header commands: their body follows the header DIRECTLY. `repeat 3
 * times then add …` is rejected ("Expected 'end' but found 'then'"), as is
 * `tell #panel then add …`.
 */
const BLOCK_HEADER_ACTIONS = new Set(['repeat', 'for', 'while', 'tell']);

/**
 * Commands whose captured body is an open-ended block that must be closed by an
 * explicit `end` when a sibling follows: `js foo() then add …` otherwise bleeds
 * the following hyperscript into the JavaScript body.
 */
const BLOCK_NEEDS_TRAILING_END = new Set(['js']);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Render a SemanticNode to standard English _hyperscript syntax.
 */
export function renderToHyperscript(node: SemanticNode): string {
  switch (node.kind) {
    case 'event-handler':
      return renderEventHandler(node as EventHandlerSemanticNode);
    case 'compound':
      return renderCompound(node as CompoundSemanticNode);
    default:
      return renderCommand(node);
  }
}

// ---------------------------------------------------------------------------
// Node-kind renderers
// ---------------------------------------------------------------------------

function renderEventHandler(node: EventHandlerSemanticNode): string {
  const parts: string[] = ['on'];

  // Event name. Rendered BARE, never through renderValue: the parser
  // produces the event as a string-typed literal, which renderValue would
  // quote — and `on "click"` is a hard parse error on the real engine
  // ("Expected event name"). Event names are identifiers in canonical
  // hyperscript (`on click`, `on draggable:start`), never quoted strings.
  const event = node.roles.get('event');
  if (event) {
    parts.push(event.type === 'literal' ? String(event.value) : renderValue(event));
  }

  // Event source (from #element)
  const source = node.roles.get('source');
  if (source) {
    parts.push('from', renderValue(source));
  }

  // Body commands. Space-joined, matching the semantic renderer: the chain word
  // between sibling body commands is optional in canonical hyperscript, and
  // joining with ` then ` unconditionally injected one after a block header
  // (`on click tell #panel then add .open` — rejected by the real engine).
  if (node.body && node.body.length > 0) {
    const bodyParts = node.body.map(renderToHyperscript);
    parts.push(bodyParts.join(' '));
  }

  return parts.join(' ');
}

function renderCompound(node: CompoundSemanticNode): string {
  const chainWord = node.chainType === 'async' ? 'async' : node.chainType;
  const rendered = node.statements.map(renderToHyperscript);
  let out = rendered[0] ?? '';
  for (let i = 1; i < rendered.length; i++) {
    const prev = node.statements[i - 1];
    const cur = node.statements[i];
    const afterBlockHeader = prev.kind === 'command' && BLOCK_HEADER_ACTIONS.has(prev.action);
    // Consecutive top-level `bind` features are separate reactive features, not
    // a then-chain: `bind $x to #a then bind $x to #b` is rejected ("Unexpected
    // Token : then" between features).
    const betweenBindFeatures =
      prev.kind === 'command' &&
      prev.action === 'bind' &&
      cur.kind === 'command' &&
      cur.action === 'bind';
    if (prev.kind === 'command' && BLOCK_NEEDS_TRAILING_END.has(prev.action)) {
      out += ' end';
    }
    out += (afterBlockHeader || betweenBindFeatures ? ' ' : ` ${chainWord} `) + rendered[i];
  }
  return out;
}

function renderCommand(node: SemanticNode): string {
  const syntax = SYNTAX[node.action];

  // Known command: use syntax table
  if (syntax) {
    const parts: string[] = [node.action];
    for (const [role, prep] of syntax) {
      const value = node.roles.get(role as SemanticRole);
      if (!value) continue;
      // Skip an implicit "me" destination/source (the default in _hyperscript) —
      // `add .active` not `add .active to me`; `remove .hidden` not `remove .hidden
      // from me`. Mirrors the semantic renderer's implicit-me suppression so the
      // full and slim (custom-renderer) paths agree.
      //
      // KNOWN GAP, deliberately unfixed here: semantic's renderer EXCEPTS a
      // string-content patient (`add "<p>Line</p>" to me` keeps the
      // destination — the bare form is rejected by the engine). Mirroring
      // that exception is correct in isolation, but it may not ship before
      // the generated repeat patterns capture quantity: measured on the
      // parity corpus, the exception alone turns the es `repeat` row's slim
      // output from engine-INVALID (host-validate gate → safe fallback to
      // the author's text) into the engine-VALID `on click repeat add
      // "<p>Line</p>" to me` — a bare `repeat` is FOREVER, so a warned
      // no-op becomes a committed infinite loop. The parity slim test pins
      // that row's output staying invalid until both fixes land together.
      if (
        (role === 'destination' || role === 'source') &&
        value.type === 'reference' &&
        value.value === 'me'
      )
        continue;
      if (prep) parts.push(prep);
      parts.push(renderValue(value));
    }
    return parts.join(' ');
  }

  // Unknown command: generic fallback — action then all roles
  const parts: string[] = [node.action];
  for (const [, value] of node.roles) {
    parts.push(renderValue(value));
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Value renderers
// ---------------------------------------------------------------------------

function renderValue(value: SemanticValue): string {
  switch (value.type) {
    case 'literal':
      if (typeof value.value === 'string' && value.dataType === 'string') {
        return `"${value.value}"`;
      }
      return String(value.value);

    case 'selector':
      return value.value;

    case 'reference':
      return value.value;

    case 'property-path':
      return renderPropertyPath(value);

    case 'expression':
      return value.raw;

    case 'flag':
      return value.enabled ? `+${value.name}` : `~${value.name}`;
  }
}

function renderPropertyPath(value: SemanticValue & { type: 'property-path' }): string {
  const objectStr = renderValue(value.object);
  const property = value.property;

  // English possessive special forms
  if (value.object.type === 'reference') {
    switch (value.object.value) {
      case 'me':
        return `my ${property}`;
      case 'it':
        return `its ${property}`;
      case 'you':
        return `your ${property}`;
    }
  }

  return `${objectStr}'s ${property}`;
}
