#!/usr/bin/env npx tsx
/**
 * Parse parity: does a refactor of the parser leave every parse unchanged?
 *
 * For M3 (d), the split of `src/parser/semantic-parser.ts` (docs-internal/
 * MULTILINGUAL_NEXT_STEPS.md). Run `--save` on the base and `--check` on the
 * branch; a behavior-preserving move shows 0 differences.
 *
 * Inputs: every command-shape case (`testing-framework`'s harvested sources,
 * English) and each language's render of it. They are stored in the snapshot,
 * so the check parses the same text even when the renderer would now write
 * something else. Per input: a hash of the whole parse (roles, diagnostics,
 * metadata, children; Maps and Sets included), or of the error it throws.
 *
 *   npx tsx scripts/parse-parity.ts --save /tmp/parity.json
 *   npx tsx scripts/parse-parity.ts --check /tmp/parity.json
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, translate, getSupportedLanguages } from '../src/index';

interface Snapshot {
  readonly inputs: Array<[lang: string, text: string]>;
  readonly hashes: string[];
}

const CASES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'testing-framework',
  'src',
  'multilingual',
  'command-shapes.cases.json'
);

/** JSON of a parse with its Maps and Sets spelled out (plain JSON drops them). */
function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v instanceof Map) return { __map: [...v.entries()] };
    if (v instanceof Set) return { __set: [...v.values()] };
    return v;
  });
}

function hashParse(text: string, lang: string): string {
  let out: string;
  try {
    out = serialize(parse(text, lang));
  } catch (e) {
    const err = e as Error;
    out = `throw ${err?.constructor?.name}: ${err?.message}`;
  }
  return createHash('sha1').update(out).digest('hex');
}

function collectInputs(): Array<[string, string]> {
  const cases = JSON.parse(readFileSync(CASES, 'utf8')).cases as Array<{ source: string }>;
  const langs = getSupportedLanguages().filter(l => l !== 'en');
  const inputs: Array<[string, string]> = [];
  for (const { source } of cases) {
    inputs.push(['en', source]);
    for (const lang of langs) {
      try {
        inputs.push([lang, translate(source, 'en', lang, { lossy: 'allow' })]);
      } catch {
        // No render to read: nothing to compare.
      }
    }
  }
  return inputs;
}

const [mode, file] = process.argv.slice(2);
if ((mode !== '--save' && mode !== '--check') || !file) {
  console.error('usage: parse-parity.ts --save <file> | --check <file>');
  process.exit(2);
}

if (mode === '--save') {
  const inputs = collectInputs();
  const hashes = inputs.map(([lang, text]) => hashParse(text, lang));
  writeFileSync(file, JSON.stringify({ inputs, hashes } satisfies Snapshot));
  console.log(`saved ${inputs.length} parses to ${file}`);
} else {
  const snap = JSON.parse(readFileSync(file, 'utf8')) as Snapshot;
  const diffs: string[] = [];
  snap.inputs.forEach(([lang, text], i) => {
    if (hashParse(text, lang) !== snap.hashes[i]) diffs.push(`${lang}\t${text}`);
  });
  console.log(`${snap.inputs.length} parses, ${diffs.length} differ`);
  for (const d of diffs.slice(0, 40)) console.log(`  ${d}`);
  process.exit(diffs.length === 0 ? 0 : 1);
}
