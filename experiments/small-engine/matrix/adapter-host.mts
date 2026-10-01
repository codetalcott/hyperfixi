// The multilingual adapter's plugin on the new engine, end to end, beside upstream.
//
// On upstream the plugin has to rewrite the attribute to English before the engine reads
// it. This engine offers `addSourceTransform`, and the plugin uses it when it is there: the
// script is translated as it is read, and the element keeps what its author wrote.
//
//   npx tsx experiments/small-engine/matrix/adapter-host.mts
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { installGlobals } from '../../../packages/testing-framework/src/multilingual/shipped-examples-execution';

const here = dirname(fileURLToPath(import.meta.url));
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
installGlobals(dom);
Reflect.set(globalThis, 'EventTarget', dom.window.EventTarget);
const document = dom.window.document;

const log = console.log;
const reported: string[] = [];
console.warn = console.info = () => {};
console.error = (...parts: unknown[]) => void reported.push(parts.map(String).join(' '));

const { parseSemantic, render } = await import('@lokascript/semantic');
const { hyperscriptI18n } = await import('../../../packages/hyperscript-adapter/src/index');
const require = createRequire(
  pathToFileURL(join(here, '../../../packages/testing-framework/package.json'))
);
const esm = require.resolve('hyperscript.org').replace(/[^/\\]+$/, '_hyperscript.esm.js');
const upstream = (await import(pathToFileURL(esm).href)).default;
await import('../src/bundles/spike');
const engine = (await import('../src/engine')).api;

let failures = 0;
function check(what: string, ok: boolean, detail = ''): void {
  if (!ok) failures++;
  log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok || !detail ? '' : `  (${detail})`}`);
}
const click = (elt: Element): boolean =>
  elt.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

// The engine's hook on its own: an error in a rewritten script names what was written.
engine.addSourceTransform(source => (source === 'pulsar' ? 'on click toggle' : null));
document.body.innerHTML = '<button _="pulsar"></button>';
let written: unknown;
document.body.addEventListener('hyperscript:parse-error', event => {
  // Like upstream, the engine dispatches a plain Event that carries a `detail`.
  const errors: unknown = Reflect.get(Object(Reflect.get(event, 'detail')), 'errors');
  written = Array.isArray(errors) ? Reflect.get(Object(errors[0]), 'written') : undefined;
});
engine.processNode(document.body);
check('a parse error in a rewritten script carries the written text', written === 'pulsar');
check(
  'and the console report names it',
  reported.some(line => line.includes('rewritten from: pulsar'))
);

// The shipped plugin on both hosts.
engine.use(hyperscriptI18n());
upstream.use(hyperscriptI18n());

const english = 'on click toggle .active';
const node = parseSemantic(english, 'en').node;
if (!node) throw new Error('semantic did not parse the English source');

for (const language of ['es', 'ja', 'ar', 'ko', 'tr', 'de']) {
  const written = render(node, language);
  for (const [name, host] of [
    ['new engine', engine],
    ['upstream', upstream],
  ] as const) {
    document.body.innerHTML = `<button lang="${language}"></button>`;
    const button = document.body.firstElementChild;
    if (!button) throw new Error('no button');
    button.setAttribute('_', written);
    host.processNode(document.body);
    click(button);
    const toggled = button.classList.contains('active');
    // Processing again must not install a second handler.
    host.processNode(document.body);
    click(button);
    const once = !button.classList.contains('active');
    const kept = button.getAttribute('_') === written;
    check(`${language} on ${name}: runs`, toggled && once, written);
    if (host === engine) check(`${language} on ${name}: the attribute is as written`, kept);
    else check(`${language} on ${name}: the attribute was rewritten (as before)`, !kept);
  }
}

log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
