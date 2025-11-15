#!/usr/bin/env node
/**
 * Comprehensive Syntax Audit
 * Tests various expression patterns to discover what's already implemented
 */

import { chromium } from 'playwright';

async function syntaxAudit() {
  console.log('🔍 Comprehensive Syntax Audit\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const categories = [
    {
      name: 'Literals',
      tests: [
        { name: 'String literals', expr: '"hello"', expected: 'hello' },
        { name: 'Number literals', expr: '42', expected: 42 },
        { name: 'Boolean true', expr: 'true', expected: true },
        { name: 'Boolean false', expr: 'false', expected: false },
        { name: 'Null', expr: 'null', expected: null },
      ]
    },
    {
      name: 'Mathematical Operations',
      tests: [
        { name: 'Addition', expr: '1 + 2', expected: 3 },
        { name: 'Subtraction', expr: '5 - 3', expected: 2 },
        { name: 'Multiplication', expr: '3 * 4', expected: 12 },
        { name: 'Division', expr: '10 / 2', expected: 5 },
        { name: 'Modulo', expr: '10 mod 3', expected: 1 },
        { name: 'Precedence', expr: '(1 + 2) * 3', expected: 9 },
      ]
    },
    {
      name: 'Comparison Operations',
      tests: [
        { name: 'Equals', expr: '5 == 5', expected: true },
        { name: 'Not equals', expr: '5 != 3', expected: true },
        { name: 'Greater than', expr: '5 > 3', expected: true },
        { name: 'Less than', expr: '3 < 5', expected: true },
        { name: 'Greater or equal', expr: '5 >= 5', expected: true },
        { name: 'Less or equal', expr: '3 <= 5', expected: true },
      ]
    },
    {
      name: 'Logical Operations',
      tests: [
        { name: 'AND true', expr: 'true and true', expected: true },
        { name: 'AND false', expr: 'true and false', expected: false },
        { name: 'OR true', expr: 'false or true', expected: true },
        { name: 'OR false', expr: 'false or false', expected: false },
        { name: 'NOT true', expr: 'not true', expected: false },
        { name: 'NOT false', expr: 'not false', expected: true },
      ]
    },
    {
      name: 'String Operations',
      tests: [
        { name: 'Concatenation', expr: '"hello" + " world"', expected: 'hello world' },
        { name: 'Template literals', expr: '`test`', expected: 'test' },
      ]
    },
    {
      name: 'Object Literals',
      tests: [
        { name: 'Empty object', expr: '{}', expected: {} },
        { name: 'Simple object', expr: '{a: 1, b: 2}', expected: {a: 1, b: 2} },
      ]
    }
  ];

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    byCategory: {}
  };

  for (const category of categories) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 ${category.name}`);
    console.log(`${'='.repeat(60)}`);

    const categoryResults = { passed: 0, failed: 0 };

    for (const test of category.tests) {
      results.total++;
      process.stdout.write(`  ${test.name}... `);

      try {
        const result = await page.evaluate(
          async ({ expr, expected }) => {
            try {
              const actual = await window.evalHyperScript(expr);

              // Deep equality check
              const actualStr = JSON.stringify(actual);
              const expectedStr = JSON.stringify(expected);

              if (actualStr === expectedStr) {
                return { success: true };
              } else {
                return { success: false, error: `Expected ${expectedStr}, got ${actualStr}` };
              }
            } catch (error) {
              return { success: false, error: error.message };
            }
          },
          { expr: test.expr, expected: test.expected }
        );

        if (result.success) {
          console.log('✅');
          results.passed++;
          categoryResults.passed++;
        } else {
          console.log(`❌ ${result.error}`);
          results.failed++;
          categoryResults.failed++;
        }
      } catch (error) {
        console.log(`❌ ${error.message}`);
        results.failed++;
        categoryResults.failed++;
      }
    }

    const categoryRate = ((categoryResults.passed / category.tests.length) * 100).toFixed(1);
    console.log(`  Category: ${categoryResults.passed}/${category.tests.length} (${categoryRate}%)`);

    results.byCategory[category.name] = categoryResults;
  }

  await browser.close();

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 AUDIT SUMMARY`);
  console.log(`${'='.repeat(60)}`);

  for (const [categoryName, categoryResults] of Object.entries(results.byCategory)) {
    const total = categoryResults.passed + categoryResults.failed;
    const rate = ((categoryResults.passed / total) * 100).toFixed(1);
    console.log(`  ${categoryName.padEnd(25)} ${categoryResults.passed}/${total} (${rate}%)`);
  }

  const totalRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  ${'TOTAL'.padEnd(25)} ${results.passed}/${results.total} (${totalRate}%)`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`✨ Discovered Implemented Features:`);
  for (const [categoryName, categoryResults] of Object.entries(results.byCategory)) {
    if (categoryResults.passed > 0) {
      console.log(`   ✅ ${categoryName}: ${categoryResults.passed} working`);
    }
  }
  console.log();

  process.exit(results.failed === 0 ? 0 : 1);
}

syntaxAudit().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
