const L = console.log; console.log = () => {}; console.warn = () => {};
const { initLeakScanner } = await import('../src/multilingual/english-leaks.ts');
const sem: any = await import('@lokascript/semantic');
const s = await initLeakScanner();
for (const [src, reader] of [
  ['on click if I match .active then remove .active else add .active end', 'program'],
  ['on load repeat for item in .item index i add .visible to item wait 100ms end', 'program'],
  ['on input debounced at 300ms fetch `/api/search?q=${my value}` as json then put it into #results', 'program'],
  ['on submit js(me) return new FormData(me.closest("form")) end then fetch /api/submit with {method:"POST", body:it}', 'program'],
  ['on click add .foo to #a then put "x" into me then add .rey to .bar when it matches .doh', 'program'],
  ['on click set the element\'s x to 10 then put #a\'s children into me', 'program'],
  ['on keyup[key is "Escape"] clear me', 'program'],
] as const) {
  const info = s.sourceInfo(src, reader)!;
  L('\n' + src, '| grammar', JSON.stringify([...info.grammar]), '| props', JSON.stringify([...info.props]), '| events', JSON.stringify([...info.events]), '| clause', [...info.clauseWords].join(' '));
  for (const l of ['es', 'de', 'ja', 'ru', 'tr', 'he']) {
    const r = sem.render(sem.parse(src, 'en'), l);
    L(`  ${l}: ${r.replace(/\s+/g, ' ').slice(0, 120)}\n      ⇒ ${s.scan(r, info, l).map((f: any) => `${f.kind}:${f.word}/${f.context}${f.hasWord ? '+' : ''}`).join(' ')}`);
  }
}
process.exit(0);
