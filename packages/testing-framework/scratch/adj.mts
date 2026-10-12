import { getPatternsForLanguage } from '@lokascript/semantic';
const [l, ...ms] = process.argv.slice(2);
const seen = new Set<string>();
const walk = (p: any, ts: any[]) => { for (let i = 0; i < ts.length; i++) { const t = ts[i], n = ts[i+1]; if (t.type === 'literal' && n?.type === 'role' && ms.includes(t.value.split(' ').pop())) seen.add(`${p.id}: ${t.value} {${n.role}}`); if (t.type === 'group') walk(p, t.tokens); } };
for (const p of getPatternsForLanguage(l) as any[]) walk(p, p.template.tokens);
console.log(l, [...seen].join('\n   ') || 'none');
