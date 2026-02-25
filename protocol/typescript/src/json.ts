import {
  type SemanticNode,
  type SemanticValue,
  type NodeKind,
  type ChainType,
  type LSEEnvelope,
  type Annotation,
  selectorValue,
  literalValue,
  referenceValue,
  expressionValue,
  flagValue,
} from './types';

/** A validation diagnostic (error or warning). */
export interface Diagnostic {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

/** Validates a parsed JSON object. Returns diagnostics (empty array = valid). */
export function validateJSON(data: Record<string, unknown>): Diagnostic[] {
  const diags: Diagnostic[] = [];

  const action = data['action'];
  if (typeof action !== 'string' || !action) {
    diags.push({
      severity: 'error',
      code: 'INVALID_ACTION',
      message: "Missing or invalid 'action' field (must be a non-empty string)",
    });
  }

  const roles = data['roles'];
  if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
    const validTypes = new Set([
      'selector', 'literal', 'reference', 'expression', 'property-path', 'flag',
    ]);
    for (const [roleName, rv] of Object.entries(roles as Record<string, unknown>)) {
      if (!rv || typeof rv !== 'object' || Array.isArray(rv)) {
        diags.push({
          severity: 'error',
          code: 'INVALID_ROLE_VALUE',
          message: `Role "${roleName}" must be an object with type and value`,
        });
        continue;
      }
      const roleValue = rv as Record<string, unknown>;
      const vtype = roleValue['type'];
      if (typeof vtype !== 'string' || !validTypes.has(vtype)) {
        diags.push({
          severity: 'error',
          code: 'INVALID_VALUE_TYPE',
          message: `Role "${roleName}" has invalid type "${vtype}"`,
        });
      }
    }
  }

  const trigger = data['trigger'];
  if (trigger && typeof trigger === 'object' && !Array.isArray(trigger)) {
    const event = (trigger as Record<string, unknown>)['event'];
    if (typeof event !== 'string' || !event) {
      diags.push({
        severity: 'error',
        code: 'INVALID_TRIGGER',
        message: "Trigger must have a non-empty 'event' string",
      });
    }
  }

  return diags;
}

/** Converts a SemanticNode to a full-fidelity JSON-compatible object. */
export function toJSON(node: SemanticNode): Record<string, unknown> {
  const m: Record<string, unknown> = {
    kind: node.kind,
    action: node.action,
    roles: marshalRoles(node.roles),
  };

  if (node.body && node.body.length > 0) {
    m['body'] = node.body.map(toJSON);
  }

  if (node.kind === 'compound') {
    m['statements'] = (node.statements ?? []).map(toJSON);
    if (node.chainType) m['chainType'] = node.chainType;
  }

  // Conditional fields (v1.1)
  if (node.thenBranch && node.thenBranch.length > 0) {
    m['thenBranch'] = node.thenBranch.map(toJSON);
  }
  if (node.elseBranch && node.elseBranch.length > 0) {
    m['elseBranch'] = node.elseBranch.map(toJSON);
  }

  // Loop fields (v1.1)
  if (node.loopVariant) m['loopVariant'] = node.loopVariant;
  if (node.loopBody && node.loopBody.length > 0) {
    m['loopBody'] = node.loopBody.map(toJSON);
  }
  if (node.loopVariable) m['loopVariable'] = node.loopVariable;
  if (node.indexVariable) m['indexVariable'] = node.indexVariable;

  // Diagnostics (v1.2)
  if (node.diagnostics && node.diagnostics.length > 0) {
    m['diagnostics'] = node.diagnostics.map(d => ({
      level: d.level,
      role: d.role,
      message: d.message,
      code: d.code,
    }));
  }

  // Annotations (v1.2)
  if (node.annotations && node.annotations.length > 0) {
    m['annotations'] = node.annotations.map(a =>
      a.value !== undefined ? { name: a.name, value: a.value } : { name: a.name },
    );
  }

  // Error handling (v1.2): try/catch/finally
  if (node.catchBranch && node.catchBranch.length > 0) {
    m['catchBranch'] = node.catchBranch.map(toJSON);
  }
  if (node.finallyBranch && node.finallyBranch.length > 0) {
    m['finallyBranch'] = node.finallyBranch.map(toJSON);
  }

  // Async coordination (v1.2): all/race
  if (node.asyncVariant) m['asyncVariant'] = node.asyncVariant;
  if (node.asyncBody && node.asyncBody.length > 0) {
    m['asyncBody'] = node.asyncBody.map(toJSON);
  }

  return m;
}

/**
 * Converts a protocol wire format object to a SemanticNode.
 * Accepts both full-fidelity and LLM-simplified formats.
 */
export function fromJSON(data: Record<string, unknown>): SemanticNode {
  const action = (data['action'] as string) ?? '';
  const rawRoles = (data['roles'] as Record<string, unknown>) ?? {};

  const roles: Record<string, SemanticValue> = {};
  for (const [roleName, rv] of Object.entries(rawRoles)) {
    if (rv && typeof rv === 'object' && !Array.isArray(rv)) {
      roles[roleName] = convertJSONValue(rv as Record<string, unknown>);
    }
  }

  // LLM-simplified format: trigger field wraps command in event-handler
  const trigger = data['trigger'] as Record<string, unknown> | undefined;
  if (trigger) {
    const eventName = (trigger['event'] as string) ?? '';
    return {
      kind: 'event-handler',
      action: 'on',
      roles: { event: literalValue(eventName, 'string') },
      body: [{ kind: 'command', action, roles }],
    };
  }

  // Full-fidelity format: kind field
  const kind = ((data['kind'] as string) ?? 'command') as NodeKind;

  if (kind === 'event-handler') {
    const body: SemanticNode[] = [];
    const bodyData = data['body'] as unknown[] | undefined;
    if (Array.isArray(bodyData)) {
      for (const b of bodyData) {
        if (b && typeof b === 'object' && !Array.isArray(b)) {
          body.push(fromJSON(b as Record<string, unknown>));
        }
      }
    }
    const ehAnnotations = deserializeAnnotations(data['annotations']);
    const ehNode: SemanticNode = { kind: 'event-handler', action, roles, body };
    if (ehAnnotations) ehNode.annotations = ehAnnotations;
    return ehNode;
  }

  if (kind === 'compound') {
    const statements: SemanticNode[] = [];
    const stmtsData = data['statements'] as unknown[] | undefined;
    if (Array.isArray(stmtsData)) {
      for (const s of stmtsData) {
        if (s && typeof s === 'object' && !Array.isArray(s)) {
          statements.push(fromJSON(s as Record<string, unknown>));
        }
      }
    }
    const chainType = ((data['chainType'] as string) || 'then') as ChainType;
    const cmpAnnotations = deserializeAnnotations(data['annotations']);
    const cmpNode: SemanticNode = { kind: 'compound', action, roles, statements, chainType };
    if (cmpAnnotations) cmpNode.annotations = cmpAnnotations;
    return cmpNode;
  }

  // Command node — with optional v1.1 conditional/loop fields
  const node: SemanticNode = { kind: 'command', action, roles };

  // body (used by try, all, race)
  const cmdBody = deserializeNodeArray(data['body']);
  if (cmdBody.length > 0) node.body = cmdBody;

  // Conditional fields (v1.1)
  const thenBranch = deserializeNodeArray(data['thenBranch']);
  if (thenBranch.length > 0) node.thenBranch = thenBranch;
  const elseBranch = deserializeNodeArray(data['elseBranch']);
  if (elseBranch.length > 0) node.elseBranch = elseBranch;

  // Loop fields (v1.1)
  if (typeof data['loopVariant'] === 'string') {
    node.loopVariant = data['loopVariant'] as SemanticNode['loopVariant'];
  }
  const loopBody = deserializeNodeArray(data['loopBody']);
  if (loopBody.length > 0) node.loopBody = loopBody;
  if (typeof data['loopVariable'] === 'string') node.loopVariable = data['loopVariable'];
  if (typeof data['indexVariable'] === 'string') node.indexVariable = data['indexVariable'];

  // Diagnostics (v1.2)
  const diagnosticsRaw = data['diagnostics'];
  if (Array.isArray(diagnosticsRaw) && diagnosticsRaw.length > 0) {
    node.diagnostics = diagnosticsRaw
      .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
      .map(d => ({
        level: (d['level'] as 'error' | 'warning') ?? 'error',
        role: (d['role'] as string) ?? '',
        message: (d['message'] as string) ?? '',
        code: (d['code'] as string) ?? '',
      }));
  }

  // Annotations (v1.2)
  const annotations = deserializeAnnotations(data['annotations']);
  if (annotations) node.annotations = annotations;

  // Error handling (v1.2): try/catch/finally
  const catchBranch = deserializeNodeArray(data['catchBranch']);
  if (catchBranch.length > 0) node.catchBranch = catchBranch;
  const finallyBranch = deserializeNodeArray(data['finallyBranch']);
  if (finallyBranch.length > 0) node.finallyBranch = finallyBranch;

  // Async coordination (v1.2): all/race
  const av = data['asyncVariant'] as string | undefined;
  if (av === 'all' || av === 'race') node.asyncVariant = av;
  const asyncBody = deserializeNodeArray(data['asyncBody']);
  if (asyncBody.length > 0) node.asyncBody = asyncBody;

  return node;
}

/**
 * Check if data is an LSE versioned envelope (v1.2).
 */
export function isEnvelope(data: Record<string, unknown>): boolean {
  return typeof data['lseVersion'] === 'string' && Array.isArray(data['nodes']);
}

/**
 * Convert a versioned envelope to its typed form.
 */
export function fromEnvelopeJSON(data: Record<string, unknown>): LSEEnvelope {
  const lseVersion = data['lseVersion'] as string;
  const features = Array.isArray(data['features'])
    ? (data['features'] as string[])
    : undefined;
  const nodesRaw = (data['nodes'] as unknown[]) ?? [];
  const nodes: SemanticNode[] = nodesRaw
    .filter((n): n is Record<string, unknown> => n != null && typeof n === 'object' && !Array.isArray(n))
    .map(n => fromJSON(n));

  return { lseVersion, ...(features && { features }), nodes };
}

/**
 * Convert a typed envelope to a JSON-compatible object.
 */
export function toEnvelopeJSON(envelope: LSEEnvelope): Record<string, unknown> {
  const result: Record<string, unknown> = {
    lseVersion: envelope.lseVersion,
    nodes: envelope.nodes.map(toJSON),
  };
  if (envelope.features && envelope.features.length > 0) {
    result['features'] = envelope.features;
  }
  return result;
}

function deserializeAnnotations(arr: unknown): Annotation[] | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const result: Annotation[] = [];
  for (const item of arr) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const a = item as Record<string, unknown>;
      if (typeof a['name'] === 'string') {
        const ann: Annotation = { name: a['name'] };
        if (typeof a['value'] === 'string') ann.value = a['value'];
        result.push(ann);
      }
    }
  }
  return result.length > 0 ? result : undefined;
}

function deserializeNodeArray(arr: unknown): SemanticNode[] {
  const result: SemanticNode[] = [];
  if (Array.isArray(arr)) {
    for (const item of arr) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        result.push(fromJSON(item as Record<string, unknown>));
      }
    }
  }
  return result;
}

function marshalRoles(roles: Record<string, SemanticValue>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(roles)) {
    result[k] = marshalValue(v);
  }
  return result;
}

function marshalValue(v: SemanticValue): Record<string, unknown> {
  const m: Record<string, unknown> = { type: v.type };
  switch (v.type) {
    case 'selector':
      m['value'] = v.value;
      if (v.selectorKind) m['selectorKind'] = v.selectorKind;
      break;
    case 'reference':
      m['value'] = v.value;
      break;
    case 'literal':
      m['value'] = v.value;
      if (v.dataType) m['dataType'] = v.dataType;
      break;
    case 'expression':
    case 'property-path':
      m['raw'] = v.raw;
      break;
    case 'flag':
      m['name'] = v.name;
      m['enabled'] = v.enabled;
      break;
  }
  return m;
}

function convertJSONValue(data: Record<string, unknown>): SemanticValue {
  const vtype = data['type'] as string;

  switch (vtype) {
    case 'selector': {
      const sv = selectorValue((data['value'] as string) ?? '');
      const sk = data['selectorKind'] as string | undefined;
      if (sk) (sv as Record<string, unknown>).selectorKind = sk;
      return sv;
    }

    case 'literal': {
      const value = data['value'];
      if (typeof value === 'boolean') return literalValue(value, 'boolean');
      if (typeof value === 'number') {
        return literalValue(Number.isInteger(value) ? value : value, 'number');
      }
      const dataType = (data['dataType'] as string) || 'string';
      return literalValue(String(value ?? ''), dataType);
    }

    case 'reference':
      return referenceValue(String(data['value'] ?? ''));

    case 'expression': {
      // LLM-simplified format may use 'value' instead of 'raw'
      const raw = (data['raw'] as string) || String(data['value'] ?? '');
      return expressionValue(raw);
    }

    case 'flag': {
      // LLM-simplified format may use { type: 'flag', value: true } instead of { name, enabled }
      const name = (data['name'] as string) || '';
      const enabled = typeof data['enabled'] === 'boolean' ? data['enabled'] : true;
      return flagValue(name, enabled);
    }

    case 'property-path':
      return expressionValue(String(data['value'] ?? ''));

    default:
      return literalValue(String(data['value'] ?? ''), 'string');
  }
}
