#!/usr/bin/env tsx
/**
 * Regenerate `packages/core/baselines/ast-equivalence.json`.
 *
 * Arc 0 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. The baseline records a
 * fingerprint of every corpus source's parse; `ast-equivalence.test.ts` fails
 * when one moves.
 *
 *     npm run baseline:ast-equivalence --prefix packages/core
 *
 * ## When to run this
 *
 * ONLY as part of a change that deliberately moves a parse — an Arc 3 command
 * migration, say. Arcs 1 and 2 are refactors and must leave this file
 * untouched; regenerating it there would convert the gate from a proof into a
 * rubber stamp, which is the single way this whole mechanism fails.
 *
 * The generator and the test import the same `fingerprint` from
 * `engine-corpus.ts`, so the two cannot disagree about what is being hashed —
 * and the fingerprint lives there rather than in the test because the generator
 * importing the test would make the baseline import itself into existence.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { corpusSources, fingerprint } from '../src/parser/__tests__/engine-corpus';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = resolve(HERE, '../baselines/ast-equivalence.json');

const sources = corpusSources();
const fingerprints: Record<string, string> = {};
for (const source of sources) {
  fingerprints[source] = fingerprint(source);
}

const byOutcome = Object.values(fingerprints).reduce<Record<string, number>>((acc, fp) => {
  const kind = fp.split(':')[0];
  acc[kind] = (acc[kind] ?? 0) + 1;
  return acc;
}, {});

// The corpus can contain the same SOURCE twice — `unless user.isLoggedIn
// showLoginForm` is documented by both `if` and `unless`, which share an
// implementation. Fingerprints are keyed by source, so those collapse; both
// counts are recorded because they answer different questions and a reader who
// sees only one will try to reconcile them.
const payload = {
  $comment:
    'Parse fingerprints for docs-internal/ENGINE_MIGRATION_PLAN.md Arc 0. One entry per ' +
    'corpus source (see src/parser/__tests__/engine-corpus.ts); the value is a hash of the ' +
    'canonicalized parse, or fail:<errorCount> for a source the parser rejects. ' +
    'ast-equivalence.test.ts fails when any entry moves. Regenerate ONLY in a change that ' +
    'deliberately alters a parse — Arcs 1 and 2 are refactors and must leave this file alone.',
  generated: new Date().toISOString().slice(0, 10),
  sourceCount: sources.length,
  uniqueSourceCount: Object.keys(fingerprints).length,
  outcomes: byOutcome,
  fingerprints,
};

mkdirSync(dirname(BASELINE), { recursive: true });
writeFileSync(BASELINE, `${JSON.stringify(payload, null, 2)}\n`);

const summary = Object.entries(byOutcome)
  .sort()
  .map(([kind, n]) => `${kind} ${n}`)
  .join(', ');
process.stdout.write(
  `ast-equivalence baseline written — ${sources.length} sources, ` +
    `${Object.keys(fingerprints).length} unique (${summary})\n`
);
