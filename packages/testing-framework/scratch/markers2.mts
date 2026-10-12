import { tryGetProfile } from '@lokascript/semantic';
for (const l of ['es','pt','it','hi','tl']) {
  const p: any = tryGetProfile(l);
  console.log(l, p.markingStrategy, Object.entries(p.roleMarkers).map(([r, t]: any) => `${r}=${[t.primary, ...(t.alternatives ?? [])].join('/')}`).join('  '));
}
