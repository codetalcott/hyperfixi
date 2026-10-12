import { translate } from '@lokascript/semantic';
const cases: Array<[string, string]> = [
  ['es', 'on click put 1 into me'], ['pt', 'on click put 1 into me'], ['it', 'on click put 1 into me'],
  ['tl', 'on click put 1 into me'], ['pl', 'on click put 1 into me'], ['ru', 'on click put 1 into me'],
  ['uk', 'on click put 1 into me'], ['de', 'on click put 1 into me'], ['hi', 'on click put 1 into me'],
  ['de', 'on click toggle .x on me'], ['ru', 'on click toggle .x on me'], ['uk', 'on click toggle .x on me'],
  ['ru', 'on click add .x to me'], ['pl', 'on click remove .x from me'], ['hi', 'on click remove .x from me'],
  ['pl', 'on click hide <p/> in me'], ['ru', 'on click hide <p/> in me'], ['de', 'on click hide <p/> in me'],
  ['de', 'on click get the first <p/> in me'], ['ru', 'on click put 1 before me'], ['uk', 'on click put 1 before me'],
  ['pl', 'on click put 1 before me'], ['pl', 'on click put 1 at end of me'], ['es', 'on click set $x to me'],
  ['de', 'on click send foo to me'], ['es', 'on click if I match .x remove .x from me end'], ['tl', 'on click remove .x from me'],
  ['tl', 'on click toggle .x on me for 2s'],
];
for (const [l, s] of cases) {
  const out = translate(s, 'en', l);
  let back = ''; try { back = translate(out, l, 'en'); } catch (e: any) { back = 'ERR'; }
  console.log(`    ['${l}', '${s}', '${out}'],${back === s ? '' : '   // BACK: ' + back}`);
}
