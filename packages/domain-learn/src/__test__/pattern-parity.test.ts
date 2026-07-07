/**
 * Golden-snapshot parity for generated patterns.
 *
 * Asserts `generatePatternVariants` output for every registered language
 * profile × every schema is byte-identical to the committed golden file.
 * domain-learn's profile shape wraps the PatternGenLanguageProfile inside a
 * larger LearnLanguageProfile; only the inner `patternProfile` feeds pattern
 * generation, so that is what the golden covers. This is the "no silent
 * behavior change" gate for the framework↔semantic bridge migration: any
 * diff in profiles, schemas, or the framework generator must show up as a
 * reviewed golden-file update, never slip through.
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
import { ALL_PROFILES } from '../profiles';

const goldenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'golden/generated-patterns.golden.json'
);
const golden: Record<string, Record<string, unknown>> = JSON.parse(
  readFileSync(goldenPath, 'utf-8')
);

const patternProfiles = Object.values(ALL_PROFILES).map(p => p.patternProfile);

describe('domain-learn: generated-pattern parity (golden snapshot)', () => {
  it('covers exactly the registered languages', () => {
    expect(Object.keys(golden).sort()).toEqual(patternProfiles.map(p => p.code).sort());
  });

  for (const profile of patternProfiles) {
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
