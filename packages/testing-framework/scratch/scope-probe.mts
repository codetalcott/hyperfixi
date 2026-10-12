import { translate } from '../../semantic/src/index';
import { writeFileSync } from 'fs';
const shapes = [
  'on click hide <p/> in me','on click hide <p/> in #list','on click add .x to <li/> in #list','on click put "x" into <p/> in me','on click repeat for x in <p/> in me log x end','on click get the first <p/> in me',
  'on click hide <input/> in closest <form/>','on click focus first <input/> in closest <form/>','on click set x to first .item in #list','on click scroll to last <.message/> in #chat','on click remove <li/> in #list',
  'on submit add @disabled to <button/> in me then put "Submitting..." into <button/> in me','on click if target matches <button/> in me then log 1 end','on click if no <li/> in #list then log 1 end','on click if x is in <li/> in me then log 1 end',
  'on click show .item in #list','on click toggle .a on <li/> in #list','on click take .a from <li/> in #list','on click put the first <p/> in me into #out','on click set x to <p/> in me','on click log <p/> in it',
  'on keydown from .modal if target matches last <button/> in .modal focus first <button/> in .modal halt end','on click send foo to <li/> in #list','on click trigger foo on <p/> in me','on click remove .a from <li/> in me',
  'on click hide <p/> in me then show <p/> in #b','def foo() hide <p/> in me end','on click repeat 2 times hide <p/> in me end','on click put "x" into the last <p/> in #list','on click append "x" to <ul/> in me',
  'on click hide me','on click put "x" into #out','on click toggle .active',
];
const langs = ['ar','bn','de','es','fr','he','hi','id','it','ja','ko','ms','pl','pt','qu','ru','sw','th','tl','tr','uk','vi','zh'];
const out: Record<string, string> = {};
for (const s of shapes) {
  let ref: string; try { ref = translate(s, 'en', 'en'); } catch { ref = 'REFUSED'; }
  for (const l of langs) {
    let r = '', back = '';
    try { r = translate(s, 'en', l); } catch { r = 'REFUSED'; }
    if (r !== 'REFUSED') { try { back = translate(r, l, 'en'); } catch { back = 'REFUSED'; } }
    out[`${l}\t${s}`] = `${back === ref ? 'ok' : 'FAIL'}\t${r}`;
  }
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
