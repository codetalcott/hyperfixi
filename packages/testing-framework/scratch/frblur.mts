import { translate } from '../../semantic/src/index';
for (const s of ['on click blur me', 'on click blur #name', 'on blur add .x', 'on focus wait 10ms then blur me', 'blur #search\nblur me', 'on click if I match .a hide me end', 'on click repeat 2 times hide it end']) { const o = translate(s, 'en', 'fr'); let b; try { b = translate(o, 'fr', 'en'); } catch (e: any) { b = 'REFUSED'; } console.log(JSON.stringify(o), '=>', JSON.stringify(b)); }
console.log(translate('quand clic perte de focus #name', 'fr', 'en'));
