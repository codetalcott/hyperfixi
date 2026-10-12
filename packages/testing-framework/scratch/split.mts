// Split each leak kind: fixable without a vocabulary decision (the language has the word) vs not.
const L = console.log; console.log = () => {}; console.warn = () => {};
import { readFileSync, writeFileSync } from 'node:fs';
const lk: any = await import('../src/multilingual/english-leaks.ts');
const cs: any = await import('../src/multilingual/command-shapes.ts');
const sem: any = await import('@lokascript/semantic');
const scanner = await lk.initLeakScanner();
const halves: Record<string, any> = {};
if (process.argv.includes('--corpus')) {
  const pr: any = await import('@hyperfixi/patterns-reference');
  const rows = await pr.getAllPatterns({ limit: 5000 });
  halves.corpus = (await lk.corpusLeaks(scanner, rows)).results;
}
if (process.argv.includes('--shapes')) {
  const cases = JSON.parse(readFileSync('src/multilingual/command-shapes.cases.json', 'utf8')).cases;
  const results = cases.map((c: any) => {
    const lanes: any = {};
    for (const l of lk.FOREIGN_LANGUAGES ?? sem.getSupportedLanguages().filter((x: string) => x !== 'en')) {
      try { lanes[l] = { rendered: sem.translate(c.source, 'en', l) }; } catch { lanes[l] = {}; }
    }
    return { id: c.id, lanes };
  });
  halves.shapes = lk.shapeLeaks(scanner, results, cases);
}
const out: any = {};
for (const [half, results] of Object.entries(halves)) {
  const per: Record<string, any> = {};
  const words: Record<string, { n: number; has: number; ctx: Record<string, number>; langs: Set<string> }> = {};
  let renders = 0, wordAny = 0, wordVocab = 0, ev = 0, ca = 0;
  for (const byLang of (results as Map<string, Map<string, any[] | null>>).values()) {
    for (const [l, fs] of byLang) {
      if (!fs) continue;
      renders++;
      const p = (per[l] ??= { renders: 0, word: 0, wordVocab: 0, event: 0, case: 0 });
      p.renders++;
      const w = fs.filter(f => f.kind === 'word');
      if (w.length) { p.word++; wordAny++; }
      if (w.some(f => !f.hasWord)) { p.wordVocab++; wordVocab++; }
      if (fs.some(f => f.kind === 'event')) { p.event++; ev++; }
      if (fs.some(f => f.kind === 'case')) { p.case++; ca++; }
      for (const f of w) { const x = (words[f.word] ??= { n: 0, has: 0, ctx: {}, langs: new Set() }); x.n++; if (f.hasWord) x.has++; x.ctx[f.context] = (x.ctx[f.context] ?? 0) + 1; x.langs.add(l); }
    }
  }
  const pct = (a: number, b: number) => (100 * a / b).toFixed(1) + '%';
  L(`\n## ${half}: ${renders} renders`);
  L(`  word (any): ${pct(wordAny, renders)}   word needing vocabulary (a word the language lacks): ${pct(wordVocab, renders)}   event: ${pct(ev, renders)}   case: ${pct(ca, renders)}`);
  L('  per language: word / word-needing-vocab / event / case');
  for (const [l, p] of Object.entries(per).sort((a: any, b: any) => b[1].word / b[1].renders - a[1].word / a[1].renders))
    L(`   ${l}  ${pct(p.word, p.renders).padStart(6)}  ${pct(p.wordVocab, p.renders).padStart(6)}  ${pct(p.event, p.renders).padStart(6)}  ${pct(p.case, p.renders).padStart(6)}`);
  L('  top words: tokens (has-word tokens) langs contexts');
  for (const [w, x] of Object.entries(words).sort((a, b) => b[1].n - a[1].n).slice(0, 45))
    L(`   ${String(x.n).padStart(5)} (${String(x.has).padStart(4)}) ${String(x.langs.size).padStart(2)}  ${w.padEnd(16)} ${Object.entries(x.ctx).map(([c, n]) => `${c}:${n}`).join(' ')}`);
  out[half] = { per, words: Object.fromEntries(Object.entries(words).map(([w, x]) => [w, { ...x, langs: [...x.langs] }])) };
}
writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(out));
process.exit(0);
