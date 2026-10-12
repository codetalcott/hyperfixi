const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import(process.env.SRC ? '../../semantic/src/index.ts' : '@lokascript/semantic');
const langs = sem.getSupportedLanguages().filter((l: string) => l !== 'en');
const show = (process.env.SHOW ?? 'es,ja,ar,zh,tr,he,qu').split(',');
for (const s of process.argv.slice(2)) {
  const en = sem.translate(s, 'en', 'en'); const bad: string[] = []; const shown: string[] = [];
  for (const l of langs) {
    try { const r = sem.translate(s, 'en', l); const b = sem.translate(r, l, 'en'); if (b !== en) bad.push(`${l}:${b}`); if (show.includes(l)) shown.push(`  ${l}: ${r}`); }
    catch (e: any) { bad.push(`${l}:REFUSED ${e.message.split('\n')[0].slice(0, 70)}`); }
  }
  L(`${s}\n  en: ${en}\n${shown.join('\n')}\n  differs/refused: ${bad.length ? bad.join(' | ') : 'none'}`);
}
process.exit(0);
