import { watch } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { scanDirectory, scanRoutes, matchIgnorePattern } from '../scanner/route-scanner.js';
import { detectConflicts, formatConflicts } from '../scanner/conflict-detector.js';
import { selectGenerator } from '../generators/index.js';
import { createManifest, saveManifest } from '../generators/manifest.js';
import { loadConfig } from './config.js';
import type { RouteDescriptor } from '../types.js';

interface WatchOptions {
  dir: string;
  framework?: 'express' | 'hono' | 'openapi' | 'django' | 'fastapi';
  output?: string;
  typescript?: boolean;
  include?: string[];
  exclude?: string[];
  ignore?: string[];
  debounce?: number;
}

/** Convert a glob-like pattern to a regex for file matching. */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*\//g, '\0/')
    .replace(/\*\*/g, '\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\0\//g, '(.+/)?')
    .replace(/\0/g, '.*');
  return new RegExp('^' + escaped + '$');
}

function shouldScan(filename: string, includePatterns: string[]): boolean {
  return includePatterns.some(p => patternToRegex(p).test(filename));
}

function shouldSkip(relPath: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(p => patternToRegex(p).test(relPath));
}

/**
 * Creates a debounced runner that:
 * - Debounces rapid invocations with setTimeout/clearTimeout
 * - Guards against overlapping async executions
 * - Queues a follow-up run if triggered during execution
 */
export function createDebouncedRunner(fn: () => Promise<void>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let queued = false;

  function trigger(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  }

  async function run(): Promise<void> {
    timer = null;
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      await fn();
    } finally {
      running = false;
      if (queued) {
        queued = false;
        trigger();
      }
    }
  }

  return { trigger };
}

/**
 * Compute a hash of all route method:path pairs for change detection.
 */
export function computeRouteHash(routes: RouteDescriptor[]): string {
  return routes
    .map(r => `${r.method}:${r.path}`)
    .sort()
    .join('\n');
}

export async function runWatch(options: WatchOptions): Promise<void> {
  const cwd = resolve(options.dir);
  const config = await loadConfig(cwd, {
    framework: options.framework,
    output: options.output,
    typescript: options.typescript,
    include: options.include,
    exclude: options.exclude,
    ignore: options.ignore,
  });

  const includePatterns = config.include ?? ['**/*.html', '**/*.htm'];
  const excludePatterns = config.exclude ?? ['node_modules/**', 'dist/**'];
  const ignorePatterns = config.ignore ?? [];
  const debounceMs = options.debounce ?? 300;
  const outputDir = resolve(cwd, config.output ?? './server/routes');
  const framework = config.framework ?? 'express';

  console.log(`\nWatching for changes in ${cwd}/`);
  console.log(`  Output: ${outputDir}/`);
  console.log(`  Framework: ${framework}`);
  console.log(`  Press Ctrl+C to stop.\n`);

  // Per-file route cache
  const routesByFile = new Map<string, RouteDescriptor[]>();
  let currentRouteHash = '';

  // Initial full scan
  const initialScan = await scanDirectory(cwd, {
    include: config.include,
    exclude: config.exclude,
    ignore: config.ignore,
  });
  for (const route of initialScan.routes) {
    const file = route.source.file;
    const existing = routesByFile.get(file) ?? [];
    existing.push(route);
    routesByFile.set(file, existing);
  }

  // Generate from initial scan
  await generateFromCache();

  const changedFiles = new Set<string>();
  const debounced = createDebouncedRunner(async () => {
    const files = [...changedFiles];
    changedFiles.clear();
    await incrementalUpdate(files);
  }, debounceMs);

  const watcher = watch(cwd, { recursive: true }, (_eventType, filename) => {
    if (!filename) return;

    const relPath = relative(cwd, resolve(cwd, filename));

    if (shouldSkip(relPath, excludePatterns)) return;
    if (!shouldScan(filename, includePatterns)) return;

    console.log(`  Changed: ${relPath}`);
    changedFiles.add(resolve(cwd, filename));
    debounced.trigger();
  });

  process.on('SIGINT', () => {
    console.log('\nStopping watch mode...');
    watcher.close();
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});

  async function incrementalUpdate(files: string[]): Promise<void> {
    try {
      for (const file of files) {
        try {
          const content = await readFile(file, 'utf-8');
          const routes = scanRoutes(content, file);
          routesByFile.set(file, routes);
        } catch {
          // File may have been deleted
          routesByFile.delete(file);
        }
      }
      await generateFromCache();
    } catch (err) {
      console.error('Generation failed:', err instanceof Error ? err.message : err);
    }
  }

  async function generateFromCache(): Promise<void> {
    // Merge all cached routes
    let allRoutes: RouteDescriptor[] = [];
    for (const routes of routesByFile.values()) {
      allRoutes.push(...routes);
    }

    // Apply ignore patterns
    if (ignorePatterns.length > 0) {
      allRoutes = allRoutes.filter(
        route => !ignorePatterns.some(p => matchIgnorePattern(route.path, p))
      );
    }

    // Deduplicate by method:path (first wins)
    const seen = new Map<string, RouteDescriptor>();
    for (const route of allRoutes) {
      const key = `${route.method}:${route.path}`;
      if (!seen.has(key)) seen.set(key, route);
    }
    const routes = [...seen.values()];

    // Hash check — skip generation if unchanged
    const newHash = computeRouteHash(routes);
    if (newHash === currentRouteHash) {
      console.log('  No route changes detected, skipping generation.');
      return;
    }
    currentRouteHash = newHash;

    // Detect conflicts
    const conflicts = detectConflicts(allRoutes);
    if (conflicts.length > 0) {
      console.error(
        `\n  Warning: ${conflicts.length} route conflict(s):\n${formatConflicts(conflicts)}`
      );
    }

    // Generate
    const generator = selectGenerator(framework);
    const generated = generator.generate(routes, {
      outputDir,
      typescript: config.typescript,
    });

    // Write files
    await mkdir(outputDir, { recursive: true });
    for (const file of generated.files) {
      const filePath = join(outputDir, file.path);
      const fileDir = join(filePath, '..');
      await mkdir(fileDir, { recursive: true });
      await writeFile(filePath, file.content, 'utf-8');
    }

    // Save manifest
    const manifest = createManifest(routes);
    await saveManifest(outputDir, manifest);

    console.log(`  Generated ${generated.files.length} file(s) for ${routes.length} route(s)`);
  }
}

// Exported for testing
export { patternToRegex, shouldScan, shouldSkip };
