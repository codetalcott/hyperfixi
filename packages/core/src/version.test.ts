/**
 * The version core reports is the one it publishes.
 *
 * An equality check, not a shape check: a stale hard-coded literal satisfies
 * `/^\d+\.\d+\.\d+/` forever — and did, for five minor releases, when
 * `getVersion()` returned '2.0.0' against a published 2.10.0 and
 * `packageInfo.version` sat three minors behind. (Until 4.0 this lived in the
 * API's tests, which left with core's engine.)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VERSION } from './version';
import { packageInfo } from './metadata';

const PACKAGE_JSON = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');

describe('the reported version', () => {
  it('is the version in package.json, on every surface that exposes one', () => {
    const declared = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version as string;
    expect(declared).toMatch(/^\d+\.\d+\.\d+/);
    expect(VERSION).toBe(declared);
    expect(packageInfo.version).toBe(declared);
  });
});
