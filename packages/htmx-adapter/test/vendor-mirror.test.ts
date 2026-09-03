import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TOP_LEVEL_COMMA_RE } from '../src/canonicalize.js';

/**
 * Drift guard: the adapter mirrors htmx v4's `HCON.split` regex so that
 * `hx-trigger` spec boundaries match core's grammar. The mirror is only
 * correct while it is byte-identical to the vendored build the e2e suite
 * runs against — so a vendor bump that changes the splitter fails HERE,
 * not silently in production.
 */
const VENDOR_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'browser', 'vendor');
const VENDORED_V4 = 'htmx-4.0.0.js';

describe('TOP_LEVEL_COMMA_RE mirrors the vendored htmx v4 HCON.split', () => {
  it('is byte-identical to the regex literal in ' + VENDORED_V4, () => {
    const src = readFileSync(path.join(VENDOR_DIR, VENDORED_V4), 'utf8');
    const m = src.match(/\bsplit\(string\) \{\s*return string\.split\(\/(.*?)\/\);/s);
    expect(
      m,
      'HCON.split not found in the vendored build — update this test with the bump'
    ).not.toBeNull();
    expect(TOP_LEVEL_COMMA_RE.source).toBe(m![1]);
  });
});
