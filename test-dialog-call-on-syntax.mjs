import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('COMMAND') || text.includes('Error') || text.includes('Dialog')) {
      console.log('[Console]', text);
    }
  });

  await page.goto('http://localhost:3000/examples/intermediate/06-native-dialog.html');
  console.log('\nPage loaded\n');

  // Wait for HyperFixi to initialize
  await page.waitForTimeout(1000);

  console.log('Test 1: Opening info dialog with "call showModal() on #dialog" syntax...');

  // Click the button
  await page.click('text=Open Info Dialog');

  // Wait a bit
  await page.waitForTimeout(1000);

  // Check if dialog is open
  const dialogOpen = await page.evaluate(() => {
    const dialog = document.getElementById('info-dialog');
    return dialog && dialog.open;
  });

  console.log('  Dialog open:', dialogOpen ? 'YES' : 'NO');

  if (dialogOpen) {
    console.log('\n✅ SUCCESS: Dialog opened with "call method() on element" syntax!\n');
  } else {
    console.log('\n❌ FAILED: Dialog did not open\n');
  }

  await browser.close();
})();
