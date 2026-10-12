import { tryGetProfile } from '@lokascript/semantic';
const [l, ...ks] = process.argv.slice(2);
const p: any = tryGetProfile(l);
for (const k of ks) console.log(k, JSON.stringify(p.keywords[k]));
