#!/usr/bin/env npx tsx
/**
 * Regenerate baselines/en-reference-preservation.json from the current tree.
 *
 * The allowlist records the corpus units whose English parse drops or changes
 * content. It ratchets DOWN only: the gate fails on a new lossy unit, on an
 * allowlisted unit whose render changed, and on an entry that now passes. Run
 * this after an intentional parser/renderer change (on a freshly populated DB)
 * and commit the result with the change.
 *
 * Families are hand-written triage labels, so they are carried over from the
 * existing baseline for every unit that is still lossy; a NEW lossy unit gets
 * `UNTRIAGED`, which the gate rejects until someone names its family.
 *
 * Usage: npx tsx tools/regen-en-reference-baseline.ts [--dry-run]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkEnReferencePreservation } from '../src/multilingual/en-reference-preservation';

const dryRun = process.argv.includes('--dry-run');
const target = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../baselines/en-reference-preservation.json'
);

interface Entry {
  family: string;
  rendered: string | null;
  lost: string[];
  added: string[];
}

async function main(): Promise<void> {
  const previous: Record<string, Entry> = existsSync(target)
    ? (JSON.parse(readFileSync(target, 'utf8')) as { allowedLosses: Record<string, Entry> })
        .allowedLosses
    : {};

  const result = await checkEnReferencePreservation();
  const allowedLosses: Record<string, Entry> = {};
  for (const f of [...result.failures].sort((a, b) => a.key.localeCompare(b.key))) {
    allowedLosses[f.key] = {
      family: previous[f.key]?.family ?? 'UNTRIAGED',
      rendered: f.rendered,
      lost: f.lost,
      added: f.added,
    };
  }

  const doc = {
    description:
      'Allowlist for the en-reference preservation gate ' +
      '(src/multilingual/en-reference-preservation.test.ts). Each key is a corpus unit ' +
      '(a plain row id, or <id>#<n> for the n-th `_` body of a markup row) whose English ' +
      're-render — render(parse_en(src), "en") — drops or changes content, so all 23 ' +
      'translations inherit the loss. A new lossy unit, a changed render of a listed unit, ' +
      'and a listed unit that now passes all fail the gate. Shrinks only: deleting an entry ' +
      'is how a fix is completed. Regenerate with tools/regen-en-reference-baseline.ts.',
    checked: result.checked,
    preserved: result.preserved,
    allowedLosses,
  };

  const untriaged = Object.entries(allowedLosses).filter(([, e]) => e.family === 'UNTRIAGED');
  const pruned = Object.keys(previous).filter(key => !(key in allowedLosses));
  console.log(
    `checked ${result.checked}  preserved ${result.preserved}  lossy ${result.failures.length}` +
      (pruned.length ? `  pruned: ${pruned.join(', ')}` : '') +
      (untriaged.length ? `\nUNTRIAGED (name a family): ${untriaged.map(([k]) => k).join(', ')}` : '')
  );
  if (dryRun) {
    console.log('[dry-run] not written');
  } else {
    writeFileSync(target, `${JSON.stringify(doc, null, 2)}\n`);
    console.log(`wrote ${target}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
