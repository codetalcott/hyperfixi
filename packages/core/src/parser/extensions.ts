/**
 * Parser Extension Registry — runtime plugin surface for the hyperfixi parser.
 *
 * Lets external packages (e.g. @hyperfixi/reactivity, @hyperfixi/speech,
 * @hyperfixi/components) extend the parser at runtime without forking the
 * parser monolith. Six extension points are exposed:
 *
 *   1. Commands — `registerCommand('customBeep')` makes the parser treat
 *      `customBeep` as a command at command position. The plugin is expected
 *      to also register a corresponding CommandImplementation via
 *      CommandRegistryV2.register() for execution dispatch.
 *
 *   2. Multi-word operator tokens — `registerCompoundOperator('sorted by')`
 *      hooks into the tokenizer's compound-operator path so multi-word
 *      tokens emit as single OPERATOR tokens.
 *
 *   3. Infix / prefix Pratt operators — `registerInfixOperator(token, ...)`
 *      and `registerPrefixOperator(token, ...)` insert entries into the
 *      shared Pratt binding-power table.
 *
 *   4. Top-level features — `registerFeature('live', parseFn)` makes the
 *      parser dispatch a keyword at script top-level (parallel to
 *      `init` / `on` / `def`) to a plugin-provided parse function. The
 *      parse fn receives a `ParserContext` and can consume a body via
 *      `ctx.parseCommandListUntilEnd()`.
 *
 *   5. Custom AST node evaluators — `registerNodeEvaluator(type, fn)` lets
 *      a plugin register an evaluator for a custom AST node type. The
 *      runtime's expression evaluator falls through to the registry
 *      before throwing "Unknown AST node type".
 *
 *   6. Global-write hooks — `registerGlobalWriteHook(fn)` registers a
 *      callback invoked whenever a `$name` global is written via the
 *      runtime's `setGlobal()` helper. Used by the reactivity plugin
 *      to notify dependent effects.
 *
 * The registry is **global**: there is one shared `ParserExtensionRegistry`
 * per process, because the parser itself reads from module-level `Set`/`Map`
 * instances. Plugins install once at app startup and persist for the lifetime
 * of the process. `snapshot()` / `restore()` are exposed for tests that need
 * to sandbox plugin installations.
 */

import { COMMANDS, COMPARISON_OPERATORS } from './parser-constants';
import { PARSER_TABLE } from './pratt-parser';
import type { BindingPower, BindingPowerEntry, InfixHandler, PrefixHandler } from './pratt-parser';
import type { ASTNode, ExecutionContext } from '../types/base-types';
import type { Token } from '../types/core';
import type { ParserContext } from './parser-types';

/**
 * Handler signature for a plugin-provided top-level feature parser.
 * Invoked after the parser has advanced past the feature's keyword token.
 */
export type FeatureParseFn = (ctx: ParserContext, token: Token) => ASTNode | null;

/**
 * Handler signature for a plugin-provided AST-node evaluator. The runtime
 * calls this when it encounters a node type it doesn't know how to evaluate
 * natively.
 */
export type NodeEvaluatorFn = (
  node: ASTNode,
  context: ExecutionContext
) => unknown | Promise<unknown>;

/**
 * Callback invoked on every global-variable write (e.g. `set $foo to 42`).
 * Used by the reactivity plugin to notify dependent effects. The hook is
 * fire-and-forget; return value is ignored.
 */
export type GlobalWriteHook = (name: string, value: unknown, context: ExecutionContext) => void;

/**
 * Callback invoked on every global-variable read. Used by the reactivity
 * plugin to record dependency subscriptions — when an effect reads `$foo`
 * during evaluation, the plugin subscribes that effect to `foo` so writes
 * trigger a re-run. Fire-and-forget; return value is ignored.
 */
export type GlobalReadHook = (name: string, context: ExecutionContext) => void;

/**
 * Callback invoked on every local-variable write (e.g. `set :foo to 42`).
 * Mirror-image of `GlobalWriteHook` — used by the reactivity plugin to notify
 * effects subscribed to per-element local state. Fire-and-forget.
 */
export type LocalWriteHook = (name: string, value: unknown, context: ExecutionContext) => void;

/**
 * Callback invoked on every local-variable read. Mirror-image of
 * `GlobalReadHook` — used by the reactivity plugin to track dependencies on
 * `:name` reads. Fire-and-forget.
 */
export type LocalReadHook = (name: string, context: ExecutionContext) => void;

/**
 * Writer for a custom AST-node assignment target. Registered by plugins so
 * commands like `set` and `increment` can dispatch writes to plugin-defined
 * targets (e.g. `set ^count to 0` writes to a caret-var via the reactivity
 * plugin). The writer receives the target node, the value to assign, and the
 * execution context. Returns nothing.
 */
export type NodeWriterFn = (
  node: ASTNode,
  value: unknown,
  context: ExecutionContext
) => void | Promise<void>;

/**
 * Module-level storage for Phase 5b extension points. Kept here (not in
 * parser-constants.ts) because these hold functions, not string sets.
 */
const FEATURE_REGISTRY = new Map<string, FeatureParseFn>();
const NODE_EVALUATORS = new Map<string, NodeEvaluatorFn>();
const NODE_WRITERS = new Map<string, NodeWriterFn>();
const GLOBAL_WRITE_HOOKS = new Set<GlobalWriteHook>();
const GLOBAL_READ_HOOKS = new Set<GlobalReadHook>();
const LOCAL_WRITE_HOOKS = new Set<LocalWriteHook>();
const LOCAL_READ_HOOKS = new Set<LocalReadHook>();

/**
 * Look up a registered feature parse function. The parser calls this at the
 * top-level statement loop before falling back to "Unexpected token".
 */
export function getRegisteredFeature(name: string): FeatureParseFn | undefined {
  return FEATURE_REGISTRY.get(name.toLowerCase());
}

/**
 * Look up a registered node evaluator. The runtime calls this from the
 * `evaluateExpression` default branch before throwing "Unknown AST node type".
 */
export function getRegisteredNodeEvaluator(type: string): NodeEvaluatorFn | undefined {
  return NODE_EVALUATORS.get(type);
}

/**
 * Look up a registered node writer. The `set` command (and any other
 * assignment-style command) consults this when its target is a custom AST
 * node type — if a writer is registered, the command delegates the write
 * instead of failing with "target must be a string or object literal".
 */
export function getRegisteredNodeWriter(type: string): NodeWriterFn | undefined {
  return NODE_WRITERS.get(type);
}

/**
 * Iterate registered global-write hooks. Intended for internal use by the
 * runtime's `setGlobal()` helper.
 */
export function getGlobalWriteHooks(): Iterable<GlobalWriteHook> {
  return GLOBAL_WRITE_HOOKS;
}

/**
 * Notify all registered read hooks that a `$name` global was just read.
 * Called by identifier evaluators. No-op when no hooks are installed (common
 * case); keep this check fast.
 */
export function notifyGlobalRead(name: string, context: ExecutionContext): void {
  if (GLOBAL_READ_HOOKS.size === 0) return;
  for (const hook of GLOBAL_READ_HOOKS) {
    try {
      hook(name, context);
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.error('[hyperfixi] globalReadHook threw:', err);
      }
    }
  }
}

/**
 * Iterate registered local-write hooks. Intended for internal use by
 * `setVariableValue` / any other path that mutates `context.locals`.
 */
export function getLocalWriteHooks(): Iterable<LocalWriteHook> {
  return LOCAL_WRITE_HOOKS;
}

/**
 * Notify all registered hooks that a `:name` local was just written. No-op
 * when no hooks are installed (common case); keep this check fast.
 */
export function notifyLocalWrite(name: string, value: unknown, context: ExecutionContext): void {
  if (LOCAL_WRITE_HOOKS.size === 0) return;
  for (const hook of LOCAL_WRITE_HOOKS) {
    try {
      hook(name, value, context);
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.error('[hyperfixi] localWriteHook threw:', err);
      }
    }
  }
}

/**
 * Notify all registered hooks that a `:name` local was just read. Called by
 * identifier evaluators in both the explicit `scope === 'local'` branch and
 * the implicit-scope fallback. No-op when no hooks are installed.
 */
export function notifyLocalRead(name: string, context: ExecutionContext): void {
  if (LOCAL_READ_HOOKS.size === 0) return;
  for (const hook of LOCAL_READ_HOOKS) {
    try {
      hook(name, context);
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.error('[hyperfixi] localReadHook threw:', err);
      }
    }
  }
}

/**
 * Snapshot of the registry state so tests can roll back plugin installations.
 */
export interface ParserExtensionSnapshot {
  commands: string[];
  operators: string[];
  prattEntries: Array<[string, BindingPowerEntry]>;
  features: Array<[string, FeatureParseFn]>;
  nodeEvaluators: Array<[string, NodeEvaluatorFn]>;
  nodeWriters: Array<[string, NodeWriterFn]>;
  globalWriteHooks: GlobalWriteHook[];
  globalReadHooks: GlobalReadHook[];
  localWriteHooks: LocalWriteHook[];
  localReadHooks: LocalReadHook[];
}

export class ParserExtensionRegistry {
  /**
   * Register a command keyword so the parser treats `<name>` as a command
   * at command position. The plugin must separately register a
   * `CommandImplementation` via `CommandRegistryV2.register()` for execution.
   */
  registerCommand(name: string): void {
    COMMANDS.add(name.toLowerCase());
  }

  /**
   * Register a multi-word token (e.g. `'sorted by'`) for compound-operator
   * tokenization. The tokenizer will emit the compound as a single OPERATOR
   * token, which the Pratt table can then bind to a handler.
   */
  registerCompoundOperator(token: string): void {
    COMPARISON_OPERATORS.add(token.toLowerCase());
  }

  /**
   * Register a binary infix operator in the shared Pratt binding-power table.
   * Later registrations for the same token **replace** the infix entry
   * (prefix, if any, is preserved).
   *
   * @param token    The operator token (case-insensitive match against the
   *                 tokenizer output). For multi-word operators, call
   *                 `registerCompoundOperator()` first.
   * @param leftBp   Left binding power (must be < rightBp for left-assoc).
   * @param rightBp  Right binding power.
   * @param handler  The LED handler. Receives the parsed left operand, the
   *                 operator token, and the Pratt context; returns the
   *                 combined AST node.
   */
  registerInfixOperator(
    token: string,
    leftBp: number,
    rightBp: number,
    handler: InfixHandler
  ): void {
    const key = token.toLowerCase();
    const existing = PARSER_TABLE.get(key);
    const bp: BindingPower = [leftBp, rightBp];
    PARSER_TABLE.set(key, {
      ...(existing ?? {}),
      infix: { bp, handler },
    });
  }

  /**
   * Register a prefix (NUD) operator in the shared Pratt binding-power table.
   * Later registrations for the same token replace the prefix entry
   * (infix, if any, is preserved).
   */
  registerPrefixOperator(token: string, bp: number, handler: PrefixHandler): void {
    const key = token.toLowerCase();
    const existing = PARSER_TABLE.get(key);
    PARSER_TABLE.set(key, {
      ...(existing ?? {}),
      prefix: { bp, handler },
    });
  }

  /**
   * Check if a command is registered (built-in or plugin).
   */
  hasCommand(name: string): boolean {
    return COMMANDS.has(name.toLowerCase());
  }

  /**
   * Register a top-level feature parse function. The parser dispatches the
   * keyword at script top-level (parallel to `init` / `on` / `def`) to the
   * supplied `parseFn`. The returned AST node is pushed into the program.
   *
   * Pair with `registerNodeEvaluator(type, fn)` so the runtime knows how to
   * execute whatever node type the parse fn emits.
   */
  registerFeature(keyword: string, parseFn: FeatureParseFn): void {
    FEATURE_REGISTRY.set(keyword.toLowerCase(), parseFn);
  }

  /**
   * Check if a feature keyword is registered.
   */
  hasFeature(name: string): boolean {
    return FEATURE_REGISTRY.has(name.toLowerCase());
  }

  /**
   * Register an evaluator for a custom AST node type. The runtime's default
   * expression-evaluator switch consults this registry before throwing
   * "Unknown AST node type". Enables plugins to emit custom node shapes
   * (e.g. `caretVar`, `liveFeature`) and evaluate them natively.
   */
  registerNodeEvaluator(nodeType: string, fn: NodeEvaluatorFn): void {
    NODE_EVALUATORS.set(nodeType, fn);
  }

  /**
   * Register a writer for a custom AST-node assignment target. Used by plugins
   * that introduce new write targets — e.g. the reactivity plugin registers a
   * writer for `caretVar` so `set ^count to 42` flows through `reactive.writeCaret`
   * instead of failing in the `set` command.
   */
  registerNodeWriter(nodeType: string, fn: NodeWriterFn): void {
    NODE_WRITERS.set(nodeType, fn);
  }

  /**
   * Register a hook invoked on every `$name` global-variable write. Used by
   * the reactivity plugin to notify dependent effects. Returns a disposer
   * that removes the hook.
   */
  registerGlobalWriteHook(hook: GlobalWriteHook): () => void {
    GLOBAL_WRITE_HOOKS.add(hook);
    return () => GLOBAL_WRITE_HOOKS.delete(hook);
  }

  /**
   * Register a hook invoked on every `$name` global-variable read. Used by
   * the reactivity plugin to track dependencies — when an effect reads a
   * global, subscribe that effect so writes trigger a re-run. Returns a
   * disposer that removes the hook.
   */
  registerGlobalReadHook(hook: GlobalReadHook): () => void {
    GLOBAL_READ_HOOKS.add(hook);
    return () => GLOBAL_READ_HOOKS.delete(hook);
  }

  /**
   * Register a hook invoked on every `:name` local-variable write. Mirror-image
   * of `registerGlobalWriteHook` — used by the reactivity plugin to notify
   * effects subscribed to per-element local state. Returns a disposer.
   */
  registerLocalWriteHook(hook: LocalWriteHook): () => void {
    LOCAL_WRITE_HOOKS.add(hook);
    return () => LOCAL_WRITE_HOOKS.delete(hook);
  }

  /**
   * Register a hook invoked on every `:name` local-variable read. Mirror-image
   * of `registerGlobalReadHook` — used by the reactivity plugin to track
   * dependencies on local reads. Returns a disposer.
   */
  registerLocalReadHook(hook: LocalReadHook): () => void {
    LOCAL_READ_HOOKS.add(hook);
    return () => LOCAL_READ_HOOKS.delete(hook);
  }

  /**
   * Capture current state so a test can roll back plugin installations.
   * Intended for test isolation — do not use in production code.
   */
  snapshot(): ParserExtensionSnapshot {
    return {
      commands: Array.from(COMMANDS),
      operators: Array.from(COMPARISON_OPERATORS),
      prattEntries: Array.from(PARSER_TABLE.entries()).map(([k, v]) => [k, { ...v }]),
      features: Array.from(FEATURE_REGISTRY.entries()),
      nodeEvaluators: Array.from(NODE_EVALUATORS.entries()),
      nodeWriters: Array.from(NODE_WRITERS.entries()),
      globalWriteHooks: Array.from(GLOBAL_WRITE_HOOKS),
      globalReadHooks: Array.from(GLOBAL_READ_HOOKS),
      localWriteHooks: Array.from(LOCAL_WRITE_HOOKS),
      localReadHooks: Array.from(LOCAL_READ_HOOKS),
    };
  }

  /**
   * Restore a previously captured snapshot. Mutations added since the
   * snapshot are discarded; mutations in the snapshot that have since been
   * removed are re-added.
   */
  restore(snapshot: ParserExtensionSnapshot): void {
    COMMANDS.clear();
    for (const c of snapshot.commands) COMMANDS.add(c);
    COMPARISON_OPERATORS.clear();
    for (const o of snapshot.operators) COMPARISON_OPERATORS.add(o);
    PARSER_TABLE.clear();
    for (const [k, v] of snapshot.prattEntries) PARSER_TABLE.set(k, v);
    FEATURE_REGISTRY.clear();
    for (const [k, v] of snapshot.features) FEATURE_REGISTRY.set(k, v);
    NODE_EVALUATORS.clear();
    for (const [k, v] of snapshot.nodeEvaluators) NODE_EVALUATORS.set(k, v);
    NODE_WRITERS.clear();
    for (const [k, v] of snapshot.nodeWriters ?? []) NODE_WRITERS.set(k, v);
    GLOBAL_WRITE_HOOKS.clear();
    for (const h of snapshot.globalWriteHooks) GLOBAL_WRITE_HOOKS.add(h);
    GLOBAL_READ_HOOKS.clear();
    for (const h of snapshot.globalReadHooks ?? []) GLOBAL_READ_HOOKS.add(h);
    LOCAL_WRITE_HOOKS.clear();
    for (const h of snapshot.localWriteHooks ?? []) LOCAL_WRITE_HOOKS.add(h);
    LOCAL_READ_HOOKS.clear();
    for (const h of snapshot.localReadHooks ?? []) LOCAL_READ_HOOKS.add(h);
  }
}

/**
 * Singleton parser extension registry. Plugins receive a reference to this
 * instance in their install context; the parser reads from the same
 * underlying module-level sets/maps.
 */
const SINGLETON = new ParserExtensionRegistry();

export function getParserExtensionRegistry(): ParserExtensionRegistry {
  return SINGLETON;
}

/**
 * Phase 5b: centralized writer for `$name` globals. Routes through registered
 * GlobalWriteHook callbacks so plugins (e.g. @hyperfixi/reactivity) are notified
 * on every write. All core write paths for `$name` go through this helper.
 *
 * Kept here (not in parser/runtime.ts) so command helpers can depend on it
 * without pulling in the full expression evaluator graph.
 */
export function setGlobal(context: ExecutionContext, name: string, value: unknown): void {
  context.globals.set(name, value);
  if (GLOBAL_WRITE_HOOKS.size === 0) return;
  for (const hook of GLOBAL_WRITE_HOOKS) {
    try {
      hook(name, value, context);
    } catch (err) {
      // Hooks are best-effort; don't let a plugin throw break the runtime.
      if (typeof console !== 'undefined') {
        console.error('[hyperfixi] globalWriteHook threw:', err);
      }
    }
  }
}
