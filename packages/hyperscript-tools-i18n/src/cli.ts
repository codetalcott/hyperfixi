#!/usr/bin/env node
/**
 * CLI: hyperscript-i18n
 *
 * Usage:
 *   hyperscript-i18n translate <input.html> --langs ja,es,ko --out dist/
 *   hyperscript-i18n translate "src/**\/*.html" --langs ja,es,ko --out dist/ --from en
 *
 * For each input file and each requested target language, emits a sibling
 * file in --out named `<basename>.<lang>.html` containing the translated
 * `_=` attributes. The original English remains the canonical source.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, basename, extname, resolve } from 'node:path';
import { translateHtml } from './html.js';

interface Args {
  command: 'translate' | 'help';
  inputs: string[];
  langs: string[];
  from: string;
  out: string;
  strict: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    command: 'help',
    inputs: [],
    langs: [],
    from: 'en',
    out: '.',
    strict: false,
  };

  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') return args;

  args.command = argv[0] === 'translate' ? 'translate' : 'help';
  if (args.command === 'help') return args;

  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--langs' || a === '-l') {
      args.langs = (argv[++i] ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    } else if (a === '--out' || a === '-o') {
      args.out = argv[++i] ?? '.';
    } else if (a === '--from' || a === '-f') {
      args.from = argv[++i] ?? 'en';
    } else if (a === '--strict') {
      args.strict = true;
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      args.inputs.push(a);
    }
  }
  return args;
}

function expandInputs(patterns: string[]): string[] {
  const out: string[] = [];
  for (const pattern of patterns) {
    const abs = resolve(pattern);
    if (!existsSync(abs)) {
      console.warn(`Skipping missing input: ${pattern}`);
      continue;
    }
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      for (const name of readdirSync(abs)) {
        if (name.endsWith('.html')) out.push(join(abs, name));
      }
    } else {
      out.push(abs);
    }
  }
  return out;
}

function printHelp(): void {
  console.log(`hyperscript-i18n — translate _="..." attributes in HTML

Usage:
  hyperscript-i18n translate <input> [<input> ...] --langs <codes> --out <dir> [--from <code>] [--strict]

Options:
  --langs, -l   Comma-separated target language codes (e.g. ja,es,ko).
  --out, -o     Output directory. Defaults to the current directory.
  --from, -f    Source locale of the input. Defaults to 'en'.
  --strict      Fail the run if any single attribute fails to translate.
                Default is lenient: untranslatable snippets are left in place.

Output:
  For each input file foo.html and each lang, writes <out>/foo.<lang>.html.

Example:
  hyperscript-i18n translate src/patterns.html --langs ja,es,ko --out dist/
`);
}

export async function run(argv: string[]): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error((err as Error).message);
    return 2;
  }

  if (args.command === 'help') {
    printHelp();
    return 0;
  }

  if (args.langs.length === 0) {
    console.error('No --langs provided.');
    return 2;
  }
  if (args.inputs.length === 0) {
    console.error('No input files provided.');
    return 2;
  }

  const files = expandInputs(args.inputs);
  if (files.length === 0) {
    console.error('No HTML inputs matched.');
    return 1;
  }

  mkdirSync(args.out, { recursive: true });

  let written = 0;
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    const stem = basename(file, extname(file));
    for (const lang of args.langs) {
      const translated = translateHtml(html, lang, {
        from: args.from,
        lenient: !args.strict,
      });
      const outPath = join(args.out, `${stem}.${lang}.html`);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, translated, 'utf8');
      written++;
    }
  }

  console.log(
    `Wrote ${written} files (${files.length} input × ${args.langs.length} langs) to ${args.out}`
  );
  return 0;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run(process.argv.slice(2)).then(code => process.exit(code));
}
