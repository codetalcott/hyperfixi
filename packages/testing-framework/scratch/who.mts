const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('@lokascript/semantic');
const P = (process.env.CLS === "parser" ? sem.SemanticParserImpl : sem.PatternMatcher).prototype;
for (const name of Object.getOwnPropertyNames(P)) {
  const f = P[name];
  if (typeof f !== 'function' || name === 'constructor') continue;
  P[name] = function (...args: any[]) {
    const r = f.apply(this, args);
    const s = r && typeof r === 'object' ? JSON.stringify(r instanceof Map ? Object.fromEntries(r) : r) : '';
    if (s && s.includes('100px *height')) L(name, s.length);
    return r;
  };
}
sem.parse(process.argv[2], 'en');
process.exit(0);
