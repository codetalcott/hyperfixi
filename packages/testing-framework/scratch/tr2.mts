const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('@lokascript/semantic');
const src = process.argv[2];
for (const l of process.argv.slice(3)) {
  const r = sem.translate(src, 'en', l, { lossy: 'allow' });
  const n = sem.parse(r, l);
  const c = n?.body?.[0] ?? n;
  L(`${l}: ${r}\n    roles: ${JSON.stringify([...(c?.roles ?? new Map())].map(([k, v]: any) => [k, v.type, v.value ?? v.raw ?? JSON.stringify(v).slice(0, 60)]))} clause: ${c?.verbatimClause ?? '-'}\n    back: ${sem.render(n, 'en')}`);
}
process.exit(0);
