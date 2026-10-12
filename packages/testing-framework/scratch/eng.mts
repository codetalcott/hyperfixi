const engine: any = await import('@hyperfixi/engine');
engine.register(...engine.everything);
const plain = (v: any, seen = new WeakSet()): any => { if (typeof v === 'function') return undefined; if (!v || typeof v !== 'object') return v; if (seen.has(v)) return '<c>'; seen.add(v); if (Array.isArray(v)) return v.map(x => plain(x, seen)); const o: any = {}; for (const [k, x] of Object.entries(v)) { if (['start','end','line','column','displayName'].includes(k)) continue; const w = plain(x, seen); if (w !== undefined) o[k] = w; } return o; };
for (const s of ['set x to 2 *y', 'set x to 2 * y', 'set x to 2*y', 'transition *width to 100px *height to 5px', 'put 3 *opacity into me']) {
  try { const p = engine.parse(s); console.log(s, '=>', JSON.stringify(plain(p)).replace(/"type":/g, '').slice(0, 260)); } catch (e: any) { console.log(s, 'ERR', e.message.slice(0, 80)); }
}
process.exit(0);
