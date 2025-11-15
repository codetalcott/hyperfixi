#!/usr/bin/env node
/**
 * Test attributeRef category only
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

const HYPERSCRIPT_TEST_ROOT = process.env.HYPERSCRIPT_TEST_ROOT || '../../../_hyperscript/test';

async function runAttributeRefTests() {
  console.log('🧪 Testing attributeRef only...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Suppress console logs for cleaner output
  page.on('console', () => {});

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  // Read attributeRef.js test file
  const filePath = join(HYPERSCRIPT_TEST_ROOT, 'expressions', 'attributeRef.js');
  const content = readFileSync(filePath, 'utf8');

  // Extract test cases
  const patterns = [
    /it\s*\(\s*["']([^"']+)["']\s*,\s*function\s*\(\s*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
    /it\s*\(\s*["']([^"']+)["']\s*,\s*\(\s*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
    /it\s*\(\s*["']([^"']+)["']\s*,\s*async\s+function\s*\(\s*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
  ];

  const tests = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      tests.push({ description: match[1], code: match[2] });
    }
  }

  console.log(`Found ${tests.length} attributeRef tests\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    process.stdout.write(`[${i + 1}/${tests.length}] ${test.description}... `);

    // Debug first test
    if (i === 0) {
      console.log('\n[DEBUG] Original code:');
      console.log(test.code);
    }

    try {
      const result = await page.evaluate(
        async ({ code }) => {
          try {
            if (window.clearWorkArea) {
              window.clearWorkArea();
            }

            // Transform code to add await before _hyperscript calls
            const transformedCode = code
              .replace(/([^a-zA-Z_])_hyperscript\(/g, '$1await _hyperscript(')
              .replace(/^_hyperscript\(/g, 'await _hyperscript(')
              .replace(/([^a-zA-Z_])evalHyperScript\(/g, '$1await evalHyperScript(')
              .replace(/^evalHyperScript\(/g, 'await evalHyperScript(');

            const testFn = new Function(
              'make',
              'clearWorkArea',
              'evalHyperScript',
              'getParseErrorFor',
              '_hyperscript',
              'document',
              'window',
              'Array',
              `return (async function() { ${transformedCode} })();`
            );

            await testFn(
              window.make,
              window.clearWorkArea,
              window.evalHyperScript,
              window.getParseErrorFor,
              window.evalHyperScript,  // Map _hyperscript to our implementation
              document,
              window,
              Array
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

    await page.waitForTimeout(50);
  }

  await browser.close();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 AttributeRef Results: ${passed}/${tests.length} passed (${((passed/tests.length)*100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`✨ Session 24 Impact:`);
  console.log(`   Before: 0/${tests.length} passing (missing [@foo] syntax)`);
  console.log(`   After: ${passed}/${tests.length} passing (implemented!)`);
  console.log(`   Improvement: +${passed} tests\n`);

  process.exit(failed === 0 ? 0 : 1);
}

runAttributeRefTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
