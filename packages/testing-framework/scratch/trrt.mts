import { translate } from '../../semantic/src/index';
for (const s of ['on click put result into #out','on click put "x" into the target','on click send foo to the target','on click remove .a from the target','on click get the event','on click log result','on click set the result to 5','on click put "x" into document','on click add .x to the body','on click put "x" into window','on click remove .x from the body','on click put the detail into #o','on click hide the target']) {
  const o = translate(s, 'en', 'tr'); let b; try { b = translate(o, 'tr', 'en'); } catch (e: any) { b = 'REFUSED'; } console.log(o, '|', b === translate(s,'en','en') ? 'ok' : '!! ' + b);
}
