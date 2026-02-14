import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import type { RouteDescriptor, ScanResult, ScanError } from '../types.js';
import { extractHyperscriptRoutes } from './hyperscript-extractor.js';
import { extractHtmxRoutes } from './htmx-extractor.js';
import { extractFormBodies } from './form-scanner.js';
import { detectConflicts } from './conflict-detector.js';
import { normalizeUrl } from '../conventions/url-patterns.js';

/**
 * Default file patterns to scan.
 */
const DEFAULT_INCLUDE = ['**/*.html', '**/*.htm'];
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/.git/**'];

interface ScanOptions {
  include?: string[];
  exclude?: string[];
  /** URL patterns to ignore */
  ignore?: string[];
}

/**
 * Scan a single file's content for routes.
 */
export function scanRoutes(content: string, file: string): RouteDescriptor[] {
  const hsRoutes = extractHyperscriptRoutes(content, { file });
  const htmxRoutes = extractHtmxRoutes(content, { file });

  // Merge and deduplicate
  const all = [...hsRoutes, ...htmxRoutes];
  const deduped = deduplicateRoutes(all);

  // Enrich with form body data
  const formBodies = extractFormBodies(content);
  for (const route of deduped) {
    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
      const rawUrl = route.path;
      const fields = formBodies.get(rawUrl);
      if (fields && fields.length > 0) {
        route.requestBody = fields;
      }
    }
  }

  return deduped;
}

/**
 * Scan a directory for all HTML/template files and extract routes.
 */
export async function scanDirectory(dir: string, options: ScanOptions = {}): Promise<ScanResult> {
  const include = options.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;

  const files: string[] = [];
  for (const pattern of include) {
    const matches = await glob(pattern, {
      cwd: dir,
      absolute: true,
      ignore: exclude,
    });
    files.push(...matches);
  }

  // Deduplicate file paths
  const uniqueFiles = [...new Set(files)];

  const allRoutes: RouteDescriptor[] = [];
  const errors: ScanError[] = [];

  for (const file of uniqueFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      const routes = scanRoutes(content, file);
      allRoutes.push(...routes);
    } catch (err) {
      errors.push({
        file,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Detect conflicts BEFORE deduplication (needs all occurrences)
  const conflicts = detectConflicts(allRoutes);

  // Final deduplication across files
  const deduped = deduplicateRoutes(allRoutes);

  // Apply ignore patterns
  const ignored = options.ignore ?? [];
  const filtered = deduped.filter(
    route => !ignored.some(pattern => matchIgnorePattern(route.path, pattern))
  );

  return {
    routes: filtered,
    filesScanned: uniqueFiles,
    errors,
    conflicts,
  };
}

/**
 * Deduplicate routes by method + path.
 * First occurrence wins (preserves source from first detection).
 */
function deduplicateRoutes(routes: RouteDescriptor[]): RouteDescriptor[] {
  const seen = new Map<string, RouteDescriptor>();
  for (const route of routes) {
    const key = `${route.method}:${route.path}`;
    if (!seen.has(key)) {
      seen.set(key, route);
    }
  }
  return [...seen.values()];
}

/**
 * Check if a URL path matches an ignore pattern.
 * Supports simple wildcards: /external/** matches /external/anything
 */
export function matchIgnorePattern(path: string, pattern: string): boolean {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return path.startsWith(prefix);
  }
  return path === pattern;
}
