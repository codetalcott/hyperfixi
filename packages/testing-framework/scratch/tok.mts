import { tokenize } from '../../semantic/src/index';
const [lang, text] = process.argv.slice(2);
const r: any = tokenize(text, lang);
console.log((r.tokens ?? r).map((t: any) => `${t.value}[${t.kind}${t.normalized ? '→' + t.normalized : ''}]`).join(' '));
