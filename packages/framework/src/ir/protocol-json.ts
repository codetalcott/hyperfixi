/**
 * Protocol Full-Fidelity JSON Serialization
 *
 * Converts between TypeScript SemanticNode (internal representation) and
 * the protocol wire format defined in protocol/spec/wire-format.md.
 *
 * The TypeScript layer is a superset of the protocol spec:
 * - TS has 5 node kinds; protocol has 3 (command, event-handler, compound)
 * - TS uses ReadonlyMap<SemanticRole, SemanticValue>; protocol uses plain Record
 * - TS SelectorValue has optional selectorKind; protocol does not
 * - TS has PropertyPathValue; protocol flattens it to expression
 *
 * Use toProtocolJSON() to serialize for tool-to-tool interchange.
 * Use fromProtocolJSON() to deserialize from protocol-conformant sources.
 */

import type {
  SemanticNode,
  SemanticValue,
  SemanticRole,
  EventHandlerSemanticNode,
  CompoundSemanticNode,
} from '../core/types';
import {
  createCommandNode,
  createEventHandlerNode,
  createCompoundNode,
  createSelector,
  createLiteral,
  createReference,
  createExpression,
  createFlag,
  extractValue,
} from '../core/types';
import type { ProtocolNodeJSON, ProtocolValueJSON, ProtocolChainType, IRDiagnostic } from './types';

// =============================================================================
// Serialization: SemanticNode → ProtocolNodeJSON
// =============================================================================

/**
 * Serialize a SemanticNode to the protocol full-fidelity JSON wire format.
 *
 * TS-only node kinds are downgraded (lossy):
 * - `conditional` → `command` (thenBranch/elseBranch dropped)
 * - `loop` → `command` (body/loopVariable/indexVariable dropped)
 *
 * TS-only value fields stripped:
 * - `selectorKind` on SelectorValue
 * - `property-path` flattened to `expression` using extractValue()
 */
export function toProtocolJSON(node: SemanticNode): ProtocolNodeJSON {
  const roles = rolesToProtocol(node.roles);

  switch (node.kind) {
    case 'command':
      return { kind: 'command', action: node.action, roles };

    case 'event-handler': {
      const eh = node as EventHandlerSemanticNode;
      return {
        kind: 'event-handler',
        action: node.action,
        roles,
        body: eh.body.map(toProtocolJSON),
      };
    }

    case 'compound': {
      const c = node as CompoundSemanticNode;
      return {
        kind: 'compound',
        action: 'compound',
        roles: {},
        statements: c.statements.map(toProtocolJSON),
        chainType: c.chainType,
      };
    }

    // TS-only kinds: downgrade to command — branch/body/loop data is dropped
    case 'conditional':
      return { kind: 'command', action: node.action, roles };

    case 'loop':
      return { kind: 'command', action: node.action, roles };
  }
}

function rolesToProtocol(
  roles: ReadonlyMap<SemanticRole, SemanticValue>
): Record<string, ProtocolValueJSON> {
  const result: Record<string, ProtocolValueJSON> = {};
  for (const [role, value] of roles) {
    result[role] = valueToProtocol(value);
  }
  return result;
}

function valueToProtocol(value: SemanticValue): ProtocolValueJSON {
  switch (value.type) {
    case 'selector':
      // selectorKind intentionally stripped — TS-only extension not in wire format
      return { type: 'selector', value: value.value };

    case 'literal':
      return value.dataType
        ? { type: 'literal', value: value.value, dataType: value.dataType }
        : { type: 'literal', value: value.value };

    case 'reference':
      return { type: 'reference', value: value.value };

    case 'expression':
      return { type: 'expression', raw: value.raw };

    case 'property-path':
      // Flatten to expression — property-path has no structured protocol representation
      return { type: 'expression', raw: extractValue(value) };

    case 'flag':
      return { type: 'flag', name: value.name, enabled: value.enabled };
  }
}

// =============================================================================
// Deserialization: ProtocolNodeJSON → SemanticNode
// =============================================================================

/**
 * Deserialize a protocol wire format JSON object into a SemanticNode.
 *
 * Only produces the 3 protocol-supported node kinds (command, event-handler, compound).
 * Never up-converts to TypeScript-only conditional or loop nodes.
 */
export function fromProtocolJSON(json: ProtocolNodeJSON): SemanticNode {
  const roles = new Map<SemanticRole, SemanticValue>(
    Object.entries(json.roles ?? {}).map(([role, val]) => [role, valueFromProtocol(val)])
  );

  if (json.kind === 'event-handler') {
    const body = (json.body ?? []).map(fromProtocolJSON);
    return createEventHandlerNode(json.action, roles, body);
  }

  if (json.kind === 'compound') {
    const statements = (json.statements ?? []).map(fromProtocolJSON);
    return createCompoundNode(statements, (json.chainType ?? 'sequential') as ProtocolChainType);
  }

  // 'command' (default)
  return createCommandNode(json.action, roles);
}

function valueFromProtocol(value: ProtocolValueJSON): SemanticValue {
  switch (value.type) {
    case 'selector':
      return createSelector(String(value.value ?? ''));

    case 'literal':
      return createLiteral(
        value.value !== undefined ? value.value : '',
        value.dataType as 'string' | 'number' | 'boolean' | 'duration' | undefined
      );

    case 'reference':
      return createReference(String(value.value ?? ''));

    case 'expression':
      return createExpression(value.raw ?? String(value.value ?? ''));

    case 'flag':
      return createFlag(value.name ?? '', value.enabled ?? true);

    case 'property-path':
      // Protocol property-path has no structured form; restore as expression
      return createExpression(String(value.value ?? value.raw ?? ''));
  }
}

// =============================================================================
// Validation
// =============================================================================

const VALID_KINDS = new Set(['command', 'event-handler', 'compound']);
const VALID_VALUE_TYPES = new Set([
  'selector',
  'literal',
  'reference',
  'expression',
  'property-path',
  'flag',
]);
const VALID_CHAIN_TYPES = new Set(['then', 'and', 'async', 'sequential']);

/**
 * Validate that an unknown value conforms to the protocol full-fidelity JSON format.
 * Returns an array of diagnostics (empty array = valid).
 */
export function validateProtocolJSON(json: unknown): IRDiagnostic[] {
  const diagnostics: IRDiagnostic[] = [];

  if (typeof json !== 'object' || json === null) {
    return [{ severity: 'error', code: 'INVALID_ROOT', message: 'Root must be a JSON object' }];
  }

  const node = json as Record<string, unknown>;

  // kind
  if (!('kind' in node)) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_KIND',
      message: 'Missing required field: kind',
    });
  } else if (!VALID_KINDS.has(String(node.kind))) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_KIND',
      message: `Invalid kind "${node.kind}". Must be one of: command, event-handler, compound`,
    });
  }

  // action
  if (!('action' in node)) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_ACTION',
      message: 'Missing required field: action',
    });
  } else if (typeof node.action !== 'string' || node.action.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_ACTION',
      message: 'action must be a non-empty string',
    });
  }

  // roles
  if (!('roles' in node)) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_ROLES',
      message: 'Missing required field: roles',
    });
  } else if (typeof node.roles !== 'object' || node.roles === null || Array.isArray(node.roles)) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_ROLES',
      message: 'roles must be a plain object',
    });
  } else {
    for (const [role, value] of Object.entries(node.roles as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_ROLE_VALUE',
          message: `Role "${role}" value must be an object`,
        });
        continue;
      }
      const v = value as Record<string, unknown>;
      if (!('type' in v) || !VALID_VALUE_TYPES.has(String(v.type))) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_VALUE_TYPE',
          message: `Role "${role}" has invalid type "${v.type}"`,
        });
      }
      if (v.type === 'flag') {
        if (typeof v.name !== 'string') {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_FLAG_NAME',
            message: `Flag role "${role}" missing required field: name`,
          });
        }
        if (typeof v.enabled !== 'boolean') {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_FLAG_ENABLED',
            message: `Flag role "${role}" missing required field: enabled`,
          });
        }
      }
      if (v.type === 'expression' && typeof v.raw !== 'string') {
        diagnostics.push({
          severity: 'error',
          code: 'MISSING_EXPRESSION_RAW',
          message: `Expression role "${role}" missing required field: raw`,
        });
      }
    }
  }

  // event-handler requires body array
  if (node.kind === 'event-handler') {
    if (!('body' in node) || !Array.isArray(node.body)) {
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_BODY',
        message: 'event-handler node requires a body array',
      });
    }
  }

  // compound requires statements array
  if (node.kind === 'compound') {
    if (!('statements' in node) || !Array.isArray(node.statements)) {
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_STATEMENTS',
        message: 'compound node requires a statements array',
      });
    }
    if ('chainType' in node && !VALID_CHAIN_TYPES.has(String(node.chainType))) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_CHAIN_TYPE',
        message: `Invalid chainType "${node.chainType}". Must be one of: then, and, async, sequential`,
      });
    }
  }

  return diagnostics;
}
