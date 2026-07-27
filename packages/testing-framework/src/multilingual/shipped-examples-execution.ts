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
 * processed by hyperfixi (parse + a fresh Runtime with the element as context,
 * the same shape the browser attribute processor uses), one by the real
 * `hyperscript.org` engine (`processNode`) — the handler's trigger event is
 * dispatched, and the resulting DOM effect signatures (../effect-signature.ts,
 * shared with the R2 execution ratchet) are diffed against each other.
 * Upstream plays the role R4 gives it for validity: the oracle. A divergence
 * means hyperfixi's runtime behavior differs from upstream's ON A SHIPPED
 * PAGE — exactly the #785/#786 failure mode, caught on behavior instead of by
 * luck.
 *
 * ## Fair denominator (mirrors R4)
 * A handler is only compared when BOTH engines accept its source: hyperfixi
 * must compile it clean (`ok: true`, no recovered errors — recovering sources
 * are the shipped-sources gate's business) and upstream must parse it (a
 * hyperfixi-only extension has no oracle). It must also be deterministically
 * executable in jsdom: triggered by a dispatchable event, free of network /
 * timer / navigation constructs. Every exclusion is recorded with a reason —
 * the skip list is part of the result, never silent (`no silent caps`).
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

/** One compared handler: both engines ran it; signatures either match or not. */
export interface ComparedHandler extends ShippedHandler {
  /** Stable key: file + source hash + event. Fixing a source changes its key. */
  key: string;
  event: string;
  hyperfixiEffects: string[];
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
  /** Handlers executed on both engines. */
  compared: ComparedHandler[];
  /** Handlers excluded, each with its reason. */
  skipped: SkippedHandler[];
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

function walkHtml(dir: string, acc: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
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
  /** hyperfixi compile check (fair-denominator side 1). */
  compileClean(source: string): boolean;
  /** upstream parse check (fair-denominator side 2). Returns error strings; [] = valid. */
  upstreamErrors(source: string): string[];
  /** Install a handler on an element via hyperfixi (the public eval surface). */
  hyperfixiInstall(source: string, el: Element): Promise<void>;
  /** Install a handler on an element via the upstream engine. */
  upstreamInstall(el: Element): void;
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

  // Install goes through parse + a FRESH Runtime per handler with the element
  // as context — the same shape the browser attribute processor uses, and the
  // same shape the R2 validator proved stable across per-page document swaps.
  // (The api singleton `hyperscript.eval` binds document-dependent state at
  // first use, which is correct in a browser — document identity never changes
  // within a realm — but silently resolves later PAGES' selectors against the
  // first page here. Measured: a two-page probe no-opped page 2's toggle.)
  const core = (await import('@hyperfixi/core')) as unknown as {
    hyperscript: {
      compileSync(code: string): { ok: boolean; errors?: Array<{ message: string }> };
    };
    parse(code: string): { success: boolean; node?: unknown };
    Runtime: new () => { execute(ast: unknown, ctx: unknown): Promise<unknown> };
    createContext(el: HTMLElement): unknown;
  };

  const require = createRequire(import.meta.url);
  const esm = path.join(path.dirname(require.resolve('hyperscript.org')), '_hyperscript.esm.js');
  const hs = (await import(pathToFileURL(esm).href)).default as {
    parse(src: string): { errors?: Array<{ message: string }> };
    processNode(el: Node): void;
  };

  return {
    compileClean(source) {
      try {
        const r = core.hyperscript.compileSync(source);
        return r.ok && (r.errors ?? []).length === 0;
      } catch {
        return false;
      }
    },
    upstreamErrors(source) {
      try {
        return (hs.parse(source)?.errors ?? []).map(e => e.message);
      } catch (e) {
        return ['threw: ' + (e as Error).message.split('\n')[0]];
      }
    },
    async hyperfixiInstall(source, el) {
      const parsed = core.parse(source);
      if (!parsed.success || !parsed.node) {
        throw new Error('parse failed at install (eligibility should have caught this)');
      }
      const runtime = new core.Runtime();
      await runtime.execute(parsed.node, core.createContext(el as HTMLElement));
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
 * The sweep: walk `examples/**`, extract handlers, apply the fair-denominator
 * filters (each skip reasoned), and execute every eligible handler on both
 * engines.
 */
export async function runShippedExamplesExecution(opts?: {
  roots?: string[];
  repoRoot?: string;
  engines?: Engines;
}): Promise<ExecutionParityResult> {
  const repoRoot = opts?.repoRoot ?? REPO_ROOT;
  const roots = opts?.roots ?? DEFAULT_ROOTS;
  const engines = opts?.engines ?? (await initEngines());

  const compared: ComparedHandler[] = [];
  const skipped: SkippedHandler[] = [];
  let pages = 0;
  let handlers = 0;

  for (const root of roots) {
    for (const full of walkHtml(path.join(repoRoot, root))) {
      const rel = path.relative(repoRoot, full);
      const html = fs.readFileSync(full, 'utf8');
      const pageHandlers = extractHandlers(rel, html);
      if (pageHandlers.length === 0) continue;
      pages++;
      handlers += pageHandlers.length;

      const eligible: Array<ShippedHandler & { event: string }> = [];
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
        if (!engines.compileClean(h.source)) {
          skipped.push({
            ...h,
            reason: 'hyperfixi does not compile it clean (shipped-sources gate territory)',
          });
          continue;
        }
        const upstreamErrs = engines.upstreamErrors(h.source);
        if (upstreamErrs.length > 0) {
          skipped.push({ ...h, reason: `upstream rejects it (no oracle): ${upstreamErrs[0]}` });
          continue;
        }
        eligible.push(h as ShippedHandler & { event: string });
      }
      if (eligible.length === 0) continue;

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
        for (const h of eligible) {
          const ours = await runHandlerOnEngine(html, eligible, h, (hh, el) =>
            engines.hyperfixiInstall(hh.source, el)
          );
          const theirs = await runHandlerOnEngine(html, eligible, h, (_hh, el) =>
            engines.upstreamInstall(el)
          );
          compared.push({
            ...h,
            key: keyFor(h),
            hyperfixiEffects: ours,
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

  return { pages, handlers, compared, skipped };
}
