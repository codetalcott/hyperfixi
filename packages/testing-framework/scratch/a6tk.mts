import '../../semantic/src/index';
import { tokenize } from '../../semantic/src/tokenizers/index';
import { getSchema } from '../../semantic/src/generators/command-schemas';
const goal: any = (getSchema('toggle' as any) as any).roles.find((r: any) => r.role === 'goal');
for (const l of (process.argv[2] ?? 'ar bn de es fr he hi id it ja ko ms pl pt qu ru sw th tl tr uk vi zh').split(' ')) {
  const w = process.argv[3] ?? goal.markerOverride[l];
  const ts: any = tokenize(`.foo ${w} .bar`, l);
  console.log(l, w, '→', ts.tokens.map((t: any) => `${t.value}:${t.kind}${t.normalized ? '=' + t.normalized : ''}`).join('  '));
}
