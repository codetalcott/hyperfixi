/**
 * API-surface snapshot: the third-party extension contract.
 *
 * Domain packages now live OUTSIDE this repo (lokascript-domains, published as
 * @lokascript/domains), so a signature change here no longer breaks anything
 * in-tree at build time — this test is what makes an accidental change to the
 * promised surface fail loudly instead. DOMAIN_AUTHOR_GUIDE.md documents the
 * promise; docs/API_SURFACE.md is the committed snapshot.
 *
 * On a DELIBERATE contract change: regenerate with
 * `npx tsx scripts/api-surface-report.ts`, commit the diff, and note the
 * change in DOMAIN_AUTHOR_GUIDE.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { extractApiSurface } from '../../scripts/api-surface-lib';

const PKG_ROOT = path.resolve(__dirname, '..', '..');

describe('extension-contract API surface', () => {
  it('matches the committed docs/API_SURFACE.md snapshot', () => {
    const committed = readFileSync(path.join(PKG_ROOT, 'docs', 'API_SURFACE.md'), 'utf8');
    const current = extractApiSurface(PKG_ROOT) + '\n';
    expect(
      current,
      'API surface drifted from docs/API_SURFACE.md — if deliberate, regenerate with `npx tsx scripts/api-surface-report.ts` and update DOMAIN_AUTHOR_GUIDE.md'
    ).toBe(committed);
  });

  it('the snapshot pins every promised export (no MISSING markers)', () => {
    const committed = readFileSync(path.join(PKG_ROOT, 'docs', 'API_SURFACE.md'), 'utf8');
    expect(committed).not.toContain('MISSING');
  });
});
