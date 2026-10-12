import { tryGetProfile as getProfile } from '@lokascript/semantic';
for (const l of 'ar bn de en es fr he hi id it ja ko ms pl pt qu ru sw th tl tr uk vi zh'.split(' ')) {
  const p: any = getProfile(l);
  console.log(l, p.wordOrder, JSON.stringify(p.roleMarkers?.goal), JSON.stringify(p.roleMarkers?.patient), 'and:', JSON.stringify(p.keywords?.and));
}
