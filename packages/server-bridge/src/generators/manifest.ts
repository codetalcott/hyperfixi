import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { RouteDescriptor } from '../types.js';
import { USER_START, USER_END } from './template-helpers.js';

const MANIFEST_FILENAME = 'server-bridge.manifest.json';

export interface ManifestEntry {
  method: string;
  path: string;
  handlerName: string;
  hash: string;
}

export interface Manifest {
  version: number;
  generatedAt: string;
  routes: Record<string, ManifestEntry>;
}

/**
 * Create a hash for a RouteDescriptor to detect changes.
 */
export function hashRoute(route: RouteDescriptor): string {
  const data = JSON.stringify({
    path: route.path,
    method: route.method,
    responseFormat: route.responseFormat,
    pathParams: route.pathParams,
    queryParams: route.queryParams,
    requestBody: route.requestBody,
  });
  return createHash('md5').update(data).digest('hex').slice(0, 8);
}

/**
 * Build a manifest key from method + path.
 */
function manifestKey(method: string, path: string): string {
  return `${method}:${path}`;
}

/**
 * Create a new manifest from a set of routes.
 */
export function createManifest(routes: RouteDescriptor[]): Manifest {
  const manifest: Manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    routes: {},
  };

  for (const route of routes) {
    const key = manifestKey(route.method, route.path);
    manifest.routes[key] = {
      method: route.method,
      path: route.path,
      handlerName: route.handlerName,
      hash: hashRoute(route),
    };
  }

  return manifest;
}

/**
 * Load an existing manifest from the output directory.
 * Returns null if no manifest exists.
 */
export async function loadManifest(outputDir: string): Promise<Manifest | null> {
  try {
    const content = await readFile(join(outputDir, MANIFEST_FILENAME), 'utf-8');
    return JSON.parse(content) as Manifest;
  } catch {
    return null;
  }
}

/**
 * Save a manifest to the output directory.
 */
export async function saveManifest(outputDir: string, manifest: Manifest): Promise<void> {
  await writeFile(
    join(outputDir, MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  );
}

/**
 * Extract user-written code between @serverbridge-user-start and @serverbridge-user-end markers.
 * Returns a map from route key (METHOD:path) to user code string.
 */
export function extractUserCode(fileContent: string): Map<string, string> {
  const result = new Map<string, string>();

  // Find each route marker followed by a user code block
  const routeMarkerPattern = /\/\/ @serverbridge-route:\s+(\w+)\s+(\/\S+)/g;
  let match;
  while ((match = routeMarkerPattern.exec(fileContent)) !== null) {
    const method = match[1];
    const path = match[2];
    const key = manifestKey(method, path);

    // Find the user-start/user-end block after this marker
    const afterMarker = fileContent.slice(match.index);
    const startIdx = afterMarker.indexOf(USER_START);
    const endIdx = afterMarker.indexOf(USER_END);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const userCode = afterMarker.slice(
        startIdx + USER_START.length + 1, // +1 for newline
        endIdx
      );
      // Only save if it differs from the default TODO
      if (!userCode.includes('// TODO: Implement')) {
        result.set(key, userCode);
      }
    }
  }

  return result;
}

/**
 * Determine what changed between old and new route sets.
 */
export function diffRoutes(
  oldManifest: Manifest | null,
  newRoutes: RouteDescriptor[]
): {
  added: RouteDescriptor[];
  removed: ManifestEntry[];
  changed: RouteDescriptor[];
  unchanged: RouteDescriptor[];
} {
  const oldRoutes = oldManifest?.routes ?? {};

  const added: RouteDescriptor[] = [];
  const changed: RouteDescriptor[] = [];
  const unchanged: RouteDescriptor[] = [];

  for (const route of newRoutes) {
    const key = manifestKey(route.method, route.path);
    const existing = oldRoutes[key];

    if (!existing) {
      added.push(route);
    } else if (existing.hash !== hashRoute(route)) {
      changed.push(route);
    } else {
      unchanged.push(route);
    }
  }

  // Find removed routes
  const newKeys = new Set(newRoutes.map(r => manifestKey(r.method, r.path)));
  const removed = Object.values(oldRoutes).filter(
    entry => !newKeys.has(manifestKey(entry.method, entry.path))
  );

  return { added, removed, changed, unchanged };
}
