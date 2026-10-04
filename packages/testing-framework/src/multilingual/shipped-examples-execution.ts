/**
 * Shipped-examples execution gate — upstream as the behavioral oracle
 * -------------------------------------------------------------------
 * Every parse-level gate in this repo went green while `native-dialog.html`
 * shipped with a conditional body running unconditionally (#785), and again
 * while five upstream-valid `if` shapes regressed on a PR branch (#786). The
 * class they cannot see is BEHAVIOR: a handler that parses cleanly and then
 * does the wrong thing on the page.
 *
 * This gate executes the handlers we actually ship. For each `_="…"` attribute
 * in `examples/**`, the full page is loaded into two jsdom instances — one
 * processed by `@hyperfixi/engine`, one by the real `hyperscript.org` engine
 * (`processNode` on both) — the handler's trigger event is dispatched, and the
 * resulting DOM effect signatures (../effect-signature.ts, shared with the R2
 * execution ratchet) are diffed against each other. Upstream plays the role R4
 * gives it for validity: the oracle. A divergence means the engine's runtime
 * behavior differs from upstream's ON A SHIPPED PAGE — exactly the #785/#786
 * failure mode, caught on behavior instead of by luck. The parse-level list of
 * what the engine rejects (shipped-sources-engine.test.ts) cannot see a handler
 * that parses on both and runs differently; this can. A handler upstream
 * accepts and the engine rejects is compared too, and diverges.
 *
 * (Until Phase C4 a second lane ran each handler on `@hyperfixi/core`'s runtime
 * against the same oracle. It left with core's engine; its ten allowlisted
 * divergences were core's.)
 *
 * ## Fair denominator (mirrors R4)
 * A handler is only compared when upstream parses it (an engine-only form, such
 * as `new X()`, has no oracle). It must also be deterministically executable in
 * jsdom: triggered by a dispatchable event, free of network / timer /
 * navigation constructs. Every exclusion is recorded with a reason — the skip
 * list is part of the result, never silent (`no silent caps`).
 *
 * ## Execution model
 * Per handler and engine: a FRESH jsdom of the whole page, every eligible
 * handler installed (page-like — bubbling into sibling handlers stays real and
 * symmetric), then ONLY the probed handler's event dispatched, with a
 * before/after snapshot around it. See runHandlerOnEngine for why isolation is
 * worth its cost.
 *
 * ## Node-only
 * Imports the real `hyperscript.org` build off disk and swaps jsdom globals
 * per handler execution (both engines resolve `document` lazily through
 * globalThis — the same mechanism the R2 validator relies on). Cannot run in a
 * browser suite, and under vitest REQUIRES the node environment (see the test
 * file's docblock).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { snapshot, diffSnapshots } from './effect-signature';

/** Repo root, from `packages/testing-framework/src/multilingual/`. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * Only `examples/**` — unlike the shipped-sources validity gate, execution
 * needs the surrounding PAGE (the handler's selectors resolve against it), and
 * doc snippets have none.
 */
const DEFAULT_ROOTS = ['examples'];

/**
 * Events the harness can dispatch deterministically. `on load` is excluded
 * (fires through engine-specific initialization, not a dispatchable event);
 * anything not listed is skipped with a reason.
 */
const SAFE_EVENTS = new Set([
  'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'pointerdown',
  'pointerup',
  'input',
  'change',
  'keydown',
  'keyup',
  'focus',
  'blur',
]);

/**
 * Constructs that make an execution nondeterministic in jsdom (network,
 * timers, animation, navigation, module-level installs) — with, for each, the
 * reason it is excluded. Matched against the whole source.
 */
const DISQUALIFIERS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bfetch\b/, reason: 'network (fetch)' },
  { pattern: /\bwait\b/, reason: 'timers (wait)' },
  { pattern: /\bsettle\b/, reason: 'animation settling' },
  { pattern: /\btransition\b/, reason: 'animation (transition)' },
  { pattern: /\brepeat\s+forever\b/, reason: 'unbounded loop' },
  { pattern: /\bgo\s+to\s+url\b/i, reason: 'navigation' },
  { pattern: /\binstall\s/, reason: 'behavior install (registries differ by design)' },
  { pattern: /(^|\s)js(\s|\()/, reason: 'js interop block' },
  { pattern: /\beventsource\b/i, reason: 'SSE' },
  { pattern: /\bsocket\b/i, reason: 'WebSocket' },
  { pattern: /\bnavigator\b/, reason: 'browser API jsdom does not implement' },
  { pattern: /\bbeep!/, reason: 'debug construct' },
  {
    pattern: /\bnew Date\b|\bMath\.random\b|toLocaleTimeString|Date\.now/,
    reason: 'nondeterministic value (time/random) — signatures would flake across the two runs',
  },
];

/** A handler extracted from a shipped page. */
export interface ShippedHandler {
  /** Repo-relative path of the page. */
  file: string;
  /** Document-order index among the page's `[_]` elements — the element's identity across jsdom instances. */
  index: number;
  /** The hyperscript source. */
  source: string;
  /** The trigger event parsed from the leading `on` clause, when any. */
  event: string | null;
}

export interface SkippedHandler extends ShippedHandler {
  reason: string;
}

/** One handler run on upstream and on `@hyperfixi/engine`; signatures either match or not. */
export interface EngineComparedHandler extends ShippedHandler {
  /** Stable key: file + source hash + event. Fixing a source changes its key. */
  key: string;
  event: string;
  engineEffects: string[];
  upstreamEffects: string[];
  match: boolean;
  /**
   * Both signatures empty. NOT evidence of parity — a genuinely effect-free
   * handler (bare `halt`, a `log`) and a both-engines-broken handler look the
   * same. Counted separately; never let vacuous pairs inflate the match count.
   */
  vacuous: boolean;
  /** Single-line excerpt, for reading the baseline without opening the file. */
  excerpt: string;
}

export interface ExecutionParityResult {
  /** Pages walked. */
  pages: number;
  /** Handlers found (before eligibility). */
  handlers: number;
  /** Handlers excluded, each with its reason. */
  skipped: SkippedHandler[];
  /** Handlers upstream accepts, executed on upstream and on `@hyperfixi/engine`. */
  engineCompared: EngineComparedHandler[];
}

/** Stable key for one handler execution. */
export function keyFor(h: { file: string; source: string; event: string }): string {
  const hash = createHash('sha1').update(h.source).digest('hex').slice(0, 10);
  return `${h.file}::${hash}::${h.event}`;
}

/** First `on <event>` name, if the source is an event handler. */
export function triggerEventOf(source: string): string | null {
  // `on every click`, `on click[filter]`, `on click from #x`, `on click or keyup`
  // all yield their first event name; modifiers/filters are dropped.
  const m = source.match(/^\s*on\s+(?:every\s+)?([\w-]+(?::[\w-]+)?)/);
  return m ? (m[1] ?? null) : null;
}

/**
 * Git-TRACKED .html files under `root` (repo-relative), as absolute paths.
 *
 * Tracked, not on-disk, because the corpus must be the SHIPPED tree: four
 * `examples/` dirs are gitignored (experiments/, playground/,
 * vite-plugin-test/, vite-plugin-multilingual/), and the disk walk this
 * replaced counted whatever happened to be on the machine. That is how the
 * gate's sanity floors and allowlist got calibrated against handlers that
 * were never shipped — and why it failed on every clean checkout the first
 * time CI ran it (#862). `git ls-files` sees the same corpus everywhere.
 *
 * git being unavailable is a THROW, not a fallback to the disk walk — a
 * silent fallback would resurrect the corpus drift this exists to kill.
 * A tracked file missing from disk (an uncommitted local deletion) is
 * skipped: the working tree is mid-edit, and in CI checkout == index.
 */
function trackedHtml(repoRoot: string, root: string): string[] {
  const out = execFileSync('git', ['ls-files', '-z', '--', root], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split('\0')
    .filter(rel => rel.endsWith('.html'))
    .map(rel => path.join(repoRoot, rel))
    .filter(full => fs.existsSync(full));
}

/** Extract the page's `[_]` handlers in document order. */
export function extractHandlers(file: string, html: string): ShippedHandler[] {
  const dom = new JSDOM(html);
  const out: ShippedHandler[] = [];
  dom.window.document.querySelectorAll('[_]').forEach((el: Element, index: number) => {
    const source = el.getAttribute('_') ?? '';
    out.push({ file, index, source, event: triggerEventOf(source) });
  });
  return out;
}

/** Minimal engine surfaces, injected by `initEngines`. */
export interface Engines {
  /** upstream parse check (the fair denominator). Returns error strings; [] = valid. */
  upstreamErrors(source: string): string[];
  /** Install a handler on an element via the upstream engine. */
  upstreamInstall(el: Element): void;
  /** `@hyperfixi/engine`'s parse errors for a source; [] = it parses. */
  engineErrors(source: string): string[];
  /** Install a handler on an element via `@hyperfixi/engine`. */
  engineInstall(el: Element): void;
}

/**
 * Keys this module has installed onto globalThis from a jsdom window. Tracked
 * so every later `installGlobals` RE-points them at the new page's window —
 * merely skipping keys that already exist left every DOM constructor
 * (`HTMLElement`, `Element`, …) bound to the FIRST page forever, and both
 * engines' `instanceof` checks then silently failed for later pages' elements
 * (measured: upstream produced empty signatures for `on click put 'Hello' into
 * #output` — the simplest possible handler — on every page after the first).
 */
const installedGlobalKeys = new Set<string>();

/**
 * Point the process globals at a page's jsdom (jsdom-global style: everything
 * the window owns that node does not, plus the DOM-critical names node has
 * opinions about). Both engines resolve `document` lazily through globalThis,
 * so this is what "switching pages" means.
 */
export function installGlobals(dom: JSDOM): void {
  const g = globalThis as Record<string, unknown>;
  const win = dom.window as unknown as Record<string, unknown>;
  for (const key of Object.getOwnPropertyNames(win)) {
    if (key in globalThis && !installedGlobalKeys.has(key)) continue; // node's own — leave it
    try {
      g[key] = win[key];
      installedGlobalKeys.add(key);
    } catch {
      /* read-only */
    }
  }
  for (const key of ['window', 'document', 'Event', 'CustomEvent', 'navigator']) {
    try {
      Object.defineProperty(g, key, {
        value: key === 'window' ? dom.window : win[key],
        configurable: true,
        writable: true,
      });
      installedGlobalKeys.add(key);
    } catch {
      /* read-only */
    }
  }
}

/**
 * Errors thrown inside dispatched listeners surface as unhandled rejections
 * (handlers are async) and would crash the sweep. Trapped, not asserted: a
 * runtime error that damages behavior diverges in its effect signature, which
 * is the comparison — same stance as the R2 validator.
 */
let rejectionTrapInstalled = false;
function installRejectionTrap(): void {
  if (rejectionTrapInstalled) return;
  process.on('unhandledRejection', () => {
    /* swallowed — the effect signature is the assertion */
  });
  rejectionTrapInstalled = true;
}

/**
 * Load both engines ONCE, after bootstrapping jsdom globals (both packages
 * touch DOM constructors at module evaluation). Callers then swap pages via
 * `installGlobals`.
 */
export async function initEngines(): Promise<Engines> {
  installRejectionTrap();
  installGlobals(new JSDOM('<!doctype html><html><body></body></html>'));

  const require = createRequire(import.meta.url);
  const esm = path.join(path.dirname(require.resolve('hyperscript.org')), '_hyperscript.esm.js');
  const hs = (await import(pathToFileURL(esm).href)).default as {
    parse(src: string): { errors?: Array<{ message: string }> };
    processNode(el: Node): void;
  };

  const engine = await import('@hyperfixi/engine');
  engine.register(...engine.everything);

  return {
    engineErrors(source) {
      try {
        return engine.api.parse(source).errors.map(e => e.message.split('\n')[0] ?? '');
      } catch (e) {
        return ['threw: ' + (e as Error).message.split('\n')[0]];
      }
    },
    engineInstall(el) {
      engine.api.processNode(el);
    },
    upstreamErrors(source) {
      try {
        return (hs.parse(source)?.errors ?? []).map(e => e.message);
      } catch (e) {
        return ['threw: ' + (e as Error).message.split('\n')[0]];
      }
    },
    upstreamInstall(el) {
      hs.processNode(el);
    },
  };
}

/** Drain micro/macrotasks after a dispatch (same window the R2 validator uses). */
const SETTLE_MS = 20;
const settle = () => new Promise(r => setTimeout(r, SETTLE_MS));

/**
 * Execute ONE handler on one engine, in ISOLATION: a fresh jsdom of the page,
 * every eligible handler installed (as on a real page — bubbling into sibling
 * handlers stays page-like and symmetric across engines), then ONLY the probed
 * handler's event dispatched, with a before/after snapshot around it.
 *
 * Isolation is deliberate, and worth its jsdom-per-handler cost: a sequential
 * dispatch-them-all model was measured amplifying ONE real divergence into a
 * page's worth of cascades (upstream's inert element-`decrement` made the
 * following `put 0 into #count` write 0-over-0 — invisible — so every later
 * handler on the page diverged too), and letting double-failures hide as
 * empty-vs-empty "matches". Fresh state per handler makes each comparison
 * independently triageable.
 *
 * Runtime errors do not abort — the effect signature is the comparison, and an
 * error that damages behavior diverges in its effects.
 */
async function runHandlerOnEngine(
  html: string,
  eligible: Array<ShippedHandler & { event: string }>,
  target: ShippedHandler & { event: string },
  install: (h: ShippedHandler & { event: string }, el: Element) => Promise<void> | void
): Promise<string[]> {
  // No pretendToBeVisual: nothing eligible needs rAF (animation constructs are
  // disqualified), and its frame timer would keep node alive after the sweep.
  const dom = new JSDOM(html);
  try {
    installGlobals(dom);
    const doc = dom.window.document;
    const els = doc.querySelectorAll('[_]');

    // Stamp identity keys BEFORE anything runs: same page → same stamping on
    // both engines, so snapshot keys are the element's identity and an
    // engine-inserted node cannot shift them (see snapshot()).
    doc.body
      .querySelectorAll('*')
      .forEach((el: Element, i: number) => el.setAttribute('data-exec-key', String(i)));

    for (const h of eligible) {
      const el = els[h.index];
      if (!el) continue;
      try {
        await install(h, el);
      } catch {
        /* recorded via the empty signature */
      }
    }

    const el = els[target.index];
    if (!el) return ['<element not found>'];
    if ((target.event === 'input' || target.event === 'change') && 'value' in el) {
      (el as HTMLInputElement).value = 'test';
    }
    const before = snapshot(doc);
    el.dispatchEvent(new dom.window.Event(target.event, { bubbles: true, cancelable: true }));
    await settle();
    return diffSnapshots(before, snapshot(doc));
  } finally {
    // Release the page's timers/listeners so the process can exit; the next
    // page (or the caller's bootstrap dom) re-points the globals.
    dom.window.close();
  }
}

/**
 * The sweep: walk the git-tracked `examples/**` corpus, extract handlers,
 * apply the fair-denominator filters (each skip reasoned), and execute every
 * eligible handler on upstream and on the engine.
 */
export async function runShippedExamplesExecution(opts?: {
  roots?: string[];
  repoRoot?: string;
  engines?: Engines;
}): Promise<ExecutionParityResult> {
  const repoRoot = opts?.repoRoot ?? REPO_ROOT;
  const roots = opts?.roots ?? DEFAULT_ROOTS;
  const engines = opts?.engines ?? (await initEngines());

  const skipped: SkippedHandler[] = [];
  const engineCompared: EngineComparedHandler[] = [];
  let pages = 0;
  let handlers = 0;

  for (const root of roots) {
    for (const full of trackedHtml(repoRoot, root)) {
      const rel = path.relative(repoRoot, full);
      const html = fs.readFileSync(full, 'utf8');
      const pageHandlers = extractHandlers(rel, html);
      if (pageHandlers.length === 0) continue;
      pages++;
      handlers += pageHandlers.length;

      // The denominator: dispatchable, deterministic, and upstream accepts it.
      const oracle: Array<ShippedHandler & { event: string }> = [];
      for (const h of pageHandlers) {
        if (!h.event) {
          skipped.push({ ...h, reason: 'not an `on <event>` handler' });
          continue;
        }
        if (!SAFE_EVENTS.has(h.event)) {
          skipped.push({ ...h, reason: `event not dispatchable deterministically (${h.event})` });
          continue;
        }
        const disq = DISQUALIFIERS.find(d => d.pattern.test(h.source));
        if (disq) {
          skipped.push({ ...h, reason: disq.reason });
          continue;
        }
        const upstreamErrs = engines.upstreamErrors(h.source);
        if (upstreamErrs.length > 0) {
          skipped.push({ ...h, reason: `upstream rejects it (no oracle): ${upstreamErrs[0]}` });
          continue;
        }
        oracle.push(h as ShippedHandler & { event: string });
      }
      if (oracle.length === 0) continue;

      // Both engines log runtime errors to the console during dispatch
      // (COMMAND FAILED etc.). That is expected data here — the effect
      // signature carries the consequence — so silence the console for the
      // engine runs only, restoring even on a throw.
      const saved = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      };
      const noop = () => {};
      console.log = console.warn = console.error = console.debug = noop;
      try {
        for (const h of oracle) {
          const rejected = engines.engineErrors(h.source)[0];
          const theirs = await runHandlerOnEngine(html, oracle, h, (_hh, el) =>
            engines.upstreamInstall(el)
          );
          const ours =
            rejected !== undefined
              ? [`<engine rejects the source: ${rejected}>`]
              : await runHandlerOnEngine(html, oracle, h, (_hh, el) => engines.engineInstall(el));
          engineCompared.push({
            ...h,
            key: keyFor(h),
            engineEffects: ours,
            upstreamEffects: theirs,
            match: JSON.stringify(ours) === JSON.stringify(theirs),
            vacuous: ours.length === 0 && theirs.length === 0,
            excerpt: h.source.replace(/\s+/g, ' ').trim().slice(0, 100),
          });
        }
      } finally {
        console.log = saved.log;
        console.warn = saved.warn;
        console.error = saved.error;
        console.debug = saved.debug;
      }
    }
  }

  return { pages, handlers, skipped, engineCompared };
}
