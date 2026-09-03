/**
 * BARE-surface en→foreign render-fidelity ratchet (see bare-render-fidelity.ts
 * for why this exists and why it is not redundant with the wrapped gate).
 *
 * Identical assertions to `render-fidelity.test.ts`, over handler-STRIPPED
 * corpus bodies. The allowlist is seeded at the level measured when the gate
 * landed, so it starts green; it is a record of what is known-broken, not a
 * target, and completing a fix means deleting entries.
 *
 * Needs FOREIGN_CANONICAL_VALIDITY=1 and a freshly populated patterns.db, the
 * same contract the two sibling gates carry.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { checkBareRenderFidelity } from './bare-render-fidelity';
import { groupFailuresByPattern, type RenderFidelityResult } from './render-fidelity';

interface AllowlistDoc {
  checked: number;
  clean: number;
  cleanPct: number;
  allowedFailures: Record<string, string[]>;
}

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/bare-render-fidelity.json'
);
const allowlist = JSON.parse(readFileSync(baselinePath, 'utf8')) as AllowlistDoc;
const key = (id: string, language: string) => `${id} ${language}`;
const allowed = new Set(
  Object.entries(allowlist.allowedFailures).flatMap(([id, langs]) => langs.map(l => key(id, l)))
);

const DB_FRESHLY_POPULATED = process.env.FOREIGN_CANONICAL_VALIDITY === '1';

describe.skipIf(!DB_FRESHLY_POPULATED)('bare-surface english→foreign render-fidelity gate', () => {
  let result: RenderFidelityResult;

  beforeAll(async () => {
    result = await checkBareRenderFidelity();
  }, 300_000);

  it('scores a non-empty bare corpus in every language (sanity: guards a false green)', () => {
    // A derivation that stopped finding handler bodies — a changed handler head
    // shape, a broken strip — would otherwise report zero failures and pass.
    expect(result.checked).toBeGreaterThan(2500);
    expect(result.clean).toBeGreaterThan(0);
  });

  it('does not regress the measured clean rate', () => {
    const cleanPct = (100 * result.clean) / result.checked;
    expect(
      cleanPct,
      `clean rate fell to ${cleanPct.toFixed(2)}% from the committed ${allowlist.cleanPct}%`
    ).toBeGreaterThanOrEqual(allowlist.cleanPct - 0.01);
  });

  it('produces no NEW failing (pattern, language) bare render outside the allowlist', () => {
    const unexpected = result.failures.filter(f => !allowed.has(key(f.id, f.language)));
    expect(
      unexpected,
      unexpected.length
        ? `\nNew BARE render-fidelity failures (fix it, or allowlist the pair):\n` +
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
        ? `\nThese allowlisted pairs now render faithfully bare — prune them from ` +
            `baselines/bare-render-fidelity.json (regenerate with ` +
            `tools/regen-bare-render-fidelity-baseline.ts):\n  ${stale.join('\n  ')}`
        : ''
    ).toEqual([]);
  });

  it('keeps the committed allowlist grouping in sync with the live failure set', () => {
    expect(groupFailuresByPattern(result.failures)).toEqual(allowlist.allowedFailures);
  });
});
