/**
 * Protocol JSON Serialization
 *
 * Converts between TypeScript SemanticNode (internal representation) and
 * the protocol wire format defined in protocol/spec/wire-format.md.
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
} from '../types';
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
} from '../types';
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

export function toProtocolJSON(node: SemanticNode): ProtocolNodeJSON {
  const roles = rolesToProtocol(node.roles);
  let result: ProtocolNodeJSON;

  switch (node.kind) {
    case 'command': {
      const cmd = node as CommandSemanticNode;
      result = { kind: 'command', action: node.action, roles };
      if (cmd.body && cmd.body.length > 0) result.body = cmd.body.map(toProtocolJSON);
      if (cmd.catchBranch && cmd.catchBranch.length > 0)
        result.catchBranch = cmd.catchBranch.map(toProtocolJSON);
      if (cmd.finallyBranch && cmd.finallyBranch.length > 0)
        result.finallyBranch = cmd.finallyBranch.map(toProtocolJSON);
      if (cmd.asyncVariant) result.asyncVariant = cmd.asyncVariant;
      if (cmd.asyncBody && cmd.asyncBody.length > 0)
        result.asyncBody = cmd.asyncBody.map(toProtocolJSON);
      if (cmd.arms && cmd.arms.length > 0) {
        result.arms = cmd.arms.map(arm => ({
          pattern: valueToProtocol(arm.pattern),
          body: arm.body.map(toProtocolJSON),
        }));
      }
      if (cmd.defaultArm && cmd.defaultArm.length > 0)
        result.defaultArm = cmd.defaultArm.map(toProtocolJSON);
      break;
    }
    case 'event-handler': {
      const eh = node as EventHandlerSemanticNode;

      // Emit compact form with `trigger` sugar when it's lossless. The compact
      // form is `{action: bodyAction, roles: bodyRoles, trigger: {event, modifiers?}}`
      // and deserializes back to an identical event-handler node via the
      // `if (json.trigger)` branch in fromProtocolJSON. The compact form is
      // also the only form the runtime dispatch path currently executes
      // correctly for most commands — see examples/llm-native-todo-demo.
      if (canEmitCompactTrigger(eh)) {
        const body = eh.body[0] as CommandSemanticNode;
        const eventValue = eh.roles.get('event' as SemanticRole);
        // Safe because canEmitCompactTrigger verified type + value.
        const eventName = (eventValue as { value: string }).value;

        const trigger: { event: string; modifiers?: Record<string, unknown> } = {
          event: eventName,
        };
        const triggerModifiers = serializeEventModifiers(eh.eventModifiers);
        if (triggerModifiers) trigger.modifiers = triggerModifiers;

        result = {
          action: body.action,
          roles: rolesToProtocol(body.roles),
          trigger,
        };
        break;
      }

      // Fallback: verbose form (multi-command body, nested control flow,
      // additional events, parameter names, annotations on body, etc.)
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
      if (cond.elseBranch && cond.elseBranch.length > 0)
        result.elseBranch = cond.elseBranch.map(toProtocolJSON);
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

  if (node.annotations && node.annotations.length > 0) {
    result.annotations = node.annotations.map(a =>
      a.value !== undefined ? { name: a.name, value: a.value } : { name: a.name }
    );
  }

  if (node.diagnostics && node.diagnostics.length > 0) {
    result.diagnostics = node.diagnostics.map(d => {
      const json: ProtocolDiagnosticJSON = { level: d.severity, message: d.message };
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
  for (const [role, value] of roles) result[role] = valueToProtocol(value);
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
      if (sk && PROTOCOL_SELECTOR_KINDS.has(sk as 'id'))
        sv.selectorKind = sk as 'id' | 'class' | 'attribute' | 'element' | 'complex';
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
      return { type: 'expression', raw: extractValue(value) };
    case 'flag':
      return { type: 'flag', name: value.name, enabled: value.enabled };
  }
}

/**
 * Decide whether an event-handler node can be emitted in the compact
 * `{action, roles, trigger}` form without losing information.
 *
 * The compact form is lossless when the event-handler wraps exactly one plain
 * command, uses a simple literal event name, and carries no metadata that
 * compact form can't represent (body-level annotations, additional events,
 * parameter names, etc.). Round-trip: `fromProtocolJSON(compact)` rebuilds an
 * equivalent event-handler via the `if (json.trigger)` branch.
 */
function canEmitCompactTrigger(eh: EventHandlerSemanticNode): boolean {
  // Must wrap exactly one body node and that node must be a plain command.
  if (!eh.body || eh.body.length !== 1) return false;
  const body = eh.body[0];
  if (body.kind !== 'command') return false;

  // The body command must not carry its own control flow or v1.2 extensions.
  const cmd = body as CommandSemanticNode;
  if (cmd.body && cmd.body.length > 0) return false;
  if (cmd.catchBranch && cmd.catchBranch.length > 0) return false;
  if (cmd.finallyBranch && cmd.finallyBranch.length > 0) return false;
  if (cmd.asyncVariant) return false;
  if (cmd.asyncBody && cmd.asyncBody.length > 0) return false;
  if (cmd.arms && cmd.arms.length > 0) return false;
  if (cmd.defaultArm && cmd.defaultArm.length > 0) return false;

  // Event handler must expose a simple literal string event name.
  const eventValue = eh.roles.get('event' as SemanticRole);
  if (!eventValue || eventValue.type !== 'literal') return false;
  if (typeof (eventValue as { value: unknown }).value !== 'string') return false;

  // The body command must NOT have its own `event` role — in compact form
  // `roles.event` is reserved for the trigger and would collide on re-parse.
  if (cmd.roles.has('event' as SemanticRole)) return false;

  // Event handler must not carry features compact form cannot represent.
  if (eh.additionalEvents && eh.additionalEvents.length > 0) return false;
  if (eh.parameterNames && eh.parameterNames.length > 0) return false;

  // Annotations/diagnostics: compact form collapses event-handler and body
  // command into one node, so only EH-level annotations round-trip. If either
  // the EH or the body command carries annotations/diagnostics, fall back
  // to verbose form to preserve them losslessly.
  if (eh.annotations && eh.annotations.length > 0) return false;
  if (eh.diagnostics && eh.diagnostics.length > 0) return false;
  if (cmd.annotations && cmd.annotations.length > 0) return false;
  if (cmd.diagnostics && cmd.diagnostics.length > 0) return false;

  return true;
}

/**
 * Serialize EventModifiers to the shape expected by `trigger.modifiers` in the
 * wire format. Returns undefined when there are no modifiers, so the caller
 * can omit the field entirely.
 *
 * `from` is a SemanticValue reference and is not round-trip-safe through the
 * trigger sugar path; if present, it signals that canEmitCompactTrigger
 * should have rejected the node. We still emit the simple keys here so
 * partial information survives if the caller bypasses the guard.
 */
function serializeEventModifiers(
  mods: EventHandlerSemanticNode['eventModifiers']
): Record<string, unknown> | undefined {
  if (!mods) return undefined;
  const out: Record<string, unknown> = {};
  if (mods.once) out.once = true;
  if (typeof mods.debounce === 'number') out.debounce = mods.debounce;
  if (typeof mods.throttle === 'number') out.throttle = mods.throttle;
  if (mods.queue) out.queue = mods.queue;
  return Object.keys(out).length > 0 ? out : undefined;
}

// =============================================================================
// Deserialization: ProtocolNodeJSON → SemanticNode
// =============================================================================

export function fromProtocolJSON(json: ProtocolNodeJSON): SemanticNode {
  const roles = new Map<SemanticRole, SemanticValue>(
    Object.entries(json.roles ?? {}).map(([role, val]) => [role, valueFromProtocol(val)])
  );

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
    return applyV12Metadata(
      createEventHandlerNode(json.action, roles, body),
      annotations,
      diagnostics
    );
  }

  if (kind === 'compound') {
    const statements = (json.statements ?? []).map(fromProtocolJSON);
    return applyV12Metadata(
      createCompoundNode(statements, (json.chainType ?? 'sequential') as ProtocolChainType),
      annotations,
      diagnostics
    );
  }

  if (json.thenBranch && json.thenBranch.length > 0) {
    const thenBranch = json.thenBranch.map(fromProtocolJSON);
    const elseBranch = json.elseBranch ? json.elseBranch.map(fromProtocolJSON) : undefined;
    return applyV12Metadata(
      createConditionalNode(json.action, roles, thenBranch, elseBranch),
      annotations,
      diagnostics
    );
  }

  if (json.loopVariant) {
    const loopBody = (json.loopBody ?? []).map(fromProtocolJSON);
    return applyV12Metadata(
      createLoopNode(
        json.action,
        roles,
        json.loopVariant as LoopVariant,
        loopBody,
        json.loopVariable,
        json.indexVariable
      ),
      annotations,
      diagnostics
    );
  }

  if (json.catchBranch || json.finallyBranch) {
    const body = (json.body ?? []).map(fromProtocolJSON);
    const catchBranch = json.catchBranch ? json.catchBranch.map(fromProtocolJSON) : undefined;
    const finallyBranch = json.finallyBranch ? json.finallyBranch.map(fromProtocolJSON) : undefined;
    return applyV12Metadata(
      createTryNode(body, catchBranch, finallyBranch),
      annotations,
      diagnostics
    );
  }

  if (json.asyncVariant) {
    const asyncBody = (json.asyncBody ?? []).map(fromProtocolJSON);
    return applyV12Metadata(
      createAsyncNode(json.asyncVariant as AsyncVariant, asyncBody),
      annotations,
      diagnostics
    );
  }

  if (json.arms && json.arms.length > 0) {
    const arms = json.arms.map(arm => ({
      pattern: valueFromProtocol(arm.pattern),
      body: arm.body.map(fromProtocolJSON),
    }));
    const defaultArm = json.defaultArm ? json.defaultArm.map(fromProtocolJSON) : undefined;
    return applyV12Metadata(createMatchNode(roles, arms, defaultArm), annotations, diagnostics);
  }

  if (json.body && json.body.length > 0 && kind === 'command') {
    return applyV12Metadata(
      createTryNode(json.body.map(fromProtocolJSON)),
      annotations,
      diagnostics
    );
  }

  return applyV12Metadata(createCommandNode(json.action, roles), annotations, diagnostics);
}

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
  if ((!annotations || annotations.length === 0) && (!diagnostics || diagnostics.length === 0))
    return node;
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
      return createExpression(String(value.value ?? value.raw ?? ''));
  }
}

// =============================================================================
// Envelope (v1.2)
// =============================================================================

export function toEnvelopeJSON(envelope: LSEEnvelope): LSEEnvelopeJSON {
  const result: LSEEnvelopeJSON = {
    lseVersion: envelope.lseVersion,
    nodes: envelope.nodes.map(toProtocolJSON),
  };
  if (envelope.features && envelope.features.length > 0) result.features = [...envelope.features];
  return result;
}

export function fromEnvelopeJSON(json: LSEEnvelopeJSON): LSEEnvelope {
  return {
    lseVersion: json.lseVersion,
    ...(json.features && json.features.length > 0 ? { features: json.features } : {}),
    nodes: json.nodes.map(fromProtocolJSON),
  };
}

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

export function validateProtocolJSON(json: unknown): IRDiagnostic[] {
  const diagnostics: IRDiagnostic[] = [];

  if (typeof json !== 'object' || json === null) {
    return [{ severity: 'error', code: 'INVALID_ROOT', message: 'Root must be a JSON object' }];
  }

  const node = json as Record<string, unknown>;
  const kind = 'kind' in node ? String(node.kind) : 'command';

  if ('kind' in node && !VALID_KINDS.has(kind)) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_KIND',
      message: `Invalid kind "${node.kind}". Must be one of: command, event-handler, compound`,
    });
  }

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
      if (v.type === 'flag') {
        if (typeof v.name !== 'string' && !('value' in v))
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_FLAG_NAME',
            message: `Flag role "${role}" missing required field: name (or value)`,
          });
        if (typeof v.enabled !== 'boolean' && !('value' in v))
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_FLAG_ENABLED',
            message: `Flag role "${role}" missing required field: enabled (or value)`,
          });
      }
      if (v.type === 'expression' && typeof v.raw !== 'string' && !('value' in v)) {
        diagnostics.push({
          severity: 'error',
          code: 'MISSING_EXPRESSION_RAW',
          message: `Expression role "${role}" missing required field: raw (or value)`,
        });
      }
    }
  }

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

  if (kind === 'event-handler' && !('trigger' in node)) {
    if (!('body' in node) || !Array.isArray(node.body)) {
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_BODY',
        message: 'event-handler node requires a body array',
      });
    }
  }

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
        message: `Invalid chainType "${node.chainType}"`,
      });
    }
  }

  if ('diagnostics' in node && !Array.isArray(node.diagnostics)) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_DIAGNOSTICS',
      message: 'diagnostics must be an array',
    });
  }

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
        if (typeof a.name !== 'string' || a.name.length === 0)
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_ANNOTATION_NAME',
            message: `annotations[${i}] missing required field: name`,
          });
      }
    }
  }

  if ('asyncVariant' in node && !VALID_ASYNC_VARIANTS.has(String(node.asyncVariant))) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_ASYNC_VARIANT',
      message: `Invalid asyncVariant "${node.asyncVariant}". Must be "all" or "race"`,
    });
  }

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
        if (!arm.pattern || typeof arm.pattern !== 'object')
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_ARM_PATTERN',
            message: `arms[${i}] missing required field: pattern`,
          });
        if (!Array.isArray(arm.body))
          diagnostics.push({
            severity: 'error',
            code: 'MISSING_ARM_BODY',
            message: `arms[${i}] missing required field: body (array)`,
          });
      }
    }
  }

  if ('diagnostics' in node && Array.isArray(node.diagnostics)) {
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
      if (!VALID_DIAGNOSTIC_LEVELS.has(String(d.level)))
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_DIAGNOSTIC_LEVEL',
          message: `diagnostics[${i}].level must be "error", "warning", or "info"`,
        });
      if (typeof d.message !== 'string')
        diagnostics.push({
          severity: 'error',
          code: 'MISSING_DIAGNOSTIC_MESSAGE',
          message: `diagnostics[${i}] missing required field: message`,
        });
    }
  }

  return diagnostics;
}
