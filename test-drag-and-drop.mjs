import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Loading page...');
  await page.goto('http://localhost:3000/compound-examples.html', {
    waitUntil: 'networkidle'
  });

  await page.waitForTimeout(1500);

  console.log('\nGetting initial position...');
  const initialPos = await page.evaluate(() => {
    const box = document.querySelector('#item1');
    return {
      left: parseInt(box.style.left || '0'),
      top: parseInt(box.style.top || '0'),
      hasClass: box.classList.contains('draggable-item')
    };
  });

  console.log('Initial position:', initialPos);

  console.log('\nSimulating drag...');
  // Use Playwright's drag-and-drop API which properly dispatches pointer events
  const titlebar = page.locator('#item1 .titlebar');
  await titlebar.dragTo(page.locator('body'), {
    sourcePosition: { x: 50, y: 10 },
    targetPosition: { x: 150, y: 110 }
  });

  await page.waitForTimeout(500);

  console.log('\nGetting final position...');
  const finalPos = await page.evaluate(() => {
    const box = document.querySelector('#item1');
    return {
      left: parseInt(box.style.left || '0'),
      top: parseInt(box.style.top || '0'),
      hasClass: box.classList.contains('draggable-item'),
      isDragging: box.classList.contains('dragging')
    };
  });

  console.log('Final position:', finalPos);

  const moved = finalPos && (finalPos.left !== initialPos.left || finalPos.top !== initialPos.top);

  console.log('\n========== RESULTS ==========');
  console.log('Box moved:', moved ? '✅ YES' : '❌ NO');
  console.log('Distance:', {
    x: finalPos.left - initialPos.left,
    y: finalPos.top - initialPos.top
  });
  console.log('============================\n');

  await browser.close();

  process.exit(moved ? 0 : 1);
})();
