// Run English sources on upstream and on the new engine, side by side, on the matrix's fixture.
//   npx tsx experiments/small-engine/matrix/probe.mts '<source>' ['<source>' …]
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { installGlobals } from '../../../packages/testing-framework/src/multilingual/shipped-examples-execution';
import {
  FIXTURE,
  GLOBALS,
} from '../../../packages/testing-framework/src/multilingual/value-matrix';

const here = dirname(fileURLToPath(import.meta.url));
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
installGlobals(dom);
Reflect.set(globalThis, 'EventTarget', dom.window.EventTarget);
const errors: string[] = [];
const log = console.log;
console.error = (...a: unknown[]) => void errors.push(a.map(String).join(' ').split('\n')[0]);

interface Host {
  parse(source: string): { errors?: Array<{ message: string }> } | undefined;
  processNode(element: Element): void;
}
const require = createRequire(
  pathToFileURL(join(here, '../../../packages/testing-framework/package.json'))
);
const esm = require.resolve('hyperscript.org').replace(/[^/\\]+$/, '_hyperscript.esm.js');
const upstream: Host = (await import(pathToFileURL(esm).href)).default;
await import('../src/bundles/spike');
const engine: Host = (await import('../src/engine')).api;
const document = dom.window.document;

function run(host: Host, source: string): string {
  const bad = host.parse(source)?.errors ?? [];
  if (bad.length) return `✗parse: ${bad[0]?.message.split('\n')[0]}`;
  document.body.innerHTML = FIXTURE;
  for (const [name, make] of Object.entries(GLOBALS)) {
    Reflect.set(dom.window, name, make());
    Reflect.set(globalThis, name, Reflect.get(dom.window, name));
  }
  const button = document.getElementById('b');
  if (!button) return '✗no #b';
  button.setAttribute('_', source);
  errors.length = 0;
  host.processNode(button);
  button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const out = document.getElementById('out')?.textContent ?? '✗no #out';
  return JSON.stringify(out) + (errors.length ? `  (error: ${errors[0]?.slice(0, 90)})` : '');
}

for (const source of process.argv.slice(2)) {
  log(source);
  log('   upstream  ', run(upstream, source));
  log('   new engine', run(engine, source));
}
process.exit(0);
