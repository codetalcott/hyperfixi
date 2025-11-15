#!/usr/bin/env node
/**
 * Comprehensive Advanced Syntax Audit - Session 27
 * Tests advanced expression patterns beyond basic literals/math/comparisons
 */

import { chromium } from 'playwright';

async function advancedSyntaxAudit() {
  console.log('🔍 Advanced Syntax Audit - Session 27\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const categories = [
    {
      name: 'Property Access',
      tests: [
        {
          name: 'Dot notation',
          setup: 'var obj = {name: "Alice"}',
          expr: 'obj.name',
          expected: 'Alice'
        },
        {
          name: 'Chained properties',
          setup: 'var obj = {user: {name: "Bob"}}',
          expr: 'obj.user.name',
          expected: 'Bob'
        },
        {
          name: 'Bracket string key',
          setup: 'var obj = {name: "Charlie"}',
          expr: 'obj["name"]',
          expected: 'Charlie'
        },
      ]
    },
    {
      name: 'Context Variables',
      tests: [
        {
          name: 'Variable reference',
          setup: 'var x = 42',
          expr: 'x',
          expected: 42
        },
        {
          name: 'Multiple variables',
          setup: 'var x = 10; var y = 20',
          expr: 'x + y',
          expected: 30
        },
      ]
    },
    {
      name: 'Function Calls',
      tests: [
        {
          name: 'String method',
          setup: 'var str = "hello"',
          expr: 'str.toUpperCase()',
          expected: 'HELLO'
        },
        {
          name: 'Array method',
          setup: 'var arr = [1, 2, 3]',
          expr: 'arr.length',
          expected: 3
        },
        {
          name: 'Math operations',
          setup: 'var num = 16',
          expr: 'Math.sqrt(num)',
          expected: 4
        },
      ]
    },
    {
      name: 'Type Conversions',
      tests: [
        {
          name: 'String to Int',
          expr: '"123" as Int',
          expected: 123
        },
        {
          name: 'String to Number',
          expr: '"45.67" as Number',
          expected: 45.67
        },
        {
          name: 'Int to String',
          expr: '42 as String',
          expected: '42'
        },
      ]
    },
    {
      name: 'Ternary/Conditional',
      tests: [
        {
          name: 'If true',
          expr: 'if true then 1 else 2',
          expected: 1
        },
        {
          name: 'If false',
          expr: 'if false then 1 else 2',
          expected: 2
        },
        {
          name: 'Conditional with comparison',
          expr: 'if 5 > 3 then "yes" else "no"',
          expected: 'yes'
        },
      ]
    },
    {
      name: 'Null/Undefined Handling',
      tests: [
        {
          name: 'Null literal',
          expr: 'null',
          expected: null
        },
        {
          name: 'Null equality',
          expr: 'null == null',
          expected: true
        },
        {
          name: 'Null comparison',
          expr: 'null != 5',
          expected: true
        },
      ]
    },
    {
      name: 'Complex Expressions',
      tests: [
        {
          name: 'Nested arrays',
          expr: '[[1, 2], [3, 4]][0][1]',
          expected: 2
        },
        {
          name: 'Mixed operations',
          expr: '(10 + 5) * 2 - 10',
          expected: 20
        },
        {
          name: 'Boolean algebra',
          expr: '(true and false) or (true and true)',
          expected: true
        },
      ]
    },
    {
      name: 'String Operations',
      tests: [
        {
          name: 'Contains operator',
          setup: 'var str = "hello world"',
          expr: 'str contains "world"',
          expected: true
        },
        {
          name: 'Starts with',
          setup: 'var str = "hello"',
          expr: 'str starts with "hel"',
          expected: true
        },
        {
          name: 'Ends with',
          setup: 'var str = "hello"',
          expr: 'str ends with "lo"',
          expected: true
        },
      ]
    },
    {
      name: 'Array Operations',
      tests: [
        {
          name: 'Array contains',
          setup: 'var arr = [1, 2, 3]',
          expr: 'arr contains 2',
          expected: true
        },
        {
          name: 'Array does not contain',
          setup: 'var arr = [1, 2, 3]',
          expr: 'arr does not contain 5',
          expected: true
        },
        {
          name: 'In operator',
          setup: 'var arr = [1, 2, 3]',
          expr: '2 in arr',
          expected: true
        },
      ]
    },
    {
      name: 'Existence Checks',
      tests: [
        {
          name: 'Variable exists',
          setup: 'var x = 5',
          expr: 'x exists',
          expected: true
        },
        {
          name: 'Is empty (empty string)',
          setup: 'var str = ""',
          expr: 'str is empty',
          expected: true
        },
        {
          name: 'Is not empty',
          setup: 'var str = "hello"',
          expr: 'str is not empty',
          expected: true
        },
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

    const categoryResults = { passed: 0, failed: 0, tests: [] };

    for (const test of category.tests) {
      results.total++;
      process.stdout.write(`  ${test.name}... `);

      try {
        const result = await page.evaluate(
          async ({ expr, expected, setup }) => {
            try {
              // Build context object from setup
              const context = {};

              if (setup) {
                // Execute setup code to build context
                const setupCode = `
                  ${setup}
                  return { ${setup.match(/var\s+(\w+)\s*=/g)?.map(m => {
                    const varName = m.match(/var\s+(\w+)/)[1];
                    return `${varName}: ${varName}`;
                  }).join(', ') || ''} };
                `;
                const setupFn = new Function(setupCode);
                Object.assign(context, setupFn());
              }

              const actual = await window.evalHyperScript(expr, context);

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
          { expr: test.expr, expected: test.expected, setup: test.setup || null }
        );

        if (result.success) {
          console.log('✅');
          results.passed++;
          categoryResults.passed++;
          categoryResults.tests.push({ name: test.name, status: 'pass' });
        } else {
          console.log(`❌ ${result.error}`);
          results.failed++;
          categoryResults.failed++;
          categoryResults.tests.push({ name: test.name, status: 'fail', error: result.error });
        }
      } catch (error) {
        console.log(`❌ ${error.message}`);
        results.failed++;
        categoryResults.failed++;
        categoryResults.tests.push({ name: test.name, status: 'error', error: error.message });
      }
    }

    const categoryRate = ((categoryResults.passed / category.tests.length) * 100).toFixed(1);
    console.log(`  Category: ${categoryResults.passed}/${category.tests.length} (${categoryRate}%)`);

    results.byCategory[category.name] = categoryResults;
  }

  await browser.close();

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ADVANCED SYNTAX AUDIT SUMMARY`);
  console.log(`${'='.repeat(60)}`);

  for (const [categoryName, categoryResults] of Object.entries(results.byCategory)) {
    const total = categoryResults.passed + categoryResults.failed;
    const rate = ((categoryResults.passed / total) * 100).toFixed(1);
    const status = rate === '100.0' ? '✅' : rate === '0.0' ? '❌' : '⚠️';
    console.log(`  ${status} ${categoryName.padEnd(25)} ${categoryResults.passed}/${total} (${rate}%)`);
  }

  const totalRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  ${'TOTAL'.padEnd(25)} ${results.passed}/${results.total} (${totalRate}%)`);
  console.log(`${'='.repeat(60)}\n`);

  // Group by status
  console.log(`✨ Implementation Status:\n`);

  const fullImplemented = Object.entries(results.byCategory)
    .filter(([_, r]) => r.passed === r.passed + r.failed && r.passed > 0);
  const partialImplemented = Object.entries(results.byCategory)
    .filter(([_, r]) => r.passed > 0 && r.failed > 0);
  const notImplemented = Object.entries(results.byCategory)
    .filter(([_, r]) => r.passed === 0);

  if (fullImplemented.length > 0) {
    console.log(`   ✅ Fully Implemented (${fullImplemented.length} categories):`);
    fullImplemented.forEach(([name, r]) => {
      console.log(`      • ${name}: ${r.passed}/${r.passed + r.failed}`);
    });
  }

  if (partialImplemented.length > 0) {
    console.log(`\n   ⚠️  Partially Implemented (${partialImplemented.length} categories):`);
    partialImplemented.forEach(([name, r]) => {
      console.log(`      • ${name}: ${r.passed}/${r.passed + r.failed}`);
    });
  }

  if (notImplemented.length > 0) {
    console.log(`\n   ❌ Not Implemented (${notImplemented.length} categories):`);
    notImplemented.forEach(([name, r]) => {
      console.log(`      • ${name}: 0/${r.passed + r.failed}`);
    });
  }

  console.log();

  process.exit(results.failed === 0 ? 0 : 1);
}

advancedSyntaxAudit().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
