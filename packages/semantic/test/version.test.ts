/**
 * semantic's exported VERSION is the package's version. It was a `0.1.0`
 * literal from the package's first release until 3.2.0, and every browser
 * bundle carried its own `1.0.0-<lang>`; nothing read either.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/index';
import { VERSION as ES_BUNDLE_VERSION } from '../src/browser-es';

const PACKAGE_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json');

describe('package version', () => {
  it('reports the real package version', () => {
    const declared = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version as string;
    expect(declared).toMatch(/^\d+\.\d+\.\d+/);
    expect(VERSION).toBe(declared);
  });

  it('tags a browser bundle with it', () => {
    expect(ES_BUNDLE_VERSION).toBe(`${VERSION}-es`);
  });
});
