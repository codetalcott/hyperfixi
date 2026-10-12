const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const eh: any = await import('../../semantic/src/patterns/event-handler.ts');
const deny = eh.getEventLocalizationDenylist();
const rb = (e: string, n: string, l: string) => [`on ${e} add .a to me`, `on ${e} from #b log 1`, `on click send ${e} to #x then log 1`].every(src => { try { return sem.translate(sem.translate(src, 'en', l).split(e).join(n), l, 'en') === src; } catch { return false; } });
for (const l of Object.keys(deny)) {
  const m: any = await import(`../../semantic/src/lexicons/${l}.ts`); const lex = m[l] ?? Object.values(m)[0];
  const out: string[] = [];
  for (const e of deny[l]) {
    const t = lex?.events?.[e]; if (!t?.primary || t.primary === e || /_/.test(t.primary)) continue;
    const table = Object.entries(eh.eventNameTranslations[l] ?? {}).filter(([, en]) => en === e).map(([n]) => n);
    if (rb(e, t.primary, l)) out.push(`${e}: lexicon ${t.primary} | table [${table.join(', ')}]`);
  }
  if (out.length) L(`${l}:\n  ` + out.join('\n  '));
}
process.exit(0);
