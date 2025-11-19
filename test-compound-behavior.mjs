import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('trigger') || text.includes('Draggable') || text.includes('behavior')) {
      logs.push(text);
    }
  });

  console.log('Loading compound-examples.html...');
  await page.goto('http://localhost:3000/compound-examples.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n=== COMPOUND-EXAMPLES.HTML CONSOLE LOGS ===');
  if (logs.length > 0) {
    console.log(logs.join('\n'));
  } else {
    console.log('(no trigger/behavior logs)');
  }

  console.log('\n=== CHECKING BEHAVIOR INSTALLATION ===');

  const result = await page.evaluate(() => {
    const item1 = document.querySelector('#item1');
    return {
      hasElement: !!item1,
      hasAttr: item1 ? item1.hasAttribute('_') : false,
      attrContent: item1 ? item1.getAttribute('_')?.substring(0, 50) : null,
      hyperfixiLoaded: typeof hyperfixi !== 'undefined',
      hasBehaviors: typeof hyperfixi !== 'undefined' && hyperfixi._runtime && hyperfixi._runtime._behaviors,
      behaviorCount: typeof hyperfixi !== 'undefined' && hyperfixi._runtime && hyperfixi._runtime._behaviors ? hyperfixi._runtime._behaviors.size : 0
    };
  });

  console.log(JSON.stringify(result, null, 2));

  // Try to drag
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

  console.log('\n=== DRAG LOGS (after attempt) ===');
  const newLogs = logs.length;
  console.log(`Total logs with 'trigger': ${logs.filter(l => l.includes('trigger')).length}`);

  await browser.close();
})();
