/*
 * M2 acceptance test for dixi.
 * Run a static server at the monorepo root, then `node test/dixi.spec.mjs`.
 */
import { chromium } from 'playwright';

const URL =
  process.env.DIXI_DEMO_URL || 'http://127.0.0.1:8765/experiments/dixi/demo/index.html';

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

const errors = [];
const requests = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');

await page.evaluate(() => {
  window.__dxEvents = [];
  document.addEventListener('dx:rewrote', e =>
    window.__dxEvents.push((e.detail.root && (e.detail.root.id || e.detail.root.tagName)) || '?')
  );
});

const grab = sel => page.evaluate(s => {
  const el = document.querySelector(s);
  return el ? Object.fromEntries([...el.attributes].map(a => [a.name, a.value])) : null;
}, sel);

const initial = {
  en: await grab('section:nth-of-type(1) button'),
  es: await grab('section[lang="es"] button'),
  ja: await grab('section[lang="ja"] button'),
  ar: await grab('section[lang="ar"] button'),
};
console.log('--- Static buttons after dixi rewrite ---');
console.log(JSON.stringify(initial, null, 2));

requests.length = 0;

const click = async (sel, fragment) => {
  await page.click(sel);
  await page.waitForTimeout(800);
  return (await page.textContent(fragment)).trim();
};

const enSwap = await click('section:nth-of-type(1) button', '#target-en');
const esSwap = await click('section[lang="es"] button', '#target-es');
const jaSwap = await click('section[lang="ja"] button', '#target-ja');
const arSwap = await click('section[lang="ar"] button', '#target-ar');

await page.click('#inject');
await page.waitForTimeout(150);
const injected = await grab('#injected button');
await page.click('#injected button');
await page.waitForTimeout(800);
const injectedSwap = (await page.textContent('#injected-target')).trim();

const dxEventsFired = await page.evaluate(() => (window.__dxEvents || []).length);

console.log('\n--- Injected button after rewrite ---');
console.log(JSON.stringify(injected, null, 2));
console.log('\n--- Network during clicks ---');
requests.filter(r => r.includes('fragments/')).forEach(r => console.log('  ' + r));
console.log('\n--- Errors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
console.log('\n--- dx:rewrote events fired:', dxEventsFired);

const checks = [
  // English regression: not rewritten, still canonical
  [() => initial.en && initial.en['fx-action'] && !initial.en['fx-acción'],
    'English canonical button was modified (regression)'],

  // Per-locale rewrite checks
  [() => initial.es && initial.es['fx-action'] && initial.es['fx-trigger'] === 'click' && !initial.es['fx-acción'],
    'Spanish localized button was NOT rewritten'],
  [() => initial.ja && initial.ja['fx-action'] && initial.ja['fx-trigger'] === 'click' && !initial.ja['fx-アクション'],
    'Japanese localized button was NOT rewritten'],
  [() => initial.ar && initial.ar['fx-action'] && initial.ar['fx-trigger'] === 'click' && !initial.ar['fx-إجراء'],
    'Arabic localized button was NOT rewritten'],

  // Network: each click should fire its expected fragment
  [() => requests.some(r => r.includes('hello.html')),     'English click did not fetch hello.html'],
  [() => requests.some(r => r.includes('hola.html')),      'Spanish click did not fetch hola.html'],
  [() => requests.some(r => r.includes('konnichiwa.html')), 'Japanese click did not fetch konnichiwa.html'],
  [() => requests.some(r => r.includes('marhaba.html')),    'Arabic click did not fetch marhaba.html'],

  // Swaps actually mutated each target
  [() => enSwap.includes('Hello'),      'English target did not swap'],
  [() => esSwap.includes('Hola'),       'Spanish target did not swap'],
  [() => jaSwap.includes('こんにちは'),    'Japanese target did not swap'],
  [() => arSwap.includes('مرحبا'),       'Arabic target did not swap'],

  // MutationObserver path still works
  [() => injected && injected['fx-action'] && !injected['fx-acción'],
    'Dynamically-injected Spanish button was NOT rewritten'],
  [() => injectedSwap.includes('Hola'),  'Injected target did not swap'],

  // Event API
  [() => dxEventsFired >= 1,             'dx:rewrote event never fired'],
  [() => errors.length === 0,            `${errors.length} runtime error(s) captured`],
];

const failures = checks.filter(([test]) => !test()).map(([, msg]) => msg);

await browser.close();

if (failures.length) {
  console.log('\n--- M2 FAIL ---');
  failures.forEach(f => console.log(' • ' + f));
  process.exit(1);
}
console.log('\n--- M2 PASS ---  4 locales × (rewrite + fetch + swap) + injection');
