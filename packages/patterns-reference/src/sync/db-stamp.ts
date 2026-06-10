/**
 * DB provenance stamp — guards against running the multilingual gate against a
 * `patterns.db` that was generated from *different* source than is currently checked
 * out (the cross-branch "phantom regression" footgun).
 *
 * The DB's content (transformer translation text + stored parser confidence /
 * verified_parses) is determined by the i18n + semantic **source**, plus the seed and
 * sync scripts. We hash that source (not the gitignored, build-non-deterministic
 * `dist/`) so the stamp catches a branch / source change regardless of whether `dist`
 * happened to be rebuilt. `sync-translations` writes the stamp next to the DB; the
 * gate verifies it before trusting a comparison against the committed baseline.
 *
 * The stamp file (`patterns.db.stamp`) is a **local** artifact (gitignored) — it
 * records "what source produced *my* local DB", which is exactly what the gate needs
 * to confirm the DB is fresh for the current working tree.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/**
 * Resolve the monorepo root from a `patterns.db` path. Standard layout:
 * `<root>/packages/patterns-reference/data/patterns.db` → up 3 from `data/`.
 */
function repoRootFromDbPath(dbPath: string): string {
  return resolve(dirname(dbPath), '..', '..', '..');
}

/** Recursively collect non-test `.ts` source files under `dir`. */
function walkTsFiles(dir: string, acc: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === 'dist' || name === '__tests__') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsFiles(full, acc);
    } else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
}

/**
 * The source files whose content determines `patterns.db`: the i18n transformer +
 * dictionaries + grammar profiles (translation text), the semantic parser + profiles
 * (stored confidence + the language set), and the seed / sync scripts.
 */
function dbInputFiles(dbPath: string): string[] {
  const root = repoRootFromDbPath(dbPath);
  const files: string[] = [];
  walkTsFiles(join(root, 'packages', 'i18n', 'src'), files);
  walkTsFiles(join(root, 'packages', 'semantic', 'src'), files);
  const pr = join(root, 'packages', 'patterns-reference');
  for (const f of [
    join(pr, 'scripts', 'init-db.ts'),
    join(pr, 'scripts', 'sync-translations.ts'),
    join(pr, 'src', 'sync', 'span-mask.ts'),
  ]) {
    if (existsSync(f)) files.push(f);
  }
  return files.sort();
}

/**
 * Compute the provenance hash of the DB's source inputs. Stable across machines (it
 * hashes committed source, keyed by repo-relative path).
 */
export function computeDbInputHash(dbPath: string): string {
  const root = repoRootFromDbPath(dbPath);
  const files = dbInputFiles(dbPath);
  const h = createHash('sha256');
  h.update(`files:${files.length}\0`);
  for (const f of files) {
    h.update(relative(root, f).split(sep).join('/'));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  return h.digest('hex');
}

export function dbStampPath(dbPath: string): string {
  return `${dbPath}.stamp`;
}

/** Write the provenance stamp next to the DB (called at the end of sync). */
export function writeDbStamp(dbPath: string): void {
  writeFileSync(dbStampPath(dbPath), `${computeDbInputHash(dbPath)}\n`, 'utf8');
}

export type DbStampStatus =
  | { status: 'ok' }
  | { status: 'unstamped' }
  | { status: 'stale'; expected: string; actual: string };

/**
 * Verify the DB's stamp against the current source. `unstamped` (no sidecar) is
 * returned when the DB predates this guard — callers should warn, not hard-fail.
 */
export function checkDbStamp(dbPath: string): DbStampStatus {
  const sp = dbStampPath(dbPath);
  if (!existsSync(sp)) return { status: 'unstamped' };
  const expected = readFileSync(sp, 'utf8').trim();
  const actual = computeDbInputHash(dbPath);
  return actual === expected ? { status: 'ok' } : { status: 'stale', expected, actual };
}
