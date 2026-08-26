import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VERSION } from './version.js';

const PACKAGE_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json');

describe('package version', () => {
  // The generated constant and the manifest are bumped by the same script.
  // Without this assertion nothing reads the plugin's version at all, which is
  // exactly how the previous inline literals sat stale for many releases.
  it('reports the real package version', () => {
    const declared = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version as string;
    expect(declared).toMatch(/^\d+\.\d+\.\d+/);
    expect(VERSION).toBe(declared);
  });
});
