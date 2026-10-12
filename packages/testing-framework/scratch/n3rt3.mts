import { translate } from '@lokascript/semantic';
const shapes = [
  'on click put "x" into me', 'on click put "x" before me', 'on click put "x" after me',
  'on click put "x" at end of me', 'on click put "x" at start of me', 'on click put it into me',
  'on click add .a to me', 'on click remove .a from me', 'on click toggle .a on me',
  'on click send foo to me', 'on click trigger foo on me', 'on click append "x" to me',
  'on click hide <p/> in me', 'on click show <p/> in me when it matches .x', 'on click take .a from me',
  'on click bind $x to me', 'on click set $x to me', 'on click put "x" into me then add .a to me',
  'on click remove <p/> from me', 'on click add .foo to <p/> in me', 'on click toggle .a on me for 2s',
  'on click add @disabled to me', 'on click remove @disabled from me', 'on click put #a.innerHTML into me',
  'on click get #a then put it into me', 'on click repeat 3 times put "x" at end of me end',
  'on click if I match .a remove .a from me else add .a to me end', 'on click put "<b>x</b>" into me',
  'on click append "<li/>" to me', 'on click wait 1s then put "done" into me',
  'on click fetch /a then put it into me', 'on click put me into #out', 'on click toggle .a on #b',
  'on click put "x" into #out', 'on click add .a to it', 'on click morph me to "<div/>"',
  'on click swap .a with .b', 'on click increment :n then put :n into me', 'on click put :n as String into me',
  'on click send foo(x: 1) to me', 'on click take .active from .tabs for me',
  'on click put "x" at end of #out', 'on click put "x" before #a', 'on click hide <p/> in #list',
  'on click put the first <li/> in me into #o', 'on click remove .a from <p/> in me', 'on click send foo to #a',
  'on click get the value of me', 'on click put my value into #o', 'on click put "x" into it', 'on click take .a from it',
  'on click put #a into me then add .b to it', 'on click set $x to #a', 'on click set $x to "y"', 'on click set my x to 1',
  'on click toggle .a on <p/> in me', 'on click put "x" into <p/> in me', 'on click trigger foo on #a',
  'on click append "x" to #a', 'on click remove me', 'on click hide me', 'on click wait for load from me',
  'on click put "x" after #a', 'on click add .a to the first <li/> in me', 'on click put me as String into #o',
  'on click put 1 into it', 'on click toggle .x on it', 'on click put 1 before it', 'on click put 1 after it',
  'on click hide <p/> in it', 'on click get first <p/> in it', 'on click send foo to it', 'on click remove .x from it',
  'on click show me', 'on click measure me', 'on click hide me with *opacity', 'on click focus me', 'on click log me',
  'on click tell me add .x end', 'on click bind me to $x', 'on click put it at end of me', 'on click put 1 at end of it',
  'on click if it matches .x add .y to it end', 'on click set $x to it', 'on click trigger foo on it',
]
const langs = (process.argv[2] ?? 'ar bn de es fr he hi id it ja ko ms pl pt qu ru sw th tl tr uk vi zh').split(' ');
const rows: any[] = [];
for (const s of shapes) {
  let ref: string; try { ref = translate(s, 'en', 'en'); } catch { ref = 'ERR'; }
  for (const l of langs) {
    let out = '', back = '';
    try { out = translate(s, 'en', l); } catch (e: any) { out = 'REFUSED ' + (e.code ?? e.message).toString().slice(0, 40); }
    if (!out.startsWith('REFUSED')) { try { back = translate(out, l, 'en'); } catch (e: any) { back = 'REFUSED ' + (e.code ?? e.message).toString().slice(0, 40); } }
    rows.push({ s, l, out, back, ok: back === ref });
  }
}
console.log(JSON.stringify(rows));
