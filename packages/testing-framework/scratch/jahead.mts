import { getPatternsForLanguage, translate } from '../../semantic/src/index';
const pats = getPatternsForLanguage('ja').filter((p: any) => p.command === 'on').sort((a: any, b: any) => b.priority - a.priority);
for (const p of pats.slice(0, 12)) console.log(p.id, p.priority, JSON.stringify(p.template.tokens.map((t: any) => t.type === 'literal' ? t.value : t.type === 'role' ? '{' + t.role + '}' : '[group]')));
for (const s of ['クリックで 自分を 隠す','クリックで #outに "x"を 置く','クリック で .aを 切り替え','#in から keydown[key=="Enter"]で #fに goを 送る','helloで 自分を 隠す']) { let b; try { b = translate(s, 'ja', 'en'); } catch (e: any) { b = 'REFUSED'; } console.log(s, '=>', b); }
