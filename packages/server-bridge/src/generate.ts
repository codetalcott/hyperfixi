import { resolve } from 'node:path';
import { scanDirectory } from './scanner/route-scanner.js';
import { selectGenerator } from './generators/index.js';
import type { GenerateResult, RouteDescriptor, ScanResult } from './types.js';

export interface ProgrammaticGenerateOptions {
  dir: string;
  framework?: 'express' | 'hono' | 'openapi' | 'django' | 'fastapi';
  output?: string;
  typescript?: boolean;
  include?: string[];
  exclude?: string[];
  ignore?: string[];
}

export interface GenerateFullResult {
  scan: ScanResult;
  generated: GenerateResult;
  routes: RouteDescriptor[];
}

/**
 * Programmatic scan + generate. Scans a directory for routes and generates
 * framework-specific route files. Returns structured results for the caller
 * to write to disk.
 */
export async function generate(options: ProgrammaticGenerateOptions): Promise<GenerateFullResult> {
  const cwd = resolve(options.dir);
  const outputDir = resolve(cwd, options.output ?? './server/routes');

  const scan = await scanDirectory(cwd, {
    include: options.include,
    exclude: options.exclude,
    ignore: options.ignore,
  });

  const generator = selectGenerator(options.framework ?? 'express');
  const generated = generator.generate(scan.routes, {
    outputDir,
    typescript: options.typescript,
  });

  return { scan, generated, routes: scan.routes };
}
