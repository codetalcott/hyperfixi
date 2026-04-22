/**
 * Parser Extension Registry — runtime plugin surface for the hyperfixi parser.
 *
 * Lets external packages (e.g. @hyperfixi/reactivity, @hyperfixi/speech,
 * @hyperfixi/components) extend the parser at runtime without forking the
 * parser monolith. Three extension points are exposed:
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
 * The registry is **global**: there is one shared `ParserExtensionRegistry`
 * per process, because the parser itself reads from module-level `Set`/`Map`
 * instances. Plugins install once at app startup and persist for the lifetime
 * of the process. `snapshot()` / `restore()` are exposed for tests that need
 * to sandbox plugin installations.
 */

import { COMMANDS, COMPARISON_OPERATORS } from './parser-constants';
import { PARSER_TABLE } from './pratt-parser';
import type { BindingPower, BindingPowerEntry, InfixHandler, PrefixHandler } from './pratt-parser';

/**
 * Snapshot of the registry state so tests can roll back plugin installations.
 */
export interface ParserExtensionSnapshot {
  commands: string[];
  operators: string[];
  prattEntries: Array<[string, BindingPowerEntry]>;
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
   * Capture current state so a test can roll back plugin installations.
   * Intended for test isolation — do not use in production code.
   */
  snapshot(): ParserExtensionSnapshot {
    return {
      commands: Array.from(COMMANDS),
      operators: Array.from(COMPARISON_OPERATORS),
      prattEntries: Array.from(PARSER_TABLE.entries()).map(([k, v]) => [k, { ...v }]),
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
