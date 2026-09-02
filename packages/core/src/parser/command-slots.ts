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
  go: [],
  halt: [],
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
  scroll: [],
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

/** The keys `raw.modifiers` may carry for command `K` (a union of commands unions their keys). */
export type SlotKey<K extends SlottedCommandName> =
  (typeof COMMAND_SLOTS)[K][number] | GenericSlotKey;

/**
 * What a command's `parseInput` receives. `modifiers` is keyed by the
 * command's declared slots: a read of any other key does not compile.
 */
export interface CommandRaw<K extends SlottedCommandName> {
  args: ASTNode[];
  modifiers: Partial<Record<SlotKey<K>, ExpressionNode>>;
  commandName?: string;
}
