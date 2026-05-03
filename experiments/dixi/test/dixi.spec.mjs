/*
 * M1 regression + smoke test for dixi.
 * Run a static server at the monorepo root, then `node test/dixi.spec.mjs`.
 */
import { chromium } from 'playwright';

const URL = process.env.DIXI_DEMO_URL
  || 'http://127.0.0.1:8765/experiments/dixi/demo/index.html';

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

const errors = [];
const events = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');

await page.evaluate(() => {
  document.addEventListener('dx:rewrote', e => {
    window.__dxEvents = window.__dxEvents || [];
    window.__dxEvents.push(e.detail.root && e.detail.root.id || e.detail.root && e.detail.root.tagName || '?');
  });
});

const initial = await page.evaluate(() => {
  const grab = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return Object.fromEntries([...el.attributes].map(a => [a.name, a.value]));
  };
  return {
    en: grab('section:nth-of-type(1) button'),
    es: grab('section[lang="es"] button'),
  };
});

console.log('--- Static buttons after dixi ---');
console.log(JSON.stringify(initial, null, 2));

const enHasCanonical = initial.en && initial.en['fx-action'] && !initial.en['fx-acción'];
const esRewritten = initial.es
  && initial.es['fx-action']
  && initial.es['fx-trigger'] === 'click'
  && !initial.es['fx-acción']
  && !initial.es['fx-disparador'];

const requests = [];
page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

await page.click('section:nth-of-type(1) button');
await page.waitForTimeout(800);
const enSwap = (await page.textContent('#target-en')).trim();
await page.click('section[lang="es"] button');
await page.waitForTimeout(800);
const esSwap = (await page.textContent('#target-es')).trim();

await page.click('#inject');
await page.waitForTimeout(150);
const injected = await page.evaluate(() => {
  const b = document.querySelector('#injected button');
  return b ? Object.fromEntries([...b.attributes].map(a => [a.name, a.value])) : null;
});
const injectedRewritten = injected
  && injected['fx-action']
  && injected['fx-trigger'] === 'click'
  && !injected['fx-acción'];
await page.click('#injected button');
await page.waitForTimeout(800);
const injectedSwap = (await page.textContent('#injected-target')).trim();

const dxEventsFired = await page.evaluate(() => (window.__dxEvents || []).length);

console.log('\n--- Injected button after rewrite ---');
console.log(JSON.stringify(injected, null, 2));
console.log('\n--- Network during clicks ---');
console.log(requests.length ? requests.join('\n') : '(none)');
console.log('\n--- Errors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
console.log('\n--- dx:rewrote events fired:', dxEventsFired);

const failures = [];
if (!enHasCanonical) failures.push('English canonical button was modified by dixi (regression)');
if (!esRewritten) failures.push('Spanish localized button was NOT rewritten');
if (!injectedRewritten) failures.push('Dynamically-injected Spanish button was NOT rewritten');
if (!requests.some(r => r.includes('hello.html'))) failures.push('English click did not fetch hello.html');
if (!requests.some(r => r.includes('hola.html'))) failures.push('Spanish click did not fetch hola.html');
if (!enSwap.includes('Hello')) failures.push('English target did not swap in fetched fragment');
if (!esSwap.includes('Hola')) failures.push('Spanish target did not swap in fetched fragment');
if (!injectedSwap.includes('Hola')) failures.push('Injected target did not swap in fetched fragment');
if (errors.length) failures.push(`${errors.length} runtime error(s)`);
if (dxEventsFired < 1) failures.push('dx:rewrote event never fired');

await browser.close();

if (failures.length) {
  console.log('\n--- M1 FAIL ---');
  failures.forEach(f => console.log(' • ' + f));
  process.exit(1);
}
console.log('\n--- M1 PASS ---');
