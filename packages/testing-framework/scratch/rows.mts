const L = console.log; console.log = () => {}; console.warn = () => {};
const lk: any = await import('../src/multilingual/english-leaks.ts');
const pr: any = await import('@hyperfixi/patterns-reference');
const scanner = await lk.initLeakScanner();
const rows = await pr.getAllPatterns({ limit: 5000 });
const { results } = await lk.corpusLeaks(scanner, rows);
const lang = process.env.LANG2 ?? 'es';
const KEPT_CTX = new Set(['bracket', 'call', 'property', 'clause']);
const byRow: Array<[string, string[]]> = [];
for (const [id, byLang] of results) {
  const f = (byLang.get(lang) ?? []).filter((x: any) => x.kind === 'word' && !x.kept);
  if (f.length) byRow.push([id, [...new Set(f.map((x: any) => x.word))].sort()]);
}
const src = new Map(rows.map((r: any) => [r.id, r.rawCode.replace(/\s+/g, ' ')]));
L(`${lang}: ${byRow.length} rows with a counted English word (of ${[...results.values()].filter(m => m.get(lang)).length})`);
for (const [id, ws] of byRow.sort((a, b) => a[1].join().localeCompare(b[1].join()))) L(`  ${ws.join(',').padEnd(34)} ${id.padEnd(28)} ${String(src.get(id)).slice(0, 80)}`);
process.exit(0);
