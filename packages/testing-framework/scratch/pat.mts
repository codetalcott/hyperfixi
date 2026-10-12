import { parse, getPatternsForLanguageAndCommand } from '@lokascript/semantic';
import { semanticRenderer } from '../../semantic/src/explicit/renderer';
const [src, lang] = process.argv.slice(2);
let node: any = parse(src, 'en');
const walk = (n: any): any[] => n?.kind === 'event-handler' ? (n.body ?? []).flatMap(walk) : n?.kind === 'compound' ? n.statements.flatMap(walk) : [n];
for (const c of walk(node)) {
  const pats = getPatternsForLanguageAndCommand(lang, c.action);
  const best: any = (semanticRenderer as any).findBestPattern(c, pats);
  console.log(c.action, [...c.roles].map(([r, v]: any) => `${r}=${v.type}:${v.value ?? v.raw}`).join(' '));
  console.log('  ', best?.id, JSON.stringify(best?.template.tokens.map((t: any) => t.type === 'literal' ? `L:${t.value}` : t.type === 'role' ? `R:${t.role}` : `G[${t.tokens.map((u: any) => u.type === 'literal' ? `L:${u.value}` : `R:${u.role}`).join(',')}]${t.optional ? '?' : ''}`)));
}
