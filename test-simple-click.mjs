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
  await page.waitForTimeout(2000);

  console.log('\n=== BEFORE CLICK ===');
  console.log(`Total logs: ${logs.length}`);
  console.log(`Logs with "Adding event listener for 'pointerdown'": ${logs.filter(l => l.includes("Adding event listener for 'pointerdown'")).length}`);

  console.log('\n=== GETTING INITIAL POSITION ===');
  const initialPos = await page.evaluate(() => {
    const box = document.querySelector('#item1');
    return {
      left: parseInt(box.style.left || '0'),
      top: parseInt(box.style.top || '0')
    };
  });
  console.log('Initial position:', initialPos);

  console.log('\n=== CLICKING TITLEBAR ===');
  await page.click('#item1 .titlebar');
  await page.waitForTimeout(500);

  console.log('\n=== GETTING FINAL POSITION ===');
  const finalPos = await page.evaluate(() => {
    const box = document.querySelector('#item1');
    return {
      left: parseInt(box.style.left || '0'),
      top: parseInt(box.style.top || '0')
    };
  });
  console.log('Final position:', finalPos);
  console.log('Box moved:', initialPos.left !== finalPos.left || initialPos.top !== finalPos.top ? '✅ YES' : '❌ NO');

  console.log('\n=== AFTER CLICK ===');
  const afterClickLogs = logs.slice(logs.length - 50);
  console.log('Last 50 logs:');
  afterClickLogs.forEach(log => console.log(log));

  const eventFiredLogs = logs.filter(l => l.includes('EVENT FIRED'));
  console.log(`\nEVENT FIRED logs: ${eventFiredLogs.length}`);
  if (eventFiredLogs.length > 0) {
    eventFiredLogs.forEach(l => console.log(l));
  } else {
    console.log('⚠️  NO EVENT FIRED LOGS FOUND');
  }

  await browser.close();
})();
