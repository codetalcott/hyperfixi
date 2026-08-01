/**
 * Command and feature tiers for hyperscript vs LokaScript compatibility.
 *
 * LokaScript is a superset of _hyperscript with 100% compatibility.
 * This module defines which features are:
 * - hyperscript: Available in original _hyperscript (and LokaScript)
 * - lokascript: LokaScript extensions (not compatible with original _hyperscript)
 *
 * ## These lists are a partition, and it is now complete (Arc A step 4.1)
 *
 * Every registered command sits in exactly one of the two lists. Before
 * 2026-07-28 **23 of the engine's 59 commands were in neither**, which was not
 * a cosmetic gap: `detectLokascriptFeatures()` below scans only
 * `LOKASCRIPT_ONLY_COMMANDS`, and `server.ts` turns each hit into a
 * `DiagnosticSeverity.Error`. An unclassified extension therefore produced
 * **no diagnostic at all** — a user writing code that cannot run on original
 * _hyperscript was told nothing. The audit that pins the partition in both
 * directions is `packages/core/src/runtime/__tests__/command-manifest-audit.test.ts`;
 * the arc brief is `docs-internal/archive/HANDOFF-command-arch-manifest.md`.
 *
 * ## The oracle, and how to re-run it
 *
 * Classification is measured, not remembered. The oracle is the **published**
 * original engine, `hyperscript.org` from this repo's own `node_modules` (the
 * same one `packages/testing-framework/src/multilingual/canonical-validity.ts`
 * loads for the R4 gate). Verified 2026-07-28 against **0.9.93**, and
 * cross-checked against a `bigskysoftware/_hyperscript` **0.9.91** checkout —
 * the two agree on every row below.
 *
 * The package blocks subpath imports, so resolve it and import the prebuilt
 * ESM sibling by file URL — the same dance `canonical-validity.ts` does:
 *
 * ```js
 * const dir = path.dirname(createRequire(import.meta.url).resolve('hyperscript.org'));
 * const hs = (await import(pathToFileURL(path.join(dir, '_hyperscript.esm.js')).href)).default;
 * const el = hs.parse(`on click ${snippet}`);
 * ```
 *
 * A command counts as upstream only when that parse yields a **real command
 * node** — walk `el.features[0].start` and require something other than
 * `EmptyCommandListCommand`/`ImplicitReturn`. Checking `el.errors` alone is not
 * enough and produces a false "upstream": a *feature* keyword makes the
 * command-list parser stop cleanly and hand back an EMPTY command list with no
 * error at all. `install` is exactly that case, and it is why its row below
 * carries the caveat it does.
 */

/**
 * Commands available in original _hyperscript.
 * These work in both _hyperscript and LokaScript.
 */
export const HYPERSCRIPT_COMMANDS = [
  // Core commands
  'add',
  'append',
  'call',
  'default',
  'exit',
  'fetch',
  'for',
  'get',
  'go',
  'halt',
  'hide',
  'if',
  'increment',
  'decrement',
  'js',
  'log',
  'put',
  'remove',
  'repeat',
  'return',
  'send',
  'set',
  'show',
  'take',
  'tell',
  'throw',
  'toggle',
  'transition',
  'trigger',
  'wait',
  'while',

  // Upstream commands this list omitted until Arc A step 4.1. Each was probed
  // on hyperscript.org@0.9.93 in the form shown and produced the command node
  // named beside it; none of them is a LokaScript invention.
  'blur', //           `blur #a`                        → BlurCommand
  'break', //          `repeat 3 times break end`       → controlflow.js BreakCommand
  'breakpoint', //     `breakpoint`                     → BreakpointCommand (core debug.js)
  'clear', //          `clear #a`                       → EmptyCommand — upstream spells the
  'empty', //          `empty #a`                         pair as ONE command with two keywords
  'close', //          `close #a`                       → CloseCommand
  'continue', //       `repeat 3 times continue end`    → controlflow.js ContinueCommand
  'focus', //          `focus #a`                       → FocusCommand
  'open', //           `open #a`                        → OpenCommand
  'pick', //           `pick items 1 to 3 from "hello"` → PickCommand
  'render', //         `render #tpl`                    → RenderCommand
  'reset', //          `reset #a`                       → ResetCommand
  'scroll', //         `scroll to #a`                   → ScrollCommand
  'select', //         `select #a`                      → SelectCommand
  'start', //          `start view transition end`      → ViewTransitionCommand
  'swap', //           `swap $a with $b`                → SwapCommand. The htmx-style
  //                     `swap <content> into <target>` form is an EXTENSION of this same
  //                     command, not a different one — `commands/dom/swap.ts` implements the
  //                     upstream value-swap variant explicitly, under a `variant` discriminator.

  // Never written by a user: `pseudo-command` is the internal registry name for
  // method-call-as-command (`foo() on #a`), and `-` is not an identifier
  // character, so no source text can contain the token. Listed so the
  // partition is total. The mechanism is upstream — the probe above yields
  // PseudoCommand from `parsetree/commands/pseudoCommand.js`, which the core
  // `_hyperscript.js` bundle registers.
  'pseudo-command',

  // Moved OUT of LOKASCRIPT_ONLY_COMMANDS by the same 4.1 oracle run. Each was
  // asserted to be a LokaScript extension and each parses on stock
  // hyperscript.org@0.9.93, so the LSP was raising a spurious *error*
  // diagnostic on portable code — the same defect as the omissions above, with
  // the sign flipped.
  'make', //     `make a <div/>`             → MakeCommand      (basic.js)
  'measure', //  `measure #a`                → MeasureCommand   (dom.js)
  'morph', //    `morph #a to "<p>x</p>"`    → MorphCommand     (dom.js)
  'settle', //   `settle`                    → SettleCommand    (animations.js)
  // `install` is upstream at the position it is actually written — `_="install
  // Foo"` parses as InstallFeature. It is a FEATURE upstream and a registered
  // command here, so `on click install Foo` works only in LokaScript. The
  // lists are keyed by name and cannot express "upstream in feature position
  // only"; classified by the canonical usage, which is portable.
  'install',

  // Definitions
  'behavior',
  'def',
  'init',
  'on',
  'eventsource',
  'socket',
  'worker',
] as const;

/**
 * Commands that are LokaScript extensions.
 * These do NOT work in original _hyperscript.
 *
 * Each row records the probe that placed it here: the snippet, and how
 * hyperscript.org@0.9.93 rejected it.
 */
export const LOKASCRIPT_ONLY_COMMANDS = [
  // Upstream _hyperscript has no `prepend`; it offers only
  // `put <content> at the start of <target>`.
  'prepend', // `prepend "x" to #a`      → Unexpected Token : prepend
  'process', // `process "<p>x</p>"`     → Unexpected Token : process

  // Added by Arc A step 4.1 — the omissions that produced NO diagnostic.
  'async', //   `async do log "x" end`   → Unexpected Token : async
  'copy', //    `copy "x"`               → Unexpected Token : copy
  'push', //    `push url "/x"`          → Unexpected Token : push
  'replace', // `replace url "/x"`       → Unexpected Token : replace

  // Upstream spells this command `beep!`, with the bang as part of the token:
  // `beep! me` parses (BeepCommand), `beep me` does not. hyperfixi registers it
  // as `beep` and accepts both spellings, so the portable spelling is `beep!`
  // and the bare one is the extension. Classified by the registered name,
  // which is what these lists key on.
  'beep', //    `beep me`                → Unexpected Token : beep

  // Upstream has `unless` only as a TRAILING statement modifier
  // (`log "x" unless true` → UnlessStatementModifier, kernel.js
  // parseIndirectStatement). The registered `unless` COMMAND — the leading
  // block form, an alias of `if` — is the LokaScript addition.
  'unless', //  `unless true log "x" end` → Unexpected Token : unless
] as const;

/**
 * All commands (hyperscript + lokascript extensions).
 */
export const ALL_COMMANDS = [...HYPERSCRIPT_COMMANDS, ...LOKASCRIPT_ONLY_COMMANDS] as const;

/**
 * Type conversion targets available in original _hyperscript.
 */
export const HYPERSCRIPT_AS_TARGETS = ['String', 'Number', 'Boolean', 'Array', 'Object'] as const;

/**
 * Extended type conversion targets (LokaScript only).
 */
export const LOKASCRIPT_ONLY_AS_TARGETS = [
  'Int',
  'Integer',
  'Float',
  'JSON',
  'FormData',
  'Date',
  'URLSearchParams',
  'Set',
  'Map',
] as const;

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
 * Event modifiers that are LokaScript extensions.
 */
export const LOKASCRIPT_ONLY_EVENT_MODIFIERS = ['debounce', 'throttle'] as const;

/**
 * Syntax patterns that are LokaScript-only.
 * Used for detecting LokaScript features in hyperscript mode.
 */
export const LOKASCRIPT_SYNTAX_PATTERNS = {
  /**
   * Possessive dot notation: my.textContent, its.value, your.classList
   * Original _hyperscript uses space: my textContent
   */
  dotNotation: /\b(my|your|its)\.\w+/,

  /**
   * Optional chaining: my?.value
   */
  optionalChaining: /\b(my|your|its)\?\.\w+/,

  /**
   * Extended 'as' conversions
   */
  extendedAsConversion: /\bas\s+(Int|Integer|Float|JSON|FormData|Date|URLSearchParams|Set|Map)\b/i,

  /**
   * Debounce/throttle modifiers with duration: .debounce(300), .throttle(1s)
   */
  temporalModifiers: /\.(debounce|throttle)\s*\(\s*\d+/i,
} as const;

/**
 * Check if a command is hyperscript-compatible.
 */
export function isHyperscriptCommand(cmd: string): boolean {
  return HYPERSCRIPT_COMMANDS.includes(cmd.toLowerCase() as (typeof HYPERSCRIPT_COMMANDS)[number]);
}

/**
 * Check if a command is LokaScript-only.
 */
export function isLokascriptOnlyCommand(cmd: string): boolean {
  return LOKASCRIPT_ONLY_COMMANDS.includes(
    cmd.toLowerCase() as (typeof LOKASCRIPT_ONLY_COMMANDS)[number]
  );
}

/**
 * Detect LokaScript-only features in code.
 * Returns an array of detected features with their descriptions.
 */
export function detectLokascriptFeatures(
  code: string
): Array<{ feature: string; description: string; pattern: string }> {
  const detected: Array<{ feature: string; description: string; pattern: string }> = [];

  // Check for LokaScript-only commands
  for (const cmd of LOKASCRIPT_ONLY_COMMANDS) {
    const pattern = new RegExp(`\\b${cmd}\\b`, 'i');
    if (pattern.test(code)) {
      detected.push({
        feature: 'command',
        description: `'${cmd}' command is a LokaScript extension`,
        pattern: cmd,
      });
    }
  }

  // Check for dot notation
  if (LOKASCRIPT_SYNTAX_PATTERNS.dotNotation.test(code)) {
    detected.push({
      feature: 'syntax',
      description:
        "Dot notation (my.property) is a LokaScript extension. Use 'my property' for _hyperscript compatibility",
      pattern: 'dot-notation',
    });
  }

  // Check for optional chaining
  if (LOKASCRIPT_SYNTAX_PATTERNS.optionalChaining.test(code)) {
    detected.push({
      feature: 'syntax',
      description: 'Optional chaining (my?.property) is a LokaScript extension',
      pattern: 'optional-chaining',
    });
  }

  // Check for extended as conversions
  const asMatch = code.match(LOKASCRIPT_SYNTAX_PATTERNS.extendedAsConversion);
  if (asMatch) {
    detected.push({
      feature: 'conversion',
      description: `'as ${asMatch[1]}' is a LokaScript extension`,
      pattern: `as-${asMatch[1].toLowerCase()}`,
    });
  }

  // Check for temporal modifiers
  const temporalMatch = code.match(LOKASCRIPT_SYNTAX_PATTERNS.temporalModifiers);
  if (temporalMatch) {
    detected.push({
      feature: 'modifier',
      description: `'.${temporalMatch[1]}()' modifier is a LokaScript extension`,
      pattern: temporalMatch[1].toLowerCase(),
    });
  }

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
