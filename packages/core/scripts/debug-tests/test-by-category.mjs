#!/usr/bin/env node
/**
 * Category-by-Category Test Runner
 * Runs official test suite one category at a time with progress feedback
 */

import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const HYPERSCRIPT_TEST_ROOT = process.env.HYPERSCRIPT_TEST_ROOT || '../../../_hyperscript/test';

class CategoryTestRunner {
  constructor() {
    this.results = {
      categories: {},
      totalPassed: 0,
      totalFailed: 0,
      totalTests: 0
    };
  }

  discoverCategory(category) {
    const categoryPath = join(HYPERSCRIPT_TEST_ROOT, category);
    const files = [];

    if (!existsSync(categoryPath)) {
      console.log(`⚠️  Category ${category} not found at ${categoryPath}`);
      return files;
    }

    const fileList = readdirSync(categoryPath);
    for (const file of fileList) {
      if (file.endsWith('.js')) {
        const filePath = join(categoryPath, file);
        const stats = statSync(filePath);
        if (stats.isFile()) {
          files.push({ filename: file, path: filePath });
        }
      }
    }

    return files;
  }

  extractTestCases(content) {
    const testCases = [];
    const patterns = [
      /it\s*\(\s*["']([^"']+)["']\s*,\s*function\s*\(\s*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
      /it\s*\(\s*["']([^"']+)["']\s*,\s*\(\s*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
      /it\s*\(\s*["']([^"']+)["']\s*,\s*async\s+function\s*\(\s*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        testCases.push({
          description: match[1],
          code: match[2],
        });
      }
    }

    return testCases;
  }

  async runCategory(page, category) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📁 Category: ${category.toUpperCase()}`);
    console.log(`${'='.repeat(70)}\n`);

    const files = this.discoverCategory(category);
    if (files.length === 0) {
      console.log(`⚠️  No test files found in ${category}`);
      return { passed: 0, failed: 0, total: 0 };
    }

    console.log(`Found ${files.length} test files\n`);

    let categoryPassed = 0;
    let categoryFailed = 0;
    let categoryTotal = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = `[${i + 1}/${files.length}]`;

      try {
        const content = readFileSync(file.path, 'utf8');
        const testCases = this.extractTestCases(content);

        process.stdout.write(`${progress} ${file.filename} (${testCases.length} tests)... `);

        if (testCases.length === 0) {
          console.log('⚠️  No tests');
          continue;
        }

        let filePassed = 0;
        let fileFailed = 0;

        for (const testCase of testCases) {
          const result = await this.runTestCase(page, testCase);
          if (result) {
            filePassed++;
          } else {
            fileFailed++;
          }
        }

        categoryPassed += filePassed;
        categoryFailed += fileFailed;
        categoryTotal += testCases.length;

        // Progress feedback
        const fileRate = ((filePassed / testCases.length) * 100).toFixed(0);
        if (filePassed === testCases.length) {
          console.log(`✅ ${filePassed}/${testCases.length} (100%)`);
        } else if (filePassed > 0) {
          console.log(`⚠️  ${filePassed}/${testCases.length} (${fileRate}%)`);
        } else {
          console.log(`❌ 0/${testCases.length} (0%)`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    // Category summary
    const categoryRate = categoryTotal > 0
      ? ((categoryPassed / categoryTotal) * 100).toFixed(1)
      : 0;

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📊 ${category} Summary: ${categoryPassed}/${categoryTotal} passed (${categoryRate}%)`);
    console.log(`${'─'.repeat(70)}\n`);

    return { passed: categoryPassed, failed: categoryFailed, total: categoryTotal };
  }

  async runTestCase(page, testCase) {
    try {
      const result = await page.evaluate(
        async ({ code }) => {
          try {
            if (window.clearWorkArea) {
              window.clearWorkArea();
            }

            // Transform code to add await before _hyperscript calls (our impl is async)
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
        { code: testCase.code }
      );

      return result.success;
    } catch (error) {
      return false;
    }
  }

  printFinalSummary() {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🏆 FINAL SUMMARY`);
    console.log(`${'='.repeat(70)}\n`);

    for (const [category, results] of Object.entries(this.results.categories)) {
      const rate = ((results.passed / results.total) * 100).toFixed(1);
      console.log(`${category.padEnd(15)} ${results.passed.toString().padStart(4)}/${results.total.toString().padStart(4)} (${rate.padStart(5)}%)`);
    }

    const totalRate = ((this.results.totalPassed / this.results.totalTests) * 100).toFixed(1);
    console.log(`${'─'.repeat(70)}`);
    console.log(`TOTAL           ${this.results.totalPassed.toString().padStart(4)}/${this.results.totalTests.toString().padStart(4)} (${totalRate.padStart(5)}%)`);
    console.log(`\n${'='.repeat(70)}\n`);
  }
}

async function main() {
  const categoriesToRun = process.argv[2]
    ? [process.argv[2]]
    : ['expressions']; // Start with expressions only

  console.log('🚀 Category-by-Category Test Runner\n');
  console.log(`Categories to test: ${categoriesToRun.join(', ')}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Suppress console logs for cleaner output
  page.on('console', () => {});

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  const runner = new CategoryTestRunner();

  for (const category of categoriesToRun) {
    const results = await runner.runCategory(page, category);
    runner.results.categories[category] = results;
    runner.results.totalPassed += results.passed;
    runner.results.totalFailed += results.failed;
    runner.results.totalTests += results.total;
  }

  await browser.close();

  runner.printFinalSummary();

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
