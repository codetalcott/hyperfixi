const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import(process.env.SRC ? '../../semantic/src/index.ts' : '@lokascript/semantic');
const langs = sem.getSupportedLanguages().filter((l: string) => l !== 'en');
const show = new Set((process.env.SHOW ?? 'es,ja,ar,tr,de,zh').split(','));
const srcs = process.argv.slice(2).length ? process.argv.slice(2) : [
  'on click add .rey to .bar when it matches .doh',
  'on click add @rey to .bar when it matches .doh',
  'on click add .foo to #d2 when asyncCheck()',
  'on click hide <div/> in me when it matches .hideable',
  'on click remove .highlight from .item when it matches .old',
  'on click toggle .foo show when I match .foo',
  'on click toggle .foo show with opacity when I match .foo',
  'on click show <p/> in me when its innerText contains "foo"',
  "on click get 'found' show <span/> in me when the result is 'found'",
  'add .foo when I match .bar',
  'hide when I match .bar',
  'show #x when it matches .y',
];
for (const src of srcs) {
  const ok: string[] = [], refused: string[] = [], wrong: string[] = [];
  let en = ''; try { en = sem.translate(src, 'en', 'en'); } catch (e: any) { en = 'REFUSED ' + e.message.split('\n')[0]; }
  const shown: string[] = [];
  for (const l of langs) {
    let r = '';
    try { r = sem.translate(src, 'en', l); const back = sem.translate(r, l, 'en'); (back === en ? ok : wrong).push(back === en ? l : `${l}:${back}`); }
    catch (e: any) { refused.push(l); }
    if (show.has(l)) shown.push(`    ${l}: ${r || 'REFUSED'}`);
  }
  L(`\n${src}\n  en: ${en}\n  ok ${ok.length}  refused ${refused.length} [${refused.join(' ')}]  wrong ${wrong.length} ${wrong.slice(0, 4).join(' | ')}\n${shown.join('\n')}`);
}
process.exit(0);
