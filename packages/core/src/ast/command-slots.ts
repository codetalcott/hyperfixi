/**
 * The slot keys each command can carry — ONE table, and the type behind
 * every `parseInput`'s `raw.modifiers`.
 *
 * Arc 3 step 2 (`docs-internal/ENGINE_MIGRATION_PLAN.md`). A slot is a
 * keyword-introduced operand the parser puts under `modifiers.<key>` instead
 * of in `args` (`toggle .a on #x` → `modifiers.on`). Until now the key space
 * was `Record<string, …>`: a command could read any key, and a read no
 * parser ever satisfied — the shape #1068 shipped, `trigger` reading
 * `modifiers.on` while its parser still pushed `on` into `args` — compiled
 * and passed every hand-built fixture. `slot-key-parity.test.ts` catches that
 * at test time by measuring what the parsers emit; this table makes it a
 * COMPILE error: `raw.modifiers.<key>` must name a key in the command's row.
 *
 * The table is declared, not derived, because it is a TYPE — but it is not
 * trusted: `command-slots.test.ts` pins every row to the union of what the
 * core parser emits (measured by parsing the command's own documented
 * examples), what `@lokascript/semantic`'s schema descriptor emits, and what
 * the command reads, in both directions. A key with no emitter and no reader
 * is a phantom; a key emitted or read but not declared is the compile error
 * this exists to produce.
 *
 * Generic keys (`when`/`where` guards, `debounced`/`throttled` delays) are
 * attached by the parser to any command and are legal everywhere.
 */

import type { ASTNode, ExpressionNode } from '../types/core';
import type { BodyOps } from '../types/program';

/** Keys the parser can attach to ANY command. */
export const GENERIC_SLOT_KEYS = ['when', 'where', 'debounce', 'throttle'] as const;
export type GenericSlotKey = (typeof GENERIC_SLOT_KEYS)[number];

/**
 * Per-command slot keys. Rows are the command's own keys only — never the
 * generic ones. Order within a row is not significant.
 */
export const COMMAND_SLOTS = {
  add: ['to'],
  append: ['to'],
  async: [],
  beep: [],
  blur: [],
  break: [],
  breakpoint: [],
  call: [],
  clear: [],
  close: [],
  continue: [],
  copy: ['to'],
  decrement: ['by'],
  default: ['to'],
  empty: [],
  exit: [],
  fetch: ['as', 'body', 'doNotThrow', 'with'],
  focus: [],
  get: [],
  go: ['back', 'behavior', 'by', 'forward', 'in', 'of', 'position', 'url'],
  halt: ['the'],
  hide: ['with'],
  if: [],
  increment: ['by'],
  install: ['on'],
  js: [],
  log: [],
  make: ['a', 'an', 'called', 'from'],
  measure: ['of', 'set'],
  morph: ['on', 'strategy', 'viewTransition', 'with'],
  open: ['as'],
  pick: ['count', 'flags', 'rangeEnd', 'rangeMode', 'rangeStart', 'regex', 'variant'],
  prepend: ['to'],
  process: ['viewTransition'],
  'pseudo-command': ['at', 'from', 'into', 'on', 'to', 'with'],
  push: ['title'],
  put: ['after', 'at', 'at end of', 'at start of', 'before', 'into', 'viewTransition'],
  remove: ['from'],
  render: ['with'],
  repeat: [
    'bottomTested',
    'event',
    'for',
    'from',
    'in',
    'index',
    'loopType',
    'times',
    'until',
    'while',
  ],
  replace: ['title'],
  reset: [],
  return: [],
  scroll: ['behavior', 'by', 'direction', 'of', 'position'],
  select: [],
  send: ['detail', 'on', 'to', 'with'],
  set: ['on', 'to'],
  settle: ['for'],
  show: ['with'],
  start: ['transitionName'],
  swap: ['strategy', 'viewTransition', 'with'],
  take: ['for', 'from'],
  tell: [],
  throw: [],
  toggle: ['as', 'between', 'for', 'from', 'on', 'until'],
  unless: [],
  transition: ['on', 'over', 'to', 'with'],
  trigger: ['on', 'to', 'with'],
  wait: [],
} as const satisfies Record<string, readonly string[]>;

export type SlottedCommandName = keyof typeof COMMAND_SLOTS;

/**
 * How many positional arguments each command's parser can emit — `[min,
 * max]`, `max: null` for a variadic tail. Declared, and pinned by
 * `command-arity.test.ts` to what the parser emits over the documented
 * examples and to the highest `raw.args[i]` each `parseInput` reads. This is
 * the `args` half of what `CommandRaw<K>` types; the slot half is above.
 */
export const COMMAND_ARITY = {
  add: [1, 2],
  append: [1, 1],
  async: [0, null],
  beep: [0, null],
  blur: [0, 1],
  break: [0, 0],
  breakpoint: [0, 0],
  call: [1, 1],
  clear: [1, 1],
  close: [0, 1],
  continue: [0, 0],
  copy: [1, 1],
  decrement: [1, 2],
  default: [1, 2],
  empty: [0, 1],
  exit: [0, 0],
  fetch: [1, 1],
  focus: [0, 1],
  get: [1, 1],
  go: [0, 1],
  halt: [0, 1],
  hide: [0, 1],
  if: [2, 3],
  increment: [1, 2],
  install: [1, 2],
  js: [2, 2],
  log: [0, null],
  make: [0, 1],
  measure: [0, 2],
  morph: [1, 3],
  open: [0, 1],
  pick: [1, null],
  prepend: [1, 1],
  process: [1, 1],
  'pseudo-command': [1, 3],
  push: [1, 1],
  put: [1, 2],
  remove: [0, 1],
  render: [1, 1],
  repeat: [1, 2],
  replace: [1, 1],
  reset: [0, 1],
  return: [0, 1],
  scroll: [0, 1],
  select: [0, 1],
  send: [1, 1],
  set: [1, 2],
  settle: [0, 1],
  show: [0, 1],
  start: [1, null],
  // 3: the front-end flat shape `[method?, target, content]` from buildAST and
  // the hybrid bundle's template — Arc 5's boundary.
  swap: [1, 3],
  take: [1, 1],
  tell: [2, null],
  throw: [0, 1],
  // 2: the semantic path may split `*display` into `*` + an identifier.
  toggle: [0, 2],
  transition: [1, 2],
  trigger: [1, 1],
  unless: [2, 3],
  wait: [1, 2],
} as const satisfies Record<SlottedCommandName, readonly [number, number | null]>;

/** The keys `raw.modifiers` may carry for command `K` (a union of commands unions their keys). */
export type SlotKey<K extends SlottedCommandName> =
  (typeof COMMAND_SLOTS)[K][number] | GenericSlotKey;

/** The `modifiers` a parser builds for command `K` — keyed by its row. */
export type SlotMap<K extends SlottedCommandName> = Partial<Record<SlotKey<K>, ExpressionNode>>;

// ---------------------------------------------------------------------------
// Positional arity as a TYPE: the tuple shapes `COMMAND_ARITY` declares.
// ---------------------------------------------------------------------------

type Repeat<T, N extends number, R extends T[] = []> = R['length'] extends N
  ? R
  : Repeat<T, N, [...R, T]>;

/** Every tuple length from `Min` to `Max` inclusive, as a union. */
type TupleRange<
  T,
  Min extends number,
  Max extends number,
  R extends T[] = Repeat<T, Min>,
> = R['length'] extends Max ? R : R | TupleRange<T, Min, Max, [...R, T]>;

/**
 * The positional arguments command `K` can carry: every tuple length up to
 * its `COMMAND_ARITY` row's max, or a plain array for a variadic tail. The
 * lower bound is deliberately 0 — a command's "requires an argument" guard
 * is real code for a hand-built or foreign node — so what the type forbids
 * is exactly a read of `raw.args[i]` at or beyond the row's max. A union of
 * commands widens to the array.
 */
export type ArgsOf<K extends SlottedCommandName> = [K] extends [
  (typeof COMMAND_ARITY)[K] extends readonly [number, number] ? K : never,
]
  ? (typeof COMMAND_ARITY)[K] extends readonly [number, infer Max extends number]
    ? TupleRange<ASTNode, 0, Max>
    : ASTNode[]
  : ASTNode[];

/**
 * What a command's `parseInput` receives. `modifiers` is keyed by the
 * command's declared slots: a read of any other key does not compile.
 */
export interface CommandRaw<K extends SlottedCommandName> {
  args: ArgsOf<K>;
  modifiers: Partial<Record<SlotKey<K>, ExpressionNode>>;
  commandName?: string;
  /** Precompiled `block`/`command` arguments, parallel to `args` (Arc 4b). */
  bodies?: BodyOps;
}
