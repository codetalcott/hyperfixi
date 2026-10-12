import { getPatternsForLanguage, tryGetProfile } from '../../semantic/src/index';
const p: any = tryGetProfile('fr');
const non = new Set<string>();
for (const pat of getPatternsForLanguage('fr') as any[]) { const t = pat.template.tokens[0]; if (t?.type === 'literal' && !/^\p{L}+(?:er|ir|re)$/u.test(t.value)) non.add(`${pat.command}:${t.value}`); }
console.log([...non].join('  '));
