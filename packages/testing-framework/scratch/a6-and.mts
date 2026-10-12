import { translate } from '@lokascript/semantic';
const shapes = ['on click if $a and $b log 1 end', 'on click set $x to $a and $b', "on click log 'a', 'b'", "on click set $x to [1, 2]"];
for (const s of shapes) { console.log('##', s);
  for (const l of 'ar de es fr he ja ko qu tr zh hi'.split(' ')) { let o; try { o = translate(s, 'en', l); } catch (e: any) { o = 'REFUSED'; } console.log('  ', l, o); } }
