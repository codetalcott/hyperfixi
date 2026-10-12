import { translate } from '../../semantic/src/index';
const shapes = process.argv[3] ? [process.argv[3]] : [
  'on click toggle between .a and .b for x in [1, 2] put x into #out end',
  'on click toggle between .foo and .bar',
  "on click toggle between [@data-state='active'] and [@data-state='inactive']",
  "on click toggle between [@enabled='true'] and [@disabled='true']",
  "on click toggle *display of me between 'none' and 'flex'",
  "on click toggle *opacity of me between '0', '0.5' and '1'",
  "on click toggle $mode between 'edit' and 'preview'",
  "on click toggle $state between 'a', 'b' and 'c'",
];
const langs = (process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : 'ar bn de es fr he hi id it ja ko ms pl pt qu ru sw th tl tr uk vi zh').split(' ');
for (const s of shapes) {
  let ref: string; try { ref = translate(s, 'en', 'en'); } catch (e: any) { ref = 'REFUSED ' + (e.code ?? e.message); }
  console.log('##', s, '\n   en→en:', ref);
  for (const l of langs) {
    let out = '', back = '';
    try { out = translate(s, 'en', l); } catch (e: any) { out = 'REFUSED ' + (e.code ?? e.message).toString().slice(0, 60); }
    if (!out.startsWith('REFUSED')) { try { back = translate(out, l, 'en'); } catch (e: any) { back = 'REFUSED ' + (e.code ?? e.message).toString().slice(0, 60); } }
    console.log('  ', l.padEnd(3), back === ref ? 'ok ' : 'BAD', out, back === ref ? '' : '  ⇒ ' + back);
  }
}
