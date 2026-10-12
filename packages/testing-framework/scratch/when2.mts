const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import(process.env.SRC ? '../../semantic/src/index.ts' : '@lokascript/semantic');
const langs = sem.getSupportedLanguages().filter((l: string) => l !== 'en');
const base = [
  'add .x to .item when it matches .y',
  'add @x to .item when it matches .y',
  'add .x when I match .y',
  'remove .x from .item when it matches .y',
  'remove .x when it matches .y',
  'hide .item when it matches .y',
  'hide when I match .y',
  'show .item when its innerText contains "foo"',
  'show me with opacity when it matches .y',
  'hide .item with opacity when it matches .y',
  'add .foo to #d2 when asyncCheck()',
  'show .item when the result is "found"',
];
const srcs = [...base, ...base.map(s => `on click ${s}`), 'on click add .x to .item when it matches .y then log 1', 'on click hide .item when it matches .y then show #z'];
let tot = { ok: 0, refused: 0, wrong: 0 };
for (const src of srcs) {
  const ok: string[] = [], refused: string[] = [], wrong: string[] = [];
  let en = ''; try { en = sem.translate(src, 'en', 'en'); } catch (e: any) { en = 'REFUSED ' + e.message.split('\n')[0]; }
  for (const l of langs) {
    try { const r = sem.translate(src, 'en', l); const back = sem.translate(r, l, 'en'); (back === en ? ok : wrong).push(back === en ? l : `${l}:${back}`); }
    catch (e: any) { refused.push(l); }
  }
  tot.ok += ok.length; tot.refused += refused.length; tot.wrong += wrong.length;
  if (refused.length || wrong.length || en !== src) L(`${src}\n  en: ${en}\n  ok ${ok.length}  refused ${refused.length} [${refused.join(' ')}]  wrong ${wrong.length} ${wrong.join(' | ')}`);
}
L(JSON.stringify(tot));
process.exit(0);
