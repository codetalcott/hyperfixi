/**
 * Vocab-consistency CLI (Arc A — docs-internal/HANDOFF_vocab-consistency.md).
 *
 *   npx tsx src/vocab/cli.ts validate [--language xx[,yy]] [--check V1,V4]
 *                                     [--json [path]] [--waivers path] [--warn-only]
 *   npx tsx src/vocab/cli.ts dump [keywords|markers|events] [--concept toggle]
 *                                 [--language xx[,yy]] [--format md|tsv|json]
 *
 * Exit codes (validate): 0 = no unwaived error-tier findings (or --warn-only);
 * 1 = unwaived errors; 2 = refused (stale dist).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckId } from './types';
import { loadWaivers, buildLedger, printLedger } from './report';
import type { DumpFormat, DumpTarget } from './dump';

// --- stale-dist guard (same pattern as the multilingual CLI) -----------------
// The model loads @lokascript/semantic and @lokascript/i18n through their
// package entries, i.e. their dist/. A stale dist scores code that differs
// from the checkout, so refuse to run rather than report vacuously.

const DIST_GUARD_PACKAGES = ['intent', 'framework', 'semantic', 'i18n'];

function hasNewerTs(dir: string, builtAt: number): boolean {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasNewerTs(p, builtAt)) return true;
    } else if (entry.name.endsWith('.ts') && fs.statSync(p).mtimeMs > builtAt) {
      return true;
    }
  }
  return false;
}

function findStaleDists(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const packagesRoot = path.resolve(here, '../../..');
  const stale: string[] = [];
  for (const name of DIST_GUARD_PACKAGES) {
    const srcDir = path.join(packagesRoot, name, 'src');
    const marker = path.join(packagesRoot, name, 'dist', 'index.js');
    if (!fs.existsSync(marker) || hasNewerTs(srcDir, fs.statSync(marker).mtimeMs)) {
      stale.push(name);
    }
  }
  return stale;
}

// --- arg parsing --------------------------------------------------------------

interface Args {
  command: 'validate' | 'dump';
  languages?: string[] | undefined;
  checks?: CheckId[] | undefined;
  json?: string | true | undefined;
  waivers: string;
  warnOnly: boolean;
  target: DumpTarget;
  concept?: string | undefined;
  format: DumpFormat;
}

const VALID_CHECKS: readonly CheckId[] = ['V1', 'V1b', 'V2', 'V3', 'V3b', 'V3c', 'V4'];

function parseArgs(argv: string[]): Args {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const args: Args = {
    command: 'validate',
    waivers: path.resolve(here, '../../vocab-waivers.json'),
    warnOnly: false,
    target: 'keywords',
    format: 'md',
  };
  const rest = [...argv];
  while (rest.length > 0) {
    const a = rest.shift()!;
    switch (a) {
      case 'validate':
        args.command = 'validate';
        break;
      case 'dump':
        args.command = 'dump';
        break;
      case 'keywords':
      case 'markers':
      case 'events':
        args.target = a;
        break;
      case '--language':
      case '-l':
      case '--languages':
        args.languages = (rest.shift() ?? '').split(',').filter(Boolean);
        break;
      case '--check':
      case '--checks': {
        const ids = (rest.shift() ?? '').split(',').filter(Boolean) as CheckId[];
        for (const id of ids) {
          if (!VALID_CHECKS.includes(id))
            throw new Error(`unknown check "${id}" (valid: ${VALID_CHECKS.join(', ')})`);
        }
        args.checks = ids;
        break;
      }
      case '--json':
        args.json = rest[0] && !rest[0].startsWith('-') ? rest.shift()! : true;
        break;
      case '--waivers':
        args.waivers = path.resolve(rest.shift() ?? args.waivers);
        break;
      case '--warn-only':
        args.warnOnly = true;
        break;
      case '--concept':
        args.concept = rest.shift();
        break;
      case '--format': {
        const f = rest.shift() as DumpFormat;
        if (!['md', 'tsv', 'json'].includes(f)) throw new Error(`unknown format "${f}"`);
        args.format = f;
        break;
      }
      case '--help':
      case '-h':
        console.log(
          'vocab cli — validate (V1–V4 cross-surface consistency) | dump (concept × language table)\n' +
            'see file header for flags'
        );
        process.exit(0);
        break;
      default:
        throw new Error(`unknown argument "${a}"`);
    }
  }
  return args;
}

// --- main ----------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const stale = findStaleDists();
  if (stale.length > 0) {
    console.error(
      `REFUSING to run: stale dist for ${stale.join(', ')} (src newer than dist/index.js).\n` +
        `Rebuild first: npm run check:fresh   (or npm run build --prefix packages/<pkg>)`
    );
    process.exit(2);
  }

  // Deferred so the guard runs before the package entries are loaded.
  const { loadVocabModel } = await import('./model');
  const model = loadVocabModel(args.languages);

  if (args.command === 'dump') {
    const { renderDump } = await import('./dump');
    console.log(renderDump(model, args.target, args.format, args.concept));
    return;
  }

  const { runChecks } = await import('./checks');
  const findings = runChecks(model, args.checks);
  const waivers = loadWaivers(args.waivers);
  const ledger = buildLedger(findings, waivers);

  printLedger(ledger);

  if (args.json) {
    const target = args.json === true ? undefined : args.json;
    const payload = JSON.stringify(ledger, null, 2);
    if (target) {
      fs.writeFileSync(target, payload);
      console.log(`ledger written: ${target}`);
    } else {
      console.log(payload);
    }
  }

  if (ledger.unwaivedErrors > 0 && !args.warnOnly) {
    console.error(`\n✗ ${ledger.unwaivedErrors} unwaived error(s)`);
    process.exit(1);
  }
  console.log(
    '\n✓ vocab consistency: no unwaived errors' + (args.warnOnly ? ' enforced (--warn-only)' : '')
  );
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
});
