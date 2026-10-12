import { translate } from '@lokascript/semantic';
const cases: Array<[string, string]> = [
  ['ru', 'on click add .x to it'], ['ru', 'on click toggle .x on it'], ['ru', 'on click put 1 into it'],
  ['pl', 'on click add .x to it'], ['pl', 'on click hide <p/> in it'], ['pl', 'on click put 1 before it'],
  ['uk', 'on click remove .x from it'], ['de', 'on click add .x to it'], ['de', 'on click toggle .x on it'], ['de', 'on click put 1 into it'],
  ['fr', 'on click add .x to it'], ['fr', 'on click put 1 into it'], ['fr', 'on click put 1 before it'], ['fr', 'on click hide <p/> in it'],
  ['hi', 'on click put 1 into it'],
  ['de', 'on click show me'], ['ru', 'on click show me'], ['pl', 'on click put me into #out'], ['uk', 'on click hide me with *opacity'],
  ['de', 'bind me to $name'], ['es', 'on click show me'],
];
for (const [l, s] of cases) {
  const out = translate(s, 'en', l);
  let back = ''; try { back = translate(out, l, 'en'); } catch (e: any) { back = 'ERR'; }
  console.log(`    ['${l}', '${s}', '${out}'],${back === s ? '' : '   // BACK: ' + back}`);
}
