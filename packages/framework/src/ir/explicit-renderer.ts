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
  ConditionalSemanticNode,
  LoopSemanticNode,
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

  // Handle conditional branches (v1.1)
  if (node.kind === 'conditional') {
    const condNode = node as ConditionalSemanticNode;
    if (condNode.thenBranch && condNode.thenBranch.length > 0) {
      const thenParts = condNode.thenBranch.map(n => renderExplicit(n));
      parts.push(`then:${thenParts.join(' ')}`);
    }
    if (condNode.elseBranch && condNode.elseBranch.length > 0) {
      const elseParts = condNode.elseBranch.map(n => renderExplicit(n));
      parts.push(`else:${elseParts.join(' ')}`);
    }
  }

  // Handle loop body and metadata (v1.1)
  if (node.kind === 'loop') {
    const loopNode = node as LoopSemanticNode;
    if (loopNode.loopVariant) {
      parts.push(`loop-variant:${loopNode.loopVariant}`);
    }
    if (loopNode.loopVariable) {
      parts.push(`variable:${loopNode.loopVariable}`);
    }
    if (loopNode.indexVariable) {
      parts.push(`index-variable:${loopNode.indexVariable}`);
    }
    if (loopNode.body && loopNode.body.length > 0) {
      const bodyParts = loopNode.body.map(n => renderExplicit(n));
      parts.push(`loop-body:${bodyParts.join(' ')}`);
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
