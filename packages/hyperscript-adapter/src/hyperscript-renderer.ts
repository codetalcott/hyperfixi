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

  // Event name
  const event = node.roles.get('event');
  if (event) {
    parts.push(renderValue(event));
  }

  // Event source (from #element)
  const source = node.roles.get('source');
  if (source) {
    parts.push('from', renderValue(source));
  }

  // Body commands
  if (node.body && node.body.length > 0) {
    const bodyParts = node.body.map(renderToHyperscript);
    parts.push(bodyParts.join(' then '));
  }

  return parts.join(' ');
}

function renderCompound(node: CompoundSemanticNode): string {
  const chainWord = node.chainType === 'async' ? 'async' : node.chainType;
  return node.statements.map(renderToHyperscript).join(` ${chainWord} `);
}

function renderCommand(node: SemanticNode): string {
  const syntax = SYNTAX[node.action];

  // Known command: use syntax table
  if (syntax) {
    const parts: string[] = [node.action];
    for (const [role, prep] of syntax) {
      const value = node.roles.get(role as SemanticRole);
      if (!value) continue;
      // Skip implicit "me" destination (default in _hyperscript)
      if (role === 'destination' && value.type === 'reference' && value.value === 'me') continue;
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
