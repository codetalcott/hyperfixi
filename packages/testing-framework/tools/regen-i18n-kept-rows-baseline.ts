#!/usr/bin/env npx tsx
/**
 * Regenerate baselines/i18n-kept-rows.json from the current (freshly populated)
 * corpus.
 *
 * The baseline is the list of (pattern, language) rows the `best` corpus writer
 * still leaves to @lokascript/i18n's renderer, and it ratchets DOWN only: the
 * gate fails both on a new kept row and on a baselined row semantic now wins.
 * Run this after an intentional renderer change (populate first) and commit
 * the result with the change. An empty `allowedKept` is the i18n retirement
 * trigger (MULTILINGUAL_NEXT_STEPS.md 2026-08-27c).
 *
 * Usage: npx tsx tools/regen-i18n-kept-rows-baseline.ts [--dry-run]
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkI18nKeptRows, groupKeptByPattern } from '../src/multilingual/i18n-kept-rows';

const dryRun = process.argv.includes('--dry-run');
const target = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../baselines/i18n-kept-rows.json'
);

async function main(): Promise<void> {
  const result = await checkI18nKeptRows();
  if (result.semantic === 0) {
    throw new Error(
      'The corpus has no semantic-rendered rows — it was written by PATTERNS_RENDERER=i18n, ' +
        'not the `best` writer. Re-run `npm run populate --prefix packages/patterns-reference` ' +
        'without PATTERNS_RENDERER set.'
    );
  }
  const grouped = groupKeptByPattern(result.kept);
  const doc = {
    description:
      'Shrink-only baseline for the i18n-kept-rows ratchet ' +
      '(src/multilingual/i18n-kept-rows.test.ts). Each entry is a corpus pattern id ' +
      'mapped to the languages whose stored row the `best` corpus writer still takes ' +
      "from @lokascript/i18n's GrammarTransformer, because the semantic render lost to " +
      'it on some ratchet signal (scoreNodes R0/R1/R3, the English round-trip, or ' +
      'engine validity). A NEW kept pair outside this list, or a listed pair that ' +
      'semantic now wins, both fail the gate. Deleting the last entry is the i18n ' +
      'retirement trigger. Regenerate with tools/regen-i18n-kept-rows-baseline.ts.',
    checked: result.checked,
    kept: result.kept.length,
    keptPct: Number(((100 * result.kept.length) / result.checked).toFixed(2)),
    allowedKept: grouped,
  };

  const byMethod: Record<string, number> = {};
  for (const row of result.kept) byMethod[row.method] = (byMethod[row.method] ?? 0) + 1;
  console.log(
    `checked ${result.checked}  semantic ${result.semantic}  kept ${result.kept.length} (${doc.keptPct}%) ` +
      `across ${Object.keys(grouped).length} patterns — ` +
      Object.entries(byMethod)
        .map(([m, n]) => `${m} ${n}`)
        .join(', ')
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
