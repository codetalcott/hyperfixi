#!/usr/bin/env npx tsx
/**
 * Template Inventory — Standalone CLI
 *
 * Run directly:
 *   npx tsx packages/developer-tools/src/inventory/cli.ts /path/to/templates
 *   npx tsx packages/developer-tools/src/inventory/cli.ts /path/to/templates --json
 *   npx tsx packages/developer-tools/src/inventory/cli.ts /path/to/templates --port 4200
 */

import * as path from 'path';
import { InventoryServer } from './server';
import { extractSnippetsFromProject } from './extractor';

const args = process.argv.slice(2);

// Help
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
Template Inventory — Scan hyperscript and htmx usage across templates

Usage:
  npx tsx inventory/cli.ts <directory> [options]

Options:
  --port <n>    Server port (default: 4200)
  --json        Output JSON to stdout instead of starting server
  --no-open     Don't open browser automatically
  --no-watch    Don't watch for file changes
  --help        Show this help

Examples:
  npx tsx inventory/cli.ts ./templates
  npx tsx inventory/cli.ts /path/to/project/templates --json
  npx tsx inventory/cli.ts ./templates --port 3000 --no-open
`);
  process.exit(0);
}

// Parse args
const directory = args.find(a => !a.startsWith('-')) ?? '.';
const jsonMode = args.includes('--json');
const noOpen = args.includes('--no-open');
const noWatch = args.includes('--no-watch');
const portIdx = args.indexOf('--port');
const port = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) : 4200;

const resolvedDir = path.resolve(directory);

async function main() {
  if (jsonMode) {
    const snippets = await extractSnippetsFromProject(resolvedDir);
    console.log(JSON.stringify(snippets, null, 2));
    return;
  }

  const server = new InventoryServer({
    projectDir: resolvedDir,
    port,
    open: !noOpen,
    watch: !noWatch,
  });

  await server.start();
  console.log('\nPress Ctrl+C to stop');
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
