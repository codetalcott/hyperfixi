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
