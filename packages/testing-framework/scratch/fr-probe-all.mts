import { translate } from '../../semantic/src/index';
import { writeFileSync } from 'fs';
const shapes = [
  'on click put "x" into #out','on click toggle .active','on click add .a to #b','on click remove .a from me','on click set $x to 5','on click increment :n by 2','on click wait 2s then hide #m',
  'on click hide me','on click add .x to <li/> in #list','on click send foo to #b','on click put my value into #out','on click get #a then put it into me','on click toggle .a on #b for 2s',
  'on click take .a from #b for me','on click set my *color to "red"','on click fetch /api as json then put it into #out','on click repeat for x in <p/> log x end','on click if I match .a remove .a from me end',
  'on keydown[key=="Enter"] from #in send go to #f','on click hide #m with *opacity','on click or keydown add .x to me','on pointerdown(clientX) log clientX','on click wait for transitionend then add .x',
  'on click trigger foo on #b','on click put result into #out','on click call alert("hi")','on click transition opacity to 0 over 300ms','on click append "x" to #out','on click put "x" before #out',
  'on click put "x" at end of #out','on click bind $x to #in','on click set :arr to [1,2,3] then append 4 to :arr','on click put :arr as String into me','on click show #m when it matches .x',
  'on click toggle between .a and .b','on click toggle .a on #b','on click measure me','on click log result','on click default $x to 5','on click put the first <p/> into #out',
  'on click go to url "/x"','on click remove .a from <li/> in #list','on click add .x to the closest <form/>','on click set #out.innerText to "x"','on click put #a.value into #b',
  'on click tell #a add .x end','on click halt the event','on click send foo(x: 1) to #b','on click take .a','on click empty #out','on click swap #a with #b','on click morph #a to "<p/>"',
  'on load put "x" into #out',
  'on click put it into #out','on click show it','on click hide it','on click show me','on click put me into #o','on click append it to #out','on click remove me','on click measure me','on click blur me','on click focus it','on click empty it','on click log it','on click call it','on click increment it','on click put it before #x','on click return it','def foo() log me end','def foo() hide it end','on click if I match .a hide me end','on click repeat 2 times hide it end','on click set le to 1 then if le put "Y" into #out else put "N" into #out end','on click set l to 1 then put l into #out',
  'on click put result into #out','on click send foo to the target','on click remove .a from the target','on click get the event','on click put "x" into document','on click add .x to the body',
  "on click put \"it's\" into #o", "on click call foo('a')", "on click set x to ['a','b']", "on click put 'x' into #out", "on click put \"a\" + 'b' into #out", "on click log [1,'a']", "on click put (x)+'y' into #o",'on click focus #name','on click get the value of #in then put it into #out',
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
