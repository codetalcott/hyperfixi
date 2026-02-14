import { resolve } from 'node:path';
import { scanDirectory } from '../scanner/route-scanner.js';
import { loadManifest, diffRoutes } from '../generators/manifest.js';
import { formatConflicts } from '../scanner/conflict-detector.js';
import { loadConfig } from './config.js';

interface DiffOptions {
  dir: string;
  format?: 'summary' | 'detailed';
  include?: string[];
  exclude?: string[];
  ignore?: string[];
}

export async function runDiff(options: DiffOptions): Promise<void> {
  const cwd = resolve(options.dir);
  const config = await loadConfig(cwd, {
    include: options.include,
    exclude: options.exclude,
    ignore: options.ignore,
  });

  const outputDir = resolve(cwd, config.output ?? './server/routes');
  const manifest = await loadManifest(outputDir);

  if (!manifest) {
    console.log('No manifest found. Run "serverbridge generate" first.');
    return;
  }

  const result = await scanDirectory(cwd, {
    include: config.include,
    exclude: config.exclude,
    ignore: config.ignore,
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`Warning: ${err.file}: ${err.message}`);
    }
  }

  if (result.conflicts.length > 0) {
    console.error(
      `\nWarning: ${result.conflicts.length} route conflict(s) detected:\n${formatConflicts(result.conflicts)}\n`
    );
  }

  const diff = diffRoutes(manifest, result.routes);
  const hasChanges = diff.added.length > 0 || diff.changed.length > 0 || diff.removed.length > 0;
  const total =
    diff.added.length + diff.changed.length + diff.removed.length + diff.unchanged.length;

  console.log(`\nRoute Diff Summary:`);
  console.log(`  Total:     ${total}`);
  console.log(`  Unchanged: ${diff.unchanged.length}`);
  console.log(`  Added:     ${diff.added.length}`);
  console.log(`  Changed:   ${diff.changed.length}`);
  console.log(`  Removed:   ${diff.removed.length}`);

  if (options.format === 'detailed' && hasChanges) {
    console.log('');

    if (diff.added.length > 0) {
      console.log('Added:');
      for (const route of diff.added) {
        console.log(
          `  + ${route.method} ${route.path}  (${route.source.file}:${route.source.line ?? '?'})`
        );
      }
    }

    if (diff.changed.length > 0) {
      console.log('Changed:');
      for (const route of diff.changed) {
        console.log(
          `  ~ ${route.method} ${route.path}  (${route.source.file}:${route.source.line ?? '?'})`
        );
      }
    }

    if (diff.removed.length > 0) {
      console.log('Removed:');
      for (const entry of diff.removed) {
        console.log(`  - ${entry.method} ${entry.path}`);
      }
    }
  }

  if (hasChanges) {
    console.log('\nChanges detected. Run "serverbridge generate" to update.');
    process.exitCode = 1;
  } else {
    console.log('\nNo changes detected.');
  }
}
