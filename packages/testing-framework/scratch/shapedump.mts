import { writeFileSync } from 'node:fs';
import { loadCommandShapeCases, runCommandShapes } from '../src/multilingual/command-shapes';
import { initLeakScanner, shapeLeaks, findingKey } from '../src/multilingual/english-leaks';
const scanner = await initLeakScanner();
const { cases } = loadCommandShapeCases();
const results = await runCommandShapes(cases);
const leaks = shapeLeaks(scanner, results, cases);
const out: any = {};
const byId = new Map(cases.map(c => [c.id, c.source]));
for (const r of results) {
  const L = leaks.get(r.id); if (!L) continue;
  out[r.id] = { source: byId.get(r.id), langs: {} };
  for (const [l, f] of L) out[r.id].langs[l] = { rendered: r.lanes[l]?.rendered ?? null, keys: (f ?? []).map(findingKey) };
}
writeFileSync(process.argv[2], JSON.stringify(out));
