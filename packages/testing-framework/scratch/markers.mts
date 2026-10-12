import { tryGetProfile } from '@lokascript/semantic';
for (const l of ['ru','uk','pl','de','fr','pt','tl','ar','tr','hi']) {
  const p: any = tryGetProfile(l);
  console.log(l, Object.entries(p.roleMarkers).map(([r, t]: any) => `${r}=${[t.primary, ...(t.alternatives ?? [])].join('/')}`).join('  '));
}
