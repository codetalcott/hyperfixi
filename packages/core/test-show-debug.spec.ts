import { test, expect } from '@playwright/test';

test('Debug SHOW/HIDE command', async ({ page }) => {
  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[Browser ${type}]:`, text);
  });

  // Go to test page
  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(2000);

  // Test show command  
  const result = await page.evaluate(async () => {
    // Create test element
    const div = document.createElement('div');
    div.id = 'test-element';
    div.style.display = 'none';
    document.body.appendChild(div);

    try {
      const result = await hyperfixi.evalHyperScript('show #test-element', {});
      const computedStyle = window.getComputedStyle(div);
      return {
        success: true,
        displayAfter: computedStyle.display,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('Test result:', result);
});
