/**
 * What an intent runs, and when: the element's decisions as a function of the
 * JSON, with no DOM in it.
 *
 * `planIntent(json)` validates the wire format, reads the node, and returns
 * either a plan (the node to render as ONE script, and the trigger the JSON
 * names, if it names one) or the diagnostics that refuse it. The element
 * refuses what it cannot run as written: it never runs part of an intent.
 */

import {
  createCompoundNode,
  fromProtocolJSON,
  validateProtocolJSON,
  type CommandSchema,
  type IRDiagnostic,
  type SemanticNode,
  type SemanticValue,
} from '@lokascript/intent';

/** The trigger an intent's JSON names: a handler's event, and whether it fires once. */
export interface IntentTrigger {
  event: string;
  once: boolean;
}

export interface IntentPlan {
  ok: true;
  /** The node as read from the JSON. */
  node: SemanticNode;
  /**
   * What runs, as one node: the node itself, or a handler's body as a `then`
   * chain. Rendered to one script, so `it` carries from command to command.
   */
  body: SemanticNode;
  /** Present when the node is an event handler. */
  trigger?: IntentTrigger;
  /** Warnings; an error is a refusal. */
  diagnostics: IRDiagnostic[];
}

export interface IntentRefusal {
  ok: false;
  diagnostics: IRDiagnostic[];
}

export interface PlanOptions {
  /**
   * The actions this page lets an intent run. With a list, the intent is
   * treated as data from outside: every command's action must be listed, no
   * value may be an `expression`, and every other value must be one token (see
   * `checkRestricted`). Without one, an intent is code the page's author wrote.
   */
  allow?: ReadonlySet<string>;
  /** A command schema for an action, if the page registered one. */
  schemaFor?: (action: string) => CommandSchema | undefined;
}

const CHILD_FIELDS = ['body', 'statements', 'thenBranch', 'elseBranch'] as const;

type Children = Partial<Record<(typeof CHILD_FIELDS)[number], SemanticNode[]>>;

function childrenOf(node: SemanticNode): SemanticNode[] {
  const fields = node as unknown as Children;
  return CHILD_FIELDS.flatMap(field => fields[field] ?? []);
}

function walk(node: SemanticNode, visit: (node: SemanticNode, depth: number) => void, depth = 0) {
  visit(node, depth);
  for (const child of childrenOf(node)) walk(child, visit, depth + 1);
}

const error = (code: string, message: string): IRDiagnostic => ({
  severity: 'error',
  code,
  message,
});

// An event the element can listen for itself: one name, no filter (`keyup[key
// is "Enter"]`), no alternatives (`click or keyup`), no `from`.
const EVENT_NAME = /^[A-Za-z][\w:.-]*$/;

function readTrigger(node: SemanticNode, diagnostics: IRDiagnostic[]): IntentTrigger | undefined {
  const event = node.roles.get('event');
  if (event?.type !== 'literal' || typeof event.value !== 'string') {
    diagnostics.push(error('INVALID_EVENT', 'an event handler needs a literal event name'));
    return undefined;
  }
  if (!EVENT_NAME.test(event.value)) {
    diagnostics.push(
      error(
        'UNSUPPORTED_EVENT',
        `<lse-intent> listens for one plain event name; "${event.value}" is not one`
      )
    );
    return undefined;
  }
  const modifiers = (node as { eventModifiers?: Record<string, unknown> }).eventModifiers ?? {};
  let once = false;
  for (const [name, value] of Object.entries(modifiers)) {
    if (value === undefined || value === false) continue;
    if (name === 'once' && value === true) once = true;
    else {
      diagnostics.push(
        error(
          'UNSUPPORTED_MODIFIER',
          `<lse-intent> does not run the "${name}" event modifier (it runs "once"); write the handler in hyperscript`
        )
      );
    }
  }
  return { event: event.value, once };
}

function checkSchema(node: SemanticNode, schema: CommandSchema, diagnostics: IRDiagnostic[]): void {
  for (const spec of schema.roles) {
    const value = node.roles.get(spec.role);
    if (spec.required && !value) {
      diagnostics.push(
        error(
          'MISSING_REQUIRED_ROLE',
          `Required role "${spec.role}" is missing for command "${node.action}"`
        )
      );
      continue;
    }
    if (value && spec.expectedTypes?.length && !spec.expectedTypes.includes(value.type)) {
      diagnostics.push({
        severity: 'warning',
        code: 'UNEXPECTED_ROLE_TYPE',
        message: `Role "${spec.role}" has type "${value.type}" but expected one of: ${spec.expectedTypes.join(', ')}`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Restricted intents: an allow list
// ---------------------------------------------------------------------------

const NAME = /^[A-Za-z_][\w-]*$/;
// `.class`, `#id`, `@attribute`, `*style`.
const SIMPLE_SELECTOR = /^[#.@*][A-Za-z_][\w-]*$/;
// `<button.primary/>`: no nested query, and no `$` or backtick (a template).
const QUERY_SELECTOR = /^<[^<>$`]+\/>$/;
const REFERENCE = /^[:$]?[A-Za-z_]\w*$/;
const NUMBER_OR_DURATION = /^-?\d+(\.\d+)?(ms|s|m|h|px|em|rem|%)?$/;
const PROPERTY = /^[@*]?[A-Za-z_][\w-]*$/;

/** Why a value cannot be let through an allow list; undefined when it can. */
function restrictedValue(value: SemanticValue): string | undefined {
  switch (value.type) {
    case 'expression':
      return 'an expression is code';
    case 'selector':
      if ((value as { scope?: unknown }).scope) return 'a scoped selector';
      return SIMPLE_SELECTOR.test(value.value) || QUERY_SELECTOR.test(value.value)
        ? undefined
        : `selector "${value.value}" is not one selector token`;
    case 'reference':
      return REFERENCE.test(value.value) ? undefined : `reference "${value.value}" is not a name`;
    case 'flag':
      return NAME.test(value.name) ? undefined : `flag "${value.name}" is not a name`;
    case 'property-path':
      if (!PROPERTY.test(value.property)) return `property "${value.property}" is not a name`;
      return restrictedValue(value.object);
    case 'literal': {
      if (typeof value.value !== 'string') return undefined;
      if (value.interpolates) return 'an interpolated literal is code';
      if (value.dataType === 'string') {
        // A string is written in quotes. With a backslash in it, what closes
        // the quotes is the engine's reading of the escapes, not the writer's.
        return value.value.includes('\\') ? 'a string with a backslash' : undefined;
      }
      // Written bare: it has to be one word or number.
      return NAME.test(value.value) || NUMBER_OR_DURATION.test(value.value)
        ? undefined
        : `bare literal "${value.value}" is not one word (a string needs "dataType": "string")`;
    }
  }
}

// ---------------------------------------------------------------------------
// What a renderer left out
// ---------------------------------------------------------------------------

/**
 * The values of `node` that `script` does not hold, as `action.role` paths.
 *
 * A renderer writes the roles it knows for an action and skips the others, so
 * an intent with a misspelt or made-up role would run without it. Checked on
 * the values that are written as they are: a selector, and a string or number
 * literal. (A reference is inflected, `me` to `my`; an expression is rewritten
 * into upstream's spelling; an implicit value is left out by design.)
 */
export function droppedValues(node: SemanticNode, script: string): string[] {
  const missing: string[] = [];
  walk(node, inner => {
    for (const [role, value] of inner.roles) {
      if (value.implicit) continue;
      const written =
        value.type === 'selector'
          ? value.value
          : value.type === 'literal' && typeof value.value !== 'boolean'
            ? String(value.value)
            : undefined;
      if (written !== undefined && written !== '' && !script.includes(written)) {
        missing.push(`${inner.action}.${role} (${written})`);
      }
    }
  });
  return missing;
}

/** Kinds that are structure, with no command of their own to allow. */
const STRUCTURAL = new Set(['event-handler', 'compound']);

function checkRestricted(
  root: SemanticNode,
  allow: ReadonlySet<string>,
  diagnostics: IRDiagnostic[]
): void {
  walk(root, node => {
    if (!STRUCTURAL.has(node.kind) && !(allow.has(node.action) && NAME.test(node.action))) {
      diagnostics.push(
        error('ACTION_NOT_ALLOWED', `"${node.action}" is not in this element's allow list`)
      );
    }
    for (const [role, value] of node.roles) {
      if (node.kind === 'event-handler' && role === 'event') continue; // checked as the trigger
      const why = restrictedValue(value);
      if (why) {
        diagnostics.push(
          error(
            'VALUE_NOT_ALLOWED',
            `${node.action}.${role}: ${why}; an element with an allow list runs plain values only`
          )
        );
      }
    }
    const loop = node as { loopVariable?: unknown; indexVariable?: unknown };
    for (const name of [loop.loopVariable, loop.indexVariable]) {
      if (typeof name === 'string' && !NAME.test(name)) {
        diagnostics.push(error('VALUE_NOT_ALLOWED', `loop variable "${name}" is not a name`));
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Fields the reader would skip
// ---------------------------------------------------------------------------

// Every field a protocol node has. `fromProtocolJSON` reads these and skips
// anything else without a word, so a handler written with `eventModifiers` (the
// verbose form has no such field) ran with the modifier gone.
const NODE_FIELDS = new Set([
  'kind',
  'action',
  'roles',
  'trigger',
  'body',
  'thenBranch',
  'elseBranch',
  'loopVariant',
  'loopBody',
  'loopVariable',
  'indexVariable',
  'statements',
  'chainType',
  'diagnostics',
  'annotations',
]);
const NODE_LISTS = ['body', 'thenBranch', 'elseBranch', 'loopBody', 'statements'];

function checkFields(raw: unknown, diagnostics: IRDiagnostic[], depth = 0): void {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || depth > 64) return;
  const node = raw as Record<string, unknown>;
  for (const key of Object.keys(node)) {
    if (!NODE_FIELDS.has(key)) {
      diagnostics.push(
        error(
          'UNKNOWN_FIELD',
          `"${key}" is not a field of an LSE node${key === 'eventModifiers' ? ' (a modifier goes in the compact form: "trigger": { "event": …, "modifiers": … })' : ''}; it would be skipped`
        )
      );
    }
  }
  for (const list of NODE_LISTS) {
    const children = node[list];
    if (Array.isArray(children))
      for (const child of children) checkFields(child, diagnostics, depth + 1);
  }
}

// ---------------------------------------------------------------------------
// planIntent
// ---------------------------------------------------------------------------

export function planIntent(raw: unknown, options: PlanOptions = {}): IntentPlan | IntentRefusal {
  const diagnostics: IRDiagnostic[] = [...validateProtocolJSON(raw)];
  checkFields(raw, diagnostics);
  if (diagnostics.some(d => d.severity === 'error')) return { ok: false, diagnostics };

  let node: SemanticNode;
  try {
    node = fromProtocolJSON(raw as Parameters<typeof fromProtocolJSON>[0]);
  } catch (err) {
    diagnostics.push(error('DESERIALIZE_ERROR', err instanceof Error ? err.message : String(err)));
    return { ok: false, diagnostics };
  }

  let trigger: IntentTrigger | undefined;
  let body = node;
  if (node.kind === 'event-handler') {
    trigger = readTrigger(node, diagnostics);
    const commands = (node as { body?: SemanticNode[] }).body ?? [];
    if (commands.length === 0) diagnostics.push(error('EMPTY_HANDLER', 'the handler has no body'));
    else body = commands.length === 1 ? commands[0] : createCompoundNode(commands, 'then');
  }

  walk(node, (inner, depth) => {
    // Evaluated, an inner `on …` would install itself on <body>, for good.
    if (depth > 0 && inner.kind === 'event-handler') {
      diagnostics.push(
        error(
          'NESTED_HANDLER',
          'an event handler inside another node cannot be run by <lse-intent>'
        )
      );
    }
    const schema = options.schemaFor?.(inner.action);
    if (schema) checkSchema(inner, schema, diagnostics);
    for (const [role, value] of inner.roles) {
      if (inner.kind === 'event-handler' && role === 'event') continue; // read as the trigger
      if (
        value.type === 'literal' &&
        typeof value.value === 'string' &&
        value.dataType === undefined &&
        /\s/.test(value.value)
      ) {
        diagnostics.push({
          severity: 'warning',
          code: 'BARE_LITERAL',
          message: `${inner.action}.${role}: "${value.value}" has no dataType, so it is written bare, as code. For text, add "dataType": "string".`,
        });
      }
    }
  });

  if (options.allow) checkRestricted(node, options.allow, diagnostics);

  if (diagnostics.some(d => d.severity === 'error')) return { ok: false, diagnostics };
  return { ok: true, node, body, ...(trigger ? { trigger } : {}), diagnostics };
}
