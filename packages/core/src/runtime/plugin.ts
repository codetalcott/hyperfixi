/**
 * Hyperfixi plugin contract.
 *
 * Plugins are the supported way for external packages (e.g. `@hyperfixi/reactivity`,
 * `@hyperfixi/speech`) to contribute commands, operators, and parser extensions
 * without modifying the core parser or runtime.
 *
 * Minimal plugin:
 *
 * ```ts
 * import type { HyperfixiPlugin } from '@hyperfixi/core';
 *
 * export const myPlugin: HyperfixiPlugin = {
 *   name: 'my-plugin',
 *   install({ commandRegistry, parserExtensions }) {
 *     parserExtensions.registerCommand('greet');
 *     commandRegistry.register(createGreetCommand());
 *   },
 * };
 * ```
 *
 * Install at app startup:
 *
 * ```ts
 * import { createRuntime, installPlugin } from '@hyperfixi/core';
 * const runtime = createRuntime();
 * installPlugin(runtime, myPlugin);
 * ```
 */

import type { CommandRegistryV2 } from './command-adapter';
import type { ParserExtensionRegistry } from '../parser/extensions';
import { getParserExtensionRegistry } from '../parser/extensions';
import type { Runtime } from './runtime';

/**
 * Context passed to `HyperfixiPlugin.install()`. Exposes both runtime and
 * parser extension surfaces so a plugin can contribute commands, operators,
 * and parser hooks in one place.
 */
export interface HyperfixiPluginContext {
  /** Command registry for adding executable commands. */
  commandRegistry: CommandRegistryV2;
  /** Parser extension registry for adding keywords, operators, and Pratt entries. */
  parserExtensions: ParserExtensionRegistry;
}

/**
 * A plugin is an object with a name and an install function. Plugins are
 * installed once at app startup and persist for the process lifetime; there
 * is no uninstall mechanism in the base contract (tests can use the
 * registry's `snapshot()`/`restore()` helpers for isolation).
 */
export interface HyperfixiPlugin {
  /** Human-readable name for diagnostics. */
  name: string;
  /** Called once during installation. Plugins register their extensions here. */
  install(ctx: HyperfixiPluginContext): void;
}

/**
 * Install a plugin into the given runtime. Surfaces the command registry and
 * the shared parser-extension registry to the plugin.
 *
 * Safe to call multiple times with the same plugin — idempotency is the
 * plugin's responsibility. Safe to call with multiple plugins in sequence.
 */
export function installPlugin(runtime: Runtime, plugin: HyperfixiPlugin): void {
  const ctx: HyperfixiPluginContext = {
    commandRegistry: runtime.getRegistry(),
    parserExtensions: getParserExtensionRegistry(),
  };
  plugin.install(ctx);
}
