import { commandSchemas } from '@lokascript/semantic';
const by = new Map<string,string[]>();
for (const [n, s] of Object.entries(commandSchemas) as any) { const c = s.category ?? '?'; by.set(c, [...(by.get(c) ?? []), n]); }
for (const [c, ns] of by) console.log(c, ':', ns.join(' '));
