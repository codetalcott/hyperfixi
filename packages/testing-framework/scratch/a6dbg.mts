import { parse, render, parseWithConfidence } from '../../semantic/src/index';
import { semanticRenderer } from '../../semantic/src/explicit/renderer';
const [src, lang = 'en', langs] = process.argv.slice(2);
const j = (n: any) => JSON.stringify(n, (k, v) => (k === 'position' || k === 'sourceSpan' || k === 'span' ? undefined : v instanceof Map ? Object.fromEntries(v) : v));
const r: any = parseWithConfidence(src, lang);
console.log('NODE', j(r.node).slice(0, 2000));
console.log('conf', r.confidence);
for (const l of (langs ?? '').split(' ').filter(Boolean)) {
  let raw = ''; try { raw = semanticRenderer.render(r.node, l); } catch (e: any) { raw = 'ERR ' + e.message; }
  let v = ''; try { v = render(r.node, l); } catch (e: any) { v = 'ERR ' + e.message.slice(0, 200); }
  console.log(l, 'raw:', raw, '\n   verified:', v);
}
