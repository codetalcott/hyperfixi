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
 * Determinism: fresh JSDOM + fresh Runtime per execution, no network, no timers
 * beyond a fixed settle window. Effect-signature primitives are imported from
 * ../multilingual/effect-signature so this harness and the R2 ratchet can never
 * disagree about what a DOM effect is.
 */

import { JSDOM } from 'jsdom';
import { parseSemantic, buildAST } from '@lokascript/semantic';
import { snapshot, diffSnapshots } from '../multilingual/effect-signature.js';
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
  /** parsed && !behaviorMatch — the silent-wrong band. */
  silentlyWrong: boolean;
  validation: ValidationOutcome;
  execution: ExecutionOutcome;
  referenceEffects: string[];
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

function installGlobals(dom: JSDOM): void {
  const g = globalThis as Record<string, unknown>;
  g.window = dom.window;
  g.document = dom.window.document;
  g.Event = dom.window.Event;
  g.CustomEvent = dom.window.CustomEvent;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
  g.MutationObserver = dom.window.MutationObserver;
  g.getComputedStyle = dom.window.getComputedStyle;
}

let core: {
  Runtime: new () => { execute(ast: unknown, ctx: unknown): Promise<unknown> };
  createContext: (el: HTMLElement) => unknown;
} | null = null;

let listenerErrors: string[] = [];
let trapInstalled = false;

/** Bootstraps jsdom globals BEFORE loading core (its dist evaluates `Element`). */
export async function initialize(): Promise<void> {
  if (core) return;
  installGlobals(new JSDOM('<!DOCTYPE html><html><body></body></html>'));
  const mod = (await import('@hyperfixi/core')) as unknown as {
    Runtime: new () => { execute(ast: unknown, ctx: unknown): Promise<unknown> };
    createContext: (el: HTMLElement) => unknown;
  };
  core = { Runtime: mod.Runtime, createContext: mod.createContext };
  if (!trapInstalled) {
    // Handler bodies are async, so a throw inside one surfaces as an unhandled
    // rejection rather than propagating to our await.
    process.on('unhandledRejection', (reason: unknown) => {
      listenerErrors.push(reason instanceof Error ? reason.message : String(reason));
    });
    trapInstalled = true;
  }
}

async function executeInner(task: BenchTask, code: string): Promise<ExecutionOutcome> {
  await initialize();
  const dom = buildDocument(task);
  installGlobals(dom);
  const document = dom.window.document;
  task.setup?.(document);
  const btn = document.getElementById('btn')!;
  listenerErrors = [];

  // The runtime logs every failing command; across a full run that is noise.
  const saved = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  try {
    const parsed = parseSemantic(code, 'en') as { node?: unknown; confidence?: number };
    if (!parsed.node || (parsed.confidence ?? 0) < 0.5) {
      return { effects: [], error: `parse failed (confidence ${parsed.confidence ?? 0})` };
    }
    const built = buildAST(parsed.node as never) as { ast?: unknown };
    if (!built.ast) return { effects: [], error: 'buildAST returned no AST' };

    const runtime = new core!.Runtime();
    const ctx = core!.createContext(btn as unknown as HTMLElement);
    await runtime.execute(built.ast, ctx);

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
    return listenerErrors.length > 0
      ? { effects, error: `runtime: ${listenerErrors.join('; ')}` }
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
  return {
    taskId: task.id,
    code,
    parsed: validation.ok,
    behaviorMatch,
    silentlyWrong: validation.ok && !behaviorMatch,
    validation,
    execution,
    referenceEffects,
  };
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
