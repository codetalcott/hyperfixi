const L = console.log; console.log = () => {};
const s: any = await import('../../semantic/src/index.ts');
for (const l of process.argv.slice(2)) { const p = s.tryGetProfile(l); L(l, JSON.stringify(p.roleMarkers?.event), JSON.stringify(p.keywords?.on), JSON.stringify(p.roleMarkers?.destination)); }
process.exit(0);
