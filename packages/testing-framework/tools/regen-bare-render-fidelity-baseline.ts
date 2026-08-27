#!/usr/bin/env npx tsx
/**
 * Regenerate baselines/bare-render-fidelity.json from the current tree.
 *
 * Same contract as the wrapped gate's baseline: a record of what is known-broken
 * on the BARE (handler-less) surface, ratcheting DOWN only. Run this after an
 * intentional renderer or matcher change and commit the result with it.
 *
 * Usage: npx tsx tools/regen-bare-render-fidelity-baseline.ts [--dry-run]
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBareRenderFidelity } from '../src/multilingual/bare-render-fidelity';
import { groupFailuresByPattern } from '../src/multilingual/render-fidelity';

const dryRun = process.argv.includes('--dry-run');
const target = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../baselines/bare-render-fidelity.json'
);

async function main(): Promise<void> {
  const result = await checkBareRenderFidelity();
  const grouped = groupFailuresByPattern(result.failures);
  const pairs = Object.values(grouped).reduce((n, langs) => n + langs.length, 0);

  const doc = {
    description:
      'Allowlist for the BARE-surface English->foreign render-fidelity gate ' +
      '(src/multilingual/bare-render-fidelity.test.ts). Same scoring as the wrapped ' +
      'gate, applied to each corpus pattern with its event-handler head STRIPPED — the ' +
      'surface no other gate covers, because every corpus row that exercises a command ' +
      'wraps it in a handler. Each entry is a corpus pattern id mapped to the languages ' +
      'whose bare rendered surface loses an action or a role from the English reference ' +
      'when parsed back. A NEW failing (pattern,language) pair outside this list, or an ' +
      'allowlisted pair that now passes, both fail the gate. Shrinks only. ' +
      'Regenerate with tools/regen-bare-render-fidelity-baseline.ts.',
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
