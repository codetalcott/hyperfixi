import { test, expect } from '@playwright/test';

test('Debug draggable behavior compilation', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    console.log(`[${msg.type()}] ${text}`);
  });

  // Capture errors
  page.on('pageerror', err => {
    errors.push(err.message);
    console.error('PAGE ERROR:', err.message);
  });

  // Load the test page
  await page.goto('http://127.0.0.1:3000/test-debug-draggable.html');

  // Wait for page to fully load
  await page.waitForTimeout(1000);

  // Check for parser errors
  const hasParserError = consoleMessages.some(msg =>
    msg.includes('PARSE ERROR') ||
    msg.includes('Expected') ||
    msg.includes('SyntaxError')
  );

  if (hasParserError) {
    console.log('\n=== PARSER ERRORS FOUND ===');
    consoleMessages
      .filter(msg => msg.includes('ERROR') || msg.includes('Expected'))
      .forEach(msg => console.log(msg));
  }

  // Check if behavior was registered
  const hasBehaviorRegistered = consoleMessages.some(msg =>
    msg.includes('Behavior registered: Draggable') ||
    msg.includes('Installing behavior Draggable')
  );

  console.log('\n=== SUMMARY ===');
  console.log('Behavior registered:', hasBehaviorRegistered);
  console.log('Parser errors:', hasParserError);
  console.log('Page errors:', errors.length);

  // Try to trigger a drag
  const box = page.locator('.box');
  await expect(box).toBeVisible();

  const boxBounds = await box.boundingBox();
  if (boxBounds) {
    console.log('\n=== ATTEMPTING DRAG ===');
    console.log('Box position:', boxBounds);

    // Clear previous messages
    consoleMessages.length = 0;

    // Simulate pointerdown
    await box.dispatchEvent('pointerdown', {
      clientX: boxBounds.x + 50,
      clientY: boxBounds.y + 50
    });

    await page.waitForTimeout(200);

    const hasPointerDownLog = consoleMessages.some(msg =>
      msg.includes('POINTERDOWN FIRED')
    );

    console.log('Pointerdown event fired:', hasPointerDownLog);

    if (hasPointerDownLog) {
      console.log('✅ Event handler is working!');
    } else {
      console.log('❌ Event handler NOT firing');
      console.log('Console messages during drag attempt:', consoleMessages);
    }
  }

  // Print all console messages for debugging
  console.log('\n=== ALL CONSOLE MESSAGES ===');
  consoleMessages.forEach(msg => console.log(msg));

  // Fail test if there are parser errors
  expect(hasParserError, 'Should not have parser errors').toBe(false);
});
