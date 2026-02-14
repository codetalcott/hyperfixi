#!/usr/bin/env node

import { runScan } from './scan-command.js';
import { runGenerate } from './generate-command.js';

const args = process.argv.slice(2);
const command = args[0];

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      const value = valueParts.join('=');
      if (value) {
        flags[key] = value;
      } else if (key.startsWith('no-')) {
        flags[key.slice(3)] = false;
      } else {
        // Check if next arg is a value
        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    }
  }
  return flags;
}

function getPositionalArgs(args: string[]): string[] {
  return args.filter(a => !a.startsWith('--'));
}

async function main(): Promise<void> {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const flagArgs = args.slice(1);
  const flags = parseFlags(flagArgs);
  const positional = getPositionalArgs(flagArgs);
  const dir = positional[0] || '.';

  if (command === 'scan') {
    await runScan({
      dir,
      format: flags.format === 'table' ? 'table' : 'json',
      include: typeof flags.include === 'string' ? flags.include.split(',') : undefined,
      exclude: typeof flags.exclude === 'string' ? flags.exclude.split(',') : undefined,
      ignore: typeof flags.ignore === 'string' ? flags.ignore.split(',') : undefined,
    });
  } else if (command === 'generate') {
    await runGenerate({
      dir,
      framework: flags.framework === 'hono' ? 'hono' : 'express',
      output: typeof flags.output === 'string' ? flags.output : undefined,
      typescript: flags.typescript !== false,
      overwrite: flags.overwrite === true,
      include: typeof flags.include === 'string' ? flags.include.split(',') : undefined,
      exclude: typeof flags.exclude === 'string' ? flags.exclude.split(',') : undefined,
    });
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run "serverbridge --help" for usage.');
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
serverbridge - Extract routes from hyperscript/htmx HTML and generate server stubs

Usage:
  serverbridge scan [dir] [options]      Scan files and print extracted routes
  serverbridge generate [dir] [options]  Scan + generate server route stubs

Scan options:
  --format=json|table    Output format (default: json)
  --include=PATTERNS     Comma-separated glob patterns (default: **/*.{html,htm})
  --exclude=PATTERNS     Comma-separated exclusion patterns
  --ignore=URLS          Comma-separated URL patterns to ignore

Generate options:
  --framework=express|hono  Target framework (default: express)
  --output=DIR              Output directory (default: ./server/routes)
  --typescript              Generate TypeScript (default: true)
  --no-typescript           Generate JavaScript
  --overwrite               Overwrite existing user code

Config file:
  Place .serverbridgerc.json in your project root to set defaults.
`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
