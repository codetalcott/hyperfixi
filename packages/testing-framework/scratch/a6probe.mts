import { translate } from '../../semantic/src/index';
const shapes = [
  // between, every form
  'on click toggle between .a and .b', 'on click toggle between .a and .b on #x', 'on click toggle between .a and .b on me',
  'on click toggle between .a and .b for 2s', 'on click toggle between @a and @b', "on click toggle between [@aria-pressed='true'] and [@aria-pressed='false'] on #b",
  'on click toggle between .a and .b then put "x" into #o', 'on click toggle between .open and .closed on the next <div/>',
  "on click toggle $x between 1 and 2", "on click toggle $x between 1, 2, 3 and 4", "on click toggle :n between 'on' and 'off'",
  "on click toggle *display of #x between 'none' and 'block'", "on click toggle *display between 'none' and 'block'",
  "on click toggle *opacity of me between '0' and '1' then log 1", "on click toggle my *display between 'none' and 'flex'",
  "on click toggle $mode between 'a' and 'b' then put $mode into #o", "on click if true toggle between .a and .b end",
  "on click toggle the value of #i between 'a' and 'b'", "on click toggle #i's value between 'a' and 'b'",
  // toggle without between
  'on click toggle .a', 'on click toggle .a on #x', 'on click toggle .a for 2s', 'on click toggle @disabled', 'on click toggle .a on <p/> in me',
  'on click toggle *display', 'on click toggle *display of #x', 'on click toggle .a until mouseup', 'on click toggle .a .b on #x',
  'on click toggle .a then toggle .b', 'on click toggle .active on the closest <li/>',
  // commas in values (join glue)
  'on click call foo(1, 2)', 'on click log "a", "b"', 'on click set $x to [1, 2, 3]', 'on click put foo(1, 2) into #o',
  'on click send foo(x: 1, y: 2) to #a', 'on click set $o to {a: 1, b: 2}', 'on click fetch /x with method: "POST", body: "y"',
  'on click put [1, 2].length into #o', 'on click make a Map then put it into #o',
  // class-name patients near markers
  'on click add .a to #x', 'on click remove .a from #x', 'on click take .a from .b', 'on click add .between to me',
  'on click remove *display', 'on click add .a to <p/> in me when it matches .x',
];
const langs = (process.argv[2] ?? 'ar bn de es fr he hi id it ja ko ms pl pt qu ru sw th tl tr uk vi zh').split(' ');
const rows: any[] = [];
for (const s of shapes) {
  let ref: string; try { ref = translate(s, 'en', 'en'); } catch (e: any) { ref = 'REFUSED ' + (e.code ?? ''); }
  rows.push({ s, l: 'en', out: ref, back: ref, ok: !ref.startsWith('REFUSED') });
  for (const l of langs) {
    let out = '', back = '';
    try { out = translate(s, 'en', l); } catch (e: any) { out = 'REFUSED ' + (e.code ?? e.message).toString().slice(0, 40); }
    if (!out.startsWith('REFUSED')) { try { back = translate(out, l, 'en'); } catch (e: any) { back = 'REFUSED ' + (e.code ?? e.message).toString().slice(0, 40); } }
    rows.push({ s, l, out, back, ok: back === ref });
  }
}
console.log(JSON.stringify(rows));
