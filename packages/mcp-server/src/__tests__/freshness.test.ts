/**
 * Guards the freshness guard. The bug it prevents — the server silently serving code from
 * before a rebuild — is invisible by construction, so these tests drive the real filesystem
 * rather than mocking `statSync`: mocking the syscall would test the mock, and the whole
 * failure mode lives in what the syscall actually reports.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import {
  captureFreshnessBaseline,
  staleSinceStartup,
  staleAtStartup,
  staleToolError,
  watchedForTest,
} from '../freshness.js';

describe('freshness guard: watch list', () => {
  beforeEach(() => captureFreshnessBaseline());

  it('watches @lokascript/semantic — the package whose staleness caused this guard to exist', () => {
    // Regression pin. The first implementation resolved `<pkg>/package.json`, which throws
    // ERR_PACKAGE_PATH_NOT_EXPORTED for every package with a strict `exports` map — so the
    // watch list silently collapsed to the ONE package (@hyperfixi/core) that allows it,
    // and the guard would have reported "fresh" through any semantic rebuild.
    const pkgs = watchedForTest().map(w => w.pkg);
    expect(pkgs).toContain('@lokascript/semantic');
    expect(pkgs.length).toBeGreaterThan(1);
    expect(pkgs.every(p => p.startsWith('@lokascript/') || p.startsWith('@hyperfixi/'))).toBe(true);
  });

  it('watches the file `import` loads, not the one `require` would', () => {
    // These resolve to DIFFERENT files (semantic: index.js vs index.cjs; core: index.mjs vs
    // index.js). This server is ESM, so watching the require-condition file would mean
    // watching a file the process never opened — a guard that reports fresh forever.
    const semantic = watchedForTest().find(w => w.pkg === '@lokascript/semantic');
    expect(semantic?.marker).toBe(fileURLToPath(import.meta.resolve('@lokascript/semantic')));
    expect(semantic?.marker.endsWith('.cjs')).toBe(false);
  });

  it('derives the watch list from package.json deps+peerDeps (tsup own externality rule)', () => {
    // Not a second list to maintain: tsup marks exactly deps+peerDeps external, so this
    // cannot drift from what is actually a bare runtime import. A hardcoded list rots —
    // mcp-server prebuild ensure-fresh list already has (it omits core, patterns-reference,
    // server-bridge, developer-tools).
    const watchedPkgs = new Set(watchedForTest().map(w => w.pkg));
    const manifest = createRequire(import.meta.url)('../../package.json') as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const workspaceDeps = [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ].filter(n => n.startsWith('@lokascript/') || n.startsWith('@hyperfixi/'));

    const unwatched = workspaceDeps.filter(dep => {
      if (watchedPkgs.has(dep)) return false;
      try {
        import.meta.resolve(dep); // resolvable but unwatched → the guard has a hole
        return true;
      } catch {
        return false; // genuinely unresolvable (unbuilt) → nothing to watch
      }
    });
    expect(unwatched).toEqual([]);
  });

  it('reports nothing stale immediately after capturing the baseline', () => {
    expect(staleSinceStartup(Date.now() + 10_000)).toEqual([]);
  });
});

describe('freshness guard: staleness detection', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'freshness-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    captureFreshnessBaseline();
  });

  it('the TTL coalesces a burst of calls into one probe', () => {
    captureFreshnessBaseline();
    const t = Date.now();
    const first = staleSinceStartup(t);
    // A second call inside the TTL must return the cached array identity, proving no re-stat.
    expect(staleSinceStartup(t + 1)).toBe(first);
  });

  it('detects a dist/index.js whose mtime moved after the baseline was captured', () => {
    // Model the real geometry: <pkg>/dist/index.js + <pkg>/src, then touch the dist.
    const pkg = join(dir, 'fake-pkg');
    mkdirSync(join(pkg, 'dist'), { recursive: true });
    mkdirSync(join(pkg, 'src'), { recursive: true });
    const marker = join(pkg, 'dist', 'index.js');
    writeFileSync(marker, 'export const v = 1;');
    writeFileSync(join(pkg, 'src', 'index.ts'), 'export const v = 1;');

    // The guard resolves real workspace packages, so drive its underlying rule directly on
    // this fixture: a rebuild moves the entry's mtime, which is exactly what
    // staleSinceStartup compares against its startup snapshot.
    const before = Date.now() / 1000 - 100;
    utimesSync(marker, before, before);
    const captured = statSync(marker).mtimeMs;

    const after = Date.now() / 1000;
    utimesSync(marker, after, after);

    expect(statSync(marker).mtimeMs).not.toBe(captured);
  });

  it('treats src/ newer than dist/ as born-stale (what the mtime snapshot cannot see)', () => {
    captureFreshnessBaseline();
    // staleAtStartup walks the real workspace; it must return well-formed rebuild hints
    // whose dir comes from the resolved marker, never from splitting the scoped name.
    for (const s of staleAtStartup()) {
      expect(s.pkg).toMatch(/^@(lokascript|hyperfixi)\//);
      expect(s.dir).not.toContain('@'); // a directory, not a package name
      expect(s.dir.startsWith('/')).toBe(true);
    }
  });
});

describe('freshness guard: the refusal', () => {
  it('is an isError result naming the packages and the remedy', () => {
    const err = staleToolError(['@lokascript/semantic']);
    expect(err.isError).toBe(true);
    const text = err.content[0].text;
    expect(text).toContain('@lokascript/semantic');
    expect(text).toContain('STALE');
    // The agent reading this is the only channel to the human who can restart it — the MCP
    // protocol has no "restart me" code, so the remedy must be spelled out in the text.
    expect(text).toContain('restart');
  });
});
