/**
 * Hot-path benchmarks — Arc 0's number for Arc 4b
 *
 * Arc 0 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Arc 4b's claim is that
 * binding a command ONCE at compile time, rather than re-deriving its arguments
 * on every execution, is faster. That claim needs a number before the arc, not
 * an adjective after it.
 *
 * ## What the existing benchmarks could not tell us
 *
 * `execution.bench.ts` calls `compile()` INSIDE each measured body, so every
 * row is compile + execute. That is a fair measure of a cold call and a useless
 * one for the question here: the shipped engine caches ASTs (`ASTCache`, 500
 * entries, keyed on source), so a page's second click re-executes a cached AST
 * and pays no parse cost at all. What it DOES still pay, on every single
 * execution, is `parseInput` — `CommandAdapterV2.execute` calls it per
 * execution and nothing caches the result.
 *
 * So the rows below split the two costs apart:
 *
 *   - **compile + execute** — matching `execution.bench.ts`.
 *   - **execute only** — the AST built once in `beforeAll`.
 *
 * Measured 2026-08-30, and the answer was not the expected one: the two are
 * within noise (1.06x). `compile()` on a repeated source is an `ASTCache` hit,
 * i.e. a Map lookup, so BOTH rows are really measuring execution. That is the
 * finding: **on the warm path the engine already pays no parse cost, so every
 * millisecond Arc 4b can win has to come from the runtime side** — from
 * `parseInput` running per execution, not from parsing. The rows are kept
 * because that equivalence is exactly what would break if the cache ever
 * regressed, and nothing else watches for that.
 *
 * ## The parseInput contrast
 *
 * The second group is the same measurement pointed at Arc 3. `toggle` has the
 * largest `parseInput` in the command set (242 lines); `add` has 66, and does
 * comparable DOM work, so the delta between them is argument derivation rather
 * than effect. Both re-run that work on every execution.
 *
 * Measured 2026-08-30: **1.03x — noise.** The size of a `parseInput` does not
 * predict what an execution costs, because most of `toggle`'s 242 lines are
 * branches a given call never enters. So **Arc 3's case is maintainability, not
 * speed**, and should be argued that way. That is worth knowing before
 * committing to ~50 PRs, and is exactly the kind of plan premise that gets
 * asserted rather than measured.
 *
 * Neither row is a gate. Both exist so the claim can be re-measured after the
 * arc lands rather than asserted.
 *
 * Run: `npm run bench --prefix packages/core`
 * CI: nightly, via `bench:ci`; `continue-on-error`, never a gate.
 */

// @vitest-environment happy-dom
import { bench, describe, beforeAll } from 'vitest';
import type { ASTNode, CompileResult, ExecutionContext } from '../src/index';

let compile: (code: string) => CompileResult;
let execute: (ast: ASTNode, context?: ExecutionContext) => Promise<unknown>;

/** The plan's named hot-path source: two commands, two targets, one sequence. */
const SEQUENCE = "toggle .active on #x then put 'a' into #y";

/** A 242-line `parseInput` (the largest in the command set). */
const HEAVY_PARSE_INPUT = 'toggle .active on #x';

/**
 * The contrast: a 66-line `parseInput` doing comparable DOM work
 * (`classList.add` vs `classList.toggle`), so the delta is the argument
 * derivation and not the effect.
 *
 * `log` was the obvious choice and is the wrong one — it writes to stdout, and
 * the I/O dominated the measurement so thoroughly that it benchmarked 9.6x
 * SLOWER than the 242-line command it was supposed to be the cheap half of.
 */
const LIGHT_PARSE_INPUT = 'add .z to #y';

let sequenceAst: ASTNode;
let heavyAst: ASTNode;
let lightAst: ASTNode;

/** Compile once, or fail loudly — a benchmark over a failed parse measures nothing. */
function compileOrThrow(source: string): ASTNode {
  const result = compile(source);
  if (!result.ok || !result.ast) {
    throw new Error(`hot-path bench: '${source}' did not compile — the benchmark would be vacuous`);
  }
  return result.ast;
}

beforeAll(async () => {
  document.body.innerHTML = `
    <div id="x" class="active"></div>
    <div id="y"></div>
  `;

  const mod = await import('../src/index');
  compile = mod.lokascript.compileSync.bind(mod.lokascript);
  execute = mod.lokascript.execute.bind(mod.lokascript);

  sequenceAst = compileOrThrow(SEQUENCE);
  heavyAst = compileOrThrow(HEAVY_PARSE_INPUT);
  lightAst = compileOrThrow(LIGHT_PARSE_INPUT);
});

// =============================================================================
// Warm vs cold — what the AST cache already saves, and what it does not
// =============================================================================

describe('Hot path: compile once, execute many', () => {
  bench(
    'execute only — toggle + put sequence',
    async () => {
      await execute(sequenceAst);
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'compile + execute — toggle + put sequence',
    async () => {
      const result = compile(SEQUENCE);
      if (result.ok && result.ast) await execute(result.ast);
    },
    { warmupIterations: 100, iterations: 1000 }
  );
});

// =============================================================================
// The per-execution parseInput cost — Arc 3's number
// =============================================================================

describe('Hot path: per-execution parseInput', () => {
  bench(
    'execute only — toggle (242-line parseInput)',
    async () => {
      await execute(heavyAst);
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'execute only — add (66-line parseInput)',
    async () => {
      await execute(lightAst);
      document.getElementById('y')?.classList.remove('z');
    },
    { warmupIterations: 100, iterations: 1000 }
  );
});
