import { resolve } from 'node:path';
import { scanDirectory } from '../scanner/route-scanner.js';
import { loadConfig } from './config.js';

interface ScanOptions {
  dir: string;
  format?: 'json' | 'table';
  include?: string[];
  exclude?: string[];
  ignore?: string[];
}

export async function runScan(options: ScanOptions): Promise<void> {
  const cwd = resolve(options.dir);
  const config = await loadConfig(cwd, {
    include: options.include,
    exclude: options.exclude,
    ignore: options.ignore,
  });

  const result = await scanDirectory(cwd, {
    include: config.include,
    exclude: config.exclude,
    ignore: config.ignore,
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`Error in ${err.file}: ${err.message}`);
    }
  }

  if (options.format === 'table') {
    printTable(result.routes);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

function printTable(
  routes: {
    path: string;
    method: string;
    responseFormat: string;
    handlerName: string;
    source: { file: string; kind: string };
  }[]
): void {
  if (routes.length === 0) {
    console.log('No routes found.');
    return;
  }

  console.log(`Found ${routes.length} route(s):\n`);
  console.log('  METHOD  PATH                          FORMAT  SOURCE');
  console.log('  ------  ----------------------------  ------  ------');

  for (const route of routes) {
    const method = route.method.padEnd(6);
    const path = route.path.padEnd(28);
    const format = route.responseFormat.padEnd(6);
    const source = route.source.kind;
    console.log(`  ${method}  ${path}  ${format}  ${source}`);
  }
}
