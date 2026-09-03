/**
 * The engine's one piece of front-end policy: the confidence threshold
 *
 * Until Arc 1 step 6 (2026-09-02, `docs-internal/ENGINE_MIGRATION_PLAN.md`)
 * this module was the in-loop semantic integration: a `SemanticAnalyzer`
 * contract, `createSemanticAdapter` to build one from `@lokascript/semantic`'s
 * primitives, and a 650-line `SemanticIntegrationAdapter` that `parseCommandCore`
 * consulted for every English command not on a 27-entry skip list, adopting
 * the front-end's parse mid-token-stream when it was confident. Step 6 deleted
 * that path: a non-English program now falls back WHOLE-PROGRAM (the front-end
 * renders to English and the core parser parses the English — `compileAsync`'s
 * `fallbackText`), and English is parsed by the core parser alone.
 *
 * Everything the adapter existed for went with it. What remains is the one
 * value the engine still owns: how confident the front-end must be before its
 * direct AST is accepted (`SemanticGrammarBridge`, `config.confidenceThreshold`).
 * It lives here rather than in `@lokascript/semantic` because it is the ENGINE
 * deciding when to trust a front-end's parse — Arc 1 step 1 made this file the
 * single owner of that number, and `multilingual/bridge.ts` imports it from here.
 *
 * @module parser/semantic-integration
 */

/**
 * Default confidence threshold for accepting a front-end's direct AST.
 * Below it, the front-end's English rendering is parsed by the core parser
 * instead (`compileAsync` → `fallbackText`).
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

import type { ASTNode } from '../types/base-types';

/**
 * What a front-end hands back for one non-English program. Either the direct
 * AST (`usedDirectPath: true`, confidence at or above the threshold) or an
 * English rendering for the core parser to parse (`fallbackText`), or neither.
 * `warnings` carries the front-end's own diagnostics (an `unconsumed-input`
 * warning, an AST-builder type-inference note) into `compile(...).meta`.
 */
export interface FrontEndParseResult {
  ast: ASTNode | null;
  usedDirectPath: boolean;
  confidence: number;
  lang: string;
  fallbackText: string | null;
  warnings?: string[];
}

/**
 * A multilingual front-end, as the engine sees it — Arc 1 step 2 of
 * `docs-internal/ENGINE_MIGRATION_PLAN.md`.
 *
 * The engine parses English itself. For any other language `compile()` asks
 * the registered front-end (`hyperscript.use(frontEnd)`), exactly once per
 * program. The front-end depends on the engine's AST types; the engine never
 * depends on the front-end — this interface is the whole of the contract, and
 * `@lokascript/semantic` satisfies it through
 * `multilingual/bridge.ts`'s `createBridgeFrontEnd`. Through 3.x the library
 * entry registers that bridge lazily when nothing else is; the 4.0 cycle
 * removes the default (CHANGELOG, Unreleased).
 *
 * `parse` and `render` are optional: `toLSE`/`fromLSE` need a semantic node
 * and a renderer, and a front-end that has neither simply cannot serve them.
 */
export interface FrontEnd {
  /** For diagnostics (`compile(...).meta` does not carry it). */
  readonly name: string;
  /** Parse a non-English program to the engine's AST, or to English. */
  parseToAST(code: string, lang: string): Promise<FrontEndParseResult>;
  /** Parse to the front-end's own semantic node (for LSE rendering). */
  parse?(code: string, lang: string): Promise<unknown>;
  /** Render a semantic node in `lang`. */
  render?(node: unknown, lang: string): Promise<string>;
}
