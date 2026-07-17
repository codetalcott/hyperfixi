/**
 * Runtime freshness guard for the long-running MCP server process.
 *
 * THE BUG THIS EXISTS FOR. `.mcp.json` launches `node packages/mcp-server/dist/index.js`,
 * and tsup marks every `dependencies`/`peerDependencies` entry EXTERNAL — so
 * `@lokascript/semantic` & co. stay bare specifiers that Node resolves through the npm
 * workspace symlink to `packages/<pkg>/dist/index.js` **at startup**. Node's ESM cache is
 * not invalidatable, and the imports are not meaningfully lazy anyway (`tools/profiles.ts`
 * imports semantic statically; `tools/validation.ts` and `tools/language-docs.ts` use a
 * module-scope `await import()` that resolves during startup; the genuinely-lazy sites all
 * memoize into module scope). So after `npm run build --prefix packages/semantic`, this
 * process keeps serving PRE-CHANGE code, silently, until it restarts.
 *
 * That is the exact shape of the "unreproducible baseline" incident (root CLAUDE.md
 * §"Stale-dist auto-rebuild"): executing a stale `dist/` scores code that differs from the
 * checkout. A wrong answer that looks right is the worst failure mode this server has.
 *
 * WHY DETECT-AND-REFUSE RATHER THAN SELF-HEAL. Re-importing is not possible (ESM cache),
 * and bundling the deps would be strictly worse: it would move the staleness from "the
 * process is behind the file" to "the FILE is behind the source too", requiring an
 * mcp-server rebuild on top. (`@hyperfixi/developer-tools` is already bundled and its dist
 * carries four orphaned generations of the same chunk, because the build has no `--clean`.)
 * The MCP protocol has no "restart me" primitive — `ErrorCode` has no such member and the
 * server→client pushes only invalidate listings, not the module graph. So the only channel
 * that reaches a human is an `isError` tool result the agent reads and relays.
 *
 * RELATION TO THE OTHER TWO GUARDS. This is the third member of a family, and it asks a
 * question neither sibling can:
 *   - `scripts/ensure-fresh.sh` — "is dist stale vs src?", and REBUILDS. For pretest hooks.
 *   - `cli.ts`'s `findStaleDists()` — same question, read-only, REFUSES. For a gate about
 *     to run.
 *   - here — "has dist CHANGED SINCE I LOADED IT?", which only a long-running process can
 *     ask, and which an src-vs-dist check cannot answer (a freshly-rebuilt dist looks
 *     perfectly fresh to that rule while this process still holds the previous one).
 * The startup probe below covers the src-vs-dist half for the launch instant, so the two
 * questions together close the window.
 */

import { createRequire } from 'node:module';
import { statSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);

/** Workspace scopes whose dist/ this process executes. */
const WORKSPACE_SCOPES = ['@lokascript/', '@hyperfixi/'];

/** Re-stat at most this often; a burst of tool calls shares one probe. */
const PROBE_TTL_MS = 1000;

interface Watched {
  readonly pkg: string;
  readonly marker: string;
  /** mtimeMs of the marker at the instant this process loaded it. */
  readonly loadedMtimeMs: number;
}

let watched: Watched[] = [];
let lastProbeAt = 0;
let lastResult: string[] = [];

/**
 * The packages to watch, derived from OUR OWN package.json `dependencies` +
 * `peerDependencies`.
 *
 * That list is not a coincidence and not a second copy to maintain: it is *exactly* tsup's
 * default externality rule, so "what tsup left as a bare runtime import" and "what we
 * watch" cannot drift apart. Hardcoding a package list here would rot the first time a
 * dependency is added (mcp-server's own `prebuild` ensure-fresh list has already rotted
 * this way — it omits core, patterns-reference, server-bridge, and developer-tools).
 */
function watchedPackages(): string[] {
  const pkg = require_('../package.json') as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const names = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);
  return [...names].filter(n => WORKSPACE_SCOPES.some(s => n.startsWith(s))).sort();
}

/**
 * Resolve the exact built file an `import '<name>'` from THIS module would load.
 *
 * Uses `import.meta.resolve`, not `require.resolve` or a hand-built `<pkg>/dist/index.js`
 * path, because those resolve to genuinely different files and would watch the wrong one:
 *
 *   @lokascript/semantic   require → dist/index.cjs   import → dist/index.js
 *   @hyperfixi/core        require → dist/index.js    import → dist/index.mjs
 *
 * This server is ESM, so it loads the `import` column; watching the `require` column would
 * mean watching a file the process never opened — a guard that reports fresh forever.
 * (`require.resolve('<name>/package.json')` is not an option either: most of these packages
 * have an `exports` map that does not expose `./package.json`, so it throws
 * ERR_PACKAGE_PATH_NOT_EXPORTED — only `@hyperfixi/core` happens to allow it.)
 */
function resolveMarker(name: string): string | null {
  try {
    const url = import.meta.resolve(name);
    const path = fileURLToPath(url);
    return existsSync(path) ? path : null;
  } catch {
    return null; // not installed / not resolvable → nothing to guard
  }
}

/**
 * Snapshot the mtime of every watched package's dist entry. Call ONCE, at startup, before
 * serving: the snapshot is this process's definition of "the code I am running".
 */
export function captureFreshnessBaseline(): void {
  watched = watchedPackages().flatMap(pkg => {
    const marker = resolveMarker(pkg);
    if (!marker) return [];
    return [{ pkg, marker, loadedMtimeMs: statSync(marker).mtimeMs }];
  });
  lastProbeAt = 0;
  lastResult = [];
}

/**
 * Names of watched packages whose dist entry has changed on disk since startup — i.e. the
 * code this process is serving is no longer the code in the working tree.
 *
 * O(#deps) statSync calls behind a 1s TTL: microseconds against a tool call's milliseconds.
 */
export function staleSinceStartup(now = Date.now()): string[] {
  if (now - lastProbeAt < PROBE_TTL_MS) return lastResult;
  lastProbeAt = now;
  lastResult = watched
    .filter(w => {
      try {
        return statSync(w.marker).mtimeMs !== w.loadedMtimeMs;
      } catch {
        return true; // marker vanished mid-build → treat as changed
      }
    })
    .map(w => w.pkg);
  return lastResult;
}

/** True if any .ts under dir is newer than builtAt (early-exit walk). */
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
 * Watched packages that were ALREADY stale (src/ newer than dist/) when we launched, each
 * with the on-disk directory to rebuild.
 *
 * The mtime snapshot cannot see these: nothing changes while we run, so the process serves
 * stale code forever and reports itself healthy. Same rule as `scripts/ensure-fresh.sh`
 * and `cli.ts`'s `findStaleDists()`, but read-only — a server must never rebuild its own
 * dependencies out from under a running client.
 *
 * `dir` comes from the RESOLVED marker path, not from splitting the package name: the two
 * disagree whenever a package's directory differs from its scoped name, and a rebuild hint
 * that names the wrong directory is worse than none.
 *
 * Startup-only: this walk is O(source tree) and far too costly per tool call.
 */
export function staleAtStartup(): Array<{ pkg: string; dir: string }> {
  return watched
    .filter(w => {
      const srcDir = join(dirname(dirname(w.marker)), 'src');
      if (!existsSync(srcDir)) return false;
      try {
        return hasNewerTs(srcDir, statSync(w.marker).mtimeMs);
      } catch {
        return false;
      }
    })
    .map(w => ({ pkg: w.pkg, dir: dirname(dirname(w.marker)) }));
}

/**
 * The refusal returned in place of a tool result. Mirrors the multilingual gate's
 * refuse-with-remedy shape (`cli.ts`), and names the restart explicitly because the agent
 * reading this is the only path to the human who can perform it.
 */
export function staleToolError(stale: string[]): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  return {
    content: [
      {
        type: 'text',
        text:
          `✗ This MCP server is serving STALE code and refused the call.\n\n` +
          `  Rebuilt since the server started: ${stale.join(', ')}\n\n` +
          `  The server resolves these packages' dist/ at startup and Node caches the module\n` +
          `  graph, so it cannot pick up a rebuild without restarting. Any answer it gave now\n` +
          `  would reflect the code as it was BEFORE the rebuild — silently.\n\n` +
          `  Fix: restart the MCP server (in Claude Code: /mcp, then reconnect "lokascript").\n\n` +
          `  If you are mid-arc and only need to probe the parser, prefer a direct tsx probe\n` +
          `  (which imports fresh each run) over this server — see the probe recipe in\n` +
          `  docs-internal/HANDOFF_foreign-validity-burndown.md.`,
      },
    ],
    isError: true,
  };
}

/** Diagnostics for the startup banner. */
export function freshnessSummary(): string {
  return `watching ${watched.length} workspace dist entries`;
}

/** Test seam: the resolved watch list. */
export function watchedForTest(): ReadonlyArray<{ pkg: string; marker: string }> {
  return watched.map(({ pkg, marker }) => ({ pkg, marker }));
}
