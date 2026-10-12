import { translate } from '../../semantic/src/index';
import { writeFileSync } from 'fs';
const shapes = [
  'on click focus me','on click focus #name','on click blur me','on click blur #name','on focus add .x','on blur remove .x','on click focus','on click blur',
  'on click focus the first <input/> in closest <form/>','on click focus it','on click blur it','on click focus #a then blur #b','on keydown[key=="Tab"] focus #x',
  'on focus from #a add .x to me','on blur if my value is empty add .error to me end','on click call #in.focus()','on click focus next <input/>',
  'on click wait 1s then focus me','on load focus #search','on click if I match .a blur me else focus me end','on focusin add .f','on focusout remove .f',
  'on click send focus to #a','on click trigger blur on me','on mouseenter focus me','on click repeat 2 times focus #a end','on click tell #a focus you end',
  'on click focus previous <input/>','on click hide me then focus #b','on click blur document.activeElement',
];
const langs = ['ar','bn','de','es','fr','he','hi','id','it','ja','ko','ms','pl','pt','qu','ru','sw','th','tl','tr','uk','vi','zh'];
const out: Record<string, string> = {};
for (const s of shapes) {
  let ref: string; try { ref = translate(s, 'en', 'en'); } catch { ref = 'REFUSED'; }
  for (const l of langs) {
    let r = '', back = '';
    try { r = translate(s, 'en', l); } catch (e: any) { r = 'REFUSED'; }
    if (r !== 'REFUSED') { try { back = translate(r, l, 'en'); } catch { back = 'REFUSED'; } }
    out[`${l}\t${s}`] = `${back === ref ? 'ok' : 'FAIL'}\t${r}`;
  }
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
