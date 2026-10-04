/**
 * Agent-loop benchmark — the scoring engine.
 *
 * Answers two questions per candidate, deliberately separately:
 *
 *   1. **Does it parse?**  `CompilationService.validate()` — the exact call the
 *      `validate_and_compile` MCP tool makes, so the number reflects what an
 *      agent actually sees.
 *   2. **Does it DO the right thing?**  The candidate is executed in jsdom
 *      against the task's fixture and its DOM effect signature compared to the
 *      reference's, byte for byte.
 *
 * Keeping them separate is the point of the benchmark rather than an
 * implementation detail: hyperscript's parser degrades instead of failing, so a
 * candidate can parse at confidence 1.0 with zero diagnostics and still target
 * the wrong element (a dropped `on` silently rebinds the destination to `me`).
 * A single "success rate" would hide exactly the failure mode the loop needs to
 * catch, so `parseRate` and `behaviorRate` are reported side by side and their
 * GAP is a headline number in its own right.
 *
 * Execution is `@hyperfixi/engine`, the product's engine: the candidate is the
 * button's `_` attribute, as on a page. (Until Phase C4 it was `@hyperfixi/core`'s
 * runtime, fed semantic's parse through `buildAST`.)
 *
 * Determinism: a fresh JSDOM per execution, no network, no timers beyond a
 * fixed settle window. Effect-signature primitives are imported from
 * ../multilingual/effect-signature so this harness and the R2 ratchet can never
 * disagree about what a DOM effect is.
 */

import { JSDOM } from 'jsdom';
import { snapshot, diffSnapshots } from '../multilingual/effect-signature.js';
import { installGlobals } from '../multilingual/shipped-examples-execution.js';
import { SHARED_FIXTURE, type BenchTask } from './tasks.js';

/** Settle window for the dispatched handler. No task waits/fetches. */
const SETTLE_MS = 20;
/** Per-execution hard timeout — a hung candidate must not hang the run. */
const EXECUTION_TIMEOUT_MS = 5000;

export interface Diagnostic {
  severity?: string;
  code?: string;
  message?: string;
  suggestion?: string;
}

export interface ValidationOutcome {
  ok: boolean;
  confidence?: number | undefined;
  diagnostics: Diagnostic[];
  /** Flattened `action.role=value` view of the parse, for eyeballing intent drift. */
  summary?: string | undefined;
}

export interface ExecutionOutcome {
  effects: string[];
  error?: string | undefined;
}

export interface TaskScore {
  taskId: string;
  code: string;
  /** CompilationService said ok — what `validate_and_compile` reports. */
  parsed: boolean;
  /** Effect signature identical to the reference's. */
  behaviorMatch: boolean;
  /** parsed && !behaviorMatch && no visible diagnostic — the band the loop cannot see. */
  silentlyWrong: boolean;
  validation: ValidationOutcome;
  execution: ExecutionOutcome;
  referenceEffects: string[];
}

/**
 * The five outcome bands, ordered best → worst. One function, used by the
 * probe, the JSON baseline, and the ratchet test alike — a fork between them
 * would let the ratchet pass against a baseline the probe can no longer
 * produce.
 *
 * `warned-*`: wrong behavior, but validation carried a warning/error-severity
 * diagnostic — VISIBLE to the loop, which can react (arc 3b's unconsumed-input
 * propagation moves rows from silent-* to here). `silent-*`: wrong behavior
 * and nothing to react to; the band that bounds the loop's ceiling.
 */
export type Band = 'correct' | 'rejected' | 'warned-wrong' | 'silent-wrong' | 'silent-noop';

export function bandOf(score: TaskScore): Band {
  if (score.behaviorMatch) return 'correct';
  if (!score.parsed) return 'rejected';
  const visible = score.validation.diagnostics.some(
    d => d.severity === 'warning' || d.severity === 'error'
  );
  if (visible) return 'warned-wrong';
  return score.execution.effects.length === 0 ? 'silent-noop' : 'silent-wrong';
}

export interface ConditionScore {
  condition: string;
  scores: TaskScore[];
  parseRate: number;
  behaviorRate: number;
  /** Tasks that parsed but behaved differently from the reference. */
  silentlyWrongCount: number;
  /** Tasks with no candidate submitted for this condition. */
  missing: string[];
}

// =============================================================================
// Validation (the agent-visible surface)
// =============================================================================

let servicePromise: Promise<any> | null = null;

async function getService(): Promise<any> {
  if (!servicePromise) {
    servicePromise = import('@lokascript/compilation-service').then(m =>
      m.CompilationService.create()
    );
  }
  return servicePromise;
}

/** Render a parse as `action(role=value, …)` so intent drift is readable. */
function summarize(semantic: unknown): string | undefined {
  const node = semantic as { action?: string; roles?: Record<string, { value?: unknown }> };
  if (!node?.action) return undefined;
  const roles = Object.entries(node.roles ?? {})
    .map(([k, v]) => `${k}=${String(v?.value ?? '')}`)
    .sort()
    .join(', ');
  return `${node.action}(${roles})`;
}

export async function validateCandidate(code: string): Promise<ValidationOutcome> {
  try {
    const service = await getService();
    const result = service.validate({ code, language: 'en' });
    return {
      ok: Boolean(result?.ok),
      confidence: result?.confidence,
      diagnostics: (result?.diagnostics ?? []) as Diagnostic[],
      summary: summarize(result?.semantic),
    };
  } catch (e: unknown) {
    return {
      ok: false,
      diagnostics: [
        { severity: 'error', code: 'HARNESS', message: e instanceof Error ? e.message : String(e) },
      ],
    };
  }
}

// =============================================================================
// Execution (what it actually does)
// =============================================================================

function buildDocument(task: BenchTask): JSDOM {
  return new JSDOM(`<!DOCTYPE html><html><body>${SHARED_FIXTURE}${task.fixture}</body></html>`);
}

/** The engine's public surface this harness uses. */
interface ScriptHost {
  parse(source: string): { errors: Array<{ message: string }> };
  processNode(node: unknown): void;
}

let engine: ScriptHost | null = null;

/** Bootstraps jsdom globals, then loads the engine with every module registered. */
export async function initialize(): Promise<void> {
  if (engine) return;
  installGlobals(new JSDOM('<!DOCTYPE html><html><body></body></html>'));
  const mod = await import('@hyperfixi/engine');
  mod.register(...mod.everything);
  engine = mod.api;
}

/** The engine's first parse error for a source, first line; undefined when it parses. */
function parseError(code: string): string | undefined {
  try {
    return engine!.parse(code).errors[0]?.message.split('\n')[0];
  } catch (e: unknown) {
    return (e instanceof Error ? e.message : String(e)).split('\n')[0];
  }
}

async function executeInner(task: BenchTask, code: string): Promise<ExecutionOutcome> {
  await initialize();
  const dom = buildDocument(task);
  installGlobals(dom);
  const document = dom.window.document;
  task.setup?.(document);
  const btn = document.getElementById('btn')!;

  // The engine reports a failing handler on the console (`hyperscript errors were
  // found…`): record those, and drop the rest of the noise.
  const runtimeErrors: string[] = [];
  const saved = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = () => {};
  console.error = (...args: unknown[]) => {
    const error = args.find(a => a instanceof Error);
    runtimeErrors.push(error instanceof Error ? error.message : String(args[0]));
  };
  try {
    const rejected = parseError(code);
    if (rejected !== undefined) return { effects: [], error: `parse failed (engine: ${rejected})` };
    btn.setAttribute('_', code);
    engine!.processNode(btn);

    const before = snapshot(document);
    const trig = task.trigger ?? { event: 'click' };
    const target = trig.selector ? document.querySelector(trig.selector) : btn;
    if (!target) return { effects: [], error: `trigger selector ${trig.selector} matched nothing` };
    const event =
      trig.detail !== undefined
        ? new dom.window.CustomEvent(trig.event, { bubbles: true, detail: trig.detail })
        : new dom.window.Event(trig.event, { bubbles: true });
    target.dispatchEvent(event);
    await new Promise(r => setTimeout(r, SETTLE_MS));

    const effects = diffSnapshots(before, snapshot(document));
    return runtimeErrors.length > 0
      ? { effects, error: `runtime: ${runtimeErrors.join('; ')}` }
      : { effects };
  } catch (e: unknown) {
    return { effects: [], error: e instanceof Error ? e.message : String(e) };
  } finally {
    console.log = saved.log;
    console.warn = saved.warn;
    console.error = saved.error;
    dom.window.close();
  }
}

/** Execute one candidate against a task's fixture. Never throws. */
export async function executeCandidate(task: BenchTask, code: string): Promise<ExecutionOutcome> {
  return Promise.race([
    executeInner(task, code),
    new Promise<ExecutionOutcome>(resolve =>
      setTimeout(
        () => resolve({ effects: [], error: `execution timed out (${EXECUTION_TIMEOUT_MS}ms)` }),
        EXECUTION_TIMEOUT_MS
      )
    ),
  ]);
}

// =============================================================================
// Scoring
// =============================================================================

function sameEffects(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Reference signatures are pure functions of (task, runtime) and every score
 * needs one, so scoring N candidates for a task would otherwise execute its
 * reference N times. Memoized per process; `initialize()` state is per-process
 * too, so the cache can never outlive the runtime it describes.
 */
const referenceCache = new Map<string, string[]>();

export async function referenceEffectsFor(task: BenchTask): Promise<string[]> {
  const hit = referenceCache.get(task.id);
  if (hit) return hit;
  const effects = (await executeCandidate(task, task.reference)).effects;
  referenceCache.set(task.id, effects);
  return effects;
}

export async function scoreCandidate(task: BenchTask, code: string): Promise<TaskScore> {
  const referenceEffects = await referenceEffectsFor(task);
  const validation = await validateCandidate(code);
  const execution = await executeCandidate(task, code);
  const behaviorMatch =
    referenceEffects.length > 0 && sameEffects(execution.effects, referenceEffects);
  const score: TaskScore = {
    taskId: task.id,
    code,
    parsed: validation.ok,
    behaviorMatch,
    silentlyWrong: false,
    validation,
    execution,
    referenceEffects,
  };
  score.silentlyWrong = bandOf(score).startsWith('silent');
  return score;
}

export async function scoreCondition(
  condition: string,
  candidates: Record<string, string>,
  tasks: readonly BenchTask[]
): Promise<ConditionScore> {
  const scores: TaskScore[] = [];
  const missing: string[] = [];
  for (const task of tasks) {
    const code = candidates[task.id];
    if (code === undefined) {
      missing.push(task.id);
      continue;
    }
    scores.push(await scoreCandidate(task, code));
  }
  // Missing candidates count as failures in the denominator: a condition that
  // simply declines to answer must not out-score one that tries and misses.
  const denom = tasks.length;
  return {
    condition,
    scores,
    parseRate: scores.filter(s => s.parsed).length / denom,
    behaviorRate: scores.filter(s => s.behaviorMatch).length / denom,
    silentlyWrongCount: scores.filter(s => s.silentlyWrong).length,
    missing,
  };
}
