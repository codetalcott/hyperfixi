#!/usr/bin/env npx tsx
/**
 * Regenerate baselines/render-fidelity.json from the current tree.
 *
 * The allowlist is a record of what is known-broken in the en->foreign render
 * direction, and it ratchets DOWN only: the gate fails both on a new failing
 * (pattern, language) pair and on an allowlisted pair that now passes, so a
 * fix is not complete until the entry is deleted. Run this after an intentional
 * renderer change and commit the result with the change.
 *
 * Usage: npx tsx tools/regen-render-fidelity-baseline.ts [--dry-run]
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRenderFidelity, groupFailuresByPattern } from '../src/multilingual/render-fidelity';

const dryRun = process.argv.includes('--dry-run');
const target = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../baselines/render-fidelity.json'
);

async function main(): Promise<void> {
  const result = await checkRenderFidelity();
  const grouped = groupFailuresByPattern(result.failures);
  const pairs = Object.values(grouped).reduce((n, langs) => n + langs.length, 0);

  const doc = {
    description:
      'Allowlist for the ENGLISH->foreign render-fidelity gate ' +
      '(src/multilingual/render-fidelity.test.ts). Each entry is a corpus pattern id ' +
      'mapped to the languages whose rendered surface loses an action or a role from ' +
      'the English reference when parsed back. A NEW failing (pattern,language) pair ' +
      'outside this list, or an allowlisted pair that now passes, both fail the gate. ' +
      'Shrinks only: deleting an entry is how a renderer fix is completed. ' +
      'Regenerate with tools/regen-render-fidelity-baseline.ts.',
    checked: result.checked,
    clean: result.clean,
    cleanPct: Number(((100 * result.clean) / result.checked).toFixed(2)),
    allowedFailures: grouped,
  };

  console.log(
    `checked ${result.checked}  clean ${result.clean} (${doc.cleanPct}%)  ` +
      `failing ${pairs} pairs across ${Object.keys(grouped).length} patterns`
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
