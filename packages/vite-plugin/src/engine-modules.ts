/**
 * The engine's modules as this plugin's vocabulary.
 *
 * A bundle on `@hyperfixi/engine` is the list of grammar modules passed to
 * `register()`. This file derives, from the engine itself, which module each
 * command or feature keyword lives in: every module in `everything` is run
 * against a fresh grammar and the keys it added are read back. The plugin
 * therefore keeps no hand-copied keyword table. (The hybrid-parser era kept
 * three — `AVAILABLE_COMMANDS`, `LITE_PARSER_COMMANDS`, `FULL_RUNTIME_ONLY_COMMANDS`
 * in core's bundle-generator — and the scanner's regex was built from them.)
 *
 * Modules that add no keyword (expression kinds, conversions, cookies) are
 * selected by the usage flags the scanner reports instead; see `resolveModules`.
 */

import * as engine from '@hyperfixi/engine';
import { createGrammar, everything, type Module } from '@hyperfixi/engine';

export interface EngineModuleInfo {
  /** The module's export name on `@hyperfixi/engine` (what the bundle imports). */
  name: string;
  /** Command keywords the module adds to the grammar (`toggle`, `call`, `for`, …). */
  commands: readonly string[];
  /** Feature keywords it adds (`on`, `def`, `live`, …). */
  features: readonly string[];
}

function exportNameOf(mod: Module): string {
  for (const [name, value] of Object.entries(engine)) {
    if (value === mod) return name;
  }
  throw new Error('[hyperfixi] an engine module in `everything` is not a named export');
}

/** Every module in the engine's `everything`, in registration order, with the keywords it adds. */
export const ENGINE_MODULES: readonly EngineModuleInfo[] = everything.map(mod => {
  const grammar = createGrammar();
  mod(grammar);
  return {
    name: exportNameOf(mod),
    // The template text line registers under a keyword no identifier can be
    // spelled as (`#text`); it is not something a scan can find.
    commands: Object.keys(grammar.commands).filter(k => /^[a-z]+$/.test(k)),
    features: Object.keys(grammar.features),
  };
});

const byName = new Map(ENGINE_MODULES.map(m => [m.name, m]));

/** Command keyword → module export name. */
export const COMMAND_KEYWORDS: ReadonlyMap<string, string> = new Map(
  ENGINE_MODULES.flatMap(m => m.commands.map(k => [k, m.name] as const))
);

/** Feature keyword → module export name. */
export const FEATURE_KEYWORDS: ReadonlyMap<string, string> = new Map(
  ENGINE_MODULES.flatMap(m => m.features.map(k => [k, m.name] as const))
);

/**
 * Every keyword the engine knows, for the scanner's word regex. Left out: `on`
 * (every handler has one), `if` (the scanner reports it as a block), and the
 * reactive features `live` / `when` / `bind` (the scanner's reactivity
 * detection reports those, and the dev-server cache key reads that flag).
 */
const NOT_SCANNED = new Set(['on', 'if', 'live', 'when', 'bind']);
export const SCANNABLE_KEYWORDS: readonly string[] = [
  ...new Set([...COMMAND_KEYWORDS.keys(), ...FEATURE_KEYWORDS.keys()]),
]
  .filter(k => !NOT_SCANNED.has(k))
  .sort();

/** Block names the scanner reports, and the modules each needs. */
const BLOCK_MODULES: Readonly<Record<string, readonly string[]>> = {
  if: ['ifCommand'],
  repeat: ['repeat', 'loopControl'],
  for: ['repeat', 'loopControl'],
  while: ['repeat', 'loopControl'],
  fetch: ['fetchCommand'],
};

/**
 * Modules every generated bundle registers. `on` is the handler feature; the
 * conversions (`as Number`, `as JSON`, …) cost 0.5 KB and no scan can tell an
 * `as` conversion from the word.
 */
const ALWAYS: readonly string[] = ['on', 'conversions'];

/** What a scan reports, reduced to what module selection needs. */
export interface ModuleUsage {
  /** Command and feature keywords seen (the scanner's `commands` set, plus `extraCommands`). */
  commands: Iterable<string>;
  /** Blocks seen (`if`, `repeat`, `for`, `while`, `fetch`). */
  blocks: Iterable<string>;
  /** Positional / collection / postfix expression kinds seen (the `expressionsExtra` module). */
  positional: boolean;
  /** `live`, `when`, `bind` or a `^var`: the reactivity modules. */
  reactivity: boolean;
  /** `new X(…)` seen: the `construct` addition. */
  construct?: boolean;
  /** `cookies` seen. */
  cookies?: boolean;
}

export interface ResolvedModules {
  /** Export names to register, in `everything` order (deterministic output). */
  modules: string[];
  /** Scanned command names the engine has no module for (a dropped core-only form, or a false positive). */
  unknown: string[];
}

/** Choose the engine modules a usage needs. */
export function resolveModules(usage: ModuleUsage): ResolvedModules {
  const wanted = new Set<string>(ALWAYS);
  const unknown: string[] = [];

  for (const name of usage.commands) {
    const mod = COMMAND_KEYWORDS.get(name) ?? FEATURE_KEYWORDS.get(name);
    if (mod) wanted.add(mod);
    else if (!(name in BLOCK_MODULES)) unknown.push(name);
  }
  for (const block of usage.blocks) {
    for (const mod of BLOCK_MODULES[block] ?? []) wanted.add(mod);
  }
  if (usage.positional) wanted.add('expressionsExtra');
  if (usage.reactivity) {
    wanted.add('reactivity');
    wanted.add('liveTemplates');
  }
  if (usage.construct) wanted.add('construct');
  if (usage.cookies) wanted.add('cookies');
  // `toggle <element>` is the engine's addition to `toggle`; a scan cannot tell
  // `toggle .cls` from `toggle #dialog`, and the module is 0.2 KB.
  if (wanted.has('toggle')) wanted.add('toggleElement');

  const modules = ENGINE_MODULES.filter(m => wanted.has(m.name)).map(m => m.name);
  for (const name of wanted) {
    if (!byName.has(name)) throw new Error(`[hyperfixi] no engine module named ${name}`);
  }
  return { modules, unknown: [...new Set(unknown)].sort() };
}
