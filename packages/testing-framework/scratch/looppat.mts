import { getPatternsForLanguage, parse } from '../../semantic/src/index';
for (const l of ['bn','ja']) {
  const pats = getPatternsForLanguage(l).filter((p: any) => /repeat|for/.test(p.command) && JSON.stringify(p.template.tokens).includes('"in"') || (p.command === 'for'));
  for (const p of pats.slice(0, 4)) console.log(l, p.id, JSON.stringify(p.template.tokens.map((t: any) => t.type === 'literal' ? t.value : t.type === 'role' ? '{' + t.role + '}' : '[group]')));
}
const n: any = parse('repeat for x in <p/> log x end', 'en');
console.log(n.kind, n.action, [...(n.roles?.keys?.() ?? [])]);
