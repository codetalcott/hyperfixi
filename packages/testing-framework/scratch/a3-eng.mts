const L = console.log;
const engine: any = await import('@hyperfixi/engine');
engine.register(...engine.everything);
const strip = (n: any, d = 0): any => {
  if (!n || typeof n !== 'object' || d > 8) return n;
  if (Array.isArray(n)) return n.map(x => strip(x, d + 1));
  const out: any = {};
  for (const [k, v] of Object.entries(n)) {
    if (['parent', 'startToken', 'endToken', 'programSource', 'sourceFor', 'lineFor', 'next', 'tokens', 'op', 'evaluate', 'resolveNext', 'execute'].includes(k)) continue;
    if (typeof v === 'function') continue;
    out[k] = strip(v, d + 1);
  }
  return out;
};
for (const src of process.argv.slice(2)) {
  try { L(src, '\n', JSON.stringify(strip(engine.parse(src)), null, 0).slice(0, 900)); } catch (e) { L(src, 'ERR', (e as Error).message); }
}
process.exit(0);
