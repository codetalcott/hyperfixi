const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const reg: any = await import('../../semantic/src/registry.ts');
for (const l of sem.getSupportedLanguages()) {
  const prof = reg.getProfile(l);
  const k = prof?.keywords ?? {};
  const f = (x: any) => x ? [x.primary, ...(x.alternatives ?? [])].join('/') : '-';
  const m = (r: string) => { const x = prof.roleMarkers?.[r]; return x ? `${x.primary}${x.alternatives ? '/' + x.alternatives.join('/') : ''}(${x.position})` : '-'; };
  L(l.padEnd(3), (prof?.wordOrder ?? '').padEnd(3), 'when=', f(k.when).padEnd(22), 'on=', f(k.on).padEnd(18), 'if=', f(k.if).padEnd(14), 'evh=', JSON.stringify(prof?.eventHandler ?? {}).slice(0, 140));
}
process.exit(0);
