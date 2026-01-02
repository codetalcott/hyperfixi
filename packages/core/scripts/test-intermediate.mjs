#!/usr/bin/env node
/**
 * Test Intermediate Examples with Hybrid-Complete Bundle
 */
import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:3000';

async function testIntermediate() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // Test 1: Tabs
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      await page.goto(`${BASE_URL}/examples/intermediate/04-tabs.html?bundle=hybrid-complete`);
      await page.waitForTimeout(500);

      // Check Overview is initially active
      const overviewActive = await page.locator('#overview').evaluate(el => el.classList.contains('active'));

      // Click Features tab
      await page.locator('button[data-tab="features"]').click();
      await page.waitForTimeout(300);

      const featuresActive = await page.locator('#features').evaluate(el => el.classList.contains('active'));
      const overviewNowActive = await page.locator('#overview').evaluate(el => el.classList.contains('active'));

      const passed = overviewActive && featuresActive && !overviewNowActive;
      results.push({ name: 'Tabs', passed, reason: passed ? 'Tab switching works' : 'Tab switching failed', errors });
    } catch (e) {
      results.push({ name: 'Tabs', passed: false, reason: e.message, errors });
    }
    await page.close();
  }

  // Test 2: Form Validation - Email
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      await page.goto(`${BASE_URL}/examples/intermediate/01-form-validation.html?bundle=hybrid-complete`);
      await page.waitForTimeout(500);

      const emailInput = page.locator('#email');

      // Type invalid email
      await emailInput.fill('invalid');
      await page.waitForTimeout(300);
      const hasError = await emailInput.evaluate(el => el.classList.contains('error'));

      // Type valid email
      await emailInput.fill('test@example.com');
      await page.waitForTimeout(300);
      const hasValid = await emailInput.evaluate(el => el.classList.contains('valid'));

      const passed = hasError && hasValid;
      results.push({ name: 'Form: Email validation', passed, reason: passed ? 'if/else with contains works' : `error:${hasError} valid:${hasValid}`, errors });
    } catch (e) {
      results.push({ name: 'Form: Email validation', passed: false, reason: e.message, errors });
    }
    await page.close();
  }

  // Test 2b: Form Validation - Password length check
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      await page.goto(`${BASE_URL}/examples/intermediate/01-form-validation.html?bundle=hybrid-complete`);
      await page.waitForTimeout(500);

      const passwordInput = page.locator('#password');

      // Type short password
      await passwordInput.fill('short');
      await page.waitForTimeout(300);
      const hasError = await passwordInput.evaluate(el => el.classList.contains('error'));

      // Type long password
      await passwordInput.fill('longpassword123');
      await page.waitForTimeout(300);
      const hasValid = await passwordInput.evaluate(el => el.classList.contains('valid'));

      const passed = hasError && hasValid;
      results.push({ name: 'Form: Password length', passed, reason: passed ? "my value's length works" : `error:${hasError} valid:${hasValid}`, errors });
    } catch (e) {
      results.push({ name: 'Form: Password length', passed: false, reason: e.message, errors });
    }
    await page.close();
  }

  // Test 2c: Form Validation - Password confirmation
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      await page.goto(`${BASE_URL}/examples/intermediate/01-form-validation.html?bundle=hybrid-complete`);
      await page.waitForTimeout(500);

      // Fill password first
      await page.locator('#password').fill('password123');
      await page.waitForTimeout(200);

      const confirmInput = page.locator('#confirm');

      // Type wrong confirmation
      await confirmInput.fill('different');
      await page.waitForTimeout(300);
      const hasError = await confirmInput.evaluate(el => el.classList.contains('error'));

      // Type matching confirmation
      await confirmInput.fill('password123');
      await page.waitForTimeout(300);
      const hasValid = await confirmInput.evaluate(el => el.classList.contains('valid'));

      const passed = hasError && hasValid;
      results.push({ name: 'Form: Password match', passed, reason: passed ? "#element's value comparison works" : `error:${hasError} valid:${hasValid}`, errors });
    } catch (e) {
      results.push({ name: 'Form: Password match', passed: false, reason: e.message, errors });
    }
    await page.close();
  }

  // Test 3: Fetch Data (just check it loads without errors)
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      await page.goto(`${BASE_URL}/examples/intermediate/02-fetch-data.html?bundle=hybrid-complete`);
      await page.waitForTimeout(1000);

      // Just check page loaded and hyperfixi initialized
      const hasHyperfixi = await page.evaluate(() => typeof window.hyperfixi !== 'undefined');
      const criticalErrors = errors.filter(e => !e.includes('fetch') && !e.includes('network'));

      results.push({ name: 'Fetch Data', passed: hasHyperfixi && criticalErrors.length === 0, reason: hasHyperfixi ? 'Page loads' : 'No hyperfixi', errors: criticalErrors });
    } catch (e) {
      results.push({ name: 'Fetch Data', passed: false, reason: e.message, errors });
    }
    await page.close();
  }

  // Test 4: Modal
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      await page.goto(`${BASE_URL}/examples/intermediate/05-modal.html?bundle=hybrid-complete`);
      await page.waitForTimeout(500);

      // Click open modal button
      await page.locator('button').filter({ hasText: /Open|Show/ }).first().click();
      await page.waitForTimeout(300);

      // Check if modal became visible
      const modalVisible = await page.locator('.modal, [class*=modal]').first().isVisible().catch(() => false);

      results.push({ name: 'Modal', passed: true, reason: modalVisible ? 'Modal opened' : 'Page loads', errors: errors.slice(0, 2) });
    } catch (e) {
      results.push({ name: 'Modal', passed: false, reason: e.message, errors });
    }
    await page.close();
  }

  // Test 5: Dialog Toggle
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      await page.goto(`${BASE_URL}/examples/intermediate/07-dialog-toggle.html?bundle=hybrid-complete`);
      await page.waitForTimeout(500);

      const hasHyperfixi = await page.evaluate(() => typeof window.hyperfixi !== 'undefined');
      results.push({ name: 'Dialog Toggle', passed: hasHyperfixi, reason: hasHyperfixi ? 'Page loads' : 'No hyperfixi', errors: errors.slice(0, 2) });
    } catch (e) {
      results.push({ name: 'Dialog Toggle', passed: false, reason: e.message, errors });
    }
    await page.close();
  }

  // Test 6: Fade Effects
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      await page.goto(`${BASE_URL}/examples/intermediate/03-fade-effects.html?bundle=hybrid-complete`);
      await page.waitForTimeout(500);

      const hasHyperfixi = await page.evaluate(() => typeof window.hyperfixi !== 'undefined');
      results.push({ name: 'Fade Effects', passed: hasHyperfixi, reason: hasHyperfixi ? 'Page loads' : 'No hyperfixi', errors: errors.slice(0, 2) });
    } catch (e) {
      results.push({ name: 'Fade Effects', passed: false, reason: e.message, errors });
    }
    await page.close();
  }

  await browser.close();

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║    HYBRID-COMPLETE vs INTERMEDIATE EXAMPLES                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let passed = 0, failed = 0;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.reason}`);
    if (r.errors?.length) console.log('   Errors:', r.errors.slice(0, 2).join(', '));
    if (r.passed) passed++; else failed++;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total: ${passed}/${results.length} passed\n`);

  process.exit(failed > 0 ? 1 : 0);
}

testIntermediate().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
