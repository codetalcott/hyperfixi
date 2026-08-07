/**
 * Full-path half of the preprocessor parity ratchet.
 *
 * Recomputes the shared corpus through the FULL preprocessor and diffs
 * against its column of the committed snapshot
 * (test/fixtures/preprocessor-parity.json, written by
 * scripts/generate-parity-fixture.ts). The slim half lives in
 * preprocessor-parity.slim.test.ts — a separate FILE on purpose: the two
 * paths wire different pattern generators into the registry, and under
 * vitest's shared-src aliases one file = one registry, so importing both
 * chains together lets whichever wires last silently reconfigure the other
 * (see parity-harness.ts). Two files = two module graphs = shipped reality.
 *
 * Why absolute pins rather than comparing the paths to each other: a
 * refactor that changes both paths identically (the F4 shared-skeleton
 * extraction) would be invisible to a live comparison — the snapshot is
 * the oracle that makes such a refactor provably behavior-preserving.
 *
 * On failure: if you changed preprocessor/semantic behavior on purpose,
 * regenerate (`npx tsx scripts/generate-parity-fixture.ts`) and commit the
 * diff. Otherwise you caught unintended drift — fix the code, not the
 * fixture. NOTE: a stale @lokascript/semantic dist makes the GENERATOR
 * vacuous — rebuild deps first (`npm run check:fresh` at the repo root).
 */

import { describe, it, expect } from 'vitest';
import { preprocessToEnglish } from '../src/preprocessor';
import { PARITY_CORPUS, KNOWN_DIVERGENCES, loadFixture } from './parity-harness';

const fixture = loadFixture();

describe('preprocessor parity — full path', () => {
  it('fixture and corpus are the same shape (regenerate after editing the corpus)', () => {
    expect(fixture.map(r => [r.lang, r.input])).toEqual(
      PARITY_CORPUS.map(r => [r.lang, r.input])
    );
  });

  it('the committed full-vs-slim divergence set is exactly the known one', () => {
    const divergent = fixture.filter(r => r.full !== r.slim).map(r => [r.lang, r.input]);
    expect(divergent).toEqual(KNOWN_DIVERGENCES);
  });

  it.each(fixture.map((row, i) => [row.lang, row.input, i] as const))(
    '[%s] %s — full path matches its snapshot',
    (_lang, _input, i) => {
      const row = fixture[i];
      expect(preprocessToEnglish(row.input, row.lang, PARITY_CORPUS[i].config ?? {})).toBe(
        row.full
      );
    }
  );
});
