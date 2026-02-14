import { resolve, join } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { scanDirectory } from '../scanner/route-scanner.js';
import { ExpressGenerator } from '../generators/express-generator.js';
import { HonoGenerator } from '../generators/hono-generator.js';
import {
  loadManifest,
  saveManifest,
  createManifest,
  diffRoutes,
  extractUserCode,
} from '../generators/manifest.js';
import { loadConfig } from './config.js';
import type { RouteGenerator } from '../generators/types.js';

interface GenerateOptions {
  dir: string;
  framework?: 'express' | 'hono';
  output?: string;
  typescript?: boolean;
  overwrite?: boolean;
  include?: string[];
  exclude?: string[];
  ignore?: string[];
}

export async function runGenerate(options: GenerateOptions): Promise<void> {
  const cwd = resolve(options.dir);
  const config = await loadConfig(cwd, {
    framework: options.framework,
    output: options.output,
    typescript: options.typescript,
    include: options.include,
    exclude: options.exclude,
    ignore: options.ignore,
  });

  // Scan for routes
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

  if (result.routes.length === 0) {
    console.log('No routes found. Nothing to generate.');
    return;
  }

  // Select generator
  const generator: RouteGenerator =
    config.framework === 'hono' ? new HonoGenerator() : new ExpressGenerator();

  const outputDir = resolve(cwd, config.output ?? './server/routes');

  // Load existing manifest for coexistence
  const oldManifest = options.overwrite ? null : await loadManifest(outputDir);
  const diff = diffRoutes(oldManifest, result.routes);

  // Generate
  const generated = generator.generate(result.routes, {
    outputDir,
    typescript: config.typescript,
    overwrite: options.overwrite,
  });

  // Write files
  await mkdir(join(outputDir, 'routes'), { recursive: true });

  for (const file of generated.files) {
    const filePath = join(outputDir, file.path);
    await writeFile(filePath, file.content, 'utf-8');
  }

  // Save manifest
  const manifest = createManifest(result.routes);
  await saveManifest(outputDir, manifest);

  // Print summary
  console.log(`Generated ${generated.files.length} file(s) in ${outputDir}/`);
  console.log(`  Framework: ${generator.framework}`);
  console.log(`  Routes: ${result.routes.length}`);

  if (diff.added.length > 0) {
    console.log(`  New: ${diff.added.length}`);
  }
  if (diff.changed.length > 0) {
    console.log(`  Changed: ${diff.changed.length}`);
  }
  if (diff.removed.length > 0) {
    console.log(`  Removed: ${diff.removed.length} (routes no longer in source)`);
  }

  for (const warning of generated.warnings) {
    console.log(`  Warning: ${warning}`);
  }
}
