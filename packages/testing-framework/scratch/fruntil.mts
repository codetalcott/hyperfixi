import { translate } from '../../semantic/src/index';
for (const s of ['on click repeat until x is 5 increment x end', 'on mousedown repeat until event mouseup log 1 end']) { const o = translate(s, 'en', 'fr'); let b; try { b = translate(o, 'fr', 'en'); } catch (e: any) { b = 'REFUSED'; } console.log(o, '=>', b); }
