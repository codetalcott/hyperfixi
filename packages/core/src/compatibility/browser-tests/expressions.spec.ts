import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Official _hyperscript Expressions Test Suite
 *
 * Tests HyperFixi compatibility with expression evaluation from the official test suite.
 * This file focuses ONLY on the expressions category (33 files).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HYPERSCRIPT_TEST_ROOT =
  process.env.HYPERSCRIPT_TEST_ROOT || resolve(__dirname, '../../../../../../_hyperscript/test');

interface TestFile {
  filename: string;
  path: string;
}

interface TestCase {
  description: string;
  code: string;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

function discoverExpressionTestFiles(): TestFile[] {
  const testFiles: TestFile[] = [];
  const categoryPath = join(HYPERSCRIPT_TEST_ROOT, 'expressions');

  try {
    const files = readdirSync(categoryPath);
    for (const file of files) {
      if (file.endsWith('.js')) {
        const filePath = join(categoryPath, file);
        const stats = statSync(filePath);
        if (stats.isFile()) {
          testFiles.push({ filename: file, path: filePath });
        }
      }
    }
  } catch (error) {
    console.warn(`Could not read expressions category:`, error);
  }

  return testFiles;
}

function extractTestCases(content: string): TestCase[] {
  const testCases: TestCase[] = [];

  // Match test cases with various formats
  const patterns = [
    // Standard it() function format
    /it\s*\(\s*["']([^"']+)["']\s*,\s*function\s*\(\s*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
    // Arrow function format
    /it\s*\(\s*["']([^"']+)["']\s*,\s*\(\s*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
    // Async function format
    /it\s*\(\s*["']([^"']+)["']\s*,\s*async\s+function\s*\(\s*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      testCases.push({
        description: match[1],
        code: transformTestCode(match[2]),
      });
    }
  }

  return testCases;
}

/**
 * Transform test code to work with async evalHyperScript
 * - Adds `await` before evalHyperScript calls
 * - Wraps var declarations that use evalHyperScript with async handling
 */
function transformTestCode(code: string): string {
  // Transform: var result = evalHyperScript("..."); result.should.equal(...)
  // To: var result = await evalHyperScript("..."); result.should.equal(...)
  let transformed = code;

  // Add await to evalHyperScript calls that assign to variables
  transformed = transformed.replace(
    /var\s+(\w+)\s*=\s*evalHyperScript\s*\(/g,
    'var $1 = await evalHyperScript('
  );

  // Add await to standalone evalHyperScript().should patterns
  transformed = transformed.replace(
    /evalHyperScript\s*\(([^)]+)\)\s*\.should/g,
    '(await evalHyperScript($1)).should'
  );

  // Add await to evalHyperScript with context that assigns to variable
  transformed = transformed.replace(/var\s+(\w+)\s*=\s*await\s+await\s+/g, 'var $1 = await ');

  return transformed;
}

test.describe('Official _hyperscript Expressions Tests', () => {
  let results: TestResults;

  test.beforeEach(async ({ page }) => {
    results = { total: 0, passed: 0, failed: 0, errors: [] };

    // Load the compatibility test HTML page
    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');
    await page.waitForTimeout(1000);

    // Verify HyperFixi and utilities are loaded
    await page.evaluate(() => {
      if (typeof window.lokascript === 'undefined') {
        throw new Error('HyperFixi browser bundle not loaded');
      }
      if (typeof window.evalHyperScript === 'undefined') {
        throw new Error('evalHyperScript helper not available');
      }
    });
  });

  test('Run expression test files', async ({ page }) => {
    const testFiles = discoverExpressionTestFiles();
    console.log(`🚀 Discovered ${testFiles.length} expression test files`);
    expect(testFiles.length).toBeGreaterThanOrEqual(30);

    for (const testFile of testFiles) {
      try {
        const content = readFileSync(testFile.path, 'utf8');
        const testCases = extractTestCases(content);

        console.log(`\n🧪 ${testFile.filename}: ${testCases.length} test cases`);

        if (testCases.length === 0) {
          console.log(`  ⚠️  No test cases found`);
          continue;
        }

        for (const testCase of testCases) {
          results.total++;

          try {
            const testResult = await page.evaluate(
              async ({ code }: { code: string }) => {
                try {
                  const win = window as any;
                  if (win.clearWorkArea) {
                    win.clearWorkArea();
                  }

                  const testFn = new Function(`
                    return (async function() {
                      const make = window.make;
                      const clearWorkArea = window.clearWorkArea;
                      const evalHyperScript = window.evalHyperScript;
                      const getParseErrorFor = window.getParseErrorFor;
                      const promiseAnIntIn = window.promiseAnIntIn;
                      const promiseValueBackIn = window.promiseValueBackIn;
                      const byId = window.byId;
                      const startsWith = window.startsWith;
                      const assert = window.assert;
                      const getWorkArea = window.getWorkArea;

                      ${code}
                    })();
                  `);

                  await testFn();
                  return { success: true };
                } catch (error) {
                  return {
                    success: false,
                    error: (error as Error).message || String(error),
                  };
                }
              },
              { code: testCase.code }
            );

            if (testResult.success) {
              console.log(`  ✅ ${testCase.description}`);
              results.passed++;
            } else {
              console.log(`  ❌ ${testCase.description}: ${testResult.error}`);
              results.failed++;
              results.errors.push(
                `${testFile.filename} - ${testCase.description}: ${testResult.error}`
              );
            }
          } catch (error) {
            console.log(`  ❌ ${testCase.description}: ${(error as Error).message}`);
            results.failed++;
            results.errors.push(
              `${testFile.filename} - ${testCase.description}: ${(error as Error).message}`
            );
          }
        }
      } catch (error) {
        console.error(`❌ Failed to process ${testFile.filename}: ${(error as Error).message}`);
      }
    }

    // Print summary
    const successRate = results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0;
    console.log(`\n📊 Expressions Test Results:`);
    console.log(`   Total: ${results.total}`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📈 Success rate: ${successRate}%`);

    // Log first 10 errors
    if (results.errors.length > 0) {
      console.log(`\n🚨 First 10 errors:`);
      results.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    }

    expect(results.total).toBeGreaterThan(0);
  });
});
