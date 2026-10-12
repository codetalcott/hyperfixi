import '../../semantic/src/index';
import { tryGetProfile } from '../../semantic/src/registry';
for (const l of 'ar bn de es fr he hi id it ja ko ms pl pt qu ru sw th tl tr uk vi zh'.split(' ')) {
  const p: any = tryGetProfile(l);
  const seen = new Map<string, string[]>();
  for (const [ref, forms] of Object.entries(p.obliqueReferences ?? {}))
    for (const [marker, form] of Object.entries(forms as any)) {
      if (!marker) continue;
      for (const ph of typeof form === 'string' ? [form] : [(form as any).direction, (form as any).location]) {
        if (!ph || /\s/.test(ph)) continue;
        const k = `${ref}:${ph}`; seen.set(k, [...(seen.get(k) ?? []), marker]);
      }
    }
  for (const [k, ms] of seen) if (new Set(ms).size > 1) console.log(l, k, ms.join(' | '));
}
