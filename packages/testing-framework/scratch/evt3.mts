const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const eh: any = await import('../../semantic/src/patterns/event-handler.ts');
const pairs = process.argv.slice(2).map(x => x.split(':'));
const lexOf = async (l: string) => { const m: any = await import(`../../semantic/src/lexicons/${l}.ts`); return m[l] ?? m.default ?? Object.values(m)[0]; };
for (const [l, e] of pairs) {
  const t = (await lexOf(l))?.events?.[e];
  const table = Object.entries(eh.eventNameTranslations[l] ?? {}).filter(([, en]) => en === e).map(([n]) => n);
  const res: string[] = [];
  for (const src of [`on ${e} add .a to me`, `on ${e} from #b log 1`, `on click send ${e} to #x then log 1`]) {
    try { const r = sem.translate(src, 'en', l); const hand = r.split(e).join(t?.primary ?? e); const back = sem.translate(hand, l, 'en'); res.push(back === src ? 'ok' : '→ ' + back); } catch (err: any) { res.push('ERR ' + err.message.split('\n')[0].slice(0, 70)); }
  }
  L(`${l} ${e}: lexicon=${t?.primary ?? '-'}${t?.render === false ? ' (render:false)' : ''} table=[${table.join(', ')}] denied=${eh.getEventLocalizationDenylist()[l]?.has(e) ?? false}  ${res.join(' | ')}`);
}
process.exit(0);
