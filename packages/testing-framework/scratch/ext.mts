const L = console.log; console.log = () => {};
const { readsAsOneExpression } = await import('../../semantic/src/parser/utils/value-extent.ts');
for (const s of ['100px *height', '2 * y', '2 *y', '2*y', "#a's *opacity", "#a's *opacity + 1", 'my *opacity', '"a *b" + 1', '*opacity', 'x * 2', '(x * 2)', "'*x' + y"]) L(JSON.stringify(s).padEnd(24), readsAsOneExpression(s));
process.exit(0);
