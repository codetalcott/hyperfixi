const L = console.log; console.log = () => {}; console.warn = () => {};
import { readFileSync } from 'node:fs';
const { initLeakScanner } = await import('../src/multilingual/english-leaks.ts');
const { readerOf } = await import('../src/multilingual/command-shapes.ts');
const sem: any = await import('@lokascript/semantic');
const s = await initLeakScanner();
const want = new Set(process.argv.slice(2));
const cases = JSON.parse(readFileSync('src/multilingual/command-shapes.cases.json', 'utf8')).cases;
const pr: any = await import('@hyperfixi/patterns-reference');
const corpus = (await pr.getAllPatterns({ limit: 5000 })).filter((r: any) => !r.rawCode.trimStart().startsWith('<')).map((r: any) => ({ id: r.id, source: r.rawCode, origin: 'upstream:x' }));
const shown = new Map<string, number>();
for (const c of [...corpus, ...cases]) {
  const info = s.sourceInfo(c.source, readerOf(c)); if (!info) continue;
  for (const l of ['es', 'de', 'ru']) {
    let r: string; try { r = sem.translate(c.source, 'en', l); } catch { continue; }
    for (const f of s.scan(r, info, l)) if (want.has(`${f.kind}:${f.word}`) && (shown.get(f.word) ?? 0) < 4) { shown.set(f.word, (shown.get(f.word) ?? 0) + 1); L(`${f.word}/${f.context} ${l} ${c.id}: ${c.source.replace(/\s+/g, ' ').slice(0, 90)}\n     ⇒ ${r.replace(/\s+/g, ' ').slice(0, 130)}`); }
  }
}
process.exit(0);
