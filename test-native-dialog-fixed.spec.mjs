import { test } from '@playwright/test';

test('Native Dialog Example - Fixed Implementation', async ({ page }) => {
  // Navigate to the dialog example
  await page.goto('http://127.0.0.1:3000/examples/intermediate/06-native-dialog.html');

  // Wait for HyperFixi to load
  await page.waitForTimeout(1000);

  console.log('\n=== Testing Demo 1: Simple Modal Dialog ===');

  // Check dialog is not visible initially
  const infoDialog = page.locator('#info-dialog');
  let isOpen = await infoDialog.evaluate(el => el.open);
  console.log('Dialog initially open:', isOpen);

  // Click "Open Info Dialog" button
  await page.click('text=Open Info Dialog');

  // Wait for dialog to open
  await page.waitForTimeout(500);

  // Check dialog is now open
  isOpen = await infoDialog.evaluate(el => el.open);
  console.log('Dialog open after click:', isOpen);

  // Check dialog is visible
  const isVisible = await infoDialog.isVisible();
  console.log('Dialog visible:', isVisible);

  // Click close button
  await page.click('#info-dialog .close-btn');

  // Wait for dialog to close
  await page.waitForTimeout(500);

  // Check dialog is closed
  isOpen = await infoDialog.evaluate(el => el.open);
  console.log('Dialog closed:', !isOpen);

  console.log('\n=== Testing Demo 2: Form Dialog ===');

  // Open form dialog
  await page.click('text=Add User');
  await page.waitForTimeout(500);

  const formDialog = page.locator('#form-dialog');
  isOpen = await formDialog.evaluate(el => el.open);
  console.log('Form dialog open:', isOpen);

  // Fill form
  await page.fill('#username', 'testuser');
  await page.selectOption('#role', 'developer');

  // Submit form
  await page.click('#form-dialog button[type="submit"]');
  await page.waitForTimeout(500);

  // Check result
  const resultText = await page.textContent('#result-text');
  console.log('Result text:', resultText);
  console.log('Contains username:', resultText?.includes('testuser'));

  console.log('\n=== Testing Demo 3: Non-Modal Dialog ===');

  // Open non-modal dialog
  await page.click('text=Open Non-Modal Dialog');
  await page.waitForTimeout(500);

  const nonModalDialog = page.locator('#non-modal-dialog');
  isOpen = await nonModalDialog.evaluate(el => el.open);
  console.log('Non-modal dialog open:', isOpen);

  // Close it
  await page.click('#non-modal-dialog .close-btn');
  await page.waitForTimeout(500);

  isOpen = await nonModalDialog.evaluate(el => el.open);
  console.log('Non-modal dialog closed:', !isOpen);

  console.log('\n=== Testing Demo 4: Backdrop Click ===');

  // Open backdrop dialog
  await page.click('button.danger');
  await page.waitForTimeout(500);

  const backdropDialog = page.locator('#backdrop-dialog');
  isOpen = await backdropDialog.evaluate(el => el.open);
  console.log('Backdrop dialog open:', isOpen);

  // Click on dialog itself (not content) to close
  await backdropDialog.click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(500);

  isOpen = await backdropDialog.evaluate(el => el.open);
  console.log('Backdrop dialog closed after backdrop click:', !isOpen);

  console.log('\n✅ All dialog tests completed!');
});
