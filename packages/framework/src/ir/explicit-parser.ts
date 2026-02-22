/**
 * Explicit Syntax Parser
 *
 * Parses the universal [command role:value ...] bracket syntax.
 * Domain-agnostic — schema validation is injectable via ParseExplicitOptions.
 *
 * Syntax:
 *   [command role1:value1 role2:value2 ...]
 *
 * Examples:
 *   [toggle patient:.active destination:#button]
 *   [put patient:"hello" destination:#output]
 *   [on event:click body:[toggle patient:.active]]
 *   [select patient:name source:users condition:age>25]
 */

import type { SemanticNode, SemanticValue, SemanticRole, ActionType } from '../core/types';
import {
  createCommandNode,
  createEventHandlerNode,
  createSelector,
  createLiteral,
  createReference,
  createFlag,
} from '../core/types';
import type { ParseExplicitOptions } from './types';
import { isValidReference, DEFAULT_REFERENCES } from './references';

// =============================================================================
// Explicit Syntax Parser
// =============================================================================

/**
 * Parse explicit bracket syntax into a semantic node.
 *
 * When `options.schemaLookup` is provided, validates roles against the
 * command's schema. When omitted, accepts any role names.
 */
export function parseExplicit(input: string, options: ParseExplicitOptions = {}): SemanticNode {
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
  const refSet = options.referenceSet ?? DEFAULT_REFERENCES;

  // Look up schema for role validation (undefined = skip validation)
  const schema = options.schemaLookup?.getSchema(command);
  const validRoleNames = schema ? new Set(schema.roles.map(r => r.role)) : null;

  // Parse role:value pairs and flags
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Boolean flag: +flag-name or ~flag-name
    if (token.startsWith('+') || token.startsWith('~')) {
      const enabled = token.startsWith('+');
      const flagName = token.slice(1);
      if (!flagName) {
        throw new Error(`Empty flag name: "${token}"`);
      }
      if (validRoleNames && !validRoleNames.has(flagName as SemanticRole)) {
        const roleList = [...validRoleNames].join(', ');
        throw new Error(
          `Unknown flag "${flagName}" for command "${command}". Valid roles: ${roleList}`
        );
      }
      roles.set(flagName as SemanticRole, createFlag(flagName, enabled));
      continue;
    }

    const colonIndex = token.indexOf(':');

    if (colonIndex === -1) {
      throw new Error(`Invalid role format: "${token}". Expected role:value or +flag`);
    }

    const roleName = token.slice(0, colonIndex);

    // Validate role name against schema (skip for unknown commands or 'body' structural role)
    if (validRoleNames && roleName !== 'body' && !validRoleNames.has(roleName as SemanticRole)) {
      const roleList = [...validRoleNames].join(', ');
      throw new Error(
        `Unknown role "${roleName}" for command "${command}". Valid roles: ${roleList}`
      );
    }

    const role = roleName as SemanticRole;
    const valueStr = token.slice(colonIndex + 1);

    // Handle nested explicit syntax for body
    if (role === ('body' as SemanticRole) && valueStr.startsWith('[')) {
      const nestedEnd = findMatchingBracket(token, colonIndex + 1);
      const nestedSyntax = token.slice(colonIndex + 1, nestedEnd + 1);
      roles.set(role, { type: 'expression', raw: nestedSyntax });
      continue;
    }

    const value = parseExplicitValue(valueStr, refSet);
    roles.set(role, value);
  }

  // Validate required roles are present (skip for event handlers — handled below)
  if (schema && command !== 'on') {
    for (const roleSpec of schema.roles) {
      if (roleSpec.required && !roles.has(roleSpec.role as SemanticRole) && !roleSpec.default) {
        throw new Error(
          `Missing required role "${roleSpec.role}" for command "${command}": ${roleSpec.description}`
        );
      }
    }
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
      body.push(parseExplicit(bodyValue.raw, options));
    }

    roles.delete('body' as SemanticRole);

    return createEventHandlerNode('on', roles, body, {
      sourceLanguage: 'explicit',
    });
  }

  // Regular command
  return createCommandNode(command, roles, {
    sourceLanguage: 'explicit',
  });
}

/**
 * Check if input is explicit bracket syntax.
 */
export function isExplicitSyntax(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']');
}

// =============================================================================
// Internal Helpers
// =============================================================================

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
function parseExplicitValue(valueStr: string, referenceSet: ReadonlySet<string>): SemanticValue {
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
  const lowerRef = valueStr.toLowerCase();
  if (isValidReference(lowerRef, referenceSet)) {
    return createReference(lowerRef);
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
