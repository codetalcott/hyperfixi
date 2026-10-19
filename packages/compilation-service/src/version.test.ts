/**
 * The version the package exports is the package's (`/health` reported a `1.4.0` literal from
 * 1.4 to 6.1.0, before the HTTP layer moved to its one user, the chat app, in 7.0).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from './index.js';

const PACKAGE_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json');

describe('package version', () => {
  it('is the version in package.json', () => {
    const declared = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version as string;
    expect(declared).toMatch(/^\d+\.\d+\.\d+/);
    expect(VERSION).toBe(declared);
  });
});
