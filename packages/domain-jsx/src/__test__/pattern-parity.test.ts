/**
 * Golden-snapshot parity for generated patterns.
 *
 * Asserts `generatePatternVariants` output for every registered language
 * profile × every schema is byte-identical to the committed golden file.
 * This is the "no silent behavior change" gate for the framework↔semantic
 * bridge migration: any diff in profiles, schemas, or the framework generator
 * must show up as a reviewed golden-file update, never slip through.
 *
 * Regenerate after an intentional change:
 *   npx tsx scripts/generate-golden-patterns.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePatternVariants } from '@lokascript/framework';
import { allSchemas } from '../schemas';
import { allProfiles } from '../profiles';

const goldenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'golden/generated-patterns.golden.json'
);
const golden: Record<string, Record<string, unknown>> = JSON.parse(
  readFileSync(goldenPath, 'utf-8')
);

describe('domain-jsx: generated-pattern parity (golden snapshot)', () => {
  it('covers exactly the registered languages', () => {
    expect(Object.keys(golden).sort()).toEqual(allProfiles.map(p => p.code).sort());
  });

  for (const profile of allProfiles) {
    describe(`language: ${profile.code}`, () => {
      for (const schema of allSchemas) {
        it(`${schema.action} patterns match golden`, () => {
          const live = JSON.parse(JSON.stringify(generatePatternVariants(schema, profile)));
          expect(live).toEqual(golden[profile.code]?.[schema.action]);
        });
      }
    });
  }
});
