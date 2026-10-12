const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
for (const [s, l] of [['add .x to .item', 'en'], ['remove .x from .item', 'en'], ['hide .item', 'en'], ['show .item', 'en'], ['agregar .x a .item', 'es'], ['.item に .x を 追加', 'ja'], ['zeige #x', 'de'], ['add .x to .item when it matches .y', 'en']]) {
  const r = sem.parseWithConfidence(s, l); L(l, s, r.confidence);
}
process.exit(0);
