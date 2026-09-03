/**
 * Regenerate `baselines/parse-input-census.json` — Arc 3 step 1's ratchet
 *
 * The measurement lives in `src/commands/__tests__/parse-input-census.ts`,
 * shared with the gate that reads the baseline, so the two cannot disagree.
 *
 *   npx tsx scripts/generate-parse-input-census.ts          # print the table
 *   npx tsx scripts/generate-parse-input-census.ts --update # rewrite the baseline
 */

import { writeFileSync } from 'node:fs';
import { census, BASELINE } from '../src/commands/__tests__/parse-input-census';

const c = census();
if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(c, null, 2) + '\n');
  console.log(
    `parse-input census written — ${c.totals.bodies} bodies, ${c.totals.lines} lines, ${c.totals.branches} branches`
  );
} else {
  const rows = Object.entries(c.commands).sort((a, b) => b[1].lines - a[1].lines);
  for (const [name, r] of rows) {
    console.log(
      `${String(r.lines).padStart(4)} lines ${String(r.branches).padStart(3)} br  S:${String(r.syntaxSites).padStart(2)} V:${String(r.valueSites).padStart(2)}  ${name}`
    );
  }
  console.log(
    `\n${c.totals.bodies} bodies · ${c.totals.lines} lines · ${c.totals.branches} branches · S ${c.totals.syntaxSites} · V ${c.totals.valueSites}`
  );
}
