/**
 * What the protocol cannot carry
 *
 * A SemanticNode holds more than the wire format has fields for: a parser built
 * on these types adds node kinds (`feature`, `def`, `behavior`), clauses
 * (`catchBody`, `headClause`, `verbatimClause`) and event modifiers (`from`,
 * `every`) of its own. `toProtocolJSON` and `renderExplicit` used to write what
 * they knew and drop the rest (or, for an unknown kind, return `undefined`), so
 * `on click from #x debounced at 200ms toggle .a` came back as
 * `on click toggle .a`. Measured on 1,166 engine-accepted scripts (2026-11-12):
 * 244 could not be encoded as JSON at all and 71 more lost a command, a role or
 * a value, none of them reported.
 *
 * Both writers now refuse such a node with a {@link LossyEncodingError} that
 * names each part they cannot carry. `{ lossy: 'allow' }` returns the partial
 * encoding, as `translate()`'s option of the same name does.
 *
 * The rule is an allowlist: a field is carried only if the writer has a line
 * for it, so a field a parser adds tomorrow is refused until a writer learns it.
 */

import type { AnyNode, SemanticValue } from '../types';

export interface EncodeOptions {
  /**
   * `'throw'` (the default) refuses a node the encoding cannot carry in full
   * with a {@link LossyEncodingError}; `'allow'` returns the partial encoding.
   */
  lossy?: 'throw' | 'allow';
}

export type EncodingSurface = 'json' | 'bracket';

/** A node `toProtocolJSON` or `renderExplicit` refused: the encoding would lose part of it. */
export class LossyEncodingError extends Error {
  /** Each part the encoding cannot carry, as a path (`event-handler.eventModifiers.from`). */
  readonly losses: readonly string[];
  /** The encoding the writer would have returned (protocol JSON, or bracket text). */
  readonly partial: unknown;
  readonly surface: EncodingSurface;

  constructor(surface: EncodingSurface, losses: readonly string[], partial: unknown) {
    const what = surface === 'json' ? 'protocol JSON' : 'bracket syntax';
    const shown = losses.slice(0, 6).join(', ') + (losses.length > 6 ? ', …' : '');
    super(
      `${what} cannot carry this node in full (${shown}). ` +
        `Pass { lossy: 'allow' } for the partial encoding.`
    );
    this.name = 'LossyEncodingError';
    this.surface = surface;
    this.losses = losses;
    this.partial = partial;
  }
}

/** `opts` may be an array index when a caller writes `nodes.map(toProtocolJSON)`. */
export function allowsLoss(opts: unknown): boolean {
  return typeof opts === 'object' && opts !== null && (opts as EncodeOptions).lossy === 'allow';
}

// Fields that hold no part of the script's meaning. `diagnostics` is carried by
// JSON and is not part of the bracket surface; either way it is not a loss.
const NODE_META = ['kind', 'action', 'roles', 'metadata', 'annotations', 'diagnostics'];

// Per node kind: fields whose value is a list of child nodes, and scalar fields.
const NODE_FIELDS: Record<string, { children: string[]; scalars: string[] }> = {
  command: { children: ['body'], scalars: [] },
  'event-handler': { children: ['body'], scalars: ['eventModifiers'] },
  compound: { children: ['statements'], scalars: ['chainType'] },
  conditional: { children: ['thenBranch', 'elseBranch'], scalars: [] },
  loop: { children: ['body'], scalars: ['loopVariant', 'loopVariable', 'indexVariable'] },
};

// Modifiers the JSON `trigger` sugar carries. The verbose event-handler form
// and bracket syntax carry none.
const TRIGGER_MODIFIERS = new Set(['once', 'debounce', 'throttle', 'queue']);

const VALUE_META = ['type', 'position', 'implicit', 'quoted'];
const VALUE_FIELDS: Record<string, string[]> = {
  literal: ['value', 'dataType'],
  selector: ['value', 'selectorKind'],
  reference: ['value'],
  // `value` repeats `raw` (the wire format's shorthand).
  expression: ['raw', 'value'],
  // Written flattened to its text: a change of type the wire format documents.
  'property-path': ['object', 'property', 'access'],
  flag: ['name', 'enabled'],
};

function holdsSomething(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Map) return v.size > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
}

/**
 * The parts of `node` the surface has no place for, as paths. Empty when the
 * node's fields all have one. (Bracket syntax has a second way to lose input,
 * text its own parser reads differently: `renderExplicit` checks that itself.)
 */
export function findUnencodable(
  node: AnyNode,
  surface: EncodingSurface,
  /** Whether JSON writes this event handler in the compact `trigger` form. */
  isCompactTrigger: (node: AnyNode) => boolean = () => false
): string[] {
  const losses: string[] = [];
  const add = (path: string): void => {
    if (!losses.includes(path)) losses.push(path);
  };

  const visitValue = (value: SemanticValue, path: string): void => {
    const carried = VALUE_FIELDS[value.type];
    if (!carried) return add(`${path}:${String(value.type)}`);
    for (const key of Object.keys(value)) {
      if (VALUE_META.includes(key) || carried.includes(key)) continue;
      if (holdsSomething((value as unknown as Record<string, unknown>)[key])) add(`${path}.${key}`);
    }
    if (value.type === 'property-path') visitValue(value.object, path);
  };

  const visit = (n: AnyNode): void => {
    const fields = NODE_FIELDS[n.kind];
    if (!fields) return add(`kind '${String(n.kind)}'`);
    const rec = n as unknown as Record<string, unknown>;

    for (const key of Object.keys(rec)) {
      if (NODE_META.includes(key) || !holdsSomething(rec[key])) continue;
      const known = fields.children.includes(key) || fields.scalars.includes(key);
      if (!known) {
        add(`${n.kind}.${key}`);
        continue;
      }
      if (key === 'eventModifiers') {
        const compact = surface === 'json' && isCompactTrigger(n);
        for (const [mod, val] of Object.entries(rec[key] as object)) {
          if (!holdsSomething(val)) continue;
          if (!compact || !TRIGGER_MODIFIERS.has(mod)) add(`${n.kind}.eventModifiers.${mod}`);
        }
      }
    }

    for (const [role, value] of n.roles) visitValue(value, `${n.action}.${role}`);
    for (const key of fields.children) {
      const list = rec[key];
      if (Array.isArray(list)) for (const child of list) visit(child as AnyNode);
    }
  };

  visit(node);
  return losses;
}
