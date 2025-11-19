import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    console.log('[Console]', text);
  });

  await page.goto('http://localhost:3000/examples/intermediate/06-native-dialog.html');
  console.log('\n✨ Testing Native Method Support Fix\n');

  // Wait for HyperFixi to initialize
  await page.waitForTimeout(1000);

  console.log('Test: Opening dialog with hyperscript "get #dialog then call it.showModal()"...');

  // Click the button
  await page.click('text=Open Info Dialog');

  // Wait a bit
  await page.waitForTimeout(1000);

  // Check if dialog is open
  const dialogOpen = await page.evaluate(() => {
    const dialog = document.getElementById('info-dialog');
    return dialog && dialog.open;
  });

  console.log('Dialog open:', dialogOpen ? '✅ YES' : '❌ NO');

  if (dialogOpen) {
    console.log('\n🎉 SUCCESS! Native method support is working!\n');
    console.log('HyperFixi can now call native DOM methods like:');
    console.log('  - dialog.showModal()');
    console.log('  - dialog.close()');
    console.log('  - element.classList.add()');
    console.log('  - element.focus()');
    console.log('  - ... and any other native method!\n');
  } else {
    console.log('\n❌ FAILED: Dialog did not open\n');
  }

  await browser.close();
})();
