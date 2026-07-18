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
import { translateHtml, checkHtmlInput } from './html.js';
import { loadValidator, formatParseCheckReport } from './validate.js';
import type { CanonicalValidate, ParseCheckReport } from './validate.js';

interface Args {
  command: 'translate' | 'help';
  inputs: string[];
  langs: string[];
  from: string;
  out: string;
  strict: boolean;
  check: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    command: 'help',
    inputs: [],
    langs: [],
    from: 'en',
    out: '.',
    strict: false,
    check: false,
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
    } else if (a === '--check') {
      args.check = true;
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
  hyperscript-i18n translate <input> [<input> ...] --langs <codes> --out <dir> [--from <code>] [--strict] [--check]

Options:
  --langs, -l   Comma-separated target language codes (e.g. ja,es,ko).
  --out, -o     Output directory. Defaults to the current directory.
  --from, -f    Source locale of the input. Defaults to 'en'.
  --strict      Fail the run if any single attribute fails to translate.
                Default is lenient: untranslatable snippets are left in place.
  --check       Validate the ENGLISH hyperscript on the real hyperscript.org
                parser (input when --from en; output when a target is en) and
                exit 3 if any attribute is invalid. Without --check, invalid
                attributes only print a warning.

Output:
  For each input file foo.html and each lang, writes <out>/foo.<lang>.html.

Exit codes:
  0  success
  1  no HTML inputs matched, or --check requested but the parser failed to load
  2  usage error (bad flags / missing --langs / no inputs)
  3  --check found invalid hyperscript

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

  // Warn is the default, so the validator is always needed unless it fails to
  // load. A load failure is fatal only under --check; otherwise checks quietly
  // disable and the run proceeds.
  let validate: CanonicalValidate | undefined;
  try {
    validate = await loadValidator();
  } catch (err) {
    const msg = (err as Error).message;
    if (args.check) {
      console.error(`--check requested but the canonical parser failed to load: ${msg}`);
      return 1;
    }
    console.warn(`parse-check disabled (could not load hyperscript.org): ${msg}`);
  }

  const failures: Array<ParseCheckReport & { file: string }> = [];
  const printedCodes = new Set<string>(); // suppress identical-code warn spam across files/langs
  const recorderFor =
    (file: string) =>
    (report: ParseCheckReport): void => {
      failures.push({ file, ...report });
      if (!printedCodes.has(report.code)) {
        printedCodes.add(report.code);
        console.warn(`${file}: ${formatParseCheckReport(report)}`);
      }
    };

  let written = 0;
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    const stem = basename(file, extname(file));
    const onInvalid = recorderFor(file);

    // Input check runs ONCE per file (not per lang).
    if (validate && args.from === 'en') {
      for (const report of checkHtmlInput(html, validate)) onInvalid(report);
    }

    for (const lang of args.langs) {
      const translated = translateHtml(html, lang, {
        from: args.from,
        lenient: !args.strict,
        validate, // still drives the OUTPUT check when lang === 'en'
        checkInput: false, // input already checked once above
        onInvalid,
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

  if (args.check && failures.length > 0) {
    const fileCount = new Set(failures.map(f => f.file)).size;
    console.error(
      `\nParse-check failed: ${failures.length} invalid hyperscript attribute(s) in ${fileCount} file(s):`
    );
    for (const f of failures) {
      console.error(
        `  ${f.file} [${f.stage}]: ${formatParseCheckReport(f).split('\n').join('\n  ')}`
      );
    }
    return 3;
  }
  return 0;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run(process.argv.slice(2)).then(code => process.exit(code));
}
