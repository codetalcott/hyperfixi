const L = console.log; console.log = () => {};
const eh: any = await import('../../semantic/src/patterns/event-handler.ts');
const sem: any = await import('../../semantic/src/index.ts');
const reg: any = await import('../../semantic/src/lexicon-registry.ts').catch(() => null);
const langs = sem.getSupportedLanguages().filter((l: string) => l !== 'en');
const lexOf = async (l: string) => { const m: any = await import(`../../semantic/src/lexicons/${l}.ts`); return m[l] ?? m.default ?? Object.values(m)[0]; };
for (const l of langs) {
  const lex = await lexOf(l);
  const ev = lex?.events ?? {};
  const lexEvents = Object.entries(ev).filter(([e, t]: any) => t.render !== false && t.primary && t.primary !== e);
  const localized = lexEvents.filter(([e]) => eh.localizeEventName(e, l) !== e);
  const differs = lexEvents.filter(([e, t]: any) => { const n = eh.localizeEventName(e, l); return n !== e && n !== t.primary; });
  L(l.padEnd(3), 'lexicon events', String(lexEvents.length).padStart(3), ' localized by table', String(localized.length).padStart(3), ' table≠lexicon primary', differs.length, differs.slice(0, 4).map(([e, t]: any) => `${e}:${eh.localizeEventName(e, l)}/${t.primary}`).join(' '));
}
process.exit(0);
