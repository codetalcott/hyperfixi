/**
 * Explicit Syntax Renderer
 *
 * Serializes SemanticNode to the universal [command role:value ...] bracket syntax.
 * Zero dependencies beyond core types — no language-specific logic.
 */

import type {
  SemanticNode,
  SemanticValue,
  CompoundSemanticNode,
  EventHandlerSemanticNode,
} from '../core/types';

/**
 * Render a semantic node as explicit bracket syntax.
 *
 * @example
 * ```typescript
 * renderExplicit(node) // "[toggle patient:.active destination:#button]"
 * ```
 */
export function renderExplicit(node: SemanticNode): string {
  // Handle compound nodes
  if (node.kind === 'compound') {
    const compoundNode = node as CompoundSemanticNode;
    const renderedStatements = compoundNode.statements.map(stmt => renderExplicit(stmt));
    return renderedStatements.join(` ${compoundNode.chainType} `);
  }

  const parts: string[] = [node.action];

  // Add roles
  for (const [role, value] of node.roles) {
    if (value.type === 'flag') {
      parts.push(value.enabled ? `+${value.name}` : `~${value.name}`);
    } else {
      parts.push(`${role}:${valueToString(value)}`);
    }
  }

  // Handle event handler body
  if (node.kind === 'event-handler') {
    const eventNode = node as EventHandlerSemanticNode;
    if (eventNode.body && eventNode.body.length > 0) {
      const bodyParts = eventNode.body.map(n => renderExplicit(n));
      parts.push(`body:${bodyParts.join(' ')}`);
    }
  }

  return `[${parts.join(' ')}]`;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Convert a semantic value to its explicit syntax string form.
 */
function valueToString(value: SemanticValue): string {
  switch (value.type) {
    case 'literal':
      if (typeof value.value === 'string') {
        // Quote strings that contain spaces or are explicitly typed as strings
        if (value.dataType === 'string' || /\s/.test(value.value)) {
          return `"${value.value}"`;
        }
        return value.value;
      }
      return String(value.value);

    case 'selector':
      return value.value;

    case 'reference':
      return value.value;

    case 'property-path':
      return `${valueToString(value.object)}'s ${value.property}`;

    case 'expression':
      return value.raw;

    case 'flag':
      return value.name;
  }
}
