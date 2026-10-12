import { tryGetProfile } from '@lokascript/semantic';
for (const l of ['ar','bn','de','es','fr','he','hi','id','it','ja','ko','ms','pl','pt','qu','ru','sw','th','tl','tr','uk','vi','zh']) {
  const p: any = tryGetProfile(l);
  console.log(l, p.wordOrder, JSON.stringify({me: p.references?.me, it: p.references?.it, you: p.references?.you, I: p.references?.I}));
}
