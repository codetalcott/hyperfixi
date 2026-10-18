/**
 * The version `/health` reports is the package's: it was a `1.4.0` literal from 1.4 to 6.1.0.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from './version.js';
import { createApp } from './http.js';

const PACKAGE_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json');

describe('package version', () => {
  it('is the version in package.json', () => {
    const declared = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version as string;
    expect(declared).toMatch(/^\d+\.\d+\.\d+/);
    expect(VERSION).toBe(declared);
  });

  it('is what /health reports', async () => {
    const res = await createApp().request('/health');
    expect((await res.json()).version).toBe(VERSION);
  });
});
