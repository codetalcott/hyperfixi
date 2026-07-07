/**
 * Regenerate the golden pattern snapshot for domain-learn.
 *
 * Captures `generatePatternVariants` output for every registered language
 * profile × every schema. domain-learn's profile shape wraps the
 * PatternGenLanguageProfile inside a larger LearnLanguageProfile
 * (patternProfile + morphology tables + sentence frames); only the inner
 * `patternProfile` feeds pattern generation, so that is what the golden
 * captures. The parity test (`src/__test__/pattern-parity.test.ts`) asserts
 * the live output is byte-identical to this snapshot, so any change to
 * profiles, schemas, or the framework generator shows up as a reviewable
 * golden-file diff.
 *
 * Run from packages/domain-learn:
 *   npx tsx scripts/generate-golden-patterns.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePatternVariants } from '@lokascript/framework';
import { allSchemas } from '../src/schemas';
import { ALL_PROFILES } from '../src/profiles';

const golden: Record<string, Record<string, unknown>> = {};
for (const learnProfile of Object.values(ALL_PROFILES)) {
  const profile = learnProfile.patternProfile;
  const perSchema: Record<string, unknown> = {};
  for (const schema of allSchemas) {
    perSchema[schema.action] = generatePatternVariants(schema, profile);
  }
  golden[profile.code] = perSchema;
}

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/__test__/golden/generated-patterns.golden.json'
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(golden, null, 2) + '\n');
console.log(
  `Wrote ${Object.keys(golden).length} languages × ${allSchemas.length} schemas → ${outPath}`
);
