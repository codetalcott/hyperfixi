import { parse, render, parseWithConfidence, translate } from '../../semantic/src/index';
import { semanticRenderer } from '../../semantic/src/explicit/renderer';
const [src, langs] = process.argv.slice(2);
const j = (n: any) => JSON.stringify(n, (k, v) => (k === 'position' || k === 'diagnostics' || k === 'metadata' ? undefined : v instanceof Map ? Object.fromEntries(v) : v));
const node: any = parse(src, 'en');
console.log('EN ', j(node).slice(0, 600));
for (const l of langs.split(' ')) {
  const raw = semanticRenderer.render(node, l);
  console.log(`--- ${l} raw: ${raw}`);
  const back: any = parseWithConfidence(raw, l);
  console.log('   back:', j(back.node).slice(0, 700));
  try { console.log('   back en:', semanticRenderer.render(back.node, 'en')); } catch (e: any) { console.log('   back en ERR', e.message); }
  const d = (back.node?.diagnostics ?? []).concat(...(back.node?.body ?? []).map((b: any) => b.diagnostics ?? [])).filter((x: any) => x.severity !== 'info');
  if (d.length) console.log('   diag:', d.map((x: any) => x.message).join(' | ').slice(0, 400));
}
