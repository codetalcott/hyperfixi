/**
 * Explicit Syntax Renderer
 *
 * Serializes SemanticNode to the universal [command role:value ...] bracket syntax.
 * Zero dependencies beyond core types — no language-specific logic.
 *
 * Also renders annotations (@name(value)) and multi-line documents.
 */

import type {
  SemanticNode,
  SemanticValue,
  CommandSemanticNode,
  CompoundSemanticNode,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  LoopSemanticNode,
  LSEEnvelope,
} from '../core/types';

/**
 * Render a semantic node as explicit bracket syntax.
 *
 * Handles annotations (v1.2) — if the node has annotations, they are
 * prepended as @name or @name(value) before the bracket output.
 *
 * @example
 * ```typescript
 * renderExplicit(node) // "[toggle patient:.active destination:#button]"
 * // With annotations:
 * renderExplicit(annotatedNode) // "@timeout(5s) [fetch source:\"/api/users\"]"
 * ```
 */
export function renderExplicit(node: SemanticNode): string {
  let result: string;

  // Handle compound nodes
  if (node.kind === 'compound') {
    const compoundNode = node as CompoundSemanticNode;
    const renderedStatements = compoundNode.statements.map(stmt => renderExplicit(stmt));
    result = renderedStatements.join(` ${compoundNode.chainType} `);
  } else {
    result = renderBracketCommand(node);
  }

  // Prepend annotations if present
  if (node.annotations && node.annotations.length > 0) {
    const annParts = node.annotations.map(ann =>
      ann.value !== undefined ? `@${ann.name}(${ann.value})` : `@${ann.name}`
    );
    return annParts.join(' ') + ' ' + result;
  }

  return result;
}

/**
 * Render an LSEEnvelope as a multi-line document string.
 *
 * @example
 * ```typescript
 * renderDocument(envelope)
 * // "#!lse 1.2\n[toggle patient:.active]\n[add patient:.highlight]"
 * ```
 */
export function renderDocument(envelope: LSEEnvelope): string {
  const lines: string[] = [];

  // Emit version header if not the default
  if (envelope.lseVersion && envelope.lseVersion !== '1.0') {
    lines.push(`#!lse ${envelope.lseVersion}`);
  }

  // Emit each node on its own line
  for (const node of envelope.nodes) {
    lines.push(renderExplicit(node));
  }

  return lines.join('\n');
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Render a single bracket command (non-compound node).
 */
function renderBracketCommand(node: SemanticNode): string {
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

  // Handle v1.2 command fields (try/catch/finally, async, match)
  if (node.kind === 'command') {
    const cmd = node as CommandSemanticNode;
    if (cmd.body && cmd.body.length > 0) {
      const bodyParts = cmd.body.map(n => renderExplicit(n));
      parts.push(`body:${bodyParts.join(' ')}`);
    }
    if (cmd.catchBranch && cmd.catchBranch.length > 0) {
      const catchParts = cmd.catchBranch.map(n => renderExplicit(n));
      parts.push(`catch:${catchParts.join(' ')}`);
    }
    if (cmd.finallyBranch && cmd.finallyBranch.length > 0) {
      const finallyParts = cmd.finallyBranch.map(n => renderExplicit(n));
      parts.push(`finally:${finallyParts.join(' ')}`);
    }
    if (cmd.asyncVariant) {
      parts.push(`async-variant:${cmd.asyncVariant}`);
    }
    if (cmd.asyncBody && cmd.asyncBody.length > 0) {
      const asyncParts = cmd.asyncBody.map(n => renderExplicit(n));
      parts.push(`async-body:${asyncParts.join(' ')}`);
    }
  }

  return `[${parts.join(' ')}]`;
}

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
