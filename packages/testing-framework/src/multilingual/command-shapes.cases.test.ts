/**
 * The command-shape gate's inputs: the harvested cases and the baseline's own
 * consistency. The gate itself is command-shapes.<n>.test.ts.
 *
 * @vitest-environment node
 */
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  LOUD,
  SILENT_FAMILIES,
  silentFamilyOf,
  collapse,
  expandLanes,
  loadCommandShapeCases,
  loadEngineReaders,
  orphanedEntries,
  readerOf,
  vendoredUpstreamVersion,
  type EngineParser,
  type Reader,
} from './command-shapes';
import { loadCommandShapesBaseline } from './command-shapes-gate';

const { cases, upstream } = loadCommandShapeCases();
const baseline = loadCommandShapesBaseline();

describe('command-shape cases', () => {
  let readers: Record<Reader, EngineParser>;

  beforeAll(async () => {
    readers = await loadEngineReaders();
  });

  it('were harvested from the upstream version the suite vendors (re-harvest when it moves)', () => {
    expect(upstream).toBe(vendoredUpstreamVersion());
  });

  // A re-harvest that changes the count is a change to the gate's input:
  // update this pin in the same PR, and say what moved.
  it('are the 1135 the harvest found', () => {
    expect(cases.length).toBe(1135);
    const byOrigin = cases.reduce<Record<string, number>>((m, c) => {
      const kind = c.origin.split(':')[0] ?? '';
      m[kind] = (m[kind] ?? 0) + 1;
      return m;
    }, {});
    expect(byOrigin).toEqual({ upstream: 947, reference: 122, 'reference-pattern': 8, hover: 58 });
  });

  it('are not edited by hand: each id is the hash of its source', () => {
    const wrong = cases.filter(
      c => createHash('sha1').update(collapse(c.source)).digest('hex').slice(0, 10) !== c.id
    );
    expect(wrong.map(c => c.id)).toEqual([]);
    expect(new Set(cases.map(c => c.id)).size).toBe(cases.length);
  });

  it('are all scripts the engine reads, as the case is read', () => {
    const bad: string[] = [];
    for (const c of cases) {
      try {
        readers[readerOf(c)].parse(c.source);
      } catch (e) {
        bad.push(`${c.id}: ${(e as Error).message.split('\n')[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('command-shape baseline', () => {
  it('was made from these cases', () => {
    expect(baseline.upstream).toBe(upstream);
    expect(baseline.cases).toBe(cases.length);
    expect(orphanedEntries(baseline, cases)).toEqual([]);
  });

  it('lists each pair once: never both refused and silent', () => {
    const both = Object.entries(baseline.entries).filter(([, e]) => {
      const silent = new Set(expandLanes(e.silent));
      return expandLanes(e.refused).some(lane => silent.has(lane));
    });
    expect(both.map(([id]) => id)).toEqual([]);
  });

  // A shape semantic does not carry yet is refused, never silently lossy (M1
  // phase 2). Each pair is still judged by the gate; this holds the list to it.
  it('no LOUD case is listed silent', () => {
    const silent = Object.entries(baseline.entries).filter(([, e]) => e.loud && e.silent);
    expect(silent.map(([id, e]) => `${id} [${e.silent}] ${e.src}`)).toEqual([]);
  });

  // The M1 plan's Phase 2 exit: the English lane has no silent pair, and every
  // foreign silent entry carries a reason.
  it('no case is silent in the English lane', () => {
    const silent = Object.entries(baseline.entries).filter(([, e]) =>
      (e.silent ?? '').split(' ').includes('en')
    );
    expect(silent.map(([id, e]) => `${id}: ${e.src}`)).toEqual([]);
  });

  it('every silent entry carries a reason (SILENT_FAMILIES)', () => {
    const bare = Object.entries(baseline.entries).filter(
      ([id, e]) => e.silent && (!silentFamilyOf(id) || !e.why)
    );
    expect(bare.map(([id, e]) => `${id} [${e.silent}]: ${e.src}`)).toEqual([]);
  });

  it('every SILENT_FAMILIES id is a case still silent somewhere (drop it once fixed)', () => {
    const stale = SILENT_FAMILIES.flatMap(f =>
      f.ids.filter(id => !baseline.entries[id]?.silent).map(id => `${f.name}: ${id}`)
    );
    expect(stale).toEqual([]);
  });

  // A LOUD family with no failing case is carried now: drop it from LOUD.
  it('every LOUD family still has a case that does not pass', () => {
    const listed = new Set(Object.values(baseline.entries).map(e => e.loud?.split(':')[0] ?? ''));
    expect(LOUD.map(f => f.name).filter(name => !listed.has(name))).toEqual([]);
  });
});
