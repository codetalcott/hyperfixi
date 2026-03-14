/**
 * Protocol JSON Serialization
 *
 * Converts between TypeScript SemanticNode (internal representation) and
 * the protocol wire format defined in protocol/spec/wire-format.md.
 *
 * `kind` is optional and defaults to `"command"` when absent.
 * `trigger` is accepted as convenience sugar for wrapping a command in an
 * event handler (e.g., `{ action: "toggle", trigger: { event: "click" } }`).
 *
 * The TypeScript layer is a superset of the protocol spec:
 * - TS has 5 node kinds; protocol has 3 (command, event-handler, compound)
 * - TS uses ReadonlyMap<SemanticRole, SemanticValue>; protocol uses plain Record
 * - TS SelectorValue has optional selectorKind; protocol preserves it when present (v1.1)
 * - TS has PropertyPathValue; protocol flattens it to expression
 * - TS conditional/loop nodes are losslessly encoded as command nodes with
 *   thenBranch/elseBranch/loopVariant/loopBody/loopVariable/indexVariable fields (v1.1)
 * - v1.2 adds: annotations, diagnostics, try/catch/finally, async all/race,
 *   match/arms, pipe chainType, and LSEEnvelope
 *
 * Use toProtocolJSON() to serialize for tool-to-tool interchange.
 * Use fromProtocolJSON() to deserialize from protocol-conformant sources.
 */

import type {
  SemanticNode,
  SemanticValue,
  SemanticRole,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  CompoundSemanticNode,
  ConditionalSemanticNode,
  LoopSemanticNode,
  LoopVariant,
  AsyncVariant,
  LSEEnvelope,
} from '../core/types';
import {
  createCommandNode,
  createEventHandlerNode,
  createCompoundNode,
  createConditionalNode,
  createLoopNode,
  createTryNode,
  createAsyncNode,
  createMatchNode,
  createSelector,
  createLiteral,
  createReference,
  createExpression,
  createFlag,
  extractValue,
} from '../core/types';
import type {
  ProtocolNodeJSON,
  ProtocolValueJSON,
  ProtocolDiagnosticJSON,
  ProtocolChainType,
  IRDiagnostic,
  LSEEnvelopeJSON,
} from './types';

// =============================================================================
// Serialization: SemanticNode → ProtocolNodeJSON
// =============================================================================

/**
 * Serialize a SemanticNode to the protocol full-fidelity JSON wire format.
 *
 * TS-only node kinds are losslessly encoded as command nodes (v1.1):
 * - `conditional` → `command` with thenBranch/elseBranch arrays
 * - `loop` → `command` with loopVariant/loopBody/loopVariable/indexVariable fields
 *
 * v1.2 fields (annotations, diagnostics, try/catch/finally, async, match)
 * are serialized when present on the source node.
 *
 * TS-only value fields:
 * - `property-path` flattened to `expression` using extractValue()
 */
export function toProtocolJSON(node: SemanticNode): ProtocolNodeJSON {
  const roles = rolesToProtocol(node.roles);
  let result: ProtocolNodeJSON;

  switch (node.kind) {
    case 'command': {
      const cmd = node as CommandSemanticNode;
      result = { kind: 'command', action: node.action, roles };
      // v1.2: try/catch/finally
      if (cmd.body && cmd.body.length > 0) {
        result.body = cmd.body.map(toProtocolJSON);
      }
      if (cmd.catchBranch && cmd.catchBranch.length > 0) {
        result.catchBranch = cmd.catchBranch.map(toProtocolJSON);
      }
      if (cmd.finallyBranch && cmd.finallyBranch.length > 0) {
        result.finallyBranch = cmd.finallyBranch.map(toProtocolJSON);
      }
      // v1.2: async coordination
      if (cmd.asyncVariant) {
        result.asyncVariant = cmd.asyncVariant;
      }
      if (cmd.asyncBody && cmd.asyncBody.length > 0) {
        result.asyncBody = cmd.asyncBody.map(toProtocolJSON);
      }
      // v1.2: match
      if (cmd.arms && cmd.arms.length > 0) {
        result.arms = cmd.arms.map(arm => ({
          pattern: valueToProtocol(arm.pattern),
          body: arm.body.map(toProtocolJSON),
        }));
      }
      if (cmd.defaultArm && cmd.defaultArm.length > 0) {
        result.defaultArm = cmd.defaultArm.map(toProtocolJSON);
      }
      break;
    }

    case 'event-handler': {
      const eh = node as EventHandlerSemanticNode;
      result = {
        kind: 'event-handler',
        action: node.action,
        roles,
        body: eh.body.map(toProtocolJSON),
      };
      break;
    }

    case 'compound': {
      const c = node as CompoundSemanticNode;
      result = {
        kind: 'compound',
        action: 'compound',
        statements: c.statements.map(toProtocolJSON),
        chainType: c.chainType,
      } as ProtocolNodeJSON;
      break;
    }

    case 'conditional': {
      const cond = node as ConditionalSemanticNode;
      result = { kind: 'command', action: node.action, roles };
      result.thenBranch = cond.thenBranch.map(toProtocolJSON);
      if (cond.elseBranch && cond.elseBranch.length > 0) {
        result.elseBranch = cond.elseBranch.map(toProtocolJSON);
      }
      break;
    }

    case 'loop': {
      const loop = node as LoopSemanticNode;
      result = { kind: 'command', action: node.action, roles };
      result.loopVariant = loop.loopVariant;
      result.loopBody = loop.body.map(toProtocolJSON);
      if (loop.loopVariable) result.loopVariable = loop.loopVariable;
      if (loop.indexVariable) result.indexVariable = loop.indexVariable;
      break;
    }
  }

  // v1.2: annotations (all node kinds)
  if (node.annotations && node.annotations.length > 0) {
    result.annotations = node.annotations.map(a =>
      a.value !== undefined ? { name: a.name, value: a.value } : { name: a.name }
    );
  }

  // v1.2/v1.2.1: diagnostics (all node kinds)
  if (node.diagnostics && node.diagnostics.length > 0) {
    result.diagnostics = node.diagnostics.map(d => {
      const json: ProtocolDiagnosticJSON = {
        level: d.severity,
        message: d.message,
      };
      if (d.code) json.code = d.code;
      if (d.source) json.source = d.source;
      if (d.suggestions && d.suggestions.length > 0) json.suggestions = [...d.suggestions];
      return json;
    });
  }

  return result;
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
    case 'selector': {
      const PROTOCOL_SELECTOR_KINDS = new Set([
        'id',
        'class',
        'attribute',
        'element',
        'complex',
      ] as const);
      const sk = 'selectorKind' in value ? value.selectorKind : undefined;
      const sv: ProtocolValueJSON = { type: 'selector', value: value.value };
      if (sk && PROTOCOL_SELECTOR_KINDS.has(sk as 'id')) {
        sv.selectorKind = sk as 'id' | 'class' | 'attribute' | 'element' | 'complex';
      }
      return sv;
    }

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
 * Produces all 5 node kinds — detects v1.1/v1.2 fields on command nodes to
 * reconstruct appropriate node types:
 * - thenBranch present → `conditional` node via createConditionalNode()
 * - loopVariant present → `loop` node via createLoopNode()
 * - catchBranch/finallyBranch → try node via createTryNode() (v1.2)
 * - asyncVariant → async node via createAsyncNode() (v1.2)
 * - arms → match node via createMatchNode() (v1.2)
 *
 * Annotations and diagnostics (v1.2) are preserved on all node kinds.
 */
export function fromProtocolJSON(json: ProtocolNodeJSON): SemanticNode {
  const roles = new Map<SemanticRole, SemanticValue>(
    Object.entries(json.roles ?? {}).map(([role, val]) => [role, valueFromProtocol(val)])
  );

  // Deserialize v1.2 metadata (applies to all node kinds)
  const annotations = json.annotations?.map(a =>
    a.value !== undefined ? { name: a.name, value: a.value } : { name: a.name }
  );
  const diagnostics = json.diagnostics?.map(d => ({
    severity: d.level as 'error' | 'warning' | 'info',
    message: d.message,
    ...(d.code ? { code: d.code } : {}),
    ...(d.source ? { source: d.source } : {}),
    ...(d.suggestions && d.suggestions.length > 0 ? { suggestions: d.suggestions } : {}),
  }));

  // trigger sugar: wrap command in event handler (check before kind dispatch)
  if (json.trigger) {
    const eventName = json.trigger.event;
    roles.set('event' as SemanticRole, createLiteral(eventName, 'string'));
    const bodyRoles = new Map(roles);
    bodyRoles.delete('event' as SemanticRole);
    const bodyNode = createCommandNode(json.action, bodyRoles);
    const node = createEventHandlerNode(
      'on',
      roles,
      [bodyNode],
      { sourceLanguage: 'json' },
      (json.trigger.modifiers as Record<string, unknown> | undefined) ?? {}
    );
    return applyV12Metadata(node, annotations, diagnostics);
  }

  const kind = json.kind ?? 'command';

  if (kind === 'event-handler') {
    const body = (json.body ?? []).map(fromProtocolJSON);
    const node = createEventHandlerNode(json.action, roles, body);
    return applyV12Metadata(node, annotations, diagnostics);
  }

  if (kind === 'compound') {
    const statements = (json.statements ?? []).map(fromProtocolJSON);
    const node = createCompoundNode(
      statements,
      (json.chainType ?? 'sequential') as ProtocolChainType
    );
    return applyV12Metadata(node, annotations, diagnostics);
  }

  // Detect v1.1 conditional encoding: command with thenBranch
  if (json.thenBranch && json.thenBranch.length > 0) {
    const thenBranch = json.thenBranch.map(fromProtocolJSON);
    const elseBranch = json.elseBranch ? json.elseBranch.map(fromProtocolJSON) : undefined;
    const node = createConditionalNode(json.action, roles, thenBranch, elseBranch);
    return applyV12Metadata(node, annotations, diagnostics);
  }

  // Detect v1.1 loop encoding: command with loopVariant
  if (json.loopVariant) {
    const loopBody = (json.loopBody ?? []).map(fromProtocolJSON);
    const node = createLoopNode(
      json.action,
      roles,
      json.loopVariant as LoopVariant,
      loopBody,
      json.loopVariable,
      json.indexVariable
    );
    return applyV12Metadata(node, annotations, diagnostics);
  }

  // v1.2: Detect try/catch/finally (body + catchBranch or finallyBranch)
  if (json.catchBranch || json.finallyBranch) {
    const body = (json.body ?? []).map(fromProtocolJSON);
    const catchBranch = json.catchBranch ? json.catchBranch.map(fromProtocolJSON) : undefined;
    const finallyBranch = json.finallyBranch ? json.finallyBranch.map(fromProtocolJSON) : undefined;
    const node = createTryNode(body, catchBranch, finallyBranch);
    return applyV12Metadata(node, annotations, diagnostics);
  }

  // v1.2: Detect async coordination (asyncVariant)
  if (json.asyncVariant) {
    const asyncBody = (json.asyncBody ?? []).map(fromProtocolJSON);
    const node = createAsyncNode(json.asyncVariant as AsyncVariant, asyncBody);
    return applyV12Metadata(node, annotations, diagnostics);
  }

  // v1.2: Detect match (arms)
  if (json.arms && json.arms.length > 0) {
    const arms = json.arms.map(arm => ({
      pattern: valueFromProtocol(arm.pattern),
      body: arm.body.map(fromProtocolJSON),
    }));
    const defaultArm = json.defaultArm ? json.defaultArm.map(fromProtocolJSON) : undefined;
    const node = createMatchNode(roles, arms, defaultArm);
    return applyV12Metadata(node, annotations, diagnostics);
  }

  // v1.2: command with body only (try with no catch/finally)
  if (json.body && json.body.length > 0 && kind === 'command') {
    const body = json.body.map(fromProtocolJSON);
    const node = createTryNode(body);
    return applyV12Metadata(node, annotations, diagnostics);
  }

  // Plain command
  const node = createCommandNode(json.action, roles);
  return applyV12Metadata(node, annotations, diagnostics);
}

/**
 * Apply v1.2 annotations and diagnostics to a node.
 * Returns the node unchanged if neither is present.
 */
function applyV12Metadata(
  node: SemanticNode,
  annotations: Array<{ name: string; value?: string }> | undefined,
  diagnostics:
    | Array<{
        severity: 'error' | 'warning' | 'info';
        message: string;
        code?: string;
        source?: string;
        suggestions?: string[];
      }>
    | undefined
): SemanticNode {
  if ((!annotations || annotations.length === 0) && (!diagnostics || diagnostics.length === 0)) {
    return node;
  }
  return {
    ...node,
    ...(annotations && annotations.length > 0 ? { annotations } : {}),
    ...(diagnostics && diagnostics.length > 0 ? { diagnostics } : {}),
  };
}

function valueFromProtocol(value: ProtocolValueJSON): SemanticValue {
  switch (value.type) {
    case 'selector':
      return createSelector(String(value.value ?? ''), value.selectorKind);

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
      return createFlag(
        value.name ?? String(value.value ?? ''),
        value.enabled ?? (typeof value.value === 'boolean' ? value.value : true)
      );

    case 'property-path':
      // Protocol property-path has no structured form; restore as expression
      return createExpression(String(value.value ?? value.raw ?? ''));
  }
}

// =============================================================================
// Envelope (v1.2)
// =============================================================================

/**
 * Serialize an LSEEnvelope to its JSON wire format.
 */
export function toEnvelopeJSON(envelope: LSEEnvelope): LSEEnvelopeJSON {
  const result: LSEEnvelopeJSON = {
    lseVersion: envelope.lseVersion,
    nodes: envelope.nodes.map(toProtocolJSON),
  };
  if (envelope.features && envelope.features.length > 0) {
    result.features = [...envelope.features];
  }
  return result;
}

/**
 * Deserialize an LSEEnvelopeJSON into an LSEEnvelope.
 */
export function fromEnvelopeJSON(json: LSEEnvelopeJSON): LSEEnvelope {
  return {
    lseVersion: json.lseVersion,
    ...(json.features && json.features.length > 0 ? { features: json.features } : {}),
    nodes: json.nodes.map(fromProtocolJSON),
  };
}

/**
 * Check whether an unknown JSON value is an LSE envelope (has lseVersion + nodes).
 */
export function isEnvelope(json: unknown): json is LSEEnvelopeJSON {
  return (
    typeof json === 'object' &&
    json !== null &&
    'lseVersion' in json &&
    'nodes' in json &&
    Array.isArray((json as Record<string, unknown>).nodes)
  );
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
const VALID_CHAIN_TYPES = new Set(['then', 'and', 'async', 'sequential', 'pipe']);
const VALID_ASYNC_VARIANTS = new Set(['all', 'race']);
const VALID_DIAGNOSTIC_LEVELS = new Set(['error', 'warning', 'info']);

/**
 * Validate that an unknown value conforms to the protocol JSON format.
 * `kind` is optional (defaults to `"command"`). `trigger` is accepted as
 * convenience sugar for wrapping a command in an event handler.
 * Returns an array of diagnostics (empty array = valid).
 */
export function validateProtocolJSON(json: unknown): IRDiagnostic[] {
  const diagnostics: IRDiagnostic[] = [];

  if (typeof json !== 'object' || json === null) {
    return [{ severity: 'error', code: 'INVALID_ROOT', message: 'Root must be a JSON object' }];
  }

  const node = json as Record<string, unknown>;

  // kind (optional, defaults to "command")
  const kind = 'kind' in node ? String(node.kind) : 'command';
  if ('kind' in node && !VALID_KINDS.has(kind)) {
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

  // roles (optional on compound nodes)
  if (!('roles' in node) && kind !== 'compound') {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_ROLES',
      message: 'Missing required field: roles',
    });
  } else if (
    'roles' in node &&
    (typeof node.roles !== 'object' || node.roles === null || Array.isArray(node.roles))
  ) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_ROLES',
      message: 'roles must be a plain object',
    });
  } else if ('roles' in node && node.roles) {
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
      // Flags: accept { name, enabled } or { value } (simplified form)
      if (v.type === 'flag') {
        const hasName = typeof v.name === 'string';
        const hasEnabled = typeof v.enabled === 'boolean';
        const hasValue = 'value' in v;
        if (!hasName && !hasValue) {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_FLAG_NAME',
            message: `Flag role "${role}" missing required field: name (or value)`,
          });
        }
        if (!hasEnabled && !hasValue) {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_FLAG_ENABLED',
            message: `Flag role "${role}" missing required field: enabled (or value)`,
          });
        }
      }
      // Expressions: accept { raw } or { value } (simplified form)
      if (v.type === 'expression' && typeof v.raw !== 'string' && !('value' in v)) {
        diagnostics.push({
          severity: 'error',
          code: 'MISSING_EXPRESSION_RAW',
          message: `Expression role "${role}" missing required field: raw (or value)`,
        });
      }
    }
  }

  // trigger validation (convenience sugar for event handlers)
  if ('trigger' in node && node.trigger) {
    const trigger = node.trigger as Record<string, unknown>;
    if (typeof trigger !== 'object' || trigger === null) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_TRIGGER',
        message: 'trigger must be an object',
      });
    } else if (!trigger.event || typeof trigger.event !== 'string') {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_TRIGGER',
        message: 'trigger.event is required and must be a non-empty string',
      });
    }
  }

  // event-handler requires body array (unless using trigger sugar)
  if (kind === 'event-handler' && !('trigger' in node)) {
    if (!('body' in node) || !Array.isArray(node.body)) {
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_BODY',
        message: 'event-handler node requires a body array',
      });
    }
  }

  // compound requires statements array
  if (kind === 'compound') {
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
        message: `Invalid chainType "${node.chainType}". Must be one of: then, and, async, sequential, pipe`,
      });
    }
  }

  // v1.2: validate diagnostics array
  if ('diagnostics' in node) {
    if (!Array.isArray(node.diagnostics)) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_DIAGNOSTICS',
        message: 'diagnostics must be an array',
      });
    } else {
      for (let i = 0; i < (node.diagnostics as unknown[]).length; i++) {
        const d = (node.diagnostics as unknown[])[i] as Record<string, unknown> | null;
        if (!d || typeof d !== 'object') {
          diagnostics.push({
            severity: 'error',
            code: 'INVALID_DIAGNOSTIC_ENTRY',
            message: `diagnostics[${i}] must be an object`,
          });
          continue;
        }
        if (!VALID_DIAGNOSTIC_LEVELS.has(String(d.level))) {
          diagnostics.push({
            severity: 'error',
            code: 'INVALID_DIAGNOSTIC_LEVEL',
            message: `diagnostics[${i}].level must be "error", "warning", or "info"`,
          });
        }
        if (typeof d.message !== 'string') {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_DIAGNOSTIC_MESSAGE',
            message: `diagnostics[${i}] missing required field: message`,
          });
        }
        // v1.2.1: role and code are now optional
        if ('code' in d && typeof d.code !== 'string') {
          diagnostics.push({
            severity: 'warning',
            code: 'INVALID_DIAGNOSTIC_CODE',
            message: `diagnostics[${i}].code must be a string if present`,
          });
        }
      }
    }
  }

  // v1.2: validate annotations array
  if ('annotations' in node) {
    if (!Array.isArray(node.annotations)) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_ANNOTATIONS',
        message: 'annotations must be an array',
      });
    } else {
      for (let i = 0; i < (node.annotations as unknown[]).length; i++) {
        const a = (node.annotations as unknown[])[i] as Record<string, unknown> | null;
        if (!a || typeof a !== 'object') {
          diagnostics.push({
            severity: 'error',
            code: 'INVALID_ANNOTATION_ENTRY',
            message: `annotations[${i}] must be an object`,
          });
          continue;
        }
        if (typeof a.name !== 'string' || a.name.length === 0) {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_ANNOTATION_NAME',
            message: `annotations[${i}] missing required field: name`,
          });
        }
      }
    }
  }

  // v1.2: validate asyncVariant
  if ('asyncVariant' in node && !VALID_ASYNC_VARIANTS.has(String(node.asyncVariant))) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_ASYNC_VARIANT',
      message: `Invalid asyncVariant "${node.asyncVariant}". Must be "all" or "race"`,
    });
  }

  // v1.2: validate arms
  if ('arms' in node) {
    if (!Array.isArray(node.arms)) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_ARMS',
        message: 'arms must be an array',
      });
    } else {
      for (let i = 0; i < (node.arms as unknown[]).length; i++) {
        const arm = (node.arms as unknown[])[i] as Record<string, unknown> | null;
        if (!arm || typeof arm !== 'object') {
          diagnostics.push({
            severity: 'error',
            code: 'INVALID_ARM_ENTRY',
            message: `arms[${i}] must be an object`,
          });
          continue;
        }
        if (!arm.pattern || typeof arm.pattern !== 'object') {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_ARM_PATTERN',
            message: `arms[${i}] missing required field: pattern`,
          });
        }
        if (!Array.isArray(arm.body)) {
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_ARM_BODY',
            message: `arms[${i}] missing required field: body (array)`,
          });
        }
      }
    }
  }

  return diagnostics;
}
