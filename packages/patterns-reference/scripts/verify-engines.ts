/**
 * Engine verification harness — mechanically fills `code_examples.engine`.
 *
 * For every corpus pattern, verifies the en `raw_code` against both engines —
 * each with its official extensions — and records which accept it:
 *
 *   - `lokascript` — @hyperfixi/core (this repo) with its first-party plugins:
 *     @hyperfixi/reactivity and @hyperfixi/realtime (pre-installed in
 *     hyperfixi.js; they register `live`/`when`/`bind`/`$var`/caret-var and
 *     socket/eventsource/worker) and @hyperfixi/components. Bar:
 *     `compileSync(code).ok` with ZERO recovered errors (the exact call the
 *     browser `_=` attribute path makes), PLUS an install smoke: the compiled
 *     AST executes top-level in jsdom (event handlers register, init blocks
 *     run) without an error inside a short settle window; what it registered
 *     is then cleaned up, so no effect outlives its pattern.
 *
 *     The "zero recovered errors" half matters: the parser is resilient, so
 *     `ok` stays true for input it recovered from (that is deliberate — see
 *     ParseResult.success). Gating on `ok` alone therefore stamped
 *     `lokascript` on patterns hyperfixi does not cleanly accept either,
 *     which is how `set-color-variable` (`*--primary-color`, rejected by BOTH
 *     engines) carried a lokascript verdict. Both legs now use the same bar.
 *   - `hyperscript` — upstream _hyperscript (hyperscript.org, pinned in
 *     devDependencies) with its official socket/worker/eventsource/component
 *     extensions loaded. Bar: `_hyperscript.parse(code)` reports zero parse
 *     errors (0.9.9x parsers recover instead of throwing). Parse-level for
 *     plain sources: a 2026-09-25 probe that also INSTALLED every row upstream
 *     parses found no failure beyond page dependencies (an undefined
 *     `initializeApp`, an unregistered behavior).
 *
 * HTML-markup patterns (raw_code starting with `<`):
 *   - every `_="…"`, `hx-live="…"` and `<script type="text/hyperscript">`
 *     source — including the `_` sources inside component template bodies —
 *     is verified on both legs as above;
 *   - template components are RENDERED on both legs, because a component's
 *     behavior is its render and no parse can check it (upstream reads
 *     `attrs.X` as an expression, @hyperfixi/components as a raw string — the
 *     same source parses on both and renders on one). Each defined tag is
 *     instantiated (COMPONENT_INSTANCES supplies attributes and slot content)
 *     and must render non-empty with nothing logged or thrown;
 *   - the htmx-compat attributes (hx-live / sse-* / ws-*) are hyperfixi-only
 *     and block the upstream claim. Their lokascript credit comes from driving
 *     the markup through the bundle that ships them, dist/hyperfixi-hx-v4.js,
 *     in an isolated jsdom window (hxV4Smoke) — never from "the feature is
 *     tested elsewhere";
 *   - a row with no source at all earns no credit on either leg.
 *
 * The engine column value is then:
 *   both        — verified on both engines
 *   lokascript  — verified on @hyperfixi/core only
 *   hyperscript — verified on upstream only
 *   NULL        — verified on neither (renders "Unverified" in the docs)
 *
 * Behavioral (DOM-effect) verification beyond the install smoke is covered
 * separately by the multilingual R2 execution ratchet
 * (packages/testing-framework/src/multilingual/validators/execution-validator.ts)
 * for its curated subset.
 *
 * Rows come from `SEED_EXAMPLES` in scripts/init-db.ts — the source — not
 * from data/patterns.db, so a stale local DB cannot change what is verified.
 *
 * Output: data/engine-verification.json (committed). `scripts/init-db.ts`
 * reads it at seed time — it is the ONLY source of the engine column — so
 * `npm run populate` stamps the verified values into the DB without needing
 * @hyperfixi/core built. Re-run this script after parser/plugin changes:
 *
 *   npm run verify:engines --prefix packages/patterns-reference
 *
 * The run REFUSES when a package it executes has src/ newer than dist/ (or
 * the hx-v4 bundle is older than the source it bundles): a stale build
 * verifies code that differs from the checkout, which is how a 2026-09-23
 * re-run produced ~20 flips no one could attribute. Rebuild with
 * `npm run check:fresh` and `npm run build:browser:hybrid-hx-v4 --prefix
 * packages/core`.
 *
 * Flags:
 *   --check       recompute and compare with the committed JSON; write
 *                 nothing; exit 1 on any verdict or coverage drift (CI:
 *                 `browser-tests`). Error text and versions are not compared,
 *                 so a parser-message tweak or release bump never reddens it.
 *   --update-db   also UPDATE the engine column in data/patterns.db in place
 */

import { JSDOM, VirtualConsole } from 'jsdom';
import Database from 'better-sqlite3';
import { extractHyperscriptFromMarkup, type MarkupSnippets } from '../src/html-snippets';
import { SEED_EXAMPLES } from './init-db';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..');
const PACKAGES_ROOT = join(PKG_ROOT, '..');
const DB_PATH = join(PKG_ROOT, 'data', 'patterns.db');
const OUT_PATH = join(PKG_ROOT, 'data', 'engine-verification.json');
const require_ = createRequire(import.meta.url);

/** Settle window for the lokascript install smoke (ms). */
const INSTALL_SETTLE_MS = 500;

/**
 * After an install resolves: how long its first effect runs (queued on a
 * microtask) get to finish, and log a failure, before judging (ms).
 */
const POST_INSTALL_MS = 50;

/** Settle window for a component render or an hx-v4 wiring step (ms). */
const RENDER_SETTLE_MS = 150;

/** Workspace packages whose built dist/ this harness executes. */
const EXECUTED_PACKAGES = ['core', 'reactivity', 'realtime', 'components'];

/** The browser bundle that implements hx-live / sse-* / ws-* (see hxV4Smoke). */
const HX_V4_BUNDLE = join(PACKAGES_ROOT, 'core', 'dist', 'hyperfixi-hx-v4.js');

/** Packages whose source that bundle is built from. */
const HX_V4_SOURCES = ['core', 'reactivity', 'realtime'];

interface ComponentFixture {
  /** Instance markup, as the page using the component would write it. Default `<tag></tag>`. */
  instance?: (tag: string) => string;
  /** Text the rendered instance must contain — its interpolations resolved. */
  text: string[];
  /** Selector inside the render → text that must land there (slot placement). */
  placed?: Record<string, string>;
}

/**
 * How to render each template-component pattern, and what a CORRECT render
 * shows. "Rendered something, logged nothing" is not enough: malformed
 * `data` renders an empty `<h3></h3>` on both engines without a word, and an
 * instance's own slot children are non-empty before any render happens. A
 * component pattern with no entry here fails on both legs, so a new one
 * cannot slip through unverified.
 */
const COMPONENT_FIXTURES: Record<string, ComponentFixture> = {
  'component-hello-world': { text: ['Hello World'] },
  'component-click-counter': { text: ['Clicks: 0', '+'] },
  'component-with-conditional': { text: ['Demo', 'admin'] },
  'component-with-attrs': {
    instance: tag => `<${tag} data='{"name":"Ada","admin":true}'></${tag}>`,
    text: ['Ada', 'admin'],
  },
  'component-with-slots': {
    instance: tag =>
      `<${tag}><span slot="title">Title</span>Body<span slot="footer">Footer</span></${tag}>`,
    text: ['Title', 'Body', 'Footer'],
    placed: { header: 'Title', main: 'Body', footer: 'Footer' },
  },
};

interface VerifyResult {
  lokascript: boolean;
  hyperscript: boolean;
  lokascriptError?: string;
  hyperscriptError?: string;
}

function isHtmlMarkupPattern(code: string): boolean {
  return /^\s*</.test(code);
}

function hasNewerTs(dir: string, builtAt: number): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasNewerTs(p, builtAt)) return true;
    } else if (entry.name.endsWith('.ts') && statSync(p).mtimeMs > builtAt) {
      return true;
    }
  }
  return false;
}

/**
 * Executed packages whose src/ is newer than their built entry (or that have
 * no build at all). Same semantics as the multilingual CLI's findStaleDists
 * and scripts/ensure-fresh.sh; read-only — this refuses rather than rebuilds.
 */
function findStaleDists(): string[] {
  const stale: string[] = [];
  for (const name of EXECUTED_PACKAGES) {
    const pkg = join(PACKAGES_ROOT, name);
    // `.mjs` for core (its CJS twin is `.cjs`), `.js` for most; newest wins.
    const marker = ['index.js', 'index.mjs', 'index.cjs']
      .map(f => join(pkg, 'dist', f))
      .filter(f => existsSync(f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
    if (!marker || hasNewerTs(join(pkg, 'src'), statSync(marker).mtimeMs)) stale.push(name);
  }
  // A separate build (`build:browser:hybrid-hx-v4`) of core+reactivity+realtime.
  const bundleAt = existsSync(HX_V4_BUNDLE) ? statSync(HX_V4_BUNDLE).mtimeMs : 0;
  if (!bundleAt || HX_V4_SOURCES.some(n => hasNewerTs(join(PACKAGES_ROOT, n, 'src'), bundleAt))) {
    stale.push('core/dist/hyperfixi-hx-v4.js');
  }
  return stale;
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Where engine errors go while a render smoke is watching: console.error
 * (both engines LOG failures in component and hx-v4 paths rather than
 * throwing to the caller), uncaught exceptions and unhandled rejections
 * (upstream's component init throws from a timer). Installed once for the
 * whole run — removing a process handler mid-run would let a late throw kill
 * the harness. With no smoke watching, output passes through untouched.
 */
let errorSink: string[] | null = null;

function installErrorSink(): void {
  const passThrough = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (errorSink) errorSink.push(args.map(errorText).join(' ').slice(0, 300));
    else passThrough(...args);
  };
  const onUncaught = (e: unknown) => {
    if (errorSink) errorSink.push(`uncaught: ${errorText(e)}`);
    else passThrough('[verify-engines] uncaught outside any smoke window:', e);
  };
  process.on('uncaughtException', onUncaught);
  process.on('unhandledRejection', onUncaught);
}

type EngineVerdict = 'both' | 'lokascript' | 'hyperscript' | null;

function engineOf(r: Pick<VerifyResult, 'lokascript' | 'hyperscript'>): EngineVerdict {
  if (r.lokascript && r.hyperscript) return 'both';
  if (r.lokascript) return 'lokascript';
  if (r.hyperscript) return 'hyperscript';
  return null;
}

/**
 * Every way the committed JSON disagrees with a fresh run: a verdict that
 * changed, a pattern with no committed verdict, a verdict for a pattern that
 * no longer exists, and an `engines` entry that contradicts its own
 * `details` (a hand edit).
 */
function compareWithCommitted(results: Record<string, VerifyResult>): string[] {
  const committed = JSON.parse(readFileSync(OUT_PATH, 'utf-8')) as {
    engines: Record<string, EngineVerdict>;
    details: Record<string, VerifyResult>;
  };
  const problems: string[] = [];
  for (const [id, fresh] of Object.entries(results)) {
    const old = committed.details[id];
    if (!old) {
      problems.push(`${id}: no committed verdict (verifies as ${engineOf(fresh) ?? 'NULL'})`);
    } else if (old.lokascript !== fresh.lokascript || old.hyperscript !== fresh.hyperscript) {
      const why = [
        fresh.lokascriptError && `lokascript: ${fresh.lokascriptError}`,
        fresh.hyperscriptError && `hyperscript: ${fresh.hyperscriptError}`,
      ]
        .filter(Boolean)
        .join('; ');
      problems.push(
        `${id}: committed ${engineOf(old) ?? 'NULL'}, verifies as ${engineOf(fresh) ?? 'NULL'}` +
          (why ? ` (${why})` : '')
      );
    }
  }
  for (const id of Object.keys(committed.details)) {
    if (!(id in results)) problems.push(`${id}: committed verdict for a pattern that no longer exists`);
  }
  for (const [id, verdict] of Object.entries(committed.engines)) {
    const d = committed.details[id];
    if (d && engineOf(d) !== verdict) {
      problems.push(`${id}: engines says ${verdict ?? 'NULL'} but its details say ${engineOf(d) ?? 'NULL'}`);
    }
  }
  return problems;
}

/** Set up jsdom globals BEFORE importing either engine. */
function installDomGlobals(): JSDOM {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  });
  const keys = [
    'window',
    'document',
    'self',
    'Element',
    'HTMLElement',
    'HTMLScriptElement',
    'HTMLInputElement',
    'HTMLTextAreaElement',
    'HTMLSelectElement',
    'HTMLTemplateElement',
    'HTMLFormElement',
    'HTMLCollection',
    'Document',
    'DOMParser',
    'customElements',
    'Node',
    'NodeList',
    'MutationObserver',
    'KeyboardEvent',
    'MouseEvent',
    'InputEvent',
    'FocusEvent',
    'DocumentFragment',
    'Blob',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'localStorage',
    'sessionStorage',
    'history',
  ];
  const g = globalThis as Record<string, unknown>;
  for (const k of keys) {
    try {
      if (!(k in globalThis) || g[k] === undefined) {
        g[k] = (dom.window as unknown as Record<string, unknown>)[k];
      }
    } catch {
      try {
        Object.defineProperty(globalThis, k, {
          value: (dom.window as unknown as Record<string, unknown>)[k],
          configurable: true,
        });
      } catch {
        /* best-effort */
      }
    }
  }
  // Node 24 ships its OWN Event, CustomEvent, EventTarget, MessageEvent and
  // FormData, so the copy-if-missing loop above would keep them — and then
  // every event core dispatches at install time (`send`/`trigger` in an init
  // block, fetch's lifecycle events) throws "parameter 1 is not of type
  // 'Event'" on a jsdom element, and `new FormData(form)` rejects a jsdom form.
  // The DOM's classes must win.
  for (const k of ['Event', 'CustomEvent', 'EventTarget', 'MessageEvent', 'FormData']) {
    Object.defineProperty(globalThis, k, {
      value: (dom.window as unknown as Record<string, unknown>)[k],
      configurable: true,
      writable: true,
    });
  }
  try {
    g.navigator = dom.window.navigator;
  } catch {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
    });
  }
  // Upstream extensions + realtime patterns need these; stubs keep the
  // harness offline and deterministic.
  g.addEventListener = dom.window.addEventListener.bind(dom.window);
  g.removeEventListener = dom.window.removeEventListener.bind(dom.window);
  g.WebSocket = class {
    send() {}
    addEventListener() {}
    close() {}
  };
  g.Worker = class {
    postMessage() {}
    addEventListener() {}
    terminate() {}
  };
  g.EventSource = class {
    addEventListener() {}
    close() {}
  };
  (globalThis.URL as unknown as { createObjectURL: () => string }).createObjectURL = () =>
    'blob:verify-engines-stub';
  // No network: resolve fetches with an empty OK response.
  g.fetch = () =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
      headers: { get: () => null },
    });
  return dom;
}

/**
 * Extract verifiable hyperscript snippets from an HTML-markup pattern.
 *
 * Delegates to the shared extractor so this harness and the testing-framework's
 * shipped-sources gate cannot drift on what counts as a live source.
 */
function extractSnippets(dom: JSDOM, markup: string): MarkupSnippets {
  return extractHyperscriptFromMarkup(dom.window.document, markup);
}

interface StubListenerMap {
  get(type: string): Array<(e: unknown) => void> | undefined;
  set(type: string, fns: Array<(e: unknown) => void>): unknown;
}

function stubListen(map: StubListenerMap, type: string, fn: (e: unknown) => void): void {
  map.set(type, [...(map.get(type) ?? []), fn]);
}

/**
 * Drive hx-live / sse-* / ws-* markup through the bundle that implements it.
 *
 * A FRESH jsdom window per call runs dist/hyperfixi-hx-v4.js exactly as a page
 * would (it auto-initializes and watches the body), with recording stubs for
 * EventSource and WebSocket. The markup must then DO something, per attribute:
 *   - each `sse-swap` event name, emitted on the connection its `sse-connect`
 *     opened, lands in its `hx-target` (or the element itself);
 *   - each `ws-send` form, submitted, reaches the socket its `ws-connect`
 *     opened;
 *   - each `hx-live` element re-renders when the `$vars` it reads change.
 * Anything the window logs as an error fails the row. Returns null on success.
 */
async function hxV4Smoke(markup: string, bundleSource: string): Promise<string | null> {
  const logged: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', (...args: unknown[]) => logged.push(args.map(errorText).join(' ')));
  virtualConsole.on('jsdomError', (e: Error) => logged.push(e.message));
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const win = dom.window as unknown as {
    document: typeof dom.window.document;
    Event: typeof dom.window.Event;
    MessageEvent: typeof dom.window.MessageEvent;
    eval: (source: string) => unknown;
    hyperfixi?: { run: (code: string, el: unknown) => Promise<unknown> };
    [k: string]: unknown;
  };
  const sources: Array<{ url: string; emit: (type: string, data: string) => void }> = [];
  const sockets: Array<{ url: string; sent: string[] }> = [];

  win.EventSource = class {
    url: string;
    readyState = 1;
    onmessage: ((e: unknown) => void) | null = null;
    onopen: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    private listeners = new Map<string, Array<(e: unknown) => void>>();
    constructor(url: string) {
      this.url = String(url);
      sources.push(this);
    }
    addEventListener(type: string, fn: (e: unknown) => void) {
      stubListen(this.listeners, type, fn);
    }
    removeEventListener(type: string, fn: (e: unknown) => void) {
      this.listeners.set(type, (this.listeners.get(type) ?? []).filter(f => f !== fn));
    }
    close() {
      this.readyState = 2;
    }
    emit(type: string, data: string) {
      const ev = new win.MessageEvent(type, { data });
      for (const fn of this.listeners.get(type) ?? []) fn(ev);
      if (type === 'message') this.onmessage?.(ev);
    }
  };
  win.WebSocket = class {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    url: string;
    readyState = 1;
    sent: string[] = [];
    onopen: ((e: unknown) => void) | null = null;
    onmessage: ((e: unknown) => void) | null = null;
    onclose: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    private listeners = new Map<string, Array<(e: unknown) => void>>();
    constructor(url: string) {
      this.url = String(url);
      sockets.push(this);
      setTimeout(() => {
        const ev = new win.Event('open');
        this.onopen?.(ev);
        for (const fn of this.listeners.get('open') ?? []) fn(ev);
      }, 0);
    }
    addEventListener(type: string, fn: (e: unknown) => void) {
      stubListen(this.listeners, type, fn);
    }
    removeEventListener(type: string, fn: (e: unknown) => void) {
      this.listeners.set(type, (this.listeners.get(type) ?? []).filter(f => f !== fn));
    }
    send(data: unknown) {
      this.sent.push(String(data));
    }
    close() {
      this.readyState = 3;
    }
  };
  win.fetch = () =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
      headers: { get: () => null },
    });

  const doc = win.document;
  try {
    win.eval(bundleSource);
    if (!win.hyperfixi) return 'hyperfixi-hx-v4.js did not install window.hyperfixi';

    // `#id` targets the markup points at but does not contain — the page
    // around the pattern provides them.
    const probe = doc.createElement('div');
    probe.innerHTML = markup;
    const missingTargets = Array.from(probe.querySelectorAll('[hx-target]'))
      .map(el => el.getAttribute('hx-target') ?? '')
      .filter(sel => /^#[\w-]+$/.test(sel) && !probe.querySelector(sel));
    doc.body.innerHTML =
      markup + [...new Set(missingTargets)].map(sel => `<div id="${sel.slice(1)}"></div>`).join('');
    await sleep(RENDER_SETTLE_MS);

    for (const el of Array.from(doc.querySelectorAll('[sse-swap]'))) {
      const url = el.closest('[sse-connect]')?.getAttribute('sse-connect') ?? '';
      const source = sources.find(s => s.url === url || s.url.endsWith(url));
      if (!source) return `sse-connect="${url}" opened no EventSource`;
      const targetSel = el.getAttribute('hx-target');
      const target = targetSel ? doc.querySelector(targetSel) : el;
      const names = (el.getAttribute('sse-swap') ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      for (const name of names) {
        source.emit(name, `<i data-probe="${name}">${name}</i>`);
        await sleep(20);
        if (!target?.querySelector(`[data-probe="${name}"]`)) {
          return `sse-swap event "${name}" did not swap into ${targetSel ?? 'its element'}`;
        }
      }
    }

    for (const form of Array.from(doc.querySelectorAll('form[ws-send]'))) {
      const url = form.closest('[ws-connect]')?.getAttribute('ws-connect') ?? '';
      const socket = sockets.find(s => s.url === url || s.url.endsWith(url));
      if (!socket) return `ws-connect="${url}" opened no WebSocket`;
      for (const input of Array.from(form.querySelectorAll('input[name]'))) {
        (input as unknown as { value: string; name: string }).value =
          `probe-${(input as unknown as { name: string }).name}`;
      }
      form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
      await sleep(RENDER_SETTLE_MS);
      if (!socket.sent.some(payload => payload.includes('probe-'))) {
        return `ws-send: the submitted form never reached the socket (sent: ${JSON.stringify(socket.sent)})`;
      }
    }

    for (const el of Array.from(doc.querySelectorAll('[hx-live]'))) {
      const source = el.getAttribute('hx-live') ?? '';
      const vars = [...new Set(source.match(/\$[A-Za-z_]\w*/g) ?? [])];
      if (vars.length === 0) continue;
      const before = el.outerHTML;
      for (const v of vars) await win.hyperfixi.run(`set ${v} to 7`, doc.body);
      await sleep(RENDER_SETTLE_MS);
      if (el.outerHTML === before) {
        return `hx-live="${source}" did not re-render when ${vars.join(', ')} changed`;
      }
    }

    return logged.length > 0 ? logged[0].slice(0, 300) : null;
  } catch (e) {
    return errorText(e);
  } finally {
    dom.window.close();
  }
}

async function main(): Promise<void> {
  const updateDb = process.argv.includes('--update-db');
  const checkOnly = process.argv.includes('--check');

  const stale = findStaleDists();
  if (stale.length > 0) {
    console.error(
      `[verify-engines] REFUSING: stale or missing dist/ in ${stale.join(', ')} — the ` +
        'verdicts would describe the built output, not your checkout.\n' +
        '  Rebuild first: npm run check:fresh (or npm run build --prefix packages/<name>).'
    );
    process.exit(2);
  }

  const dom = installDomGlobals();
  installErrorSink();
  const hxV4Bundle = readFileSync(HX_V4_BUNDLE, 'utf-8');

  // --- lokascript engine (this repo) ---
  const core = await import('@hyperfixi/core');
  const { hyperscript, installPlugin, Runtime } = core as unknown as {
    hyperscript: {
      compileSync: (code: string) => {
        ok: boolean;
        ast?: unknown;
        errors?: Array<{ message: string }>;
      };
      execute: (ast: unknown, ctx: unknown) => Promise<unknown>;
      createContext: (el?: unknown) => unknown;
      cleanup: (el: unknown) => number;
    };
    installPlugin: (runtime: unknown, plugin: unknown) => void;
    Runtime: new () => unknown;
  };
  const reactivity = (await import('@hyperfixi/reactivity')) as unknown as {
    default: { version?: string };
    reactive: { stopElementEffects: (el: unknown) => void };
  };
  const realtimeModule = (await import('@hyperfixi/realtime')) as unknown as {
    default: { version?: string };
  };
  const { componentsPlugin } = (await import('@hyperfixi/components')) as unknown as {
    componentsPlugin: { scan: (root: unknown) => number };
  };
  const pluginRuntime = new Runtime();
  installPlugin(pluginRuntime, reactivity.default);
  installPlugin(pluginRuntime, realtimeModule.default);
  installPlugin(pluginRuntime, componentsPlugin);

  // --- upstream engine ---
  await import('hyperscript.org');
  const upstreamExtensions: string[] = [];
  for (const ext of ['socket', 'worker', 'eventsource', 'component']) {
    try {
      await import(`hyperscript.org/ext/${ext}.js`);
      upstreamExtensions.push(ext);
    } catch (e) {
      console.warn(`[verify-engines] upstream ext '${ext}' failed to load:`, e);
    }
  }
  const upstream = (
    dom.window as unknown as {
      _hyperscript: {
        parse: (code: string) => { errors?: Array<{ message?: string }> };
        process: (el: unknown) => void;
      };
    }
  )._hyperscript;

  const verifyLokascriptSnippet = async (code: string): Promise<string | null> => {
    const compiled = hyperscript.compileSync(code);
    // Symmetric with the upstream leg's `errors.length === 0`. `ok` alone is
    // "is there a runnable AST?", which stays true for a recovered parse.
    if (!compiled.ok || compiled.errors?.length) {
      return compiled.errors?.[0]?.message ?? 'compile failed';
    }
    // Install smoke: top-level execute must not fail synchronously or within
    // the settle window. A still-pending install (e.g. an init block awaiting
    // a timer) counts as installed.
    //
    // Fixture synthesis: patterns reference page elements (#total, .tab, …)
    // that a real page provides. Create a bare element for every #id / .class
    // the snippet mentions so install-time effects (live/init bodies) don't
    // fail on missing targets — we're verifying the pattern, not the page.
    const fixture = dom.window.document.createElement('div');
    // `bind` auto-detects a bindable property from the target's tag, so its
    // id fixtures must be form elements; everything else gets a plain div.
    const idFixtureTag = /\bbind\b/.test(code) ? 'input' : 'div';
    for (const id of new Set(Array.from(code.matchAll(/#([A-Za-z][\w-]*)/g), m => m[1]))) {
      const target = dom.window.document.createElement(idFixtureTag);
      target.id = id;
      fixture.appendChild(target);
    }
    for (const cls of new Set(Array.from(code.matchAll(/\.([A-Za-z][\w-]*)/g), m => m[1]))) {
      const target = dom.window.document.createElement('div');
      target.className = cls;
      fixture.appendChild(target);
    }
    const el = dom.window.document.createElement('div');
    fixture.appendChild(el);
    dom.window.document.body.appendChild(fixture);
    const logged: string[] = [];
    errorSink = logged;
    try {
      const ctx = hyperscript.createContext(el);
      const settled = await Promise.race([
        hyperscript.execute(compiled.ast, ctx).then(
          () => null,
          (e: unknown) => (e instanceof Error ? e.message : String(e))
        ),
        new Promise<null>(resolve => setTimeout(() => resolve(null), INSTALL_SETTLE_MS)),
      ]);
      if (settled) return settled;
      // `execute` resolves once the install is registered, but a live/when
      // effect's first run starts on a microtask after that, and an init body
      // may still be awaiting. Let those runs finish before judging — the
      // engine LOGS their failures rather than rejecting — and before teardown
      // (tearing down mid-run is what leaked "No elements" into later rows).
      await sleep(POST_INSTALL_MS);
      return logged.length > 0 ? logged[0] : null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    } finally {
      errorSink = null;
      // Dispose what the install registered. Without this a `live` effect
      // outlives its fixture and fires during a LATER pattern's window,
      // against elements that no longer exist. Effects created through an API
      // context are owned by their element but reach no runtime cleanup
      // registry, so they are stopped explicitly (reactivity's documented
      // teardown for lifecycles managed outside the runtime).
      hyperscript.cleanup(fixture);
      for (const node of [fixture, ...Array.from(fixture.querySelectorAll('*'))]) {
        reactivity.reactive.stopElementEffects(node);
      }
      fixture.remove();
    }
  };

  let componentSeq = 0;
  /**
   * Render every component the markup defines, on one leg. Tags are renamed
   * per render so the two legs — and rows that reuse a name (two corpus rows
   * both define `user-card`) — never collide in the window's single
   * customElements registry.
   */
  const renderComponents = async (
    leg: 'lokascript' | 'hyperscript',
    rowId: string,
    markup: string,
    tags: string[]
  ): Promise<string | null> => {
    const renamed = new Map<string, string>();
    let isolated = markup;
    for (const tag of tags) {
      const fresh = `${tag}-${leg === 'lokascript' ? 'hf' : 'up'}-${++componentSeq}`;
      renamed.set(tag, fresh);
      isolated = isolated.split(`component="${tag}"`).join(`component="${fresh}"`);
    }
    const expected = COMPONENT_FIXTURES[rowId];
    if (!expected) return `no render expectation declared for ${rowId} in COMPONENT_FIXTURES`;
    const instance = expected.instance ?? ((tag: string) => `<${tag}></${tag}>`);
    const fixture = dom.window.document.createElement('div');
    fixture.innerHTML = isolated + [...renamed.values()].map(instance).join('');
    dom.window.document.body.appendChild(fixture);
    const before = new Map([...renamed.values()].map(t => [t, fixture.querySelector(t)?.innerHTML]));
    const logged: string[] = [];
    errorSink = logged;
    try {
      if (leg === 'lokascript') componentsPlugin.scan(fixture);
      else upstream.process(fixture);
      await sleep(RENDER_SETTLE_MS);
      if (logged.length > 0) return logged[0];
      for (const [tag, fresh] of renamed) {
        const el = fixture.querySelector(fresh);
        if (!el || el.innerHTML === before.get(fresh)) return `component <${tag}> never rendered`;
        const shown = el.textContent ?? '';
        const missing = expected.text.filter(t => !shown.includes(t));
        if (missing.length > 0) {
          return `component <${tag}> rendered without ${JSON.stringify(missing)}: ${JSON.stringify(shown.replace(/\s+/g, ' ').trim())}`;
        }
        for (const [selector, text] of Object.entries(expected.placed ?? {})) {
          if (!el.querySelector(selector)?.textContent?.includes(text)) {
            return `component <${tag}> did not place ${JSON.stringify(text)} in <${selector}>`;
          }
        }
      }
      return null;
    } catch (e) {
      return errorText(e);
    } finally {
      errorSink = null;
      if (leg === 'lokascript') hyperscript.cleanup(fixture);
      fixture.remove();
    }
  };

  const verifyUpstreamSnippet = (code: string): string | null => {
    try {
      const result = upstream.parse(code);
      const errors = result?.errors ?? [];
      return errors.length === 0 ? null : (errors[0]?.message ?? 'parse error');
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  };

  const rows = [...SEED_EXAMPLES].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const results: Record<string, VerifyResult> = {};

  for (const row of rows) {
    let snippets: string[] = [row.raw_code];
    let componentTags: string[] = [];
    let upstreamBlocked = false;

    if (isHtmlMarkupPattern(row.raw_code)) {
      const extracted = extractSnippets(dom, row.raw_code);
      snippets = extracted.snippets;
      componentTags = extracted.componentTags;
      upstreamBlocked = extracted.hyperfixiOnly;
    }

    // A leg earns credit only for what it exercised: a source that compiles
    // (or parses), a component that renders, markup the hx-v4 bundle drives.
    // Markup with none of those is unverified on both legs.
    const nothingToExercise = snippets.length === 0 && componentTags.length === 0;
    let lokascriptError: string | null =
      nothingToExercise && !upstreamBlocked ? 'no verifiable source' : null;
    let hyperscriptError: string | null = upstreamBlocked
      ? 'uses hyperfixi-only attributes (hx-live / sse-* / ws-*)'
      : nothingToExercise
        ? 'no verifiable source'
        : null;

    for (const snippet of snippets) {
      lokascriptError ??= await verifyLokascriptSnippet(snippet);
      hyperscriptError ??= verifyUpstreamSnippet(snippet);
    }
    if (componentTags.length > 0) {
      lokascriptError ??= await renderComponents('lokascript', row.id, row.raw_code, componentTags);
      hyperscriptError ??= await renderComponents('hyperscript', row.id, row.raw_code, componentTags);
    }
    // hx-live / sse-* / ws-* exist only in hyperfixi-hx-v4.js: its lokascript
    // credit is that bundle actually running the markup.
    if (upstreamBlocked) {
      lokascriptError ??= await hxV4Smoke(row.raw_code, hxV4Bundle);
    }

    results[row.id] = {
      lokascript: lokascriptError === null,
      hyperscript: hyperscriptError === null,
      ...(lokascriptError ? { lokascriptError: lokascriptError.slice(0, 200) } : {}),
      ...(hyperscriptError ? { hyperscriptError: hyperscriptError.slice(0, 200) } : {}),
    };
  }

  const counts = { both: 0, lokascript: 0, hyperscript: 0, unverified: 0 };
  for (const r of Object.values(results)) {
    const e = engineOf(r);
    if (e === 'both') counts.both++;
    else if (e === 'lokascript') counts.lokascript++;
    else if (e === 'hyperscript') counts.hyperscript++;
    else counts.unverified++;
  }
  console.log(
    `[verify-engines] ${rows.length} patterns → both: ${counts.both}, lokascript: ${counts.lokascript}, hyperscript: ${counts.hyperscript}, unverified: ${counts.unverified}`
  );

  if (checkOnly) {
    const problems = compareWithCommitted(results);
    if (problems.length > 0) {
      console.error(
        `[verify-engines] --check FAILED: data/engine-verification.json disagrees with the engines on ${problems.length} point(s):`
      );
      for (const p of problems) console.error(`  ✗ ${p}`);
      console.error(
        '  Regenerate on fresh builds and commit the JSON:\n' +
          '    npm run verify:engines --prefix packages/patterns-reference'
      );
      process.exit(1);
    }
    console.log(`[verify-engines] --check OK: all ${rows.length} committed verdicts reproduce`);
    process.exit(0);
  }

  const corePkg = require_('@hyperfixi/core/package.json') as { version: string };
  // hyperscript.org's exports map blocks ./package.json — resolve its entry
  // file and read the sibling package.json directly.
  const upstreamEntry = require_.resolve('hyperscript.org');
  const upstreamPkg = require_(join(dirname(upstreamEntry), '..', 'package.json')) as {
    version: string;
  };

  const output = {
    meta: {
      bar: {
        lokascript:
          'compileSync(code).ok with zero recovered errors via @hyperfixi/core (same call as the browser _= path) with its first-party plugins installed (@hyperfixi/reactivity and @hyperfixi/realtime, both pre-installed in hyperfixi.js, and @hyperfixi/components), plus a jsdom top-level install smoke (no error within a 500ms settle window; registrations cleaned up afterwards)',
        hyperscript: `upstream _hyperscript parse with zero recovered errors (extensions loaded: ${upstreamExtensions.join(', ') || 'none'}); parse-level for plain sources`,
        html: 'HTML-markup patterns: every _= / hx-live / script-tag source, including those inside component template bodies, verified on both legs; template components rendered on both legs (non-empty, nothing logged or thrown); hx-live/sse-*/ws-* markup is hyperfixi-only (blocks the upstream claim) and earns its lokascript credit only by running in dist/hyperfixi-hx-v4.js (sse events swap into hx-target, ws-send reaches the socket, hx-live re-renders); a row with no source earns no credit',
      },
      // The versions this file was last regenerated at — informational only;
      // `--check` compares verdicts, not versions.
      lokascriptVersion: corePkg.version,
      hyperscriptVersion: upstreamPkg.version,
    },
    engines: Object.fromEntries(
      Object.entries(results).map(([id, r]) => [id, engineOf(r)])
    ) as Record<string, EngineVerdict>,
    details: results,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`[verify-engines] wrote ${OUT_PATH}`);

  if (updateDb) {
    if (!existsSync(DB_PATH)) {
      console.warn(`[verify-engines] --update-db: no database at ${DB_PATH}; run npm run populate`);
    } else {
      const db = new Database(DB_PATH);
      const update = db.prepare('UPDATE code_examples SET engine = ? WHERE id = ?');
      const tx = db.transaction(() => {
        for (const [id, r] of Object.entries(results)) {
          update.run(engineOf(r), id);
        }
      });
      tx();
      db.close();
      console.log(`[verify-engines] updated engine column in ${DB_PATH}`);

      // engine-verification.json is a stamped DB input (see src/sync/db-stamp.ts),
      // and we just rewrote both it and the DB — refresh the stamp so the
      // multilingual gate doesn't read this consistent state as stale.
      const { writeDbStamp } = await import('../src/sync/db-stamp');
      writeDbStamp(DB_PATH);
      console.log('[verify-engines] refreshed patterns.db.stamp');
    }
  }

  for (const [id, r] of Object.entries(results)) {
    if (!r.lokascript) {
      console.log(`  ✗ lokascript ${id}: ${r.lokascriptError}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[verify-engines] fatal:', err);
  process.exit(1);
});
