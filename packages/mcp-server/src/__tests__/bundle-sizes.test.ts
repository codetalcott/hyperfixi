/**
 * The sizes get_bundle_config quotes, held to the files they name.
 *
 * They were written once (per-language adapter bundles at 85-101 KB, semantic's English bundle at
 * 20 KB) and the bundles grew to 135-140 KB under them. A quoted size must be within 10% of the
 * built file, gzipped; a bundle that is not built here is skipped, not passed.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  ADAPTER_BUNDLES,
  ENGINE_BUNDLE,
  FULL_ADAPTER_BUNDLE,
  SEMANTIC_BUNDLES,
} from '../tools/validation.js';

const packages = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const quoted: Array<{ dist: string; file: string; size: string; path: string }> = [
  ...Object.values(ADAPTER_BUNDLES).map(b => ({ dist: 'hyperscript-adapter', ...b })),
  { dist: 'hyperscript-adapter', ...FULL_ADAPTER_BUNDLE },
  ...Object.values(SEMANTIC_BUNDLES).map(b => ({ dist: 'semantic', ...b })),
  { dist: 'engine', ...ENGINE_BUNDLE },
].map(b => ({ ...b, path: join(packages, b.dist, 'dist', b.file) }));

describe('quoted bundle sizes', () => {
  // A bundle that is not built here is reported as skipped. In CI every one is built, and
  // the last test fails on a missing file.
  describe.each(quoted)('$file', ({ file, size, path }) => {
    it.skipIf(!existsSync(path))(`is about ${size} gzipped`, () => {
      const quotedKB = Number(/^(\d+) KB$/.exec(size)?.[1]);
      expect(quotedKB, `${size} is not "<n> KB"`).toBeGreaterThan(0);
      const actualKB = gzipSync(readFileSync(path)).length / 1024;
      expect(
        Math.abs(actualKB - quotedKB) / actualKB,
        `${file} is ${actualKB.toFixed(1)} KB`
      ).toBeLessThan(0.1);
    });
  });

  // In CI every dist is built: a renamed file must fail here, not skip above. Outside CI
  // a tree may hold only some of the builds, so this is skipped, and says so.
  it.skipIf(!process.env.CI)('finds the bundles when the packages are built (CI only)', () => {
    for (const { dist, file, path } of quoted) {
      expect(existsSync(path), `${dist}/dist/${file}`).toBe(true);
    }
  });
});
