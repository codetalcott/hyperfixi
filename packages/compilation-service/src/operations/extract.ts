/**
 * Operation Extraction
 *
 * Converts a SemanticNode (from the parsing pipeline) into a BehaviorSpec
 * containing abstract operations. This is the bridge between semantic roles
 * and framework-agnostic behavior descriptions.
 */

import type { AbstractOperation, BehaviorSpec, TargetRef } from './types.js';

// =============================================================================
// Internal Types (mirrors SemanticNode shape without importing semantic types)
// =============================================================================

interface RoleValue {
  type?: string;
  value?: unknown;
  raw?: string;
  selectorKind?: string;
  dataType?: string;
  scope?: string;
  implicit?: boolean;
  /** property-path values carry object + property instead of value. */
  object?: unknown;
  property?: string;
}

interface NodeLike {
  kind?: string;
  action?: string;
  roles?: ReadonlyMap<string, RoleValue>;
  body?: NodeLike[];
  /** compound: the commands of a `then` chain */
  statements?: NodeLike[];
  /** conditional */
  thenBranch?: NodeLike[];
  elseBranch?: NodeLike[];
  /** loop */
  loopVariant?: string;
  loopVariable?: string;
  indexVariable?: string;
  eventModifiers?: Record<string, unknown>;
  metadata?: { sourceText?: string };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Extract abstract operations from a semantic node.
 *
 * Handles event handlers (extracts trigger + recurses into body)
 * and standalone commands.
 */
export function extractOperations(node: unknown): BehaviorSpec {
  const n = node as NodeLike;
  if (!n || typeof n !== 'object') {
    return emptySpec();
  }

  // Event handler: extract trigger and recurse into body
  if (n.kind === 'event-handler' || n.action === 'on') {
    return extractEventHandler(n);
  }

  // Standalone command: wrap with default trigger
  const ops = extractCommand(n);
  return {
    trigger: { event: 'click' },
    triggerTarget: { kind: 'self' },
    operations: ops,
    async: ops.some(isAsyncOp),
    source: n.metadata?.sourceText,
  };
}

// =============================================================================
// Event Handler Extraction
// =============================================================================

function extractEventHandler(n: NodeLike): BehaviorSpec {
  // A colon-qualified event is an expression (`raw`), not a literal (`value`).
  const eventRole = n.roles?.get('event') as (RoleValue & { raw?: unknown }) | undefined;
  const named = eventRole?.value ?? eventRole?.raw;
  const eventName = typeof named === 'string' && named.length > 0 ? named : 'click';

  const operations = extractList(n.body);

  return {
    trigger: {
      event: eventName,
      modifiers: n.eventModifiers,
    },
    triggerTarget: { kind: 'self' },
    operations,
    async: operations.some(isAsyncOp),
    source: n.metadata?.sourceText,
  };
}

// =============================================================================
// Command Extraction
// =============================================================================

function extractList(nodes: NodeLike[] | undefined): AbstractOperation[] {
  return Array.isArray(nodes) ? nodes.flatMap(extractCommand) : [];
}

/**
 * The roles each operation's own fields carry. A written role outside its list goes in the
 * operation's `extra`, so no part of the parse is left out of the comparison.
 */
const CARRIED_ROLES: Record<string, readonly string[]> = {
  toggle: ['patient', 'destination'],
  add: ['patient', 'destination'],
  remove: ['patient', 'source'],
  put: ['patient', 'destination', 'method'],
  append: ['patient', 'destination'],
  show: ['patient'],
  hide: ['patient'],
  set: ['destination', 'patient'],
  increment: ['patient', 'quantity'],
  decrement: ['patient', 'quantity'],
  go: ['destination'],
  fetch: ['source', 'responseType', 'destination'],
  wait: ['duration', 'patient'],
  send: ['patient', 'destination'],
  trigger: ['patient', 'destination'],
  focus: ['patient'],
  blur: ['patient'],
  log: ['patient'],
};

function extractCommand(n: NodeLike): AbstractOperation[] {
  if (!n || typeof n !== 'object') return [];
  // A `then` chain: its commands, in order.
  if (n.kind === 'compound' || n.action === 'compound') return extractList(n.statements);
  if (n.kind === 'conditional') {
    return [
      {
        op: 'conditional',
        negated: n.action === 'unless',
        condition: roleString(n.roles?.get('condition')),
        then: extractList(n.thenBranch),
        else: extractList(n.elseBranch),
      },
    ];
  }
  if (n.kind === 'loop') {
    const roles = writtenRoles(n.roles);
    if (n.loopVariable) roles['loopVariable'] = n.loopVariable;
    if (n.indexVariable) roles['indexVariable'] = n.indexVariable;
    return [
      { op: 'loop', variant: n.loopVariant ?? n.action ?? '', roles, body: extractList(n.body) },
    ];
  }

  const action = n.action;
  if (!action || action === 'on') return [];

  const ops = Array.isArray(n.body) ? [] : extractKnownCommand(action, n.roles);
  // An operation that cannot describe this command (`wait for <event>`, a command with a
  // block), or a command no operation describes: its action and every written role.
  if (ops.length !== 1) return [genericCommand(n, action)];

  const carried = CARRIED_ROLES[action] ?? [];
  const extra = writtenRoles(n.roles, role => !carried.includes(role));
  return Object.keys(extra).length > 0 ? [{ ...ops[0], extra }] : ops;
}

function genericCommand(n: NodeLike, action: string): AbstractOperation {
  const op: AbstractOperation = { op: 'command', action, roles: writtenRoles(n.roles) };
  if (Array.isArray(n.body)) op.body = extractList(n.body);
  return op;
}

/** A role's value as text: a literal's or selector's value, an expression's (normalized) text. */
function roleString(role: RoleValue | undefined): string {
  if (!role) return '';
  if (role.type === 'property-path') {
    const owner = role.object as RoleValue | string | undefined;
    const ownerText = typeof owner === 'object' ? roleString(owner) : String(owner ?? '');
    return `${ownerText}'s ${role.property ?? ''}`;
  }
  const value = role.value ?? role.raw;
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
}

/** The roles the source wrote (a default the parse filled in is `implicit`), sorted by name. */
function writtenRoles(
  roles: ReadonlyMap<string, RoleValue> | undefined,
  keep: (role: string) => boolean = () => true
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!roles || typeof roles.entries !== 'function') return out;
  for (const [role, value] of [...roles.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (value?.implicit || !keep(role)) continue;
    out[role] = roleString(value);
  }
  return out;
}

function extractKnownCommand(
  action: string,
  roles: ReadonlyMap<string, RoleValue> | undefined
): AbstractOperation[] {
  switch (action) {
    // --- DOM Class ---
    case 'toggle':
      return extractClassOp('toggleClass', roles);
    case 'add':
      return extractClassOp('addClass', roles);
    case 'remove':
      return extractClassOp('removeClass', roles);

    // --- DOM Content ---
    case 'put':
      return extractPut(roles);
    case 'append':
      return extractAppend(roles);

    // --- DOM Visibility ---
    case 'show':
      return extractVisibility('show', roles);
    case 'hide':
      return extractVisibility('hide', roles);

    // --- Variables ---
    case 'set':
      return extractSet(roles);
    case 'increment':
      return extractIncrDecr('increment', roles);
    case 'decrement':
      return extractIncrDecr('decrement', roles);

    // --- Navigation ---
    case 'go':
      return extractGo(roles);

    // --- Async ---
    case 'fetch':
      return extractFetch(roles);
    case 'wait':
      return extractWait(roles);

    // --- Events ---
    case 'send':
    case 'trigger':
      return extractTriggerEvent(roles);

    // --- Focus ---
    case 'focus':
      return [{ op: 'focus', target: resolveTarget(roles, 'patient') }];
    case 'blur':
      return [{ op: 'blur', target: resolveTarget(roles, 'patient') }];

    // --- Utility ---
    case 'log':
      return extractLog(roles);

    default:
      return [];
  }
}

// =============================================================================
// Per-Command Extractors
// =============================================================================

function extractClassOp(
  op: 'toggleClass' | 'addClass' | 'removeClass',
  roles: ReadonlyMap<string, RoleValue> | undefined
): AbstractOperation[] {
  const patient = roles?.get('patient');
  if (!patient) return [];

  const value = String(patient.value ?? '');
  const className = value.startsWith('.') ? value.slice(1) : value;
  if (!className) return [];

  const target = resolveTarget(roles, op === 'removeClass' ? 'source' : 'destination');

  return [{ op, className, target }];
}

function extractPut(roles: ReadonlyMap<string, RoleValue> | undefined): AbstractOperation[] {
  const patient = roles?.get('patient');
  if (!patient) return [];

  const content = String(patient.value ?? patient.raw ?? '');
  const target = resolveTarget(roles, 'destination');

  // Determine position from method role
  const method = roles?.get('method');
  let position: 'into' | 'before' | 'after' | 'start' | 'end' = 'into';
  if (method?.value) {
    const m = String(method.value);
    if (m === 'before') position = 'before';
    else if (m === 'after') position = 'after';
    else if (m === 'start' || m === 'at start of') position = 'start';
    else if (m === 'end' || m === 'at end of') position = 'end';
  }

  return [{ op: 'setContent', content, target, position }];
}

function extractAppend(roles: ReadonlyMap<string, RoleValue> | undefined): AbstractOperation[] {
  const patient = roles?.get('patient');
  if (!patient) return [];

  const content = String(patient.value ?? patient.raw ?? '');
  const target = resolveTarget(roles, 'destination');

  return [{ op: 'appendContent', content, target }];
}

function extractVisibility(
  op: 'show' | 'hide',
  roles: ReadonlyMap<string, RoleValue> | undefined
): AbstractOperation[] {
  const target = resolveTarget(roles, 'patient');
  return [{ op, target }];
}

function extractSet(roles: ReadonlyMap<string, RoleValue> | undefined): AbstractOperation[] {
  const destination = roles?.get('destination');
  const patient = roles?.get('patient');

  if (!destination && !patient) return [];

  // Variable assignment: set :count to 5
  const targetRole = destination ?? patient;
  const valueRole = destination ? patient : undefined;

  const name = String(targetRole?.value ?? '');
  const value = valueRole ? String(valueRole.value ?? '') : '';
  const scope = (targetRole?.scope ?? 'local') as 'local' | 'element' | 'global';

  return [{ op: 'setVariable', name, value, scope }];
}

function extractIncrDecr(
  op: 'increment' | 'decrement',
  roles: ReadonlyMap<string, RoleValue> | undefined
): AbstractOperation[] {
  const target = resolveTarget(roles, 'patient');

  // Amount from quantity role
  const quantity = roles?.get('quantity');
  const amount = quantity?.value ? Number(quantity.value) : 1;

  return [{ op, target, amount }];
}

function extractGo(roles: ReadonlyMap<string, RoleValue> | undefined): AbstractOperation[] {
  const destination = roles?.get('destination');
  if (!destination) return [];

  const url = String(destination.value ?? '');

  if (url === 'back') return [{ op: 'historyBack' }];
  if (url === 'forward') return [{ op: 'historyForward' }];

  return [{ op: 'navigate', url }];
}

function extractFetch(roles: ReadonlyMap<string, RoleValue> | undefined): AbstractOperation[] {
  const source = roles?.get('source');
  if (!source) return [];

  const url = String(source.value ?? source.raw ?? '');

  const responseType = roles?.get('responseType');
  let format: 'json' | 'text' | 'html' = 'text';
  if (responseType?.value) {
    const f = String(responseType.value);
    if (f === 'json') format = 'json';
    else if (f === 'html') format = 'html';
  }

  const destRole = roles?.get('destination');
  const target = destRole ? resolveTargetFromRole(destRole) : undefined;

  return [{ op: 'fetch', url, format, target }];
}

function extractWait(roles: ReadonlyMap<string, RoleValue> | undefined): AbstractOperation[] {
  const duration = roles?.get('duration') ?? roles?.get('patient');
  if (!duration) return [];

  let ms = 0;
  const val = duration.value;
  if (typeof val === 'number') {
    ms = val;
  } else if (typeof val === 'string') {
    ms = parseDurationMs(val);
  }

  return [{ op: 'wait', durationMs: ms }];
}

function extractTriggerEvent(
  roles: ReadonlyMap<string, RoleValue> | undefined
): AbstractOperation[] {
  const patient = roles?.get('patient');
  if (!patient) return [];

  const eventName = String(patient.value ?? '');
  const target = resolveTarget(roles, 'destination');

  return [{ op: 'triggerEvent', eventName, target }];
}

function extractLog(roles: ReadonlyMap<string, RoleValue> | undefined): AbstractOperation[] {
  const patient = roles?.get('patient');
  const values: string[] = [];

  if (patient) {
    values.push(String(patient.value ?? patient.raw ?? ''));
  }

  return [{ op: 'log', values }];
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolve a target reference from the roles map.
 * Falls back to { kind: 'self' } if the role is missing or defaults to 'me'.
 */
function resolveTarget(
  roles: ReadonlyMap<string, RoleValue> | undefined,
  roleName: string
): TargetRef {
  const role = roles?.get(roleName);
  if (!role) return { kind: 'self' };
  return resolveTargetFromRole(role);
}

function resolveTargetFromRole(role: RoleValue): TargetRef {
  // An expression carries its text in `raw`: `toggle .a on this` is not `on me` (`this` is
  // an undefined variable in hyperscript), and read `.value` alone it resolved to self.
  const value = roleString(role);

  // Reference to self
  if (role.type === 'reference' && (value === 'me' || value === 'it')) {
    return { kind: 'self' };
  }

  // Variable reference
  if (value.startsWith(':') || role.scope) {
    return { kind: 'variable', value };
  }

  // CSS selector
  if (
    role.type === 'selector' ||
    value.startsWith('#') ||
    value.startsWith('.') ||
    value.startsWith('[')
  ) {
    return { kind: 'selector', value };
  }

  // Literal URL or other value — treat as selector if it looks like one
  if (value) {
    return { kind: 'selector', value };
  }

  return { kind: 'self' };
}

function isAsyncOp(op: AbstractOperation): boolean {
  return op.op === 'fetch' || op.op === 'wait';
}

function parseDurationMs(value: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const unit = match[2] ?? 'ms';

  switch (unit) {
    case 'ms':
      return num;
    case 's':
      return num * 1000;
    case 'm':
      return num * 60000;
    case 'h':
      return num * 3600000;
    default:
      return num;
  }
}

function emptySpec(): BehaviorSpec {
  return {
    trigger: { event: 'click' },
    triggerTarget: { kind: 'self' },
    operations: [],
    async: false,
  };
}
