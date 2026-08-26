/**
 * English→foreign render-fidelity ratchet (see render-fidelity.ts for why).
 *
 * Renders every corpus pattern's English source into each of the 23 languages,
 * parses it back, and requires that no action and no role from the English
 * reference went missing. Two ratchet assertions, at (pattern, language)
 * granularity, mirroring the foreign→English gate:
 *   1. no NEW failing pair appears outside the committed allowlist;
 *   2. no allowlisted pair has silently started passing (stale entries must be
 *      removed, so the list only ever shrinks).
 *
 * The allowlist was seeded at 75.97% clean — the level measured when the gate
 * landed — so it starts green. It is a record of what is known-broken, not a
 * target: completing a renderer fix means deleting entries from it.
 *
 * No DB freshness dependency: this scores `rawCode` (English, stable) and
 * renders live, so it always runs. Regenerate after an intentional renderer
 * change with `npx tsx tools/regen-render-fidelity-baseline.ts` and commit the
 * result alongside the change.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkRenderFidelity,
  groupFailuresByPattern,
  type RenderFidelityResult,
} from './render-fidelity';

interface AllowlistDoc {
  checked: number;
  clean: number;
  cleanPct: number;
  allowedFailures: Record<string, string[]>;
}

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/render-fidelity.json'
);
const allowlist = JSON.parse(readFileSync(baselinePath, 'utf8')) as AllowlistDoc;
const key = (id: string, language: string) => `${id} ${language}`;
const allowed = new Set(
  Object.entries(allowlist.allowedFailures).flatMap(([id, langs]) => langs.map(l => key(id, l)))
);

describe('english→foreign render-fidelity gate', () => {
  let result: RenderFidelityResult;

  beforeAll(async () => {
    result = await checkRenderFidelity();
  }, 300_000);

  it('scores a non-empty corpus in every language (sanity: guards a false green)', () => {
    // A corpus that failed to load would otherwise report zero failures and pass.
    expect(result.checked).toBeGreaterThan(3000);
    expect(result.clean).toBeGreaterThan(0);
  });

  it('does not regress the measured clean rate', () => {
    // The headline number, kept honest independently of the pair-level lists:
    // it may rise freely, but a drop means a render got worse somewhere the
    // per-pair assertions might net out to zero.
    const cleanPct = (100 * result.clean) / result.checked;
    expect(
      cleanPct,
      `clean rate fell to ${cleanPct.toFixed(2)}% from the committed ${allowlist.cleanPct}%`
    ).toBeGreaterThanOrEqual(allowlist.cleanPct - 0.01);
  });

  it('produces no NEW failing (pattern, language) render outside the allowlist', () => {
    const unexpected = result.failures.filter(f => !allowed.has(key(f.id, f.language)));
    expect(
      unexpected,
      unexpected.length
        ? `\nNew render-fidelity failures (fix the renderer, or allowlist the pair):\n` +
            unexpected
              .map(
                f =>
                  `  [${f.id}] (${f.language})\n      en:  ${f.english.split('\n')[0]}\n` +
                  `      out: ${f.rendered.split('\n')[0] || '<render threw>'}\n` +
                  `      lost: ${[...f.missingActions.map(a => `action:${a}`), ...f.missingRoles].join(', ')}`
              )
              .join('\n')
        : ''
    ).toEqual([]);
  });

  it('has no stale allowlist pairs (a now-passing pair must be removed so the list ratchets down)', () => {
    const stillFailing = new Set(result.failures.map(f => key(f.id, f.language)));
    const stale: string[] = [];
    for (const [id, langs] of Object.entries(allowlist.allowedFailures)) {
      for (const language of langs) {
        if (!stillFailing.has(key(id, language))) stale.push(`${id}/${language}`);
      }
    }
    expect(
      stale,
      stale.length
        ? `\nThese allowlisted pairs now render faithfully — prune them from ` +
            `baselines/render-fidelity.json (regenerate with ` +
            `tools/regen-render-fidelity-baseline.ts):\n  ${stale.join('\n  ')}`
        : ''
    ).toEqual([]);
  });

  it('keeps the committed allowlist grouping in sync with the live failure set', () => {
    // Structural cross-check: redundant with the two assertions above, but it
    // yields a single clear diff when regeneration is needed.
    expect(groupFailuresByPattern(result.failures)).toEqual(allowlist.allowedFailures);
  });
});
