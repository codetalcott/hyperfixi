import { resolve, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { ServerBridgeOptions } from './types.js';

/** Dynamically-loaded server-bridge module shape */
interface ServerBridgeModule {
  generate: (options: {
    dir: string;
    framework?: string;
    output?: string;
    typescript?: boolean;
    ignore?: string[];
  }) => Promise<{
    scan: { routes: Array<{ method: string; path: string }>; conflicts: unknown[] };
    generated: { files: Array<{ path: string; content: string }> };
    routes: Array<{ method: string; path: string }>;
  }>;
  createManifest: (routes: unknown[]) => unknown;
  saveManifest: (dir: string, manifest: unknown) => Promise<void>;
}

let serverBridge: ServerBridgeModule | null = null;
let loadAttempted = false;
let lastRouteHash = '';

/**
 * Attempt to lazy-load @hyperfixi/server-bridge.
 * Returns null with a warning if not installed.
 */
export async function loadServerBridge(debug?: boolean): Promise<ServerBridgeModule | null> {
  if (loadAttempted) return serverBridge;
  loadAttempted = true;

  try {
    const mod = await import('@hyperfixi/server-bridge');
    serverBridge = mod as unknown as ServerBridgeModule;
    if (debug) {
      console.log('[hyperfixi] Server-bridge loaded successfully');
    }
    return serverBridge;
  } catch {
    console.warn(
      '[hyperfixi] @hyperfixi/server-bridge is not installed. ' +
        'Install it to enable server route generation: npm install @hyperfixi/server-bridge'
    );
    return null;
  }
}

/**
 * Compute a hash of routes for change detection.
 */
function computeRouteHash(routes: Array<{ method: string; path: string }>): string {
  return routes
    .map(r => `${r.method}:${r.path}`)
    .sort()
    .join('|');
}

/**
 * Run a full server-bridge scan + generate cycle.
 * Skips generation if routes haven't changed (hash-based).
 */
export async function runServerBridge(
  cwd: string,
  options: ServerBridgeOptions,
  debug?: boolean,
  force?: boolean
): Promise<void> {
  const mod = serverBridge ?? (await loadServerBridge(debug));
  if (!mod) return;

  try {
    const outputDir = resolve(cwd, options.output ?? './server/routes');

    const result = await mod.generate({
      dir: cwd,
      framework: options.framework ?? 'express',
      output: options.output,
      typescript: options.typescript,
      ignore: options.ignore,
    });

    // Skip writing if routes haven't changed
    const routeHash = computeRouteHash(result.routes);
    if (!force && routeHash === lastRouteHash) {
      if (debug) {
        console.log('[hyperfixi] Server-bridge: routes unchanged, skipping generation');
      }
      return;
    }
    lastRouteHash = routeHash;

    if (result.routes.length === 0) {
      if (debug) {
        console.log('[hyperfixi] Server-bridge: no routes found');
      }
      return;
    }

    // Write generated files
    await mkdir(outputDir, { recursive: true });
    for (const file of result.generated.files) {
      const filePath = join(outputDir, file.path);
      const fileDir = join(filePath, '..');
      await mkdir(fileDir, { recursive: true });
      await writeFile(filePath, file.content, 'utf-8');
    }

    // Save manifest
    const manifest = mod.createManifest(result.routes);
    await mod.saveManifest(outputDir, manifest);

    if (debug) {
      console.log(
        `[hyperfixi] Server-bridge: generated ${result.generated.files.length} file(s) ` +
          `for ${result.routes.length} route(s) in ${outputDir}/`
      );
    }

    if (result.scan.conflicts.length > 0) {
      console.warn(
        `[hyperfixi] Server-bridge: ${result.scan.conflicts.length} route conflict(s) detected`
      );
    }
  } catch (err) {
    console.error(
      '[hyperfixi] Server-bridge generation failed:',
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Reset cached state (for testing).
 */
export function resetServerBridgeState(): void {
  serverBridge = null;
  loadAttempted = false;
  lastRouteHash = '';
}

// Export for testing
export { computeRouteHash as _computeRouteHash };
