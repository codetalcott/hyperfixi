import { translate } from '@lokascript/semantic';
import { writeFileSync } from 'node:fs';
const shapes = [
  'on click from document remove .open from #menu',
  'on keydown from window hide #modal',
  'on click send hello to document',
  'on click send close to window',
  'on click trigger refresh on document',
  'on click put window.innerWidth into #w',
  'on click set window.foo to 1',
  'on click call window.alert("x")',
  'on click if window.x then log 1 else log 2 end',
  'on click if not window.x then log 1 end',
  'on click if not document.hidden then log 1 end',
  'on click put document.title into me',
  'on click set document.title to "x"',
  'on click log window',
  'on scroll from window if window.scrollY > 100 add .x to body end',
  'on click get window.location.href then put it into me',
  'on click put "x" into document.body',
  'on click append "x" to document.body',
  'on load from window add .ready to body',
  'on resize from window debounced at 200ms put window.innerWidth into #w',
  'on keydown[key is "Escape"] from window hide #m',
  'on click set :y to window.scrollY',
  'on click call document.querySelector(".x").focus()',
  'on click put window into me',
  'on click if document is not null then log 1 end',
  'on click wait 1s then remove .x from document.body',
  'on click toggle .dark on document.body',
  'on click add .x to document.documentElement',
  'on visibilitychange from document if document.hidden then log "h" end',
  'on click repeat while window.x > 0 decrement window.x end',
  'on click fetch /x then put it into window.data',
  "on click put window's innerWidth into #w",
  'on click put the innerWidth of window into #w',
  "on click set window's foo to 1",
  "on click if window's x then log 1 end",
  'on click if window.x and not document.hidden then log 1 end',
  'on click put not window.tmp into me',
  'on click if window.tmp then put "foo" into me else if not window.tmp then log "b" end',
  'on click unless window.x log 1 end',
  'on mouseup from document remove .dragging from me',
];
const langs = 'ar bn de es fr he hi id it ja ko ms pl pt qu ru sw th tl tr uk vi zh'.split(' ');
const out: Record<string, string> = {};
for (const s of shapes) {
  const ref = translate(s, 'en', 'en');
  for (const l of langs) {
    let r: string, st: string;
    try { r = translate(s, 'en', l); } catch (e: any) { out[`${l}\t${s}`] = 'REFUSED-OUT'; continue; }
    try { const b = translate(r, l, 'en'); st = b === ref ? 'pass' : 'DIFF ' + b; } catch (e: any) { st = 'REFUSED-BACK'; }
    out[`${l}\t${s}`] = `${st}\t${r}`;
  }
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const c: Record<string, number> = {};
for (const v of Object.values(out)) { const k = v.split(/[\t ]/)[0]; c[k] = (c[k] ?? 0) + 1; }
console.log(c);
