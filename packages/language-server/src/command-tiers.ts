/**
 * Command and feature tiers: hyperscript (upstream _hyperscript) vs LokaScript.
 *
 * Since 4.0 the LokaScript runtime is `@hyperfixi/engine`, which follows upstream
 * _hyperscript's grammar, so the two modes share their keywords:
 *
 * - `HYPERSCRIPT_COMMANDS` is the engine's command and feature keywords, plus `while`
 *   (it continues a `repeat`) and the three features upstream ships as extensions and
 *   the engine does not have (`worker`, `socket`, `eventsource`).
 *   `command-tiers.test.ts` checks it against the engine's grammar in both directions.
 * - `LOKASCRIPT_ONLY_COMMANDS` is empty. Core's extensions (`prepend`, `process
 *   partials`, `copy`, `push url`, `replace url`, a bare `beep`, a leading `unless`)
 *   are rejected by both engines, so the engine's parse error reports them in every
 *   mode.
 *
 * What the engine has that upstream does not is two forms of existing keywords (see
 * `packages/engine/src/additions.ts`): `new X(...)` and `toggle <element>`.
 * `detectLokascriptFeatures` finds them in the engine's parse tree, which marks each
 * with its own node type.
 */

/**
 * Command and feature keywords of upstream _hyperscript, which the LokaScript runtime
 * (the engine) shares.
 */
export const HYPERSCRIPT_COMMANDS = [
  // The engine's commands.
  'add',
  'answer',
  'append',
  'ask',
  'beep!',
  'blur',
  'break',
  'breakpoint',
  'call',
  'clear',
  'close',
  'continue',
  'decrement',
  'default',
  'empty',
  'exit',
  'fetch',
  'focus',
  'for',
  'get',
  'go',
  'halt',
  'hide',
  'if',
  'increment',
  'js',
  'log',
  'make',
  'measure',
  'morph',
  'open',
  'pick',
  'put',
  'remove',
  'render',
  'repeat',
  'reset',
  'return',
  'scroll',
  'select',
  'send',
  'set',
  'settle',
  'show',
  'start',
  'swap',
  'take',
  'tell',
  'throw',
  'toggle',
  'transition',
  'trigger',
  'wait',

  // Continues a `repeat`; completed like a command.
  'while',

  // The engine's features (`set` and `js` are features too, listed above).
  'behavior',
  'bind',
  'def',
  'init',
  'install',
  'live',
  'on',
  'when',

  // Upstream extensions (ext/eventsource.js, ext/socket.js, ext/worker.js); not in the engine.
  'eventsource',
  'socket',
  'worker',
] as const;

/**
 * Command keywords the LokaScript runtime has and upstream does not: none since 4.0
 * (see the module comment).
 */
export const LOKASCRIPT_ONLY_COMMANDS: readonly string[] = [];

/**
 * All commands (hyperscript + lokascript extensions).
 */
export const ALL_COMMANDS: readonly string[] = [
  ...HYPERSCRIPT_COMMANDS,
  ...LOKASCRIPT_ONLY_COMMANDS,
];

/**
 * Type conversion targets available in original _hyperscript — the keys of
 * upstream's `_hyperscript.config.conversions` (0.9.x). `Int`, `Float`,
 * `JSON`, `Date`, `Set` and `Map` are upstream and were wrongly listed as
 * extensions until the 2026-09 audit.
 */
export const HYPERSCRIPT_AS_TARGETS = [
  'String',
  'Int',
  'Float',
  'Number',
  'Boolean',
  'Date',
  'Array',
  'JSON',
  'JSONString',
  'Object',
  'FormEncoded',
  'Set',
  'Map',
  'Keys',
  'Entries',
  'Reversed',
  'Unique',
  'Flat',
  'HTML',
  'Stream',
  'Fragment',
  // A dynamic resolver upstream (`Values`, `Values:Form`, `Values:JSON`), not a key.
  'Values',
] as const;

/**
 * Type conversion targets the LokaScript runtime has and upstream does not: none
 * since 4.0. (Core registered `Math` as well; neither engine has it.)
 */
export const LOKASCRIPT_ONLY_AS_TARGETS: readonly string[] = [];

/**
 * Event modifiers available in original _hyperscript.
 */
export const HYPERSCRIPT_EVENT_MODIFIERS = [
  'once',
  'prevent',
  'stop',
  'capture',
  'passive',
] as const;

/**
 * Event modifiers the LokaScript runtime has and upstream does not: none since 4.0.
 * (Core's `.debounce(300)` / `.throttle(1s)` are rejected by both engines; upstream
 * spells them `debounced at 300ms` / `throttled at 1s`.)
 */
export const LOKASCRIPT_ONLY_EVENT_MODIFIERS: readonly string[] = [];

/**
 * The engine's additions over upstream, by the node type its parse gives each.
 */
const ENGINE_ADDITIONS: Record<string, { pattern: string; description: string }> = {
  newExpression: {
    pattern: 'new-expression',
    description:
      "'new X()' is an @hyperfixi/engine addition; upstream reads `new` as a variable (use `make a X`)",
  },
  toggleElementCommand: {
    pattern: 'toggle-element',
    description:
      "'toggle <element>' (open or close a dialog, details or popover) is an @hyperfixi/engine addition",
  },
};

/**
 * Check if a command is hyperscript-compatible.
 */
export function isHyperscriptCommand(cmd: string): boolean {
  return (HYPERSCRIPT_COMMANDS as readonly string[]).includes(cmd.toLowerCase());
}

/**
 * Check if a command is LokaScript-only (none since 4.0).
 */
export function isLokascriptOnlyCommand(cmd: string): boolean {
  return LOKASCRIPT_ONLY_COMMANDS.includes(cmd.toLowerCase());
}

/**
 * Detect LokaScript-only syntax: the engine's additions over upstream, found in the
 * tree `@hyperfixi/engine`'s `parse` returned for the code. Each carries the source
 * offsets of the node that uses it.
 */
export function detectLokascriptFeatures(
  engineTree: unknown
): Array<{ feature: string; description: string; pattern: string; start?: number; end?: number }> {
  const detected: Array<{
    feature: string;
    description: string;
    pattern: string;
    start?: number;
    end?: number;
  }> = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    const type = Reflect.get(node, 'type');
    const addition = typeof type === 'string' ? ENGINE_ADDITIONS[type] : undefined;
    if (addition) {
      const start = Reflect.get(node, 'start');
      const end = Reflect.get(node, 'end');
      detected.push({
        feature: 'syntax',
        description: addition.description,
        pattern: addition.pattern,
        ...(typeof start === 'number' && { start }),
        ...(typeof end === 'number' && { end }),
      });
    }
    for (const value of Object.values(node)) {
      if (typeof value === 'object' && value !== null) walk(value);
    }
  };
  walk(engineTree);
  return detected;
}

/**
 * Get commands available for a given mode.
 */
export function getCommandsForMode(mode: 'hyperscript' | 'lokascript'): readonly string[] {
  return mode === 'hyperscript' ? HYPERSCRIPT_COMMANDS : ALL_COMMANDS;
}

/**
 * Get event modifiers available for a given mode.
 */
export function getEventModifiersForMode(mode: 'hyperscript' | 'lokascript'): readonly string[] {
  return mode === 'hyperscript'
    ? HYPERSCRIPT_EVENT_MODIFIERS
    : [...HYPERSCRIPT_EVENT_MODIFIERS, ...LOKASCRIPT_ONLY_EVENT_MODIFIERS];
}
