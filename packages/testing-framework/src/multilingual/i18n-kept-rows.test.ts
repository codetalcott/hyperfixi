/**
 * i18n-kept-rows ratchet (see i18n-kept-rows.ts for why).
 *
 * Reads the freshly populated corpus and asserts, at (pattern, language)
 * granularity, that the set of rows the `best` writer still leaves to the i18n
 * renderer can only shrink:
 *   1. the DB was written by the `best` writer at all (guards a vacuous pass);
 *   2. no NEW kept pair appears outside the committed baseline;
 *   3. no baselined pair has silently flipped to semantic (a stale entry must be
 *      deleted — that deletion is how a renderer fix is completed);
 *   4. the headline kept count does not grow;
 *   5. the baseline is still EMPTY — it reached 0 on 2026-08-28, and (5) is what
 *      keeps it there, since (1)–(4) are all satisfied by two empty lists.
 *
 * Regenerate after an intentional renderer change with
 * `npm run populate --prefix packages/patterns-reference` followed by
 * `npx tsx tools/regen-i18n-kept-rows-baseline.ts`, and commit the result.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { checkI18nKeptRows, groupKeptByPattern, type I18nKeptRowsResult } from './i18n-kept-rows';

interface BaselineDoc {
  checked: number;
  kept: number;
  keptPct: number;
  allowedKept: Record<string, string[]>;
}

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/i18n-kept-rows.json'
);
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as BaselineDoc;
const key = (id: string, language: string) => `${id} ${language}`;
const allowed = new Set(
  Object.entries(baseline.allowedKept).flatMap(([id, langs]) => langs.map(l => key(id, l)))
);

// Same contract as the other corpus gates: a plain `vitest run` on a stale
// checkout skips rather than reporting phantom drift. `npm run test:canonical`
// and the CI multilingual job both set this, after populating.
const DB_FRESHLY_POPULATED = process.env.FOREIGN_CANONICAL_VALIDITY === '1';

describe.skipIf(!DB_FRESHLY_POPULATED)('i18n-kept-rows ratchet (corpus writer = best)', () => {
  let result: I18nKeptRowsResult;

  beforeAll(async () => {
    result = await checkI18nKeptRows();
  }, 120_000);

  it('was written by the `best` writer (guards a vacuous pass against an i18n-written DB)', () => {
    expect(result.checked).toBeGreaterThan(3000);
    // An i18n-written corpus has ZERO semantic rows; a `best` corpus has thousands.
    expect(result.semantic).toBeGreaterThan(result.checked / 2);
  });

  it('leaves no NEW row to the i18n renderer outside the committed baseline', () => {
    const fresh = result.kept.filter(r => !allowed.has(key(r.id, r.language)));
    expect(
      fresh.map(r => ({ id: r.id, language: r.language, method: r.method, surface: r.surface })),
      'New i18n-kept rows (the semantic render got worse than i18n here — fix the renderer, or regenerate the baseline if intentional):'
    ).toEqual([]);
  });

  it('has no stale baseline entry (a row semantic now wins must be deleted from the baseline)', () => {
    const live = new Set(result.kept.map(r => key(r.id, r.language)));
    const stale = [...allowed].filter(k => !live.has(k)).sort();
    expect(
      stale,
      'Baseline rows the semantic renderer now wins — delete them (tools/regen-i18n-kept-rows-baseline.ts):'
    ).toEqual([]);
  });

  it('does not grow the kept count', () => {
    expect(result.kept.length).toBeLessThanOrEqual(baseline.kept);
  });

  it('the baseline is EMPTY — the retirement trigger, and it stays fired', () => {
    // Reached 0 on 2026-08-28: the semantic renderer wins all 3,657 rows, so no
    // corpus row is written by @lokascript/i18n's GrammarTransformer any more.
    //
    // Asserted on the BASELINE rather than only on the live result, so a future
    // regeneration cannot quietly ratchet back up: a `--save-baseline` run that
    // re-admits a kept row fails here, and re-admitting one has to be a
    // deliberate edit to this test with a reason. Every other assertion in this
    // file is satisfied by an empty list on both sides, which is exactly why
    // this one is needed.
    expect(baseline.kept, 'a kept row was re-admitted to the baseline').toBe(0);
    expect(Object.keys(baseline.allowedKept)).toEqual([]);
  });

  it('keeps the committed grouping in sync with the live set', () => {
    expect(groupKeptByPattern(result.kept)).toEqual(baseline.allowedKept);
  });
});
