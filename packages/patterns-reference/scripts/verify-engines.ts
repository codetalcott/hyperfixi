/**
 * Engine verification harness — mechanically fills `code_examples.engine`.
 *
 * For every corpus pattern, verifies the en `raw_code` against both engines —
 * each with its official extensions — and records which accept it:
 *
 *   - `lokascript` — @hyperfixi/engine (this repo's engine, every module
 *     registered: what hyperfixi-hs.js and hyperfixi.js run). Bar: `parse(code)`
 *     reports zero errors, PLUS an install smoke: the source is an element's
 *     `_` attribute, `processNode` initialises it in jsdom (event handlers
 *     register, init blocks run) without an error inside a short settle
 *     window; what it registered is then cleaned up, so no effect outlives
 *     its pattern. Template components render through `processNode` too.
 *
 *     Until Phase C4 this leg was @hyperfixi/core with its first-party plugins
 *     (@hyperfixi/reactivity, @hyperfixi/realtime and @hyperfixi/components),
 *     which is why the rows of upstream's socket / worker / eventsource /
 *     component extensions read `both` then: the engine has none of them (the
 *     plugins were deprecated with core 3.x; htmx 4 carries SSE and WebSockets).
 *   - `hyperscript` — upstream _hyperscript (hyperscript.org, pinned in
 *     devDependencies) with its official socket/worker/eventsource/component
 *     extensions loaded. Bar: `_hyperscript.parse(code)` reports zero parse
 *     errors (0.9.9x parsers recover instead of throwing). Parse-level for
 *     plain sources: a 2026-09-25 probe that also INSTALLED every row upstream
 *     parses found no failure beyond page dependencies (an undefined
 *     `initializeApp`, an unregistered behavior).
 *
 * HTML-markup patterns (raw_code starting with `<`):
 *   - every `_="…"` and `<script type="text/hyperscript">` source — including
 *     the `_` sources inside component template bodies — is verified on both
 *     legs as above;
 *   - template components are RENDERED on both legs, because a component's
 *     behavior is its render and no parse can check it (core's leg read
 *     `attrs.X` as a raw string, upstream reads an expression — the same
 *     source parsed on both and rendered on one). Each defined tag is
 *     instantiated (COMPONENT_FIXTURES supplies attributes and slot content)
 *     and must render non-empty with nothing logged or thrown. The engine
 *     has no template components, so on its leg none renders;
 *   - core's htmx-compat attributes (hx-live / sse-* / ws-*) earn no credit on
 *     either leg: they ran only in dist/hyperfixi-hx-v4.js, which retired with
 *     core's htmx layer (Phase C3). Their corpus rows went with it;
 *   - a row with no source at all earns no credit on either leg.
 *
 * The engine column value is then:
 *   both        — verified on both engines
 *   lokascript  — verified on @hyperfixi/engine only
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
 * the engine built. Re-run this script after engine changes:
 *
 *   npm run verify:engines --prefix packages/patterns-reference
 *
 * The run REFUSES when a package it executes has src/ newer than dist/: a
 * stale build verifies code that differs from the checkout, which is how a
 * 2026-09-23 re-run produced ~20 flips no one could attribute. Rebuild with
 * `npm run check:fresh`.
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

/**
 * After `processNode`: how long the install's first runs (an init body, a
 * `live` effect) get to finish, and log a failure, before judging (ms).
 */
const POST_INSTALL_MS = 50;

/** Settle window for a component render (ms). */
const RENDER_SETTLE_MS = 150;

/**
 * Functions a real page defines that a pattern calls by name. They are page
 * dependencies, like the #id / .class fixtures the smoke synthesises, so each is
 * a no-op global while its row is verified. (`on load` fires during the
 * engine's install smoke; core's never ran it, which is how this row passed
 * there without one.)
 */
const PAGE_FUNCTIONS: Record<string, string[]> = {
  'document-ready': ['initializeApp'],
};

/** Workspace packages whose built dist/ this harness executes. */
const EXECUTED_PACKAGES = ['engine'];

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
    // `.js` for most, `.mjs` / `.cjs` for a dual build; newest wins.
    const marker = ['index.js', 'index.mjs', 'index.cjs']
      .map(f => join(pkg, 'dist', f))
      .filter(f => existsSync(f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
    if (!marker || hasNewerTs(join(pkg, 'src'), statSync(marker).mtimeMs)) stale.push(name);
  }
  return stale;
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Where engine errors go while a render smoke is watching: console.error
 * (both engines LOG failures in component paths rather than
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
    // The engine's value reads and `open`/`close` test these too.
    'HTMLDialogElement',
    'HTMLDetailsElement',
    'FileList',
    'ShadowRoot',
    'SVGElement',
    'Comment',
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

  // --- lokascript engine (this repo): @hyperfixi/engine, every module ---
  // Not booted: upstream installs itself as window._hyperscript below, and the
  // two must not share that name. `api` is the engine's public object.
  const engineModule = await import('@hyperfixi/engine');
  engineModule.register(...engineModule.everything);
  const engine = engineModule.api;

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
    // Symmetric with the upstream leg's `errors.length === 0`.
    try {
      const error = engine.parse(code).errors[0];
      if (error) return error.message.split('\n')[0] ?? 'parse error';
    } catch (e) {
      return errorText(e);
    }
    // Install smoke: `processNode` must not log a failure, synchronously or
    // within the settle window. A still-pending install (e.g. an init block
    // awaiting a timer) counts as installed.
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
    el.setAttribute('_', code);
    fixture.appendChild(el);
    dom.window.document.body.appendChild(fixture);
    const logged: string[] = [];
    errorSink = logged;
    try {
      engine.processNode(el);
      // The engine reports a failing install on the console rather than
      // throwing; let the first runs finish before judging, and before
      // teardown (tearing down mid-run leaked "No elements" into later rows).
      await sleep(POST_INSTALL_MS);
      return logged.length > 0 ? logged[0] : null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    } finally {
      errorSink = null;
      // Dispose what the install registered (listeners, observers, timers,
      // reactive effects), so nothing outlives its fixture and fires during a
      // LATER pattern's window against elements that no longer exist.
      engine.cleanup(el);
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
      if (leg === 'lokascript') engine.processNode(fixture);
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
      if (leg === 'lokascript') engine.cleanup(fixture);
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
    // (or parses), a component that renders. Markup with neither is unverified
    // on both legs, and so is markup in core's retired htmx-compat attributes.
    const nothingToExercise = snippets.length === 0 && componentTags.length === 0;
    const retired = upstreamBlocked
      ? 'uses core-only attributes (hx-live / sse-* / ws-*), retired with hyperfixi-hx-v4.js'
      : null;
    let lokascriptError: string | null =
      retired ?? (nothingToExercise ? 'no verifiable source' : null);
    let hyperscriptError: string | null =
      retired ?? (nothingToExercise ? 'no verifiable source' : null);

    const pageFunctions = PAGE_FUNCTIONS[row.id] ?? [];
    for (const name of pageFunctions) Reflect.set(globalThis, name, () => {});
    for (const snippet of snippets) {
      lokascriptError ??= await verifyLokascriptSnippet(snippet);
      hyperscriptError ??= verifyUpstreamSnippet(snippet);
    }
    for (const name of pageFunctions) Reflect.deleteProperty(globalThis, name);
    if (componentTags.length > 0) {
      lokascriptError ??= await renderComponents('lokascript', row.id, row.raw_code, componentTags);
      hyperscriptError ??= await renderComponents('hyperscript', row.id, row.raw_code, componentTags);
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

  const enginePkg = require_('@hyperfixi/engine/package.json') as { version: string };
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
          '@hyperfixi/engine with every module registered (what hyperfixi-hs.js runs): parse(code) with zero errors, plus a jsdom install smoke (the source as an _ attribute, processNode, nothing logged within 50ms; cleaned up afterwards)',
        hyperscript: `upstream _hyperscript parse with zero recovered errors (extensions loaded: ${upstreamExtensions.join(', ') || 'none'}); parse-level for plain sources`,
        html: 'HTML-markup patterns: every _= / script-tag source, including those inside component template bodies, verified on both legs; template components rendered on both legs (non-empty, nothing logged or thrown); the retired core-only hx-live/sse-*/ws-* markup earns no credit on either leg; a row with no source earns no credit',
      },
      // The versions this file was last regenerated at — informational only;
      // `--check` compares verdicts, not versions.
      // The lokascript leg's package: @hyperfixi/engine since Phase C4.
      lokascriptVersion: enginePkg.version,
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
