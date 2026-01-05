import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log(msg.text()));

  // Test the grammar transformation page
  await page.goto('http://localhost:5173/grammar-test.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  console.log('\n=== Grammar Transformation E2E Test ===\n');

  const tests = [
    { btnId: 'ja-toggle', targetId: 'ja-target', label: 'Japanese SOV' },
    { btnId: 'ko-toggle', targetId: 'ko-target', label: 'Korean SOV' },
    { btnId: 'en-btn', targetId: 'en-mixed', label: 'English (control)' },
    { btnId: 'ja-btn', targetId: 'ja-mixed', label: 'Japanese (トグル)' },
    { btnId: 'ko-btn', targetId: 'ko-mixed', label: 'Korean (토글)' },
    { btnId: 'es-btn', targetId: 'es-mixed', label: 'Spanish (alternar)' },
  ];

  let allPassed = true;

  for (const { btnId, targetId, label } of tests) {
    const btn = page.locator(`#${btnId}`);
    const target = page.locator(`#${targetId}`);

    const hadBefore = await target.evaluate(el => el.classList.contains('active'));
    await btn.click();
    await page.waitForTimeout(100);
    const hasAfter = await target.evaluate(el => el.classList.contains('active'));

    const passed = hadBefore !== hasAfter;
    console.log(`${label}: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) allPassed = false;
  }

  await browser.close();

  console.log('\n=== Results ===');
  console.log(`All tests passed: ${allPassed}`);

  process.exit(allPassed ? 0 : 1);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
