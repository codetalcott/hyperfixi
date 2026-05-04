/*
 * dixi acceptance test — runs against http-server at the monorepo root.
 *
 *   npx http-server . -p 8765 -c-1 -s &
 *   node experiments/dixi/test/dixi.spec.mjs
 *
 * Phase A: M2 button demo (Latin/CJK/RTL, rewrite + fetch + swap, injection).
 * Phase B: M2.5 search demo per-locale (search filter, sidebar toggle via moxi,
 *          fx-* doc loading, and on-* rewriting).
 */
import { chromium } from 'playwright';

const BASE = process.env.DIXI_BASE_URL || 'http://127.0.0.1:8765';
const BUTTON_DEMO = `${BASE}/experiments/dixi/demo/index.html`;
const SEARCH_DEMO = locale => `${BASE}/experiments/dixi/demo/search/index.${locale}.html`;

const browser = await chromium.launch();
const failures = [];
const log = msg => console.log(msg);

const grab = (page, sel) =>
  page.evaluate(s => {
    const el = document.querySelector(s);
    return el ? Object.fromEntries([...el.attributes].map(a => [a.name, a.value])) : null;
  }, sel);

// ---------------------------------------------------------------------------
// Phase A — M2 button demo
// ---------------------------------------------------------------------------
async function phaseA() {
  log('\n=== Phase A: M2 button demo ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

  await page.goto(BUTTON_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    window.__dxEvents = [];
    document.addEventListener('dx:rewrote', () => window.__dxEvents.push(1));
  });

  const initial = {
    en: await grab(page, 'section:nth-of-type(1) button'),
    es: await grab(page, 'section[lang="es"] button'),
    ja: await grab(page, 'section[lang="ja"] button'),
    ar: await grab(page, 'section[lang="ar"] button'),
  };

  requests.length = 0;
  const clickAndRead = async (sel, target) => {
    await page.click(sel);
    await page.waitForTimeout(800);
    return (await page.textContent(target)).trim();
  };

  const enSwap = await clickAndRead('section:nth-of-type(1) button', '#target-en');
  const esSwap = await clickAndRead('section[lang="es"] button', '#target-es');
  const jaSwap = await clickAndRead('section[lang="ja"] button', '#target-ja');
  const arSwap = await clickAndRead('section[lang="ar"] button', '#target-ar');

  await page.click('#inject');
  await page.waitForTimeout(150);
  const injected = await grab(page, '#injected button');
  await page.click('#injected button');
  await page.waitForTimeout(800);
  const injectedSwap = (await page.textContent('#injected-target')).trim();
  const dxEventsFired = await page.evaluate(() => (window.__dxEvents || []).length);

  const checks = [
    [() => initial.en && initial.en['fx-action'] && !initial.en['fx-acción'], 'A: English canonical button modified (regression)'],
    [() => initial.es && initial.es['fx-action'] && initial.es['fx-trigger'] === 'click' && !initial.es['fx-acción'], 'A: Spanish button not rewritten'],
    [() => initial.ja && initial.ja['fx-action'] && initial.ja['fx-trigger'] === 'click' && !initial.ja['fx-アクション'], 'A: Japanese button not rewritten'],
    [() => initial.ar && initial.ar['fx-action'] && initial.ar['fx-trigger'] === 'click' && !initial.ar['fx-إجراء'], 'A: Arabic button not rewritten'],
    [() => requests.some(r => r.includes('hello.html')), 'A: English fetch missed'],
    [() => requests.some(r => r.includes('hola.html')), 'A: Spanish fetch missed'],
    [() => requests.some(r => r.includes('konnichiwa.html')), 'A: Japanese fetch missed'],
    [() => requests.some(r => r.includes('marhaba.html')), 'A: Arabic fetch missed'],
    [() => enSwap.includes('Hello'), 'A: English swap missed'],
    [() => esSwap.includes('Hola'), 'A: Spanish swap missed'],
    [() => jaSwap.includes('こんにちは'), 'A: Japanese swap missed'],
    [() => arSwap.includes('مرحبا'), 'A: Arabic swap missed'],
    [() => injected && injected['fx-action'] && !injected['fx-acción'], 'A: Injected button not rewritten'],
    [() => injectedSwap.includes('Hola'), 'A: Injected swap missed'],
    [() => dxEventsFired >= 1, 'A: dx:rewrote never fired'],
    [() => errors.length === 0, `A: ${errors.length} runtime errors`],
  ];
  for (const [t, msg] of checks) if (!t()) failures.push(msg);
  log(`  ${checks.length - failures.filter(f => f.startsWith('A:')).length}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Phase B — M2.5 search demo, per locale
// ---------------------------------------------------------------------------
async function phaseB(locale) {
  log(`\n=== Phase B: search demo (${locale}) ===`);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`${locale} pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${locale} console.error: ${m.text()}`); });

  await page.goto(SEARCH_DEMO(locale), { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Post-rewrite: every locale's elements should have CANONICAL attributes.
  const toggleAttrs = await grab(page, 'header .toggle');
  const inputAttrs = await grab(page, '.search input');
  const firstItemAttrs = await grab(page, '.doc-item:first-child button');
  const itemCount = await page.locator('.doc-item').count();

  // Search filter: typing 'v2' should leave only 1 item visible (API v2).
  await page.fill('.search input', 'v2');
  await page.waitForTimeout(150);
  const visibleAfterFilter = await page.locator('.doc-item:not([hidden])').count();

  // Clear search → all 8 visible again.
  await page.fill('.search input', '');
  await page.waitForTimeout(150);
  const visibleAfterClear = await page.locator('.doc-item:not([hidden])').count();

  // Sidebar toggle: clicking adds class, clicking again removes it.
  await page.click('header .toggle');
  await page.waitForTimeout(150);
  const collapsedAfter1 = await page.evaluate(() => document.body.classList.contains('sidebar-collapsed'));
  await page.click('header .toggle');
  await page.waitForTimeout(150);
  const collapsedAfter2 = await page.evaluate(() => document.body.classList.contains('sidebar-collapsed'));

  // Click the 4th item (API v2 in all locales) → fragment swaps in.
  await page.click('.doc-item:nth-child(4) button');
  await page.waitForTimeout(800);
  const contentText = (await page.textContent('#content')).trim();

  const tag = `B[${locale}]:`;
  const checks = [
    [() => itemCount === 8, `${tag} expected 8 doc-list items, got ${itemCount}`],
    [() => toggleAttrs && toggleAttrs['on-click'] !== undefined, `${tag} toggle button missing on-click after rewrite`],
    [() => inputAttrs && inputAttrs['on-input'] !== undefined, `${tag} search input missing on-input after rewrite`],
    [() => firstItemAttrs && firstItemAttrs['fx-action'] && firstItemAttrs['fx-target'] === '#content', `${tag} first doc item missing canonical fx-* after rewrite`],
    [() => visibleAfterFilter === 1, `${tag} search 'v2' should show 1 item, got ${visibleAfterFilter}`],
    [() => visibleAfterClear === 8, `${tag} clearing search should show 8 items, got ${visibleAfterClear}`],
    [() => collapsedAfter1 === true, `${tag} sidebar toggle did not add 'sidebar-collapsed' class`],
    [() => collapsedAfter2 === false, `${tag} sidebar toggle did not remove 'sidebar-collapsed' class on 2nd click`],
    [() => contentText.includes('API v2 reference'), `${tag} clicking API v2 did not load fragment ('${contentText.slice(0, 60)}...')`],
    [() => errors.length === 0, `${tag} ${errors.length} runtime errors`],
  ];
  for (const [t, msg] of checks) if (!t()) failures.push(msg);
  const passed = checks.filter(([t]) => t()).length;
  log(`  ${passed}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Run both phases
// ---------------------------------------------------------------------------
await phaseA();
for (const locale of ['en', 'es', 'ja', 'ar']) await phaseB(locale);
await browser.close();

if (failures.length) {
  log('\n--- FAIL ---');
  failures.forEach(f => log(' • ' + f));
  process.exit(1);
}
log('\n--- PASS ---  M2 button demo + M2.5 search demo × 4 locales');
