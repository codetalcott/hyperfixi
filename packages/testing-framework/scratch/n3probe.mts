import { translate } from '../../semantic/src/index';
const shapes = [
  'bind $fruit to me', 'on click bind $x to me', 'bind $x to it',
  'on click put "x" into me', 'on click put "x" into it', 'on click put it into me', 'on click append "x" to me',
  'on click add .a to me', 'on click add .a to it', 'on click remove .a from me', 'on click toggle .a on me', 'on click toggle .a on it',
  'on click send foo to me', 'on click trigger foo on me', 'on click take .a from me', 'on click hide <p/> in me',
  'on click show <p/> in me', 'on click get the first <p/> in me', 'on click put the first <li/> in me into #o',
  'on click add .x to <p/> in me', 'on click remove <p/> in me', 'on click put "x" into <p/> in me',
  'on click set $x to me', 'on click put me into #o', 'on click put "x" before me', 'on click put "x" after me',
  'on click put "x" at end of me', 'on click put "x" at start of me', 'on click show me', 'on click hide it',
  'on click focus me', 'on click measure me', 'on click tell me add .x end', 'on click get #a then put it into me',
  'on click wait for load from me', 'on click if I match .a remove .a from me end', 'on click put my value into me',
  'on click increment :n then put :n into me', 'on click repeat for x in <p/> in me log x end',
  'on click hide with display then add .foo', 'on click show with *opacity', 'on click settle', 'on click hide', 'on click measure',
  'on click hide me with *opacity', 'on click show me with display', 'on click hide with *opacity then show me', 'on click take .a for me',
  'on click empty me', 'on click hide <p/> with *opacity', 'on click show when it matches .x', 'on click hide when I match .x',
];
const langs = (process.argv[2] ?? 'bn').split(' ');
const rows: any[] = [];
for (const s of shapes) {
  let ref: string; try { ref = translate(s, 'en', 'en'); } catch { ref = 'REFUSED'; }
  for (const l of langs) {
    let out = '', back = '';
    try { out = translate(s, 'en', l); } catch (e: any) { out = 'REFUSED ' + (e.code ?? ''); }
    if (!out.startsWith('REFUSED')) { try { back = translate(out, l, 'en'); } catch (e: any) { back = 'REFUSED'; } }
    rows.push({ s, l, out, back, ok: back === ref });
  }
}
console.log(JSON.stringify(rows));
