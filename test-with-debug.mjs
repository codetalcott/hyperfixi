import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('Loading compound-examples.html...');

  // Enable debug mode before loading
  await page.addInitScript(() => {
    localStorage.setItem('__HYPERFIXI_DEBUG__', 'true');
    window.__HYPERFIXI_DEBUG__ = true;
  });

  await page.goto('http://localhost:3000/compound-examples.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n=== ALL CONSOLE LOGS (with debug enabled) ===');
  logs.forEach((log, i) => {
    console.log(`[${i}]${log}`);
  });

  console.log('\n=== ATTEMPTING DRAG ===');
  const titlebar = page.locator('#item1 .titlebar');
  const bbox = await titlebar.boundingBox();

  if (bbox) {
    await page.mouse.move(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(bbox.x + 100, bbox.y + 100, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
  }

  await page.waitForTimeout(500);

  console.log('\n=== POST-DRAG LOGS ===');
  const newLogs = logs.slice(logs.length - 20);
  newLogs.forEach(log => console.log(log));

  await browser.close();
})();
