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
  AnyNode,
  SemanticNode,
  SemanticValue,
  SemanticRole,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  CompoundSemanticNode,
  ConditionalSemanticNode,
  LoopSemanticNode,
  LoopVariant,
} from '../types';
import {
  createCommandNode,
  createEventHandlerNode,
  createCompoundNode,
  createConditionalNode,
  createLoopNode,
  createSelector,
  createLiteral,
  createReference,
  createExpression,
  createFlag,
  createPropertyPath,
} from '../types';
import type {
  ProtocolNodeJSON,
  ProtocolValueJSON,
  ProtocolDiagnosticJSON,
  ProtocolChainType,
  IRDiagnostic,
} from './types';
import { LossyEncodingError, allowsLoss, findUnencodable, type EncodeOptions } from './encodable';

// =============================================================================
// Serialization: SemanticNode → ProtocolNodeJSON
// =============================================================================

/**
 * Serialize a node to the protocol wire format.
 *
 * Refuses a node the format cannot carry in full (a kind it has no node for, an
 * event modifier or a clause it has no field for) with a
 * {@link LossyEncodingError}; `{ lossy: 'allow' }` returns the partial encoding.
 */
export function toProtocolJSON(node: AnyNode, opts?: EncodeOptions): ProtocolNodeJSON {
  if (!allowsLoss(opts)) {
    const losses = findUnencodable(node, 'json', n =>
      canEmitCompactTrigger(n as EventHandlerSemanticNode)
    );
    if (losses.length > 0) throw new LossyEncodingError('json', losses, encode(node));
  }
  return encode(node);
}

function encode(node: AnyNode): ProtocolNodeJSON {
  const roles = rolesToProtocol(node.roles);
  let result: ProtocolNodeJSON;

  switch (node.kind) {
    case 'command': {
      const cmd = node as CommandSemanticNode;
      result = { kind: 'command', action: node.action, roles };
      if (cmd.body && cmd.body.length > 0) result.body = cmd.body.map(encode);
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
        body: eh.body.map(encode),
      };
      break;
    }
    case 'compound': {
      const c = node as CompoundSemanticNode;
      result = {
        kind: 'compound',
        action: 'compound',
        statements: c.statements.map(encode),
        chainType: c.chainType,
      };
      break;
    }
    case 'conditional': {
      const cond = node as ConditionalSemanticNode;
      result = { kind: 'command', action: node.action, roles };
      result.thenBranch = cond.thenBranch.map(encode);
      if (cond.elseBranch && cond.elseBranch.length > 0)
        result.elseBranch = cond.elseBranch.map(encode);
      break;
    }
    case 'loop': {
      const loop = node as LoopSemanticNode;
      result = { kind: 'command', action: node.action, roles };
      result.loopVariant = loop.loopVariant;
      result.loopBody = loop.body.map(encode);
      if (loop.loopVariable) result.loopVariable = loop.loopVariable;
      if (loop.indexVariable) result.indexVariable = loop.indexVariable;
      break;
    }
    default: {
      // A kind the wire format has no node for (reached only under
      // `lossy: 'allow'`): what a command node can hold of it.
      result = { kind: 'command', action: node.action, roles };
      const body = (node as { body?: unknown }).body;
      if (Array.isArray(body) && body.length > 0) result.body = (body as AnyNode[]).map(encode);
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
      // `role` is part of the wire format's Diagnostic shape; dropping it here
      // silently lost which role a type-constraint diagnostic was about.
      if (d.role) json.role = d.role;
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
  // defineProperty, not assignment: `result['__proto__'] = v` sets the object's
  // prototype and the role is gone from the JSON.
  for (const [role, value] of roles) {
    Object.defineProperty(result, role, {
      value: valueToProtocol(value),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result;
}

function valueToProtocol(value: SemanticValue): ProtocolValueJSON {
  const json = bareValueToProtocol(value);
  // The marks a renderer reads. Without `implicit`, `remove #x` came back as
  // `remove #x from me`; without `quoted`, `send "a-b"` as `send a-b`.
  if (value.implicit) json.implicit = true;
  if (value.type === 'literal') {
    if (value.quoted) json.quoted = true;
    if (value.interpolates) json.interpolates = true;
  }
  return json;
}

function bareValueToProtocol(value: SemanticValue): ProtocolValueJSON {
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
    case 'property-path': {
      // As itself. Flattened to an expression (`me.@bar`, `#d2.*color`), it was
      // text no hyperscript reader takes.
      const path: ProtocolValueJSON = {
        type: 'property-path',
        object: valueToProtocol(value.object),
        property: value.property,
      };
      if (value.access) path.access = value.access;
      return path;
    }
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

/**
 * Fields and values LSE 3.0 removed with the constructs that had no producer
 * (`try`, `all`/`race`, `match`, pipe chains). Read as if absent they would be a
 * silent loss, so the reader refuses them and the validator reports them.
 */
const REMOVED_FIELDS = [
  'catchBranch',
  'finallyBranch',
  'asyncVariant',
  'asyncBody',
  'arms',
  'defaultArm',
] as const;

function removedFields(json: Record<string, unknown>): string[] {
  const found: string[] = REMOVED_FIELDS.filter(f => f in json);
  if (json.chainType === 'pipe') found.push('chainType "pipe"');
  if ('lseVersion' in json && 'nodes' in json) found.push('envelope (lseVersion, nodes)');
  return found;
}

export function fromProtocolJSON(json: ProtocolNodeJSON): SemanticNode {
  const removed = removedFields(json as unknown as Record<string, unknown>);
  if (removed.length > 0) {
    throw new Error(
      `LSE 3.0 has no ${removed.join(', ')}: LSE carries commands and simple handlers ` +
        `(protocol/README.md). The node was not read.`
    );
  }
  const roles = new Map<SemanticRole, SemanticValue>(
    Object.entries(json.roles ?? {}).map(([role, val]) => [role, valueFromProtocol(val)])
  );

  const annotations = json.annotations?.map(a =>
    a.value !== undefined ? { name: a.name, value: a.value } : { name: a.name }
  );
  const diagnostics = json.diagnostics?.map(d => ({
    severity: d.level as 'error' | 'warning' | 'info',
    message: d.message,
    ...(d.role ? { role: d.role } : {}),
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

  // Either branch makes it a conditional: `if x else y` has an empty `then`,
  // and reading it as a plain command dropped the `else`.
  if (json.thenBranch || (json.elseBranch && json.elseBranch.length > 0)) {
    const thenBranch = (json.thenBranch ?? []).map(fromProtocolJSON);
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

  // A block command (`tell #d2 …`), under its own action and roles.
  if (json.body && json.body.length > 0) {
    const block = {
      ...createCommandNode(json.action, roles),
      body: json.body.map(fromProtocolJSON),
    } as SemanticNode;
    return applyV12Metadata(block, annotations, diagnostics);
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
  const read = bareValueFromProtocol(value);
  const marks: { implicit?: true; quoted?: true; interpolates?: true } = {};
  if (value.implicit === true) marks.implicit = true;
  if (read.type === 'literal') {
    if (value.quoted === true) marks.quoted = true;
    if (value.interpolates === true) marks.interpolates = true;
  }
  return Object.keys(marks).length > 0 ? ({ ...read, ...marks } as SemanticValue) : read;
}

function bareValueFromProtocol(value: ProtocolValueJSON): SemanticValue {
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
      if (value.object && typeof value.property === 'string') {
        const path = createPropertyPath(valueFromProtocol(value.object), value.property);
        return value.access ? { ...path, access: value.access } : path;
      }
      // The older shape, a path as one string: an expression.
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
const VALID_DIAGNOSTIC_LEVELS = new Set(['error', 'warning', 'info']);

/** One value's checks; a property path's owner is a value too. */
function validateValue(
  label: string,
  v: Record<string, unknown>,
  diagnostics: IRDiagnostic[],
  depth = 0
): void {
  if (!('type' in v) || !VALID_VALUE_TYPES.has(String(v.type))) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_VALUE_TYPE',
      message: `${label} has invalid type "${v.type}"`,
    });
  }
  if (v.type === 'flag') {
    if (typeof v.name !== 'string' && !('value' in v))
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_FLAG_NAME',
        message: `${label} (flag) is missing required field: name (or value)`,
      });
    if (typeof v.enabled !== 'boolean' && !('value' in v))
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_FLAG_ENABLED',
        message: `${label} (flag) is missing required field: enabled (or value)`,
      });
  }
  if (v.type === 'expression' && typeof v.raw !== 'string' && !('value' in v)) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_EXPRESSION_RAW',
      message: `${label} (expression) is missing required field: raw (or value)`,
    });
  }
  // What each type's reader takes: without it the node was read with an empty
  // or a stringified value (`add `, `put [object Object] into …`).
  if (
    (v.type === 'selector' || v.type === 'reference') &&
    (typeof v.value !== 'string' || v.value.length === 0)
  ) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_VALUE',
      message: `${label} (${v.type}) needs a non-empty string value`,
    });
  }
  if (v.type === 'literal' && !['string', 'number', 'boolean'].includes(typeof v.value)) {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_VALUE',
      message: `${label} (literal) needs a string, number or boolean value`,
    });
  }
  if (v.type === 'property-path' && 'object' in v) {
    const owner = v.object;
    if (typeof v.property !== 'string' || v.property.length === 0) {
      diagnostics.push({
        severity: 'error',
        code: 'MISSING_PATH_PROPERTY',
        message: `${label} (property-path) is missing required field: property`,
      });
    }
    if (typeof owner !== 'object' || owner === null || Array.isArray(owner) || depth >= 32) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_PATH_OBJECT',
        message: `${label} (property-path) object must be a value`,
      });
    } else {
      validateValue(`${label} object`, owner as Record<string, unknown>, diagnostics, depth + 1);
    }
  } else if (
    v.type === 'property-path' &&
    typeof v.value !== 'string' &&
    typeof v.raw !== 'string'
  ) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_PATH_OBJECT',
      message: `${label} (property-path) needs object and property (or the older one-string value)`,
    });
  }
}

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
      validateValue(`Role "${role}"`, value as Record<string, unknown>, diagnostics);
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

  for (const field of removedFields(node)) {
    diagnostics.push({
      severity: 'error',
      code: 'REMOVED_IN_LSE_3',
      message: `LSE 3.0 has no ${field}: LSE carries commands and simple handlers`,
    });
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
