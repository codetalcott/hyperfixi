/**
 * Explicit Syntax Renderer
 *
 * Serializes SemanticNode to the universal [command role:value ...] bracket syntax.
 * Zero dependencies beyond core types — no language-specific logic.
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
} from '../types';

/**
 * Render a semantic node as explicit bracket syntax.
 *
 * @example
 * ```typescript
 * renderExplicit(node) // "[toggle patient:.active destination:#button]"
 * renderExplicit(annotatedNode) // "@timeout(5s) [fetch source:\"/api/users\"]"
 * ```
 */
export function renderExplicit(node: SemanticNode): string {
  let result: string;

  if (node.kind === 'compound') {
    const compoundNode = node as CompoundSemanticNode;
    result = compoundNode.statements
      .map(stmt => renderExplicit(stmt))
      .join(` ${compoundNode.chainType} `);
  } else {
    result = renderBracketCommand(node);
  }

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
 */
export function renderDocument(envelope: LSEEnvelope): string {
  const lines: string[] = [];
  if (envelope.lseVersion && envelope.lseVersion !== '1.0') {
    lines.push(`#!lse ${envelope.lseVersion}`);
  }
  for (const node of envelope.nodes) {
    lines.push(renderExplicit(node));
  }
  return lines.join('\n');
}

// =============================================================================
// Internal Helpers
// =============================================================================

function renderBracketCommand(node: SemanticNode): string {
  const parts: string[] = [node.action];

  for (const [role, value] of node.roles) {
    if (value.type === 'flag') {
      parts.push(value.enabled ? `+${value.name}` : `~${value.name}`);
    } else {
      parts.push(`${role}:${valueToString(value)}`);
    }
  }

  if (node.kind === 'event-handler') {
    const eventNode = node as EventHandlerSemanticNode;
    if (eventNode.body && eventNode.body.length > 0) {
      parts.push(`body:${eventNode.body.map(n => renderExplicit(n)).join(' ')}`);
    }
  }

  if (node.kind === 'conditional') {
    const condNode = node as ConditionalSemanticNode;
    if (condNode.thenBranch && condNode.thenBranch.length > 0) {
      parts.push(`then:${condNode.thenBranch.map(n => renderExplicit(n)).join(' ')}`);
    }
    if (condNode.elseBranch && condNode.elseBranch.length > 0) {
      parts.push(`else:${condNode.elseBranch.map(n => renderExplicit(n)).join(' ')}`);
    }
  }

  if (node.kind === 'loop') {
    const loopNode = node as LoopSemanticNode;
    if (loopNode.loopVariant) parts.push(`loop-variant:${loopNode.loopVariant}`);
    if (loopNode.loopVariable) parts.push(`variable:${loopNode.loopVariable}`);
    if (loopNode.indexVariable) parts.push(`index-variable:${loopNode.indexVariable}`);
    if (loopNode.body && loopNode.body.length > 0) {
      parts.push(`loop-body:${loopNode.body.map(n => renderExplicit(n)).join(' ')}`);
    }
  }

  if (node.kind === 'command') {
    const cmd = node as CommandSemanticNode;
    if (cmd.body && cmd.body.length > 0)
      parts.push(`body:${cmd.body.map(n => renderExplicit(n)).join(' ')}`);
    if (cmd.catchBranch && cmd.catchBranch.length > 0)
      parts.push(`catch:${cmd.catchBranch.map(n => renderExplicit(n)).join(' ')}`);
    if (cmd.finallyBranch && cmd.finallyBranch.length > 0)
      parts.push(`finally:${cmd.finallyBranch.map(n => renderExplicit(n)).join(' ')}`);
    if (cmd.asyncVariant) parts.push(`async-variant:${cmd.asyncVariant}`);
    if (cmd.asyncBody && cmd.asyncBody.length > 0)
      parts.push(`async-body:${cmd.asyncBody.map(n => renderExplicit(n)).join(' ')}`);
  }

  return `[${parts.join(' ')}]`;
}

function valueToString(value: SemanticValue): string {
  switch (value.type) {
    case 'literal':
      if (typeof value.value === 'string') {
        if (value.dataType === 'string' || /\s/.test(value.value)) return `"${value.value}"`;
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
