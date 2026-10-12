const L = console.log; console.log = () => {};
const eh: any = await import('../../semantic/src/patterns/event-handler.ts');
const reg: any = await import('../../semantic/src/registry.ts');
await import('../../semantic/src/index.ts');
for (const [l, table] of Object.entries(eh.eventNameTranslations) as any) {
  const prof = reg.getProfile(l);
  const kw = prof?.keywords ?? {};
  const cmdWords = new Map<string, string>();
  for (const [k, v] of Object.entries(kw) as any) for (const w of [v?.primary, ...(v?.alternatives ?? [])]) if (w) cmdWords.set(String(w).toLowerCase(), k);
  const hits = Object.entries(table).filter(([n, e]) => cmdWords.has(n.toLowerCase()) && (process.env.SAME ? cmdWords.get(n.toLowerCase()) === e : cmdWords.get(n.toLowerCase()) !== e)).map(([n, e]) => `${n}=${e} (keyword ${cmdWords.get(n.toLowerCase())})`);
  if (hits.length) L(l, hits.join('; '));
}
process.exit(0);
