#!/usr/bin/env node
/**
 * Release smoke test for the published @hyperfixi / @lokascript packages.
 *
 * Installs the published npm tarballs into an isolated temp dir (NOT a
 * workspace symlink) and verifies them end-to-end:
 *
 *   1. install resolution — every package + transitive dep resolves from npm
 *      (catches a published package depending on an unpublished/private one)
 *   2. Node import surface — `exports` maps resolve, plugin shapes are intact
 *   3. browser bundle — hyperfixi.js + hyperfixi-hx-v4.js drive a real DOM
 *
 * Why a temp dir: installing inside the monorepo would let npm resolve
 * @hyperfixi/* to the local `packages/*` workspaces — testing source, not the
 * registry. A fresh dir outside the repo guarantees the published tarballs.
 *
 * Usage:
 *   node run.mjs [version]      # version defaults to "latest"
 *   node run.mjs 2.4.0
 *
 * Exit 0 = all checks green, 1 = any failure.
 *
 * Requires Playwright (a devDependency of packages/core, hoisted to the repo
 * root node_modules) and its chromium browser. If chromium is missing:
 *   npx playwright install chromium
 */

import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  readFileSync,
  existsSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');
// `examples/release-smoke/run.mjs` → repo root is two levels up. The matrix
// stage serves repo gallery pages + test-pages from here, but swaps the
// bundle path to the registry tarball.
const REPO_ROOT = resolve(HERE, '..', '..');

// argv: any flags + an optional version. Flags start with `--`.
const args = process.argv.slice(2);
const RUN_MATRIX = args.includes('--matrix');
const VERSION = args.find((a) => !a.startsWith('--')) || 'latest';

// User-facing packages the harness installs explicitly. Their transitive deps
// (@lokascript/intent, domain-config, planner, the domain-* packages, …) are
// pulled in automatically — if any is missing from the registry the install
// fails, which is exactly the class of bug this harness exists to catch.
const PACKAGES = [
  '@hyperfixi/core',
  '@lokascript/semantic',
  '@lokascript/i18n',
  '@hyperfixi/vite-plugin',
  '@hyperfixi/speech',
  '@hyperfixi/reactivity',
  '@hyperfixi/components',
  '@hyperfixi/mcp-server',
  '@hyperfixi/behaviors',
];

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Serve `root` statically on an ephemeral port. Returns { port, close }. */
function startServer(root) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = join(root, urlPath === '/' ? 'index.html' : urlPath);
      if (!filePath.startsWith(root) || !existsSync(filePath)) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ port: server.address().port, close: () => server.close() });
    });
  });
}

/** Drive one HTML page; `fn(page)` performs the assertions. */
async function browserCase(chromium, port, file, name, fn) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/${file}`, { waitUntil: 'load' });
    // The browser bundles auto-scan the DOM on load; give the runtime a tick.
    await page.waitForFunction(() => !!window.hyperfixi, null, { timeout: 10_000 });
    await fn(page);
    if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
    record(name, true);
  } catch (e) {
    record(name, false, e.message.split('\n')[0]);
  } finally {
    await browser.close();
  }
}

/**
 * Build a webroot under `tmp` that combines:
 *   - repo `examples/` + `packages/core/test-pages/` (the HTML the spec hits)
 *   - registry-installed `node_modules/@hyperfixi/core/dist/` mounted at
 *     `/packages/core/dist/` so `bundle-loader.js`'s `../../packages/core/dist/`
 *     resolves to the published tarball, not the repo build.
 *
 * Returns the absolute webroot path. Symlinks (not copies) — fast and
 * keeps the source of truth obvious if anything 404s.
 */
function buildMatrixWebroot(tmp) {
  const webroot = join(tmp, 'webroot');
  mkdirSync(join(webroot, 'packages', 'core'), { recursive: true });
  mkdirSync(join(webroot, 'packages', 'developer-tools'), { recursive: true });

  symlinkSync(join(REPO_ROOT, 'examples'), join(webroot, 'examples'), 'dir');
  symlinkSync(
    join(REPO_ROOT, 'packages', 'core', 'test-pages'),
    join(webroot, 'packages', 'core', 'test-pages'),
    'dir',
  );
  symlinkSync(
    join(tmp, 'node_modules', '@hyperfixi', 'core', 'dist'),
    join(webroot, 'packages', 'core', 'dist'),
    'dir',
  );
  // hx-v4-i18n demos load `packages/core/vocab/htmx/{lang}.js` — vocab modules
  // are part of the published surface (`files: ["vocab/**/*.js"]`), so we
  // serve the registry-installed copy. Catches vocab-packaging bugs that would
  // otherwise only surface when an end user tries to author localized htmx.
  symlinkSync(
    join(tmp, 'node_modules', '@hyperfixi', 'core', 'vocab'),
    join(webroot, 'packages', 'core', 'vocab'),
    'dir',
  );
  // prism-loader.js (used by every gallery page for code highlighting) pulls
  // `packages/developer-tools/dist/prism-hyperscript-i18n/browser.mjs`. It's a
  // docs-only dep, but a 404 here lands in the page's console as an error and
  // tripped the spec's "loads without critical errors" assertion. Symlinking
  // the local build keeps the check honest — it's not part of the published
  // surface we're validating.
  symlinkSync(
    join(REPO_ROOT, 'packages', 'developer-tools', 'dist'),
    join(webroot, 'packages', 'developer-tools', 'dist'),
    'dir',
  );

  return webroot;
}

/**
 * Stage 4: drive `bundle-compatibility.spec.ts`, `hx-v4-features.spec.ts`, and
 * `i18n-orchestrator-api.spec.ts` from `packages/core` against the
 * registry-installed bundles via BASE_URL override. Streams Playwright's
 * line-reporter output so the user sees per-test progress; success is just
 * the spawn's exit code.
 */
async function runMatrixStage(tmp) {
  const corePkgDist = join(tmp, 'node_modules', '@hyperfixi', 'core', 'dist');
  if (!existsSync(corePkgDist)) {
    record('matrix prereq: @hyperfixi/core/dist installed', false, `missing ${corePkgDist}`);
    return;
  }

  let webroot;
  try {
    webroot = buildMatrixWebroot(tmp);
  } catch (e) {
    record('matrix webroot setup', false, e.message);
    return;
  }

  const matrixServer = await startServer(webroot);
  const baseUrl = `http://127.0.0.1:${matrixServer.port}`;

  try {
    const exitCode = await new Promise((res) => {
      const child = spawn(
        'npx',
        [
          'playwright',
          'test',
          // Existing matrix: 8 bundles × gallery examples + bundle-specific tests.
          'src/compatibility/browser-tests/bundle-compatibility.spec.ts',
          // hx-v4 distinctive features: hx-live, multi-dep tracking, two-way
          // bind, SSE / WS mock streaming, plus the no-reactivity diagnostic
          // (hx-on:click wiring in the slim bundle without reactivity installed).
          'src/compatibility/browser-tests/hx-v4-features.spec.ts',
          // Orchestrator public-API gate — guards the v2.5.0 terser regression
          // where `window.__hyperfixi_i18n = { register }` was mangled out of
          // the minified hybrid-hx / hybrid-hx-v4 bundles, silently breaking
          // every vocab/htmx/{lang}.js module on load (fixed in 90ba037b).
          // Surgical check — no swap-pipeline dependency.
          'src/compatibility/browser-tests/i18n-orchestrator-api.spec.ts',
          // NOTE: src/compatibility/browser-tests/i18n-htmx.spec.ts is NOT
          // wired here yet. Its `live-multilang` test hits a pre-existing
          // reactivity bug (localized hx-live counters don't re-render on
          // global writes — needs runtime/notify-hook investigation). Its
          // `multilang-page` test hits a separate pre-existing swap bug
          // (`fetch ... as html` → `put it into target` stringifies the
          // DocumentFragment instead of inserting it). The webroot already
          // exposes `packages/core/vocab/` so the spec can be dropped in
          // once those bugs are fixed.
          '--project=full',
          '--reporter=line',
        ],
        {
          cwd: join(REPO_ROOT, 'packages', 'core'),
          env: { ...process.env, BASE_URL: baseUrl },
          stdio: 'inherit',
        },
      );
      child.on('close', (code) => res(code ?? 1));
      child.on('error', (err) => {
        console.error(`  (spawn error: ${err.message})`);
        res(1);
      });
    });
    record(`bundle-compat + hx-v4-features + i18n-orchestrator-api vs @${VERSION} tarball`, exitCode === 0,
      exitCode === 0 ? null : `playwright exit ${exitCode}`);
  } finally {
    matrixServer.close();
  }
}

async function main() {
  console.log(`\n🔬 hyperfixi release smoke — version: ${VERSION}\n`);
  const tmp = mkdtempSync(join(tmpdir(), 'hyperfixi-release-smoke-'));
  let server;

  try {
    // ---- 1. install ---------------------------------------------------------
    console.log('1. Install published packages from npm (isolated temp dir)');
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify(
        { name: 'hyperfixi-release-smoke-sandbox', version: '0.0.0', private: true, type: 'module' },
        null,
        2,
      ),
    );
    try {
      execFileSync(
        'npm',
        ['install', '--no-audit', '--no-fund', '--loglevel=error', ...PACKAGES.map((p) => `${p}@${VERSION}`)],
        { cwd: tmp, stdio: 'pipe' },
      );
      record(`install ${PACKAGES.length} packages @${VERSION} + transitive deps`, true);
    } catch (e) {
      const msg = (e.stderr?.toString() || e.message).split('\n').filter(Boolean).slice(-2).join(' ');
      record(`install @${VERSION}`, false, msg);
      throw new Error('install failed — cannot continue');
    }

    // ---- 2. Node import surface --------------------------------------------
    console.log('\n2. Node import surface');
    copyFileSync(join(FIXTURES, 'node-smoke.mjs'), join(tmp, 'node-smoke.mjs'));
    let nodeOut = '';
    try {
      nodeOut = execFileSync('node', ['node-smoke.mjs'], { cwd: tmp, stdio: 'pipe' }).toString();
    } catch (e) {
      nodeOut = e.stdout?.toString() || '';
      if (!nodeOut) record('node-smoke', false, e.message.split('\n')[0]);
    }
    for (const line of nodeOut.split('\n').filter(Boolean)) {
      record(line.replace(/^(PASS|FAIL)\s/, ''), line.startsWith('PASS'));
    }

    // ---- 3. browser bundles -------------------------------------------------
    console.log('\n3. Browser bundles (Playwright / chromium)');
    copyFileSync(join(FIXTURES, 'core.html'), join(tmp, 'core.html'));
    copyFileSync(join(FIXTURES, 'hx-v4.html'), join(tmp, 'hx-v4.html'));
    server = await startServer(tmp);

    let chromium;
    try {
      ({ chromium } = await import('playwright'));
    } catch {
      record('Playwright available', false, 'run `npm install` at the repo root');
    }

    if (chromium) {
      // Full bundle: toggle a class + put text into an element.
      await browserCase(chromium, server.port, 'core.html', 'hyperfixi.js — toggle + put', async (page) => {
        await page.click('#toggle-btn');
        const toggled = await page.locator('#toggle-btn').evaluate((el) => el.classList.contains('active'));
        if (!toggled) throw new Error('toggle did not add .active');
        await page.click('#put-btn');
        const text = await page.locator('#out').textContent();
        if (text.trim() !== 'clicked') throw new Error(`put expected "clicked", got "${text.trim()}"`);
      });

      // hx-v4 bundle: hx-live reactive expression re-runs on $count change.
      await browserCase(chromium, server.port, 'hx-v4.html', 'hyperfixi-hx-v4.js — hx-live reactive', async (page) => {
        await page.click('#inc');
        await page.waitForFunction(
          () => document.getElementById('live')?.textContent.trim() === '1',
          null,
          { timeout: 5_000 },
        );
      });
    }

    // ---- 4. Bundle compatibility matrix (opt-in: --matrix) -----------------
    // Runs the existing in-repo Playwright matrix (~8 bundles × gallery
    // examples) against a server that serves repo gallery pages BUT swaps
    // `/packages/core/dist/*` to the registry-installed @hyperfixi/core/dist.
    // This exercises the published tarball through the same surface the local
    // browser-tests use — catching bundle-shape regressions that source-aliased
    // unit tests can't see.
    if (RUN_MATRIX) {
      console.log('\n4. Bundle compatibility matrix vs published bundles (Playwright)');
      await runMatrixStage(tmp);
    }
  } finally {
    server?.close();
    rmSync(tmp, { recursive: true, force: true });
  }

  // ---- summary --------------------------------------------------------------
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n${'─'.repeat(48)}`);
  if (passed === total) {
    console.log(`✅ release smoke PASSED — ${passed}/${total} checks green (v${VERSION})`);
    process.exit(0);
  } else {
    console.log(`❌ release smoke FAILED — ${total - passed}/${total} checks failed (v${VERSION})`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`\n❌ harness error: ${e.message}`);
  process.exit(1);
});
