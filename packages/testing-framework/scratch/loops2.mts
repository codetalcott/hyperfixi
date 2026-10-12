const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const srcs = process.argv.slice(2).length ? process.argv.slice(2) : ['on click repeat for item in .items add .processed to item end', 'on click repeat while #c.innerText < 10 increment #c end', 'on click repeat until x > 3 increment x end', 'on mousedown repeat until event mouseup increment #c end', 'on mousedown repeat until event mouseup from document increment #c end', 'for item in $items log item end', 'on click repeat for x in [1, 2] log x end'];
const show = (process.env.SHOW ?? 'es,ja,de,ar,zh,tr,qu,he').split(',');
const langs = sem.getSupportedLanguages().filter((l: string) => l !== 'en');
for (const s of srcs) {
  const en = sem.translate(s, 'en', 'en'); const bad: string[] = []; const shown: string[] = [];
  for (const l of langs) {
    try { const r = sem.translate(s, 'en', l); const b = sem.translate(r, l, 'en'); if (b !== en) bad.push(`${l}:${b}`); if (show.includes(l)) shown.push(`  ${l}: ${r}`); }
    catch (e: any) { bad.push(`${l}:REFUSED ${e.message.split('\n')[0].slice(0, 70)}`); }
  }
  L(`${s}\n  en: ${en}\n${shown.join('\n')}\n  not round-tripping: ${bad.length ? bad.join(' | ') : 'none'}`);
}
process.exit(0);
