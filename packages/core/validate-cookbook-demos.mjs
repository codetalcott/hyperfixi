#!/usr/bin/env node
/**
 * Browser Validation for Cookbook Demo Pages
 *
 * This script validates that cookbook examples actually work in a real browser,
 * addressing the issue of "tests not correctly validating browser behavior"
 */

import { chromium } from 'playwright';

const DEMOS = [
  {
    name: 'Complete Demo',
    url: 'http://127.0.0.1:3000/cookbook/complete-demo.html',
    checks: [
      {
        name: 'HyperFixi loads',
        test: async (page) => {
          const hasHyperfixi = await page.evaluate(() => typeof window.hyperfixi !== 'undefined');
          return hasHyperfixi;
        }
      },
      {
        name: 'String concatenation example initializes',
        test: async (page) => {
          const logs = await page.evaluate(() => {
            const console = document.getElementById('console-output');
            return console ? console.innerHTML : '';
          });
          return logs.includes('String concatenation API setup complete') || logs.includes('setup');
        }
      },
      {
        name: 'Indeterminate checkbox example initializes',
        test: async (page) => {
          const checkbox = await page.evaluate(() => {
            const cb = document.getElementById('api-checkbox');
            return cb ? cb.indeterminate : false;
          });
          return checkbox === true;
        }
      },
      {
        name: 'Toggle button responds to clicks',
        test: async (page) => {
          // Click the target toggle button and verify it adds/removes .active class
          const result = await page.evaluate(() => {
            const btn = document.getElementById('target-example');
            if (!btn) return { success: false, reason: 'Button not found' };

            // Check initial state
            const hadActiveInitially = btn.classList.contains('active');

            // Click the button
            btn.click();

            // Check if class toggled
            const hasActiveAfterClick = btn.classList.contains('active');
            const toggled = hadActiveInitially !== hasActiveAfterClick;

            // Click again to test toggle back
            btn.click();
            const hasActiveAfterSecondClick = btn.classList.contains('active');
            const toggledBack = hasActiveAfterClick !== hasActiveAfterSecondClick;

            return {
              success: toggled && toggledBack,
              hadActiveInitially,
              hasActiveAfterClick,
              hasActiveAfterSecondClick,
              reason: toggled && toggledBack ? 'Working correctly' : 'Toggle not working'
            };
          });

          if (!result.success) {
            console.log('Toggle test details:', result);
          }

          return result.success;
        }
      },
      {
        name: 'No console errors on load',
        test: async (page) => {
          // This is tracked during page load
          return page._consoleErrors ? page._consoleErrors.length === 0 : true;
        }
      }
    ]
  },
  {
    name: 'Cookbook Comparison Test',
    url: 'http://127.0.0.1:3000/cookbook/cookbook-comparison-test.html',
    checks: [
      {
        name: 'HyperFixi loads',
        test: async (page) => {
          const hasHyperfixi = await page.evaluate(() => typeof window.hyperfixi !== 'undefined');
          return hasHyperfixi;
        }
      },
      {
        name: 'Page initializes without errors',
        test: async (page) => {
          const logs = await page.evaluate(() => {
            const console = document.getElementById('console-output');
            return console ? console.innerHTML : '';
          });
          return logs.includes('Initializing cookbook comparison') || logs.length > 0;
        }
      },
      {
        name: 'No console errors on load',
        test: async (page) => {
          return page._consoleErrors ? page._consoleErrors.length === 0 : true;
        }
      }
    ]
  },
  {
    name: 'Compound Examples (Draggable)',
    url: 'http://127.0.0.1:3000/compound-examples.html',
    checks: [
      {
        name: 'HyperFixi loads',
        test: async (page) => {
          const hasHyperfixi = await page.evaluate(() => typeof window.hyperfixi !== 'undefined');
          return hasHyperfixi;
        }
      },
      {
        name: 'Draggable items exist',
        test: async (page) => {
          const count = await page.evaluate(() => {
            return document.querySelectorAll('.draggable-item').length;
          });
          return count === 3;
        }
      },
      {
        name: 'No console errors on load',
        test: async (page) => {
          return page._consoleErrors ? page._consoleErrors.length === 0 : true;
        }
      }
    ]
  },
  {
    name: 'Full Cookbook Test Suite',
    url: 'http://127.0.0.1:3000/cookbook/full-cookbook-test.html',
    checks: [
      {
        name: 'HyperFixi loads',
        test: async (page) => {
          const hasHyperfixi = await page.evaluate(() => typeof window.hyperfixi !== 'undefined');
          return hasHyperfixi;
        }
      },
      {
        name: 'Page loads all 9 examples',
        test: async (page) => {
          const exampleCount = await page.evaluate(() => {
            return document.querySelectorAll('.example').length;
          });
          return exampleCount === 9;
        }
      },
      {
        name: 'Test 1: Concat strings works',
        test: async (page) => {
          await page.waitForTimeout(2500); // Wait for auto-run
          const status = await page.evaluate(() => {
            const statusEl = document.getElementById('status-1');
            return statusEl ? statusEl.classList.contains('status-pass') : false;
          });
          return status;
        }
      },
      {
        name: 'Test 2: Indeterminate checkbox works',
        test: async (page) => {
          const status = await page.evaluate(() => {
            const statusEl = document.getElementById('status-2');
            return statusEl ? statusEl.classList.contains('status-pass') : false;
          });
          return status;
        }
      },
      {
        name: 'Test 4: Toggle active class works',
        test: async (page) => {
          const status = await page.evaluate(() => {
            const statusEl = document.getElementById('status-4');
            return statusEl ? statusEl.classList.contains('status-pass') : false;
          });
          return status;
        }
      },
      {
        name: 'Test 6: Filter quotes works',
        test: async (page) => {
          const status = await page.evaluate(() => {
            const statusEl = document.getElementById('status-6');
            return statusEl ? statusEl.classList.contains('status-pass') : false;
          });
          return status;
        }
      },
      {
        name: 'Test 7: Filter table rows works',
        test: async (page) => {
          const status = await page.evaluate(() => {
            const statusEl = document.getElementById('status-7');
            return statusEl ? statusEl.classList.contains('status-pass') : false;
          });
          return status;
        }
      },
      {
        name: 'At least 6/9 tests pass',
        test: async (page) => {
          const passed = await page.evaluate(() => {
            return document.querySelectorAll('.status-pass').length;
          });
          return passed >= 6;
        }
      },
      {
        name: 'No console errors on load',
        test: async (page) => {
          return page._consoleErrors ? page._consoleErrors.length === 0 : true;
        }
      }
    ]
  }
];

async function validateDemo(browser, demo) {
  const page = await browser.newPage();

  // Track console errors and logs
  page._consoleErrors = [];
  page._consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      page._consoleErrors.push(text);
    } else if (msg.type() === 'log' && text.includes('🔍')) {
      page._consoleLogs.push(text);
      console.log(`  [Browser] ${text}`);
    }
  });

  // Track page errors
  page.on('pageerror', error => {
    page._consoleErrors.push(`Page Error: ${error.message}`);
  });

  const results = {
    name: demo.name,
    url: demo.url,
    loaded: false,
    checks: [],
    errors: []
  };

  try {
    await page.goto(demo.url, {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    results.loaded = true;

    // Wait a bit for any initialization
    await page.waitForTimeout(1000);

    // Run all checks
    for (const check of demo.checks) {
      try {
        const passed = await check.test(page);
        results.checks.push({
          name: check.name,
          passed,
          error: null
        });
      } catch (error) {
        results.checks.push({
          name: check.name,
          passed: false,
          error: error.message
        });
      }
    }

    // Capture any console errors
    if (page._consoleErrors.length > 0) {
      results.errors = page._consoleErrors;
    }

  } catch (error) {
    results.errors.push(`Failed to load: ${error.message}`);
  } finally {
    await page.close();
  }

  return results;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                    ║');
  console.log('║        🌐 Browser Validation: Cookbook Demo Pages 🌐               ║');
  console.log('║                                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });

  const allResults = [];
  for (const demo of DEMOS) {
    console.log(`📄 Testing: ${demo.name}...`);
    const results = await validateDemo(browser, demo);
    allResults.push(results);

    // Print immediate feedback
    if (results.loaded) {
      const passedChecks = results.checks.filter(c => c.passed).length;
      const totalChecks = results.checks.length;
      const status = passedChecks === totalChecks ? '✅' : '⚠️';
      console.log(`   ${status} ${passedChecks}/${totalChecks} checks passed`);

      if (results.errors.length > 0) {
        console.log(`   ❌ ${results.errors.length} console errors detected`);
      }
    } else {
      console.log(`   ❌ Failed to load`);
    }
    console.log('');
  }

  await browser.close();

  // Print detailed report
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                      Detailed Results                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  let totalPassed = 0;
  let totalChecks = 0;
  let totalErrors = 0;

  for (const result of allResults) {
    console.log(`\n${result.name}`);
    console.log('─'.repeat(70));
    console.log(`URL: ${result.url}`);
    console.log(`Loaded: ${result.loaded ? '✅ Yes' : '❌ No'}\n`);

    if (result.loaded) {
      console.log('Checks:');
      for (const check of result.checks) {
        const status = check.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} - ${check.name}`);
        if (check.error) {
          console.log(`         Error: ${check.error}`);
        }
        if (check.passed) totalPassed++;
        totalChecks++;
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Console Errors:');
        result.errors.forEach((err, i) => {
          console.log(`  ${i + 1}. ${err}`);
          totalErrors++;
        });
      }
    } else {
      console.log('❌ Page failed to load');
      if (result.errors.length > 0) {
        result.errors.forEach(err => console.log(`   ${err}`));
      }
    }
  }

  // Summary
  console.log('\n\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const passRate = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;
  console.log(`📊 Total Checks: ${totalChecks}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalChecks - totalPassed}`);
  console.log(`📈 Pass Rate: ${passRate}%`);
  console.log(`⚠️  Console Errors: ${totalErrors}`);

  const allPassed = totalPassed === totalChecks && totalErrors === 0;

  if (allPassed) {
    console.log('\n🎉 All cookbook demos validated successfully!\n');
  } else {
    console.log('\n⚠️  Some checks failed or errors detected. Review above.\n');
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
