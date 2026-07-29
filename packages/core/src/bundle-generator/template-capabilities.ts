/**
 * Template Capabilities
 *
 * Documents which commands and blocks are available in generated lite bundles
 * versus those that require the full runtime.
 *
 * ---------------------------------------------------------------------------
 * WHAT "AVAILABLE" MEANS HERE, AND WHERE THE FACT ACTUALLY LIVES
 * (Arc A step 4.2 — `docs-internal/HANDOFF-command-arch-manifest.md`)
 * ---------------------------------------------------------------------------
 *
 * These lists answer ONE question: *can the bundle generator emit this command
 * into a lite bundle?* That is deliberately NOT the same question as the
 * command manifest's `tier` (`commands/manifest.ts`), which mirrors
 * `reference/index.ts`'s `availability` — "which prebuilt bundle first ships
 * it". Measured under the natural mapping the two facts disagree on 16 of 59
 * rows, so neither may be derived from the other.
 *
 * The generator's emission fact is `COMMAND_IMPLEMENTATIONS` in `./templates.ts`
 * (a `Record<name, caseSource>`): `generateBundle()` filters on it, and a name
 * with no key is rejected as `unknown-command`. `AVAILABLE_COMMANDS` below is a
 * **checked mirror** of its key set plus the two advertised aliases — not a
 * third hand-maintained copy. `capability-emission.test.ts` asserts the
 * equality in both directions, so the two cannot drift.
 *
 * It stays a literal rather than `Object.keys(COMMAND_IMPLEMENTATIONS)` for the
 * reason recorded as Finding 9/11 in the brief: a derivation references
 * `templates.ts`, dragging all 36 command source strings into every consumer of
 * this module. Same shape-split as `COMMAND_NAMES` vs `COMMAND_MANIFEST`.
 *
 * **Blocks count as a classification.** `if`, `repeat` and `fetch` are
 * registered commands that appear in neither list below; they are classified by
 * `AVAILABLE_BLOCKS`, and the generator dispatches them through
 * `BLOCK_IMPLEMENTATIONS`, not `COMMAND_IMPLEMENTATIONS`. They must NOT be
 * added to `FULL_RUNTIME_ONLY_COMMANDS`: `vite-plugin`'s `getUnsupportedCommands`
 * checks that list first, so listing them would force a full-runtime fallback
 * for `if`/`repeat`/`fetch` code that lite bundles execute correctly today.
 *
 * **Known open defect (step 4.2 follow-up).** Membership here means the case
 * label is EMITTED, not that the generated parser ever reaches it. 14 of the
 * entries below are unreachable — the parser produces no node for them, or
 * produces one under a different name — so the emitted `case` is dead code and
 * the user's source silently no-ops. They are named, counted and pinned in
 * `capability-emission.test.ts` (`UNREACHABLE_CASE_LABELS`). They are NOT
 * reclassified here: every one has a working template, so the correct remedy is
 * a parser rule that restores the capability, not a reclassification that
 * removes it and bumps those projects to the full runtime.
 */

/**
 * Commands available in generated lite bundles.
 * These have simplified implementations that cover common use cases.
 *
 * Exactly `Object.keys(COMMAND_IMPLEMENTATIONS)` plus `push-url`/`replace-url`
 * (see COMMAND_ALIASES below) — gated, both directions.
 */
export const AVAILABLE_COMMANDS = [
  // DOM manipulation
  'toggle',
  'add',
  'remove',
  'removeClass',
  'show',
  'hide',
  'put',
  'append',
  'prepend',
  'take',
  'empty',
  // Data/variables
  'set',
  'get',
  'increment',
  'decrement',
  // Async/timing
  'wait',
  'transition',
  // Events
  'send',
  'trigger',
  // Utility
  'log',
  'call',
  'copy',
  'beep',
  // Navigation
  'go',
  'push',
  'push-url',
  'replace',
  'replace-url',
  // Focus
  'focus',
  'blur',
  // Control flow
  'return',
  'break',
  'continue',
  'halt',
  'exit',
  'throw',
  // Advanced execution
  'js',
  // DOM morphing (requires morphlex import)
  'morph',
] as const;

/**
 * Blocks available in generated lite bundles.
 *
 * Exactly `Object.keys(BLOCK_IMPLEMENTATIONS)` — gated, both directions. Three
 * of these (`if`, `repeat`, `fetch`) are also registered commands; this list is
 * their classification (see the module header).
 */
export const AVAILABLE_BLOCKS = ['if', 'repeat', 'for', 'while', 'fetch'] as const;

/**
 * Commands NOT available in lite bundles (require full runtime).
 * These either have complex implementations or depend on features
 * not included in lite bundles.
 *
 * Invariant, gated: no entry here has a `COMMAND_IMPLEMENTATIONS` key. Being
 * listed routes the vite-plugin's bundle selection to the full runtime, which
 * is the conservative and correct default for anything the generator cannot
 * emit.
 */
export const FULL_RUNTIME_ONLY_COMMANDS = [
  // Advanced execution
  'async',
  // DOM operations (complex)
  'make',
  'swap',
  'process',
  // Data
  'default',
  // Utility (complex - need runtime integration)
  'tell',
  'pick',
  // Conditional (already have 'if' block)
  'unless',
  // Animation (advanced - needs helpers)
  'settle',
  'measure',
  // Behaviors (requires registry)
  'install',

  // -------------------------------------------------------------------------
  // Classified by Arc A step 4.2. These ten were in NEITHER list — registered
  // commands the capability file had no opinion about, against a doc comment
  // that claims a partition. Measured against the generator (the oracle for
  // this file): none has a `COMMAND_IMPLEMENTATIONS` key, so `generateBundle()`
  // rejects each as `unknown-command`, and none is reachable in the generated
  // parser. Full-runtime-only is therefore the accurate classification, not a
  // conservative guess.
  //
  // Behavior-preserving for bundle selection — `getUnsupportedCommands()`
  // already treated an unclassified name as unsupported via its
  // `!isAvailableCommand && !COMMAND_IMPLEMENTATIONS[cmd]` arm. What DOES
  // change is detection: `vite-plugin/src/scanner.ts` builds its command regex
  // from both lists, so these nine (`pseudo-command` is filtered out by the
  // scanner's `/^[A-Za-z]+$/` guard) become scannable. That is the improvement
  // the scanner's own comment asks for — previously their use went undetected
  // and got a lite bundle that silently no-opped them; now it routes to a tier
  // that runs them.
  // -------------------------------------------------------------------------
  'breakpoint', // debugger integration — needs the full runtime's debug hooks
  'clear', // storage/DOM clear
  'close', // dialog/details close
  'open', // dialog/details open
  'pseudo-command', // method-call-as-command; needs full expression evaluation
  'render', // template rendering — needs the template registry
  'reset', // form reset
  'scroll', // scroll to target
  'select', // selection API
  'start', // start view transition … end
] as const;

/**
 * Advertised command names that are implemented under a different template key.
 * `push-url`/`replace-url` have no key of their own in COMMAND_IMPLEMENTATIONS —
 * the `push`/`replace` templates carry `case 'push-url':`/`case 'replace-url':`
 * labels internally. Without this map, `isAvailableCommand('push-url')` was true
 * while `generateBundle({ commands: ['push-url'] })` rejected it as
 * unknown-command (the two public surfaces disagreed).
 */
export const COMMAND_ALIASES: Record<string, string> = {
  'push-url': 'push',
  'replace-url': 'replace',
};

/**
 * Resolve an advertised command name to its template key in
 * COMMAND_IMPLEMENTATIONS. Identity for non-aliased names.
 */
export function resolveCommandKey(command: string): string {
  return COMMAND_ALIASES[command] ?? command;
}

/** Type for available command names */
export type AvailableCommand = (typeof AVAILABLE_COMMANDS)[number];

/** Type for available block names */
export type AvailableBlock = (typeof AVAILABLE_BLOCKS)[number];

/** Type for full runtime only command names */
export type FullRuntimeOnlyCommand = (typeof FULL_RUNTIME_ONLY_COMMANDS)[number];

/**
 * Check if a command is available in lite bundles
 */
export function isAvailableCommand(command: string): command is AvailableCommand {
  return (AVAILABLE_COMMANDS as readonly string[]).includes(command);
}

/**
 * Check if a block is available in lite bundles
 */
export function isAvailableBlock(block: string): block is AvailableBlock {
  return (AVAILABLE_BLOCKS as readonly string[]).includes(block);
}

/**
 * Check if a command requires the full runtime
 */
export function requiresFullRuntime(command: string): boolean {
  return (FULL_RUNTIME_ONLY_COMMANDS as readonly string[]).includes(command);
}
