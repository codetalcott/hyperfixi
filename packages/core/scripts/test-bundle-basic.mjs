#!/usr/bin/env node
/**
 * Quick Bundle Validation Test
 * Validates that the tree-shaken bundles load and execute correctly
 */

import { chromium } from 'playwright';

async function testBundle() {
  console.log('🧪 Testing tree-shaken minimal bundle...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(msg.text());
  });

  // Listen for errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    // Load the test page
    await page.goto('http://127.0.0.1:3000/test-tree-shaking.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // Wait for bundle to load
    await page.waitForFunction(() => typeof window.hyperfixi !== 'undefined', {
      timeout: 5000
    });

    // Get bundle info
    const bundleInfo = await page.evaluate(() => {
      return {
        version: window.hyperfixi.version,
        commands: window.hyperfixi.commands,
        runtimeType: window.hyperfixi.runtime.constructor.name,
        registryType: window.hyperfixi.runtime.getRegistry().constructor.name
      };
    });

    console.log('✅ Bundle loaded successfully!');
    console.log('   Version:', bundleInfo.version);
    console.log('   Commands:', bundleInfo.commands.length, '-', bundleInfo.commands.join(', '));
    console.log('   Runtime:', bundleInfo.runtimeType);
    console.log('   Registry:', bundleInfo.registryType);
    console.log('');

    // Test a simple command execution
    const testResult = await page.evaluate(async () => {
      const btn = document.querySelector('button[_*="add"]');
      if (!btn) return { success: false, error: 'Button not found' };

      // Simulate click
      btn.click();

      // Wait a bit for command to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if class was added
      const hasClass = btn.classList.contains('highlight');
      return { success: hasClass, error: hasClass ? null : 'Class not added' };
    });

    if (testResult.success) {
      console.log('✅ Command execution test: PASS');
      console.log('   "add" command successfully added class\n');
    } else {
      console.log('❌ Command execution test: FAIL');
      console.log('   Error:', testResult.error, '\n');
    }

    // Test dynamic element (MutationObserver)
    const dynamicTest = await page.evaluate(() => {
      // Create dynamic element
      const container = document.getElementById('dynamic-container');
      const newBtn = document.createElement('button');
      newBtn.setAttribute('_', 'on click toggle .highlight');
      newBtn.textContent = 'Dynamic Test';
      container.appendChild(newBtn);

      // Try clicking it
      newBtn.click();

      // Check if it worked
      return {
        success: newBtn.classList.contains('highlight'),
        error: newBtn.classList.contains('highlight') ? null : 'Dynamic element not processed'
      };
    });

    if (dynamicTest.success) {
      console.log('✅ MutationObserver test: PASS');
      console.log('   Dynamic elements are properly processed\n');
    } else {
      console.log('❌ MutationObserver test: FAIL');
      console.log('   Error:', dynamicTest.error, '\n');
    }

    // Check for errors
    if (errors.length > 0) {
      console.log('❌ Page errors detected:');
      errors.forEach(err => console.log('  ', err));
      console.log('');
    } else {
      console.log('✅ No JavaScript errors detected\n');
    }

    // Summary
    const allPassed = testResult.success && dynamicTest.success && errors.length === 0;

    console.log('═══════════════════════════════════════');
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('   Tree-shaken bundle is working correctly');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('   Review errors above');
    }
    console.log('═══════════════════════════════════════\n');

    await browser.close();
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

// Run tests
testBundle().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
