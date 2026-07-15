/**
 * Canonical-validity gate (see canonical-validity.ts for the why).
 *
 * Renders every corpus English reference and parses the result on the real
 * `hyperscript.org` engine. Two ratchet assertions:
 *   1. no NEW invalid render appears outside the committed allowlist;
 *   2. no allowlisted id has silently become valid (stale entries must be
 *      removed so the list only ever shrinks).
 *
 * To update after an intentional renderer change: re-run the check and rewrite
 * `baselines/canonical-validity.json` (a fixed row leaves the list; a newly
 * broken row that is genuinely deferred is added with a reason).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { checkCorpusRenderValidity, type CanonicalValidityResult } from './canonical-validity';

interface AllowlistDoc {
  allowedInvalid: Array<{ id: string; command: string; error: string; reason: string }>;
}

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/canonical-validity.json'
);
const allowlist = JSON.parse(readFileSync(baselinePath, 'utf8')) as AllowlistDoc;
const allowed = new Set(allowlist.allowedInvalid.map(e => e.id));

describe('canonical-validity gate', () => {
  let result: CanonicalValidityResult;

  beforeAll(async () => {
    result = await checkCorpusRenderValidity();
  }, 60_000);

  it('renders a canonically-valid corpus reference set (sanity: parser loaded, corpus non-empty)', () => {
    expect(result.checked).toBeGreaterThan(50);
    expect(result.valid).toBeGreaterThan(0);
  });

  it('produces no NEW canonically-invalid English render outside the allowlist', () => {
    const unexpected = result.failures.filter(f => !allowed.has(f.id));
    expect(
      unexpected,
      unexpected.length
        ? `\nNew invalid English renders (add a renderer fix, or allowlist with a reason):\n` +
            unexpected
              .map(
                f => `  [${f.id}] (${f.command}) "${f.en}"\n      -> "${f.rendered}"  [${f.error}]`
              )
              .join('\n')
        : ''
    ).toEqual([]);
  });

  it('has no stale allowlist entries (a now-valid id must be removed so the list ratchets down)', () => {
    const stillFailing = new Set(result.failures.map(f => f.id));
    const stale = allowlist.allowedInvalid.map(e => e.id).filter(id => !stillFailing.has(id));
    expect(
      stale,
      stale.length
        ? `\nThese allowlisted ids now render valid — remove them from baselines/canonical-validity.json:\n  ${stale.join('\n  ')}`
        : ''
    ).toEqual([]);
  });
});
