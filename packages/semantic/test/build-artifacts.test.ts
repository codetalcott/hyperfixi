/**
 * Build Artifact Validation
 *
 * Reads the package.json exports map and verifies every declared file exists
 * in dist/ and is non-empty. Catches missing build outputs (e.g., the .d.ts
 * gap where tsup failed to emit index.d.ts and core.d.ts).
 *
 * This test runs against the built output, so it requires `npm run build`
 * to have been run first. It skips gracefully if dist/ doesn't exist.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

const PKG_ROOT = resolve(__dirname, '..');
const DIST_DIR = resolve(PKG_ROOT, 'dist');

// Read the package.json exports map
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require(resolve(PKG_ROOT, 'package.json'));

/**
 * Extract all file paths from the exports map.
 * Handles nested condition objects (types, import, require, default).
 */
function extractExportPaths(exports: Record<string, unknown>): { key: string; path: string }[] {
  const paths: { key: string; path: string }[] = [];

  for (const [key, value] of Object.entries(exports)) {
    if (typeof value === 'string') {
      paths.push({ key, path: value });
    } else if (typeof value === 'object' && value !== null) {
      for (const [condition, filePath] of Object.entries(value as Record<string, string>)) {
        if (typeof filePath === 'string') {
          paths.push({ key: `${key} [${condition}]`, path: filePath });
        }
      }
    }
  }

  return paths;
}

describe('build artifacts', () => {
  const hasDist = existsSync(DIST_DIR);

  // Top-level entry points declared in package.json
  describe('package.json entry points', () => {
    const topLevel = [
      { field: 'main', path: pkg.main },
      { field: 'module', path: pkg.module },
      { field: 'types', path: pkg.types },
    ].filter(e => e.path);

    it.each(topLevel.map(e => [e.field, e.path]))(
      '%s → %s exists and is non-empty',
      (_field, relPath) => {
        if (!hasDist) return; // skip if not built
        const abs = resolve(PKG_ROOT, relPath);
        expect(existsSync(abs), `${relPath} should exist`).toBe(true);
        expect(statSync(abs).size, `${relPath} should be non-empty`).toBeGreaterThan(0);
      },
    );
  });

  // Every path in the exports map
  describe('exports map', () => {
    const exportPaths = extractExportPaths(pkg.exports || {});

    it.each(exportPaths.map(e => [e.key, e.path]))(
      '%s → %s exists and is non-empty',
      (_key, relPath) => {
        if (!hasDist) return; // skip if not built
        const abs = resolve(PKG_ROOT, relPath);
        expect(existsSync(abs), `${relPath} should exist`).toBe(true);
        expect(statSync(abs).size, `${relPath} should be non-empty`).toBeGreaterThan(0);
      },
    );
  });

  // Declaration files specifically — the ones that were previously missing
  describe('critical declaration files', () => {
    const criticalDts = [
      'dist/index.d.ts',
      'dist/core.d.ts',
    ];

    it.each(criticalDts.map(p => [p]))(
      '%s exists and is non-empty',
      (relPath) => {
        if (!hasDist) return; // skip if not built
        const abs = resolve(PKG_ROOT, relPath);
        expect(existsSync(abs), `${relPath} should exist`).toBe(true);
        const size = statSync(abs).size;
        expect(size, `${relPath} should be non-empty`).toBeGreaterThan(0);
        // Declaration files should have meaningful content, not just a stub
        expect(size, `${relPath} should have substantial content`).toBeGreaterThan(100);
      },
    );
  });
});
