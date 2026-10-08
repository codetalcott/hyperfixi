/**
 * The English-leak gate, corpus half (see english-leaks.ts): every non-markup
 * corpus row rendered into each language as `populate` writes it, judged
 * against baselines/english-leaks.corpus.json. Fails on a finding a pair did
 * not have, and on a listed one that is gone (prune with
 * tools/regen-english-leaks-baseline.ts --corpus), so the list only shrinks.
 *
 * Needs FOREIGN_CANONICAL_VALIDITY=1 and a freshly populated patterns.db: the
 * SET of rows depends on `populate`, the same contract the other corpus gates
 * carry (`npm run test:canonical`).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getAllPatterns } from '@hyperfixi/patterns-reference';
import {
  corpusLeaks,
  diffLeakBaseline,
  initLeakScanner,
  loadLeakBaseline,
  type LeakResults,
} from './english-leaks';

const DB_FRESHLY_POPULATED = process.env.FOREIGN_CANONICAL_VALIDITY === '1';

/** At most `max` lines, then a count: a broad regression must not print thousands. */
function capped(lines: string[], max = 40): string[] {
  return lines.length <= max ? lines : [...lines.slice(0, max), `… and ${lines.length - max} more`];
}

describe.skipIf(!DB_FRESHLY_POPULATED)('english-leaks: corpus renders', () => {
  let results: LeakResults = new Map();
  let skipped: string[] = [];
  const sources = new Map<string, string>();

  beforeAll(async () => {
    const rows = await getAllPatterns({ limit: 5000 });
    for (const row of rows) sources.set(row.id, row.rawCode.replace(/\s+/g, ' ').trim());
    ({ results, skipped } = await corpusLeaks(await initLeakScanner(), rows));
  }, 300_000);

  it('scores the corpus (sanity: guards a false green)', () => {
    expect(results.size).toBeGreaterThan(140);
    // Rows the engine rejects have no grammar to read (worker, socket, eventsource, …).
    expect(skipped.length).toBeLessThan(10);
  });

  it('no render holds English the baseline does not list', () => {
    const gained = diffLeakBaseline(results, loadLeakBaseline('corpus')).filter(
      c => c.added.length
    );
    expect(
      capped(
        gained.map(
          c => `${c.id} [${c.language}] ${c.added.join(' ')}: ${sources.get(c.id)?.slice(0, 80)}`
        )
      )
    ).toEqual([]);
  });

  it('no listed English is gone (prune it with tools/regen-english-leaks-baseline.ts --corpus)', () => {
    const gone = diffLeakBaseline(results, loadLeakBaseline('corpus')).filter(c => c.gone.length);
    expect(capped(gone.map(c => `${c.id} [${c.language}] ${c.gone.join(' ')}`))).toEqual([]);
  });

  it('keeps no entry for a row the corpus no longer holds', () => {
    const stale = Object.keys(loadLeakBaseline('corpus').entries).filter(id => !results.has(id));
    expect(stale).toEqual([]);
  });
});
