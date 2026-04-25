/**
 * Explicit Syntax Parser
 *
 * Parses the universal [command role:value ...] bracket syntax.
 * Domain-agnostic — schema validation is injectable via ParseExplicitOptions.
 *
 * Three parsing levels matching the ABNF grammar:
 *   parseDocument()  → parseCompound()  → parseExplicit()
 *   (multi-line)       (chain ops)         (single bracket)
 */

import type {
  SemanticNode,
  SemanticValue,
  SemanticRole,
  ActionType,
  LoopVariant,
  Annotation,
  LSEEnvelope,
  CompoundSemanticNode,
} from '../types';
import {
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createLoopNode,
  createCompoundNode,
  createSelector,
  createLiteral,
  createReference,
  createFlag,
} from '../types';
import type { Diagnostic } from '../diagnostics';
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
  'catch',
  'finally',
]);

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

  const schema = options.schemaLookup?.getSchema(command);
  // Build a Set for O(1) membership checks across all role tokens in this parse call.
  // For single lookups outside a parse loop, use getRoleSpec() from schema.ts instead.
  const validRoleNames = schema ? new Set(schema.roles.map(r => r.role)) : null;

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

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
        if (collect) {
          diagnostics.push({
            severity: 'error',
            code: 'UNKNOWN_FLAG',
            message: `Unknown flag "${flagName}" for command "${command}"`,
            source: 'schema',
            suggestions: [...validRoleNames].map(r => `+${r}`),
          });
          roles.set(flagName as SemanticRole, createFlag(flagName, enabled));
          continue;
        }
        throw new Error(
          `Unknown flag "${flagName}" for command "${command}". Valid roles: ${[...validRoleNames].join(', ')}`
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

    if (
      validRoleNames &&
      !STRUCTURAL_ROLES.has(roleName) &&
      !validRoleNames.has(roleName as SemanticRole)
    ) {
      if (collect) {
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_ROLE',
          message: `Unknown role "${roleName}" for command "${command}"`,
          source: 'schema',
          suggestions: [...validRoleNames],
        });
      } else {
        throw new Error(
          `Unknown role "${roleName}" for command "${command}". Valid roles: ${[...validRoleNames].join(', ')}`
        );
      }
    }

    const role = roleName as SemanticRole;
    const valueStr = token.slice(colonIndex + 1);

    if (STRUCTURAL_ROLES.has(roleName) && valueStr.startsWith('[') && isNestedCommand(valueStr)) {
      const nestedEnd = findMatchingBracket(token, colonIndex + 1);
      const nestedSyntax = token.slice(colonIndex + 1, nestedEnd + 1);
      roles.set(role, { type: 'expression', raw: nestedSyntax });
      continue;
    }

    const value = parseExplicitValue(valueStr, refSet);
    roles.set(role, value);
  }

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

  const attachDiagnostics = (node: SemanticNode): SemanticNode => {
    if (diagnostics.length === 0) return node;
    return { ...node, diagnostics };
  };

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
          return attachDiagnostics(
            createEventHandlerNode('on', roles, [], { sourceLanguage: 'explicit' })
          );
        }
        throw new Error('Event handler requires event role: [on event:click ...]');
      }
      const body = extractStructuralBody(roles, 'body', options);
      roles.delete('body' as SemanticRole);
      return attachDiagnostics(
        createEventHandlerNode('on', roles, body, { sourceLanguage: 'explicit' })
      );
    }

    case 'if': {
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
          { sourceLanguage: 'explicit' }
        )
      );
    }

    case 'repeat': {
      const loopBody = extractStructuralBody(roles, 'loop-body', options);
      const loopVariantValue = roles.get('loop-variant' as SemanticRole);
      const variableValue = roles.get('variable' as SemanticRole);
      const indexVariableValue = roles.get('index-variable' as SemanticRole);

      roles.delete('loop-body' as SemanticRole);
      roles.delete('loop-variant' as SemanticRole);
      roles.delete('variable' as SemanticRole);
      roles.delete('index-variable' as SemanticRole);

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
      return attachDiagnostics(createCommandNode(command, roles, { sourceLanguage: 'explicit' }));
  }
}

export function isExplicitSyntax(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']');
}

// =============================================================================
// Compound Statement Parsing
// =============================================================================

const CHAIN_KEYWORDS = new Set(['then', 'and', 'async', 'sequential']);

function splitCompoundSegments(input: string): {
  segments: string[];
  chainType: CompoundSemanticNode['chainType'] | null;
} {
  const segments: string[] = [];
  let chainType: CompoundSemanticNode['chainType'] | null = null;
  let current = '';
  let bracketDepth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inString) {
      current += char;
      if (char === stringChar && input[i - 1] !== '\\') inString = false;
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
      if (bracketDepth === 0) {
        const rest = input.slice(i + 1);
        const pipeMatch = rest.match(/^\s*\|>\s*/);
        if (pipeMatch) {
          segments.push(current.trim());
          current = '';
          chainType ??= 'pipe';
          i += pipeMatch[0].length;
          continue;
        }
        const keywordMatch = rest.match(/^\s+(then|and|async|sequential)\s+/);
        if (keywordMatch && CHAIN_KEYWORDS.has(keywordMatch[1])) {
          segments.push(current.trim());
          current = '';
          chainType ??= keywordMatch[1] as CompoundSemanticNode['chainType'];
          i += keywordMatch[0].length;
          continue;
        }
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) segments.push(current.trim());
  return { segments, chainType };
}

export function parseCompound(input: string, options?: ParseExplicitOptions): SemanticNode {
  const trimmed = input.trim();
  const { annotations, remainder } = extractAnnotations(trimmed);
  const { segments, chainType } = splitCompoundSegments(remainder);

  let node: SemanticNode;
  if (segments.length <= 1) {
    node = parseExplicit(segments[0] || remainder, options);
  } else {
    const statements = segments.map(seg => parseExplicit(seg, options));
    node = createCompoundNode(statements, chainType ?? 'sequential');
  }

  if (annotations.length > 0) return { ...node, annotations };
  return node;
}

// =============================================================================
// Annotation Parsing
// =============================================================================

function extractAnnotations(input: string): { annotations: Annotation[]; remainder: string } {
  const annotations: Annotation[] = [];
  let pos = 0;

  while (pos < input.length) {
    while (pos < input.length && (input[pos] === ' ' || input[pos] === '\t')) pos++;
    if (pos >= input.length || input[pos] !== '@') break;

    pos++;
    const nameStart = pos;
    while (pos < input.length && /[A-Za-z0-9\-_]/.test(input[pos])) pos++;
    const name = input.slice(nameStart, pos);
    if (!name) break;

    let value: string | undefined;
    if (pos < input.length && input[pos] === '(') {
      pos++;
      const valueStart = pos;
      if (pos < input.length && (input[pos] === '"' || input[pos] === "'")) {
        const quote = input[pos];
        pos++;
        while (pos < input.length && input[pos] !== quote) {
          if (input[pos] === '\\') pos++;
          pos++;
        }
        pos++;
        value = input.slice(valueStart + 1, pos - 1);
      } else {
        while (pos < input.length && input[pos] !== ')') pos++;
        value = input.slice(valueStart, pos);
      }
      if (pos < input.length && input[pos] === ')') pos++;
    }

    annotations.push(value !== undefined ? { name, value } : { name });
  }

  return { annotations, remainder: input.slice(pos).trim() };
}

// =============================================================================
// Document Parsing
// =============================================================================

const VERSION_HEADER_RE = /^#!lse\s+(\d+\.\d+(?:\.\d+)?)\s*$/;

export function parseDocument(input: string, options?: ParseExplicitOptions): LSEEnvelope {
  const lines = input.split('\n');
  let lseVersion = '1.0';
  const nodes: SemanticNode[] = [];
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    const versionMatch = trimmed.match(VERSION_HEADER_RE);
    if (versionMatch) {
      lseVersion = versionMatch[1];
      startLine = i + 1;
    }
    break;
  }

  for (let i = startLine; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//') || (trimmed.startsWith('#') && !trimmed.startsWith('#!')))
      continue;
    nodes.push(parseCompound(trimmed, options));
  }

  return { lseVersion, nodes };
}

// =============================================================================
// Detection Helpers
// =============================================================================

export function isCompoundSyntax(input: string): boolean {
  const { segments } = splitCompoundSegments(input.trim());
  return segments.length > 1;
}

export function isDocumentSyntax(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.includes('\n')) return true;
  if (VERSION_HEADER_RE.test(trimmed)) return true;
  if (trimmed.startsWith('//') || (trimmed.startsWith('#') && !trimmed.startsWith('#!')))
    return true;
  return false;
}

// =============================================================================
// Internal Helpers
// =============================================================================

function extractStructuralBody(
  roles: Map<SemanticRole, SemanticValue>,
  roleName: string,
  options: ParseExplicitOptions
): SemanticNode[] {
  const value = roles.get(roleName as SemanticRole);
  if (!value) return [];
  if (value.type === 'expression') return [parseExplicit(value.raw, options)];
  return [];
}

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
      if (char === stringChar && content[i - 1] !== '\\') inString = false;
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

  if (current) tokens.push(current);
  return tokens;
}

function parseExplicitValue(valueStr: string, referenceSet: ReadonlySet<string>): SemanticValue {
  if (
    valueStr.startsWith('#') ||
    valueStr.startsWith('.') ||
    valueStr.startsWith('[') ||
    valueStr.startsWith('@') ||
    valueStr.startsWith('*')
  ) {
    return createSelector(valueStr, inferSelectorKind(valueStr));
  }
  if (valueStr.startsWith('"') || valueStr.startsWith("'")) {
    return createLiteral(valueStr.slice(1, -1), 'string');
  }
  if (valueStr === 'true') return createLiteral(true, 'boolean');
  if (valueStr === 'false') return createLiteral(false, 'boolean');
  const lowerRef = valueStr.toLowerCase();
  if (isValidReference(lowerRef, referenceSet)) return createReference(lowerRef);
  const numMatch = valueStr.match(/^(-?\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const suffix = numMatch[2];
    if (suffix) return createLiteral(valueStr, 'duration');
    return createLiteral(num, 'number');
  }
  return createLiteral(valueStr);
}

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
