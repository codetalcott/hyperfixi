#!/usr/bin/env npx tsx
/**
 * Regenerate baselines/lse-round-trip.json from the current tree, and print the
 * counts. See src/multilingual/lse-round-trip.ts for what is measured.
 *
 * Writes improvements. REFUSES to write when a case got worse (faithful →
 * type-only or refused, type-only → refused) unless `--allow-new` is given: say
 * why in the PR. Never writes while any case is `silent`: fix the writer.
 *
 * Usage: npx tsx tools/regen-lse-round-trip-baseline.ts [options]
 *   --allow-new   write even when cases got worse
 *   --report      print the counts and the refusal reasons; write nothing
 *
 * A few seconds. Needs fresh dists of intent and semantic (`npm run check:fresh`).
 */
import { existsSync, writeFileSync } from 'node:fs';
import {
  BASELINE_PATH,
  ENCODINGS,
  baselineFrom,
  diffBaseline,
  loadBaseline,
  runLseRoundTrip,
} from '../src/multilingual/lse-round-trip';

const DESCRIPTION =
  'LSE round-trip gate (src/multilingual/lse-round-trip.ts): per encoding, the command-shape ' +
  'cases whose round trip through LSE is `type-only` (same commands and values, a value type ' +
  'differs) or `refused` (the writer threw LossyEncodingError). Every other parsed case is ' +
  'faithful; `silent` is never allowed. Regenerate with tools/regen-lse-round-trip-baseline.ts.';

const allowNew = process.argv.includes('--allow-new');
const reportOnly = process.argv.includes('--report');

const results = runLseRoundTrip();
const next = baselineFrom(results, DESCRIPTION);

console.log(`${next.parsed} of ${next.cases} cases parse`);
for (const encoding of ENCODINGS) {
  const c = next.counts[encoding];
  console.log(
    `  ${encoding.padEnd(8)} faithful ${c.faithful}  type-only ${c['type-only']}  refused ${c.refused}  silent ${c.silent}`
  );
}

// Why the refused cases are refused, largest first.
for (const encoding of ENCODINGS) {
  const reasons = new Map<string, number>();
  for (const r of results) {
    if (r.outcomes?.[encoding] !== 'refused') continue;
    for (const loss of (r.detail?.[encoding] ?? '').split(', ')) {
      // A value's field under any action and role is one reason (`toggle.patient.scope`
      // → `value.scope`); a node's field and a read-back message keep their own.
      const key = /^(does not read back|reads back as)/.test(loss)
        ? loss.split(':')[0].split(' [')[0]
        : /^(command|event-handler|conditional|compound|loop|kind)\b/.test(loss)
          ? loss
          : loss.replace(/^.*\.(\w+)$/, 'value.$1');
      reasons.set(key, (reasons.get(key) ?? 0) + 1);
    }
  }
  console.log(`\n${encoding}: refusal reasons`);
  for (const [key, n] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    console.log(`  ${String(n).padStart(4)}  ${key}`);
  }
}

if (reportOnly) process.exit(0);

const silent = results.filter(r => r.outcomes && ENCODINGS.some(e => r.outcomes![e] === 'silent'));
if (silent.length > 0) {
  console.error(`\n${silent.length} case(s) are silent. Not written: fix the writer.`);
  for (const r of silent.slice(0, 10)) console.error(`  ${r.id} ${JSON.stringify(r.detail)}`);
  process.exit(1);
}

if (existsSync(BASELINE_PATH)) {
  const diff = diffBaseline(results, loadBaseline());
  console.log(
    `\nvs the committed baseline: ${diff.better.length} better, ${diff.worse.length} worse`
  );
  if (diff.worse.length > 0 && !allowNew) {
    console.error('Worse cases (not written; pass --allow-new and say why in the PR):');
    for (const line of diff.worse.slice(0, 20)) console.error(`  ${line}`);
    process.exit(1);
  }
}

writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
console.log(`\nwrote ${BASELINE_PATH}`);
