const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const langs = (process.env.LANGS ?? 'he,hi,it,pl,qu,ru,th,uk,vi').split(',');
const lexOf = async (l: string) => { const m: any = await import(`../../semantic/src/lexicons/${l}.ts`); return m[l] ?? m.default ?? Object.values(m)[0]; };
for (const l of langs) {
  const ev = (await lexOf(l))?.events ?? {};
  const ok: string[] = [], bad: string[] = [];
  for (const [e, t] of Object.entries(ev) as any) {
    if (t.render === false || !t.primary || t.primary === e) continue;
    const results: string[] = [];
    for (const src of [`on ${e} add .a to me`, `on ${e} from #b log 1`, `on click send ${e} to #x then log 1`]) {
      let back = '';
      try {
        const r = sem.translate(src, 'en', l);
        if (!r.includes(e)) { results.push('nolit'); continue; }
        const hand = r.split(e).join(t.primary);
        back = sem.translate(hand, l, 'en');
      } catch (err: any) { back = 'ERR ' + err.message.split('\n')[0].slice(0, 60); }
      results.push(back === src ? 'ok' : `→ ${back}`);
    }
    (results.every(r => r === 'ok') ? ok : bad).push(results.every(r => r === 'ok') ? `${e}:${t.primary}` : `${e}:${t.primary} [${results.join(' | ')}]`);
  }
  L(`${l}: ${ok.length} ok, ${bad.length} not`); L('  OK ' + ok.join(' '));
  for (const b of bad) L('    ' + b.slice(0, 220));
}
process.exit(0);
