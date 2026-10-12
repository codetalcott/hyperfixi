import { tryGetProfile, commandSchemas } from '../../semantic/src/index';
for (const l of ['ja','ko','bn','tr','qu']) {
  const p: any = tryGetProfile(l);
  const set = new Map<string,string[]>();
  const add = (w: string, why: string) => { if (!w) return; (set.get(w) ?? set.set(w, []).get(w)!).push(why); };
  for (const [role, m] of Object.entries<any>(p.roleMarkers ?? {})) { add(m.primary, role); for (const a of m.alternatives ?? []) add(a, role + '*'); }
  for (const [cmd, s] of Object.entries<any>(commandSchemas)) for (const r of s.roles ?? []) { const o = r.markerOverride?.[l]; if (o) add(o, cmd + '.' + r.role); for (const v of r.markerVariants?.[l] ?? []) add(v, cmd + '.' + r.role + '~'); }
  console.log(l, [...set.entries()].map(([w, why]) => `${w}(${[...new Set(why)].slice(0,4).join(',')})`).join('  '));
}
