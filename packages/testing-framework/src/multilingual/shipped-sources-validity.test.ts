/**
 * Shipped-sources validity gate (see shipped-sources-validity.ts for the why).
 *
 * Compiles every hyperscript source we ship in `examples/` and the doc trees,
 * and ratchets on the recovers-with-errors state (`ok: true` with a non-empty
 * `errors`). Three assertions, matching the canonical-validity gates:
 *   1. sanity — sources were actually found and mostly compile clean;
 *   2. no NEW recovering source appears outside the committed allowlist;
 *   3. no allowlisted key has silently become clean (stale entries must be
 *      removed so the list only ever shrinks).
 *
 * To update after an intentional fix: re-run and rewrite
 * `baselines/shipped-sources-validity.json`. Note the allowlist key embeds a
 * hash of the source, so FIXING a source changes its key — the entry goes
 * stale and assertion 3 makes removing it mandatory.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkShippedSourcesValidity,
  type ShippedSourcesResult,
  type CompileForValidity,
} from './shipped-sources-validity';

interface AllowlistDoc {
  allowedRecovered: Array<{
    key: string;
    file: string;
    error: string;
    upstream: string;
    reason: string;
  }>;
}

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/shipped-sources-validity.json'
);
const allowlist = JSON.parse(readFileSync(baselinePath, 'utf8')) as AllowlistDoc;
const allowed = new Set(allowlist.allowedRecovered.map(e => e.key));

describe('shipped-sources validity gate', () => {
  let result: ShippedSourcesResult;

  beforeAll(async () => {
    // Import core through its built entry, the same surface a consumer gets.
    const core = (await import('@hyperfixi/core')) as unknown as {
      hyperscript: { compileSync: CompileForValidity };
    };
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    result = checkShippedSourcesValidity(
      code => core.hyperscript.compileSync(code),
      dom.window.document as unknown as Parameters<typeof checkShippedSourcesValidity>[1]
    );
  }, 120_000);

  it('finds and compiles the shipped sources (sanity: trees walked, extraction working)', () => {
    // Guards the silent-zero failure mode: a broken walk or extractor would
    // make every other assertion vacuously pass.
    expect(result.checked).toBeGreaterThan(100);
    expect(result.clean).toBeGreaterThan(100);
  });

  it('has no NEW source that parses with recovered errors outside the allowlist', () => {
    const unexpected = result.findings.filter(f => !allowed.has(f.key));
    expect(
      unexpected,
      unexpected.length
        ? `\nNew shipped sources that parse ok:true WITH errors (fix the source, or allowlist with a reason):\n` +
            unexpected
              .map(f => `  [${f.key}]\n      "${f.excerpt}"\n      -> ${f.error}`)
              .join('\n') +
            `\n\nAsk the real hyperscript.org engine for a second opinion before deciding:\n` +
            `upstream REJECTING means the source is malformed; upstream ACCEPTING means this is a hyperfixi parser defect.\n` +
            `See loadCanonicalParser() in canonical-validity.ts.`
        : ''
    ).toEqual([]);
  });

  it('has no stale allowlist entries (a now-clean source must be removed so the list ratchets down)', () => {
    const stillFailing = new Set(result.findings.map(f => f.key));
    const stale = allowlist.allowedRecovered.map(e => e.key).filter(key => !stillFailing.has(key));
    expect(
      stale,
      stale.length
        ? `\nThese allowlisted sources no longer recover-with-errors (fixed, or edited — the key embeds a source hash).\n` +
            `Remove them from baselines/shipped-sources-validity.json:\n  ${stale.join('\n  ')}`
        : ''
    ).toEqual([]);
  });
});
