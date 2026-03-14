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

import type {
  SemanticNode,
  SemanticValue,
  SemanticRole,
  ActionType,
  LoopVariant,
} from '../core/types';
import {
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createLoopNode,
  createSelector,
  createLiteral,
  createReference,
  createFlag,
} from '../core/types';
import type { Diagnostic } from '../generation/diagnostics';
import type { ParseExplicitOptions } from './types';
import { isValidReference, DEFAULT_REFERENCES } from './references';

/** Structural role names whose bracket-enclosed values may be nested commands. */
export const STRUCTURAL_ROLES = new Set([
  'body',
  'then',
  'else',
  'condition',
  'loop-body',
  'variable',
  'catch', // v1.2: try/catch/finally
  'finally', // v1.2: try/catch/finally
]);

/**
 * Checks whether a bracket-enclosed value is a nested command (vs. an attribute selector).
 * A value starting with `[` is a nested command if the inner content (after stripping
 * outer `[]`) contains at least one ASCII space or `:` at bracket-depth 0.
 */
function isNestedCommand(value: string): boolean {
  const inner = value.slice(1, -1);
  let depth = 0;
  for (const ch of inner) {
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    else if (depth === 0 && (ch === ' ' || ch === ':')) return true;
  }
  return false;
}

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
  const collect = options.collectDiagnostics === true;
  const diagnostics: Diagnostic[] = [];

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
        if (collect) {
          diagnostics.push({
            severity: 'error',
            code: 'EMPTY_FLAG',
            message: `Empty flag name: "${token}"`,
            source: 'schema',
          });
          continue;
        }
        throw new Error(`Empty flag name: "${token}"`);
      }
      if (validRoleNames && !validRoleNames.has(flagName as SemanticRole)) {
        const roleList = [...validRoleNames].join(', ');
        if (collect) {
          diagnostics.push({
            severity: 'error',
            code: 'UNKNOWN_FLAG',
            message: `Unknown flag "${flagName}" for command "${command}"`,
            source: 'schema',
            suggestions: [...validRoleNames].map(r => `+${r}`),
          });
          // Still add the flag so the node is usable
          roles.set(flagName as SemanticRole, createFlag(flagName, enabled));
          continue;
        }
        throw new Error(
          `Unknown flag "${flagName}" for command "${command}". Valid roles: ${roleList}`
        );
      }
      roles.set(flagName as SemanticRole, createFlag(flagName, enabled));
      continue;
    }

    const colonIndex = token.indexOf(':');

    if (colonIndex === -1) {
      if (collect) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_ROLE_FORMAT',
          message: `Invalid role format: "${token}". Expected role:value or +flag`,
          source: 'schema',
        });
        continue;
      }
      throw new Error(`Invalid role format: "${token}". Expected role:value or +flag`);
    }

    const roleName = token.slice(0, colonIndex);

    // Validate role name against schema (skip for structural roles)
    if (
      validRoleNames &&
      !STRUCTURAL_ROLES.has(roleName) &&
      !validRoleNames.has(roleName as SemanticRole)
    ) {
      const roleList = [...validRoleNames].join(', ');
      if (collect) {
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_ROLE',
          message: `Unknown role "${roleName}" for command "${command}"`,
          source: 'schema',
          suggestions: [...validRoleNames],
        });
        // Still parse and add the role so the node is usable
      } else {
        throw new Error(
          `Unknown role "${roleName}" for command "${command}". Valid roles: ${roleList}`
        );
      }
    }

    const role = roleName as SemanticRole;
    const valueStr = token.slice(colonIndex + 1);

    // Handle nested explicit syntax for structural roles (body, then, else, condition, loop-body, variable)
    if (STRUCTURAL_ROLES.has(roleName) && valueStr.startsWith('[') && isNestedCommand(valueStr)) {
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
        if (collect) {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_REQUIRED_ROLE',
            message: `Missing required role "${roleSpec.role}" for command "${command}": ${roleSpec.description}`,
            source: 'schema',
          });
        } else {
          throw new Error(
            `Missing required role "${roleSpec.role}" for command "${command}": ${roleSpec.description}`
          );
        }
      }
    }
  }

  // Helper: attach diagnostics to a node if any were collected
  const attachDiagnostics = (node: SemanticNode): SemanticNode => {
    if (diagnostics.length === 0) return node;
    return { ...node, diagnostics };
  };

  // Build appropriate node type based on action name
  switch (command) {
    case 'on': {
      const eventValue = roles.get('event');
      if (!eventValue) {
        if (collect) {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_EVENT_ROLE',
            message: 'Event handler requires event role: [on event:click ...]',
            source: 'schema',
          });
          // Return a stub event handler with diagnostics
          return attachDiagnostics(
            createEventHandlerNode('on', roles, [], {
              sourceLanguage: 'explicit',
            })
          );
        }
        throw new Error('Event handler requires event role: [on event:click ...]');
      }

      // Parse body if present
      const body = extractStructuralBody(roles, 'body', options);
      roles.delete('body' as SemanticRole);

      return attachDiagnostics(
        createEventHandlerNode('on', roles, body, {
          sourceLanguage: 'explicit',
        })
      );
    }

    case 'if': {
      // Extract structural roles for conditional
      const thenBranch = extractStructuralBody(roles, 'then', options);
      const elseBranch = extractStructuralBody(roles, 'else', options);
      roles.delete('then' as SemanticRole);
      roles.delete('else' as SemanticRole);

      return attachDiagnostics(
        createConditionalNode(
          command,
          roles,
          thenBranch,
          elseBranch.length > 0 ? elseBranch : undefined,
          {
            sourceLanguage: 'explicit',
          }
        )
      );
    }

    case 'repeat': {
      // Extract loop structural roles
      const loopBody = extractStructuralBody(roles, 'loop-body', options);
      const loopVariantValue = roles.get('loop-variant' as SemanticRole);
      const variableValue = roles.get('variable' as SemanticRole);
      const indexVariableValue = roles.get('index-variable' as SemanticRole);

      roles.delete('loop-body' as SemanticRole);
      roles.delete('loop-variant' as SemanticRole);
      roles.delete('variable' as SemanticRole);
      roles.delete('index-variable' as SemanticRole);

      // Determine loop variant: explicit > inferred from roles
      let variant: LoopVariant;
      if (
        loopVariantValue &&
        loopVariantValue.type === 'literal' &&
        typeof loopVariantValue.value === 'string'
      ) {
        variant = loopVariantValue.value as LoopVariant;
      } else if (roles.has('quantity' as SemanticRole)) {
        variant = 'times';
      } else if (roles.has('source' as SemanticRole)) {
        variant = 'for';
      } else if (roles.has('condition' as SemanticRole)) {
        variant = 'while';
      } else {
        variant = 'forever';
      }

      const loopVariable =
        variableValue?.type === 'literal' && typeof variableValue.value === 'string'
          ? variableValue.value
          : variableValue?.type === 'expression'
            ? variableValue.raw
            : undefined;
      const indexVariable =
        indexVariableValue?.type === 'literal' && typeof indexVariableValue.value === 'string'
          ? indexVariableValue.value
          : undefined;

      return attachDiagnostics(
        createLoopNode(command, roles, variant, loopBody, loopVariable, indexVariable, {
          sourceLanguage: 'explicit',
        })
      );
    }

    default:
      return attachDiagnostics(
        createCommandNode(command, roles, {
          sourceLanguage: 'explicit',
        })
      );
  }
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
 * Extract and parse a structural role (body, then, else, loop-body) into SemanticNode[].
 * Returns an empty array if the role is not present.
 */
function extractStructuralBody(
  roles: Map<SemanticRole, SemanticValue>,
  roleName: string,
  options: ParseExplicitOptions
): SemanticNode[] {
  const value = roles.get(roleName as SemanticRole);
  if (!value) return [];
  if (value.type === 'expression') {
    return [parseExplicit(value.raw, options)];
  }
  return [];
}

/**
 * Infer selectorKind from a CSS selector string.
 */
function inferSelectorKind(
  value: string
): 'id' | 'class' | 'attribute' | 'element' | 'complex' | undefined {
  if (!value) return undefined;
  if (value.startsWith('#')) return 'id';
  if (value.startsWith('.')) return 'class';
  if (value.startsWith('[')) return 'attribute';
  if (value.startsWith('<') || value.startsWith('*')) return 'element';
  if (/[>+~ ]/.test(value) && value.length > 1) return 'complex';
  return undefined;
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
function parseExplicitValue(valueStr: string, referenceSet: ReadonlySet<string>): SemanticValue {
  // CSS selector
  if (
    valueStr.startsWith('#') ||
    valueStr.startsWith('.') ||
    valueStr.startsWith('[') ||
    valueStr.startsWith('@') ||
    valueStr.startsWith('*')
  ) {
    return createSelector(valueStr, inferSelectorKind(valueStr));
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

  // Default to untyped string literal (no dataType — avoids spurious quoting on round-trip).
  // Only explicitly-quoted values (handled above) get dataType: 'string'.
  return createLiteral(valueStr);
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
