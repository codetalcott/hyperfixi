import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
const requests = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', msg => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });
page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

await page.goto('http://127.0.0.1:8765/experiments/fixi-spike/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');

const checks = await page.evaluate(() => {
  const out = [];
  const buttons = document.querySelectorAll('button[fx-action]');
  for (const b of buttons) {
    const attrs = Object.fromEntries([...b.attributes].map(a => [a.name, a.value]));
    out.push({
      label: b.textContent.trim(),
      action: attrs['fx-action'],
      method: attrs['fx-method'],
      trigger: attrs['fx-trigger'],
      target: attrs['fx-target'],
      swap: attrs['fx-swap'],
      hasLocalizedAttrs: [...b.attributes].some(a => /[áéíóúñ]|[　-ヿ]|[一-鿿]|[؀-ۿ]/.test(a.name)),
    });
  }
  return out;
});

console.log('--- Static buttons after rewrite ---');
console.log(JSON.stringify(checks, null, 2));

const generated = await page.evaluate(() => {
  return [...document.querySelectorAll('button[fx-action]')].map(b => ({
    label: b.textContent.trim(),
    hasGenerated: b.hasAttribute('data-fx-generated'),
    generated: b.getAttribute('data-fx-generated'),
  }));
});
console.log('\n--- hyperfixi-hx processing state on static buttons ---');
console.log(JSON.stringify(generated, null, 2));

requests.length = 0;

// Click the Spanish button and verify the fragment swaps in.
await page.click('button[fx-action="./fragments/es.html"]:not([id])');
await page.waitForTimeout(800);
const esText = await page.textContent('#target-es');
console.log('\nES target after click:', JSON.stringify(esText));

// Click Japanese
await page.click('button[fx-action="./fragments/ja.html"]');
await page.waitForTimeout(800);
const jaText = await page.textContent('#target-ja');
console.log('JA target after click:', JSON.stringify(jaText));

// Click Arabic
await page.click('button[fx-action="./fragments/ar.html"]');
await page.waitForTimeout(800);
const arText = await page.textContent('#target-ar');
console.log('AR target after click:', JSON.stringify(arText));

// Inject + click — MutationObserver path
await page.click('#inject');
await page.waitForTimeout(200);
const injected = await page.evaluate(() => {
  const b = document.querySelector('#injected button');
  return Object.fromEntries([...b.attributes].map(a => [a.name, a.value]));
});
console.log('\nInjected button after rewrite:', JSON.stringify(injected, null, 2));
await page.click('#injected button');
await page.waitForTimeout(800);
const injectedTarget = await page.textContent('#injected-target');
console.log('Injected target after click:', JSON.stringify(injectedTarget));

console.log('\n--- Network requests during clicks ---');
console.log(requests.length ? requests.join('\n') : '(none)');

console.log('\n--- Errors captured ---');
console.log(errors.length ? errors.join('\n') : '(none)');

await browser.close();
