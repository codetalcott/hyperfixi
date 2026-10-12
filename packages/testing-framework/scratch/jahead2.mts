import { getPatternsForLanguage } from '../../semantic/src/index';
for (const l of ['ja', 'bn', 'tr', 'ko']) {
const pats = getPatternsForLanguage(l).filter((p: any) => p.command === 'on' && p.template.tokens.length <= 4).sort((a: any, b: any) => b.priority - a.priority);
for (const p of pats.slice(0, 8)) console.log(l, p.id, p.priority, JSON.stringify(p.template.tokens.map((t: any) => t.type === 'literal' ? t.value + (t.alternatives ? '|' + t.alternatives.join('|') : '') : t.type === 'role' ? '{' + t.role + '}' : '[' + t.tokens.map((x: any) => x.value ?? x.role).join(' ') + ']')));
}
