import { initLeakScanner, corpusLeaks, findingKey } from '../src/multilingual/english-leaks';
import { getAllPatterns } from '@hyperfixi/patterns-reference';
import { parse, render } from '@lokascript/semantic';
const scanner = await initLeakScanner();
const rows = await getAllPatterns({ limit: 5000 });
const { results } = await corpusLeaks(scanner, rows);
const byId = new Map(rows.map((r: any) => [r.id, r.rawCode]));
const want = process.argv[2]; // key e.g. case:it
const langs = (process.argv[3] ?? '').split(' ').filter(Boolean);
for (const [id, byLang] of results) {
  for (const [l, f] of byLang) {
    if (langs.length && !langs.includes(l)) continue;
    if (f?.some(x => findingKey(x) === want)) {
      const src = byId.get(id)!;
      console.log(`[${l}] ${id}: ${src.replace(/\s+/g,' ').slice(0,100)}\n     => ${render(parse(src,'en'), l).replace(/\s+/g,' ').slice(0,160)}`);
    }
  }
}
