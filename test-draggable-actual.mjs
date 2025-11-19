import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Disable cache completely
  await page.route('**/*', route => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  });

  const errors = [];
  const triggerCalls = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('trigger')) {
      triggerCalls.push(text);
    }
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  console.log('Loading page...');
  await page.goto('http://localhost:3000/compound-examples.html', {
    waitUntil: 'networkidle'
  });

  await page.waitForTimeout(1500);

  console.log('\nGetting initial position...');
  const initialPos = await page.evaluate(() => {
    const box = document.querySelector('#item1');
    return box ? {
      left: parseInt(box.style.left || '0'),
      top: parseInt(box.style.top || '0'),
      hasClass: box.classList.contains('draggable-item')
    } : null;
  });

  console.log('Initial position:', initialPos);

  console.log('\nSimulating drag on titlebar...');
  // Need to click on the .titlebar element within #item1
  const titlebar = page.locator('#item1 .titlebar');
  const bbox = await titlebar.boundingBox();

  if (bbox) {
    const startX = bbox.x + bbox.width / 2;
    const startY = bbox.y + bbox.height / 2;

    console.log('Clicking titlebar at:', startX, startY);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);

    await page.mouse.move(startX + 100, startY + 100, { steps: 10 });
    await page.waitForTimeout(100);

    await page.mouse.up();
  } else {
    console.log('⚠️  Could not find titlebar!');
  }

  await page.waitForTimeout(500);

  console.log('\nGetting final position...');
  const finalPos = await page.evaluate(() => {
    const box = document.querySelector('#item1');
    return box ? {
      left: parseInt(box.style.left || '0'),
      top: parseInt(box.style.top || '0'),
      hasClass: box.classList.contains('draggable-item'),
      isDragging: box.classList.contains('dragging')
    } : null;
  });

  console.log('Final position:', finalPos);

  const moved = finalPos && (finalPos.left !== initialPos.left || finalPos.top !== initialPos.top);

  console.log('\n========== RESULTS ==========');
  console.log('Box moved:', moved ? '✅ YES' : '❌ NO');
  console.log('Errors:', errors.length > 0 ? errors : 'None');
  console.log('Trigger calls:', triggerCalls.filter(t => t.includes('draggable')).length);
  console.log('============================\n');

  await browser.close();

  process.exit(moved ? 0 : 1);
})();
