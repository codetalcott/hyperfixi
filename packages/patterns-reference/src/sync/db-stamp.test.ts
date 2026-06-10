import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeDbInputHash, dbStampPath, writeDbStamp, checkDbStamp } from './db-stamp';

/**
 * Build a throwaway monorepo-shaped tree so the stamp's source-hashing has real
 * files to read, then exercise the ok / stale / unstamped transitions.
 *
 * Layout: <root>/packages/{i18n,semantic}/src/*.ts +
 *         <root>/packages/patterns-reference/{scripts,src/sync,data}
 */
function makeFakeRepo(): { root: string; dbPath: string } {
  const root = mkdtempSync(join(tmpdir(), 'db-stamp-'));
  const mk = (p: string) => mkdirSync(join(root, p), { recursive: true });
  mk('packages/i18n/src');
  mk('packages/semantic/src/parser');
  mk('packages/patterns-reference/scripts');
  mk('packages/patterns-reference/src/sync');
  mk('packages/patterns-reference/data');
  writeFileSync(join(root, 'packages/i18n/src/transformer.ts'), 'export const x = 1;\n');
  writeFileSync(join(root, 'packages/semantic/src/parser/p.ts'), 'export const y = 2;\n');
  writeFileSync(join(root, 'packages/patterns-reference/scripts/init-db.ts'), '// seed\n');
  writeFileSync(
    join(root, 'packages/patterns-reference/scripts/sync-translations.ts'),
    '// sync\n'
  );
  writeFileSync(join(root, 'packages/patterns-reference/src/sync/span-mask.ts'), '// mask\n');
  const dbPath = join(root, 'packages/patterns-reference/data/patterns.db');
  writeFileSync(dbPath, '');
  return { root, dbPath };
}

describe('db-stamp provenance guard', () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
  });

  it('reports `unstamped` when no stamp sidecar exists', () => {
    const { root, dbPath } = makeFakeRepo();
    roots.push(root);
    expect(checkDbStamp(dbPath).status).toBe('unstamped');
  });

  it('writes a stamp and reports `ok` against unchanged source', () => {
    const { root, dbPath } = makeFakeRepo();
    roots.push(root);
    writeDbStamp(dbPath);
    expect(existsSync(dbStampPath(dbPath))).toBe(true);
    expect(checkDbStamp(dbPath).status).toBe('ok');
  });

  it('reports `stale` after a source input changes (the cross-branch footgun)', () => {
    const { root, dbPath } = makeFakeRepo();
    roots.push(root);
    writeDbStamp(dbPath);
    // Simulate switching to a branch with different parser source.
    writeFileSync(join(root, 'packages/semantic/src/parser/p.ts'), 'export const y = 999;\n');
    const res = checkDbStamp(dbPath);
    expect(res.status).toBe('stale');
    if (res.status === 'stale') expect(res.actual).not.toBe(res.expected);
  });

  it('hash is stable for identical source and changes when a new source file appears', () => {
    const { root, dbPath } = makeFakeRepo();
    roots.push(root);
    const h1 = computeDbInputHash(dbPath);
    expect(computeDbInputHash(dbPath)).toBe(h1); // deterministic
    writeFileSync(join(root, 'packages/i18n/src/dictionaries.ts'), '// new file\n');
    expect(computeDbInputHash(dbPath)).not.toBe(h1);
  });

  it('ignores .test.ts / .d.ts files (test churn must not flip freshness)', () => {
    const { root, dbPath } = makeFakeRepo();
    roots.push(root);
    const h1 = computeDbInputHash(dbPath);
    writeFileSync(join(root, 'packages/semantic/src/parser/p.test.ts'), 'it("x", () => {});\n');
    writeFileSync(join(root, 'packages/semantic/src/parser/p.d.ts'), 'export const y: number;\n');
    expect(computeDbInputHash(dbPath)).toBe(h1);
  });
});
