import { parse, render } from '../../semantic/src/index';
import { semanticRenderer } from '../../semantic/src/explicit/renderer';
import { readsAs } from '../../semantic/src/name-collisions';
const [src, lang] = process.argv.slice(2);
const node: any = parse(src, 'en');
const raw = semanticRenderer.render(node, lang);
console.log('raw   :', raw, semanticRenderer.takeNativeWords());
console.log('reads :', readsAs(raw, lang, node));
console.log('verif :', render(node, lang));
import { parseWithConfidence } from '../../semantic/src/index';
const nomi = semanticRenderer.renderPlainWords(() => semanticRenderer.render(node, lang), ['case']);
for (const t of [raw, nomi]) {
  const back: any = parseWithConfidence(t, lang).node;
  console.log('---', t);
  console.log(JSON.stringify(back, (k, v) => (k === 'sourceSpan' || k === 'span' ? undefined : v instanceof Map ? Object.fromEntries(v) : v)).slice(0, 1500));
}
console.log('NODE', JSON.stringify(node, (k, v) => v instanceof Map ? Object.fromEntries(v) : v).slice(0, 1500));
