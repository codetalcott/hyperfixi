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

import { mkdtempSync, rmSync, writeFileSync, copyFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');
const VERSION = process.argv[2] || 'latest';

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
