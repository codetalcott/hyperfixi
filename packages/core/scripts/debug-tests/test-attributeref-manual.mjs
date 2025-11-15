#!/usr/bin/env node
/**
 * Manual attributeRef tests with correct code
 */

import { chromium } from 'playwright';

async function runManualTests() {
  console.log('🧪 Testing attributeRef manually (correct code)...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  // Manually specified tests (regex extraction has issues with nested braces)
  const tests = [
    {
      name: 'attributeRef with no value works ([@foo])',
      code: `
        var div = make("<div foo='c1'></div>");
        var value = await _hyperscript("[@foo]", { me: div });
        value.should.equal("c1");
      `
    },
    {
      name: 'attributeRef with dashes name works ([@data-foo])',
      code: `
        var div = make("<div data-foo='c1'></div>");
        var value = await _hyperscript("[@data-foo]", { me: div });
        value.should.equal("c1");
      `
    },
    {
      name: 'attributeRef with short syntax (@foo)',
      code: `
        var div = make("<div foo='c1'></div>");
        var value = await _hyperscript("@foo", { me: div });
        value.should.equal("c1");
      `
    },
    {
      name: 'attributeRef with dashes short syntax (@data-foo)',
      code: `
        var div = make("<div data-foo='c1'></div>");
        var value = await _hyperscript("@data-foo", { me: div });
        value.should.equal("c1");
      `
    }
  ];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    process.stdout.write(`[${i + 1}/${tests.length}] ${test.name}... `);

    try {
      const result = await page.evaluate(
        async ({ code }) => {
          try {
            if (window.clearWorkArea) {
              window.clearWorkArea();
            }

            const testFn = new Function(
              'make',
              'clearWorkArea',
              '_hyperscript',
              `return (async function() { ${code} })();`
            );

            await testFn(
              window.make,
              window.clearWorkArea,
              window.evalHyperScript
            );

            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        { code: test.code }
      );

      if (result.success) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log(`❌ FAIL: ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  await browser.close();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Results: ${passed}/${tests.length} passed (${((passed/tests.length)*100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`✨ Session 24 Achievement:`);
  console.log(`   Implemented [@attribute] and @attribute syntax`);
  console.log(`   ${passed}/${tests.length} expression-only tests passing\n`);

  console.log(`📝 Note: Other attributeRef tests require command support`);
  console.log(`   (set, put, add commands not yet implemented)\n`);

  process.exit(failed === 0 ? 0 : 1);
}

runManualTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
