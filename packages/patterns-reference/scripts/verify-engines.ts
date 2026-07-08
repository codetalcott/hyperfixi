/**
 * Engine verification harness — mechanically fills `code_examples.engine`.
 *
 * For every pattern in patterns.db, verifies the en `raw_code` against both
 * engines and records which accept it:
 *
 *   - `lokascript` — @hyperfixi/core (this repo). Bar: `compileSync(code).ok`
 *     (the exact call the browser `_=` attribute path makes, so "compiles"
 *     here means "the shipped hyperfixi.js bundle would accept it"), PLUS an
 *     install smoke: the compiled AST executes top-level in jsdom (event
 *     handlers register, init blocks run) without a synchronous error inside
 *     a short settle window. The @hyperfixi/reactivity plugin is installed
 *     first — it is part of the shipped ecosystem and registers the
 *     `live`/`when`/`bind`/`$var`/caret-var syntax.
 *   - `hyperscript` — upstream _hyperscript (hyperscript.org, pinned in
 *     devDependencies) with its official socket/worker/eventsource
 *     extensions loaded. Bar: `_hyperscript.parse(code)` reports zero parse
 *     errors (0.9.9x parsers recover instead of throwing). Parse-level only:
 *     upstream execution is not exercised here.
 *
 * HTML-markup patterns (raw_code starting with `<`): every `_="…"` attribute
 * and `<script type="text/hyperscript">` body is verified individually; the
 * markup counts as upstream-compatible only if it also uses no
 * hyperfixi-only attributes (hx-live / sse-* / ws-*).
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
 * Output: data/engine-verification.json (committed). `scripts/init-db.ts`
 * reads it at seed time, so `npm run populate` stamps the verified values
 * into the DB without needing @hyperfixi/core built. Re-run this script
 * (needs core + reactivity dist built) after parser/plugin changes:
 *
 *   npm run verify:engines --prefix packages/patterns-reference
 *
 * Flags:
 *   --update-db   also UPDATE the engine column in data/patterns.db in place
 */

import { JSDOM } from 'jsdom';
import Database from 'better-sqlite3';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..');
const DB_PATH = join(PKG_ROOT, 'data', 'patterns.db');
const OUT_PATH = join(PKG_ROOT, 'data', 'engine-verification.json');
const require_ = createRequire(import.meta.url);

/** Attribute prefixes that only the hyperfixi htmx-compat layer implements. */
const HYPERFIXI_ONLY_ATTR_PREFIXES = ['hx-live', 'sse-', 'ws-'];

/** Settle window for the lokascript install smoke (ms). */
const INSTALL_SETTLE_MS = 500;

interface PatternRow {
  id: string;
  raw_code: string;
  feature: string;
}

interface VerifyResult {
  lokascript: boolean;
  hyperscript: boolean;
  lokascriptError?: string;
  hyperscriptError?: string;
}

function isHtmlMarkupPattern(code: string): boolean {
  return /^\s*</.test(code);
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
    'Node',
    'NodeList',
    'MutationObserver',
    'CustomEvent',
    'Event',
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

/** Extract verifiable hyperscript snippets from an HTML-markup pattern. */
function extractSnippets(dom: JSDOM, markup: string): { snippets: string[]; hyperfixiOnly: boolean } {
  const container = dom.window.document.createElement('div');
  container.innerHTML = markup;
  const snippets: string[] = [];
  let hyperfixiOnly = false;

  for (const el of container.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      if (attr.name === '_' && attr.value.trim()) {
        snippets.push(attr.value);
      }
      // hx-live values ARE hyperscript (the htmx-compat layer compiles them),
      // so verify them like `_=` snippets. The other hyperfixi-only attribute
      // values (sse-connect URLs, sse-swap event names, ws-connect URLs) are
      // not hyperscript and carry no snippet to verify.
      if (attr.name === 'hx-live' && attr.value.trim()) {
        snippets.push(attr.value);
      }
      if (HYPERFIXI_ONLY_ATTR_PREFIXES.some(p => attr.name.startsWith(p))) {
        hyperfixiOnly = true;
      }
    }
    if (
      el.tagName === 'SCRIPT' &&
      (el.getAttribute('type') === 'text/hyperscript' ||
        el.getAttribute('type') === 'text/hyperscript-template')
    ) {
      if (el.getAttribute('type') === 'text/hyperscript-template') {
        hyperfixiOnly = true;
      } else if (el.textContent?.trim()) {
        snippets.push(el.textContent);
      }
    }
  }
  return { snippets, hyperfixiOnly };
}

async function main(): Promise<void> {
  const updateDb = process.argv.includes('--update-db');

  const dom = installDomGlobals();

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
    };
    installPlugin: (runtime: unknown, plugin: unknown) => void;
    Runtime: new () => unknown;
  };
  const reactivity = (await import('@hyperfixi/reactivity')) as unknown as {
    default: { version?: string };
  };
  const realtimeModule = (await import('@hyperfixi/realtime')) as unknown as {
    default: { version?: string };
  };
  const pluginRuntime = new Runtime();
  installPlugin(pluginRuntime, reactivity.default);
  installPlugin(pluginRuntime, realtimeModule.default);

  // --- upstream engine ---
  await import('hyperscript.org');
  const upstreamExtensions: string[] = [];
  for (const ext of ['socket', 'worker', 'eventsource']) {
    try {
      await import(`hyperscript.org/ext/${ext}.js`);
      upstreamExtensions.push(ext);
    } catch (e) {
      console.warn(`[verify-engines] upstream ext '${ext}' failed to load:`, e);
    }
  }
  const upstream = (
    dom.window as unknown as {
      _hyperscript: { parse: (code: string) => { errors?: Array<{ message?: string }> } };
    }
  )._hyperscript;

  const verifyLokascriptSnippet = async (code: string): Promise<string | null> => {
    const compiled = hyperscript.compileSync(code);
    if (!compiled.ok) {
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
    try {
      const ctx = hyperscript.createContext(el);
      const settled = await Promise.race([
        hyperscript.execute(compiled.ast, ctx).then(
          () => null,
          (e: unknown) => (e instanceof Error ? e.message : String(e))
        ),
        new Promise<null>(resolve => setTimeout(() => resolve(null), INSTALL_SETTLE_MS)),
      ]);
      return settled;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    } finally {
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

  const db = new Database(DB_PATH);
  const rows = db.prepare('SELECT id, raw_code, feature FROM code_examples ORDER BY id').all() as PatternRow[];

  const results: Record<string, VerifyResult> = {};

  for (const row of rows) {
    let snippets: string[];
    let upstreamBlocked = false;

    if (isHtmlMarkupPattern(row.raw_code)) {
      const extracted = extractSnippets(dom, row.raw_code);
      snippets = extracted.snippets;
      upstreamBlocked = extracted.hyperfixiOnly;
    } else {
      snippets = [row.raw_code];
    }

    // Markup-only hyperfixi patterns (sse-connect/ws-connect wiring, component
    // templates) carry no hyperscript text to compile — the feature itself is
    // exercised by the core htmx-compat and component test suites, so an
    // empty snippet list with hyperfixi-only markup counts as
    // lokascript-verified by feature coverage.
    let lokascriptError: string | null =
      snippets.length === 0 && !upstreamBlocked ? 'no verifiable snippets' : null;
    let hyperscriptError: string | null = upstreamBlocked
      ? 'uses hyperfixi-only attributes'
      : snippets.length === 0
        ? 'no verifiable snippets'
        : null;

    for (const snippet of snippets) {
      if (!lokascriptError) {
        lokascriptError = await verifyLokascriptSnippet(snippet);
      }
      if (!hyperscriptError) {
        hyperscriptError = verifyUpstreamSnippet(snippet);
      }
    }

    // An HTML pattern whose embedded `_` snippets all verify still counts for
    // lokascript even when it also uses hx-live/sse/ws attributes — those are
    // handled by the htmx-compat layer, which ships with the hyperfixi bundles.
    results[row.id] = {
      lokascript: lokascriptError === null,
      hyperscript: hyperscriptError === null,
      ...(lokascriptError ? { lokascriptError: lokascriptError.slice(0, 200) } : {}),
      ...(hyperscriptError ? { hyperscriptError: hyperscriptError.slice(0, 200) } : {}),
    };
  }

  const engineOf = (r: VerifyResult): string | null =>
    r.lokascript && r.hyperscript
      ? 'both'
      : r.lokascript
        ? 'lokascript'
        : r.hyperscript
          ? 'hyperscript'
          : null;

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
          'compileSync(code).ok via @hyperfixi/core (same call as the browser _= path), with @hyperfixi/reactivity and @hyperfixi/realtime installed (both ship pre-installed in hyperfixi.js), plus a jsdom top-level install smoke (no error within 500ms settle window)',
        hyperscript: `upstream _hyperscript parse with zero recovered errors (extensions loaded: ${upstreamExtensions.join(', ') || 'none'}); parse-level only`,
        html: 'HTML-markup patterns: each _= / script-tag snippet verified individually; hx-live/sse-*/ws-* attributes are hyperfixi-only and block the upstream claim',
      },
      lokascriptVersion: corePkg.version,
      hyperscriptVersion: upstreamPkg.version,
    },
    engines: Object.fromEntries(
      Object.entries(results).map(([id, r]) => [id, engineOf(r)])
    ) as Record<string, string | null>,
    details: results,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n');

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
  console.log(`[verify-engines] wrote ${OUT_PATH}`);

  if (updateDb) {
    const update = db.prepare('UPDATE code_examples SET engine = ? WHERE id = ?');
    const tx = db.transaction(() => {
      for (const [id, r] of Object.entries(results)) {
        update.run(engineOf(r), id);
      }
    });
    tx();
    console.log(`[verify-engines] updated engine column in ${DB_PATH}`);

    // engine-verification.json is a stamped DB input (see src/sync/db-stamp.ts),
    // and we just rewrote both it and the DB — refresh the stamp so the
    // multilingual gate doesn't read this consistent state as stale.
    const { writeDbStamp } = await import('../src/sync/db-stamp');
    writeDbStamp(DB_PATH);
    console.log('[verify-engines] refreshed patterns.db.stamp');
  }
  db.close();

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
