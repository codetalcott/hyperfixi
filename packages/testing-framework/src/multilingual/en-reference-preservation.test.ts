/**
 * En-reference preservation gate (see en-reference-preservation.ts for why).
 *
 * Renders every translatable corpus unit (plain row, or markup `_` body) back
 * to English through its own English parse, and requires the render to carry
 * the source's content under the named equivalences. The committed allowlist
 * records the units that do not, one entry per unit, with the render it was
 * triaged against. Assertions:
 *   1. sanity — the corpus loaded and most units pass (guards a silent zero);
 *   2. no NEW unit loses content outside the allowlist;
 *   3. no allowlisted unit's render has CHANGED (a different render is a
 *      different defect, or a partial fix — re-triage and regenerate);
 *   4. no stale entry: a unit that now preserves its content, or no longer
 *      exists, must be pruned (the list only shrinks);
 *   5. every entry is triaged (has a family), so the list stays a worklist.
 *
 * DB DEPENDENCY: the unit set comes from `getAllPatterns()`, so this runs only
 * when the caller asserts a freshly populated DB — the same contract as the
 * foreign and render-fidelity gates. `npm run test:canonical` and CI's
 * multilingual job set it, after populating.
 *
 * Regenerate after an intentional parser/renderer change:
 * `npm run populate --prefix packages/patterns-reference`, then
 * `npx tsx tools/regen-en-reference-baseline.ts`, then fill in the family of any
 * entry it marks UNTRIAGED, and commit the result with the change.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  checkEnReferencePreservation,
  type PreservationFailure,
  type PreservationResult,
} from './en-reference-preservation';

interface AllowlistEntry {
  /** A short worklist label: the construct family, and MEANING/TRIAGE/BY DESIGN tags. */
  family: string;
  /** The English re-render this entry was triaged against (null = parse/render failed). */
  rendered: string | null;
  lost: string[];
  added: string[];
}

interface AllowlistDoc {
  checked: number;
  preserved: number;
  allowedLosses: Record<string, AllowlistEntry>;
}

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/en-reference-preservation.json'
);
const allowlist = JSON.parse(readFileSync(baselinePath, 'utf8')) as AllowlistDoc;

const DB_FRESHLY_POPULATED = process.env.FOREIGN_CANONICAL_VALIDITY === '1';

const show = (f: PreservationFailure) =>
  `  [${f.key}]\n      source: ${f.source.replace(/\s+/g, ' ').trim()}\n` +
  `      render: ${f.rendered === null ? '<parse or render failed>' : f.rendered.replace(/\s+/g, ' ').trim()}\n` +
  `      lost:   ${JSON.stringify(f.lost)}  added: ${JSON.stringify(f.added)}`;

describe.skipIf(!DB_FRESHLY_POPULATED)('en-reference preservation gate', () => {
  let result: PreservationResult;

  beforeAll(async () => {
    result = await checkEnReferencePreservation();
  }, 120_000);

  it('checks a non-empty corpus and most of it passes (sanity: guards a false green)', () => {
    expect(result.checked).toBeGreaterThan(150);
    expect(result.preserved).toBeGreaterThan(100);
  });

  it('loses no content in a unit outside the allowlist', () => {
    const unexpected = result.failures.filter(f => !(f.key in allowlist.allowedLosses));
    expect(
      unexpected,
      unexpected.length
        ? '\nThe English parse of these units drops or changes content — every one of the ' +
            '23 translations inherits it, and no other gate can see it. Fix the parser/renderer, ' +
            'or allowlist the unit with a family (tools/regen-en-reference-baseline.ts):\n' +
            unexpected.map(show).join('\n')
        : ''
    ).toEqual([]);
  });

  it('has not changed the render of an allowlisted unit (re-triage and regenerate)', () => {
    const changed = result.failures.filter(f => {
      const entry = allowlist.allowedLosses[f.key];
      return entry !== undefined && entry.rendered !== f.rendered;
    });
    expect(
      changed,
      changed.length
        ? '\nThese allowlisted units now render differently — still lossy, but not the loss ' +
            'that was triaged. Check what changed, then regenerate the baseline:\n' +
            changed.map(show).join('\n')
        : ''
    ).toEqual([]);
  });

  it('has no stale allowlist entries (a fixed or deleted unit must be pruned)', () => {
    const stillFailing = new Set(result.failures.map(f => f.key));
    const stale = Object.keys(allowlist.allowedLosses).filter(key => !stillFailing.has(key));
    expect(
      stale,
      stale.length
        ? '\nThese allowlisted units now preserve their content (or no longer exist) — ' +
            'remove them from baselines/en-reference-preservation.json (regenerate with ' +
            `tools/regen-en-reference-baseline.ts):\n  ${stale.join('\n  ')}`
        : ''
    ).toEqual([]);
  });

  it('has every allowlisted loss triaged into a family', () => {
    const untriaged = Object.entries(allowlist.allowedLosses)
      .filter(([, entry]) => !entry.family || entry.family === 'UNTRIAGED')
      .map(([key]) => key);
    expect(untriaged).toEqual([]);
  });
});
