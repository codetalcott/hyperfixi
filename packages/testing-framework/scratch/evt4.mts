const L = console.log; console.log = () => {};
const eh: any = await import('../../semantic/src/patterns/event-handler.ts');
const sem: any = await import('../../semantic/src/index.ts');
const deny = eh.getEventLocalizationDenylist();
for (const l of sem.getSupportedLanguages().filter((x: string) => x !== 'en')) {
  const m: any = await import(`../../semantic/src/lexicons/${l}.ts`); const lex = m[l] ?? Object.values(m)[0];
  const silent = Object.entries(lex?.events ?? {}).filter(([e, t]: any) => t.render !== false && t.primary && t.primary !== e && eh.localizeEventName(e, l) === e && !deny[l]?.has(e)).map(([e, t]: any) => `${e}:${t.primary}`);
  if (silent.length) L(l, silent.join(' '));
}
L('done');
process.exit(0);
