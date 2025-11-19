import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('Loading compound-examples.html...');
  await page.goto('http://localhost:3000/compound-examples.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('\n=== MANUALLY CALLING processNode ===');
  const result = await page.evaluate(() => {
    if (typeof hyperfixi === 'undefined') {
      return { error: 'hyperfixi not loaded' };
    }

    // Manually process the document
    if (hyperfixi.processNode) {
      hyperfixi.processNode(document);
    }

    return { processed: true };
  });

  console.log(JSON.stringify(result, null, 2));

  await page.waitForTimeout(2000);

  console.log('\n=== LOGS AFTER processNode ===');
  logs.forEach(log => {
    if (log.includes('SCRIPT') || log.includes('behavior') || log.includes('Draggable')) {
      console.log(log);
    }
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

  console.log('\n=== DRAG RESULT ===');
  const finalLogs = logs.filter(l => l.includes('trigger'));
  console.log(`Trigger events: ${finalLogs.length}`);
  if (finalLogs.length > 0) {
    finalLogs.slice(0, 3).forEach(l => console.log(l));
  }

  await browser.close();
})();
