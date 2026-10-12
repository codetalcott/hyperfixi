const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('@lokascript/semantic');
const orig = Map.prototype.set;
let done = false;
Map.prototype.set = function (k: any, v: any) {
  if (!done && v && typeof v === 'object' && (v.raw === '100px *height' || v.value === '100px *height')) {
    done = true;
    L(new Error('here').stack!.split('\n').slice(2, 12).join('\n'));
  }
  return orig.call(this, k, v);
};
sem.parse(process.argv[2], 'en');
process.exit(0);
