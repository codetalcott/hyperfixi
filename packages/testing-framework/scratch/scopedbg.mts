import { parse, semanticRenderer, translate } from '../../semantic/src/index';
import { readAlike, readsAs } from '../../semantic/src/name-collisions';
const s = 'on click if target matches <button/> in me then log 1 end';
const node = parse(s, 'en')!;
for (const l of ['bn', 'tr']) {
  for (const kinds of [[], ['scope'], ['case'], ['value'], ['case', 'scope']] as any[]) {
    const t = semanticRenderer.renderPlainWords(() => semanticRenderer.render(node, l), kinds);
    let b; try { b = translate(t, l, 'en'); } catch (e: any) { b = 'REFUSED'; }
    console.log(l, JSON.stringify(kinds), '|', t, '|', b, '| readsAs', readsAs(t, l, node));
  }
  console.log(l, 'final:', translate(s, 'en', l));
}
