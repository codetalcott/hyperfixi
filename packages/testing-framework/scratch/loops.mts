const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('@lokascript/semantic');
const langs = (process.env.LANGS ?? 'es,de,ru,ja,ar,zh,tr,ko').split(',');
const srcs = process.argv.slice(2).length ? process.argv.slice(2) : [
  'on click repeat for item in .items add .processed to item end',
  'on click repeat while #c.innerText < 10 increment #c end',
  'on click repeat until x > 3 increment x end',
  'on mousedown repeat until event mouseup increment #c end',
  'on load repeat for item in .item index i add .visible to item end',
  'on click repeat 3 times add .a end',
  'on click repeat forever add .a end',
];
for (const s of srcs) {
  L(`\n${s}`);
  for (const l of langs) { try { const r = sem.translate(s, 'en', l); L(`  ${l}: ${r}`); } catch (e: any) { L(`  ${l}: REFUSED ${e.message.split('\n')[0].slice(0, 80)}`); } }
}
process.exit(0);
