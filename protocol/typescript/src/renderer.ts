import { type SemanticNode, type SemanticValue } from './types';

/** Serializes a SemanticNode as explicit bracket syntax. */
export function renderExplicit(node: SemanticNode): string {
  if (node.kind === 'compound') {
    const parts = (node.statements ?? []).map(renderExplicit);
    const chain = node.chainType ?? 'then';
    return parts.join(` ${chain} `);
  }

  const parts: string[] = [node.action];

  // Sort roles alphabetically for deterministic output
  const roleNames = Object.keys(node.roles).sort();

  for (const role of roleNames) {
    const value = node.roles[role];
    if (value.type === 'flag') {
      const prefix = value.enabled !== false ? '+' : '~';
      parts.push(prefix + value.name);
    } else {
      parts.push(`${role}:${valueToString(value)}`);
    }
  }

  // Event handler body (appended after roles)
  if (node.kind === 'event-handler' && node.body && node.body.length > 0) {
    const bodyStr = node.body.map(renderExplicit).join(' ');
    parts.push(`body:${bodyStr}`);
  }

  // Conditional branches (v1.1)
  if (node.thenBranch && node.thenBranch.length > 0) {
    parts.push(`then:${node.thenBranch.map(renderExplicit).join(' ')}`);
  }
  if (node.elseBranch && node.elseBranch.length > 0) {
    parts.push(`else:${node.elseBranch.map(renderExplicit).join(' ')}`);
  }

  // Loop fields (v1.1)
  if (node.loopVariant) {
    parts.push(`loopVariant:${node.loopVariant}`);
  }
  if (node.loopBody && node.loopBody.length > 0) {
    parts.push(`loop-body:${node.loopBody.map(renderExplicit).join(' ')}`);
  }
  if (node.loopVariable) {
    parts.push(`loopVariable:${JSON.stringify(node.loopVariable)}`);
  }
  if (node.indexVariable) {
    parts.push(`indexVariable:${JSON.stringify(node.indexVariable)}`);
  }

  return `[${parts.join(' ')}]`;
}

/** Converts a SemanticValue to its explicit syntax string form. */
export function valueToString(v: SemanticValue): string {
  switch (v.type) {
    case 'literal': {
      if (v.value === undefined || v.value === null) return '';
      if (typeof v.value === 'boolean') return v.value ? 'true' : 'false';
      if (typeof v.value === 'number') return String(v.value);
      if (typeof v.value === 'string') {
        // String literals are always quoted; other dataTypes (duration) are not
        if (v.dataType === 'string') return JSON.stringify(v.value);
        return v.value;
      }
      return String(v.value);
    }

    case 'selector':
    case 'reference':
      return typeof v.value === 'string' ? v.value : String(v.value ?? '');

    case 'expression':
    case 'property-path':
      return v.raw ?? '';

    case 'flag':
      return v.name ?? '';

    default:
      return v.value !== undefined ? String(v.value) : '';
  }
}
