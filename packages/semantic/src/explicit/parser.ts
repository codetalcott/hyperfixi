/**
 * Explicit Mode Parser
 *
 * Parses the explicit [command role:value ...] syntax.
 * This syntax is universal across all languages and makes
 * semantic roles visible for learning and debugging.
 *
 * Syntax:
 *   [command role1:value1 role2:value2 ...]
 *
 * Examples:
 *   [toggle class:.active target:#button]
 *   [put content:"hello" destination:#output]
 *   [on event:click body:[toggle class:.active]]
 */

import type { SemanticNode, SemanticValue, SemanticRole, ActionType } from '../types';
import {
  createCommandNode,
  createEventHandler,
  createSelector,
  createLiteral,
  createReference,
} from '../types';

// =============================================================================
// Explicit Syntax Parser
// =============================================================================

/**
 * Parse explicit syntax into a semantic node.
 */
export function parseExplicit(input: string): SemanticNode {
  const trimmed = input.trim();

  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    throw new Error('Explicit syntax must be wrapped in brackets: [command role:value ...]');
  }

  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    throw new Error('Empty explicit statement');
  }

  const tokens = tokenizeExplicit(content);
  if (tokens.length === 0) {
    throw new Error('No command specified in explicit statement');
  }

  const command = tokens[0].toLowerCase() as ActionType;
  const roles = new Map<SemanticRole, SemanticValue>();

  // Parse role:value pairs
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const colonIndex = token.indexOf(':');

    if (colonIndex === -1) {
      throw new Error(`Invalid role format: "${token}". Expected role:value`);
    }

    const role = token.slice(0, colonIndex) as SemanticRole;
    const valueStr = token.slice(colonIndex + 1);

    // Handle nested explicit syntax for body
    if (role === ('body' as SemanticRole) && valueStr.startsWith('[')) {
      // Find matching bracket
      const nestedEnd = findMatchingBracket(token, colonIndex + 1);
      const nestedSyntax = token.slice(colonIndex + 1, nestedEnd + 1);
      roles.set(role, { type: 'expression', raw: nestedSyntax });
      continue;
    }

    const value = parseExplicitValue(valueStr);
    roles.set(role, value);
  }

  // Build appropriate node type
  if (command === 'on') {
    const eventValue = roles.get('event');
    if (!eventValue) {
      throw new Error('Event handler requires event role: [on event:click ...]');
    }

    // Parse body if present
    const bodyValue = roles.get('body' as SemanticRole);
    const body: SemanticNode[] = [];
    if (bodyValue && bodyValue.type === 'expression') {
      body.push(parseExplicit(bodyValue.raw));
    }

    roles.delete('body' as SemanticRole);

    return createEventHandler(eventValue, body, undefined, {
      sourceLanguage: 'explicit',
    });
  }

  // Regular command
  const rolesObj: Record<string, SemanticValue> = {};
  for (const [role, value] of roles) {
    rolesObj[role] = value;
  }

  return createCommandNode(command, rolesObj, {
    sourceLanguage: 'explicit',
  });
}

/**
 * Tokenize explicit syntax content (space-separated, respecting quotes and brackets).
 */
function tokenizeExplicit(content: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let bracketDepth = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inString) {
      current += char;
      if (char === stringChar && content[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      current += char;
      continue;
    }

    if (char === '[') {
      bracketDepth++;
      current += char;
      continue;
    }

    if (char === ']') {
      bracketDepth--;
      current += char;
      continue;
    }

    if (char === ' ' && bracketDepth === 0) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse a value string into a SemanticValue.
 */
function parseExplicitValue(valueStr: string): SemanticValue {
  // CSS selector
  if (
    valueStr.startsWith('#') ||
    valueStr.startsWith('.') ||
    valueStr.startsWith('[') ||
    valueStr.startsWith('@') ||
    valueStr.startsWith('*')
  ) {
    return createSelector(valueStr);
  }

  // String literal
  if (valueStr.startsWith('"') || valueStr.startsWith("'")) {
    const inner = valueStr.slice(1, -1);
    return createLiteral(inner, 'string');
  }

  // Boolean
  if (valueStr === 'true') return createLiteral(true, 'boolean');
  if (valueStr === 'false') return createLiteral(false, 'boolean');

  // Reference
  if (['me', 'you', 'it', 'result', 'event', 'target', 'body'].includes(valueStr.toLowerCase())) {
    return createReference(valueStr.toLowerCase() as any);
  }

  // Number (possibly with duration suffix)
  const numMatch = valueStr.match(/^(-?\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const suffix = numMatch[2];
    if (suffix) {
      return createLiteral(valueStr, 'duration');
    }
    return createLiteral(num, 'number');
  }

  // Default to string
  return createLiteral(valueStr, 'string');
}

/**
 * Find the matching closing bracket.
 */
function findMatchingBracket(str: string, start: number): number {
  let depth = 0;

  for (let i = start; i < str.length; i++) {
    if (str[i] === '[') depth++;
    else if (str[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return str.length - 1;
}

/**
 * Check if input is explicit syntax.
 */
export function isExplicitSyntax(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']');
}
