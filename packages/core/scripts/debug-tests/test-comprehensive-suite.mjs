import { chromium } from 'playwright';

async function runComprehensiveTests() {
  console.log('🚀 Running comprehensive test suite...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console messages with test failures
  const testFailures = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('❌ Test failed:')) {
      testFailures.push(text.replace('❌ Test failed: ', ''));
    }
  });

  try {
    await page.goto('http://127.0.0.1:3000/src/compatibility/hyperscript-tests/test-runner.html', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    console.log('✅ Page loaded\n');

    // Click "Run All Tests" button
    await page.click('button:has-text("Run All Tests")');
    console.log('✅ Tests initiated\n');

    // Poll for test completion (faster than fixed wait)
    let results = { passing: 0, failing: 0, total: 0 };
    let lastTotal = 0;
    let stableCount = 0;

    for (let i = 0; i < 40; i++) { // Max 4 seconds (40 * 100ms)
      await page.waitForTimeout(100);

      results = await page.evaluate(() => {
        const passing = document.getElementById('pass-count')?.textContent || '0';
        const failing = document.getElementById('fail-count')?.textContent || '0';
        const total = document.getElementById('total-count')?.textContent || '0';
        return { passing: parseInt(passing), failing: parseInt(failing), total: parseInt(total) };
      });

      // If we have results and they're stable for 3 checks, we're done
      if (results.total > 0 && results.total === lastTotal) {
        stableCount++;
        if (stableCount >= 3) break;
      } else {
        stableCount = 0;
      }
      lastTotal = results.total;
    }

    // Print results
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                Comprehensive Test Suite Results                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Summary:`);
    console.log(`   Total Tests: ${results.total}`);
    console.log(`   ✅ Passed:    ${results.passing}`);
    console.log(`   ❌ Failed:    ${results.failing}`);

    if (results.total > 0) {
      const passRate = ((results.passing / results.total) * 100).toFixed(1);
      console.log(`   📈 Pass Rate: ${passRate}%\n`);
    }

    if (testFailures.length > 0) {
      console.log('\n❌ Failed Tests:\n');
      console.log('━'.repeat(70));
      testFailures.forEach((failure, i) => {
        console.log(`${i + 1}. ${failure}`);
      });
      console.log('━'.repeat(70));
    }

    await browser.close();

    // Exit with appropriate code
    process.exit(results.failing === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error running tests:', error.message);
    await browser.close();
    process.exit(1);
  }
}

runComprehensiveTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
