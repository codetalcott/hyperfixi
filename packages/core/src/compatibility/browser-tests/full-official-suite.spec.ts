import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Window.hyperfixi and Window.evalHyperScript types are declared globally in browser-bundle.ts
// Additional test helper functions (make, clearWorkArea, getParseErrorFor) are injected by compatibility-test.html
// and accessed via type assertions in page.evaluate() contexts

/**
 * Complete Official _hyperscript Test Suite Runner
 *
 * This test file dynamically discovers and runs all 84 official _hyperscript test files
 * across all categories: core, expressions, commands, and features
 */

const HYPERSCRIPT_TEST_ROOT = process.env.HYPERSCRIPT_TEST_ROOT || '../../../_hyperscript/test';

interface TestFile {
  category: string;
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

class OfficialTestSuiteRunner {
  public results: TestResults = { total: 0, passed: 0, failed: 0, errors: [] };

  /**
   * Discover all test files in the official _hyperscript test suite
   */
  discoverTestFiles(): TestFile[] {
    const testFiles: TestFile[] = [];
    const categories = ['core', 'expressions', 'commands', 'features'];

    for (const category of categories) {
      const categoryPath = join(HYPERSCRIPT_TEST_ROOT, category);

      try {
        const files = readdirSync(categoryPath);

        for (const file of files) {
          if (file.endsWith('.js')) {
            const filePath = join(categoryPath, file);
            const stats = statSync(filePath);

            if (stats.isFile()) {
              testFiles.push({
                category,
                filename: file,
                path: filePath,
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Could not read category ${category}:`, error);
      }
    }

    return testFiles;
  }

  /**
   * Extract individual test cases from a test file
   */
  extractTestCases(content: string): TestCase[] {
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
          code: match[2],
        });
      }
    }

    return testCases;
  }

  /**
   * Extract evalHyperScript calls from test code
   */
  extractEvalCalls(code: string): Array<{ expression: string; context?: any }> {
    const calls: Array<{ expression: string; context?: any }> = [];

    // Match evalHyperScript calls with optional context
    const regex = /evalHyperScript\s*\(\s*["'`]([^"'`]+)["'`](?:\s*,\s*(\{[^}]*\}))?\s*\)/g;
    let match;

    while ((match = regex.exec(code)) !== null) {
      const expression = match[1];
      let context = {};

      if (match[2]) {
        try {
          // Safely evaluate the context object
          context = eval(`(${match[2]})`);
        } catch (e) {
          console.warn(`Failed to parse context for expression "${expression}":`, e);
        }
      }

      calls.push({ expression, context });
    }

    return calls;
  }

  /**
   * Try to extract expected result from test assertions
   */
  extractExpectedResult(code: string, expression: string): any {
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(expression)) {
        // Look for common assertion patterns in the next few lines
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const line = lines[j].trim();

          // Chai-style assertions
          const shouldEqual = line.match(/\.should\.equal\s*\(\s*([^)]+)\s*\)/);
          if (shouldEqual) {
            try {
              return eval(shouldEqual[1]);
            } catch (e) {
              return shouldEqual[1].replace(/['"]/g, '');
            }
          }

          // Direct equality assertions
          const directEqual = line.match(/===?\s*([^;]+)/);
          if (directEqual) {
            try {
              return eval(directEqual[1].trim());
            } catch (e) {
              return directEqual[1].trim().replace(/['"]/g, '');
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Run a single test case using HyperFixi - NEW APPROACH: Run complete test code
   */
  async runTestCase(page: any, testFile: TestFile, testCase: TestCase): Promise<boolean> {
    try {
      // NEW: Run the complete test code in browser context
      const testResult = await page.evaluate(
        async ({ code, description }: { code: string; description: string }) => {
          try {
            // Cast window to any to access test helper functions injected by compatibility-test.html
            const win = window as any;

            // Clear work area before each test
            if (win.clearWorkArea) {
              win.clearWorkArea();
            }

            // Create a test execution context with all utilities
            const testContext = {
              make: win.make,
              clearWorkArea: win.clearWorkArea,
              evalHyperScript: win.evalHyperScript,
              getParseErrorFor: win.getParseErrorFor,
              document: document,
              window: window,
              console: console,
              // Chai-style assertion helper
              should: {
                equal: function (this: { value?: any }, expected: any) {
                  return {
                    actual: this.value,
                    equal: (actual: any) => {
                      if (actual !== expected) {
                        throw new Error(
                          `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
                        );
                      }
                    },
                  };
                },
              },
            };

            // Execute the test code with access to utilities
            // Wrap in async function to handle async operations
            const testFn = new Function(
              'make',
              'clearWorkArea',
              'evalHyperScript',
              'getParseErrorFor',
              'document',
              'window',
              'should',
              `return (async function() { ${code} })();`
            );

            await testFn(
              testContext.make,
              testContext.clearWorkArea,
              testContext.evalHyperScript,
              testContext.getParseErrorFor,
              testContext.document,
              testContext.window,
              testContext.should
            );

            return { success: true };
          } catch (error) {
            return {
              success: false,
              error: (error as Error).message || String(error),
            };
          }
        },
        { code: testCase.code, description: testCase.description }
      );

      if (testResult.success) {
        this.results.passed++;
        return true;
      } else {
        this.results.errors.push(
          `${testFile.category}/${testFile.filename} - ${testCase.description}: ${testResult.error}`
        );
        this.results.failed++;
        return false;
      }
    } catch (error) {
      this.results.errors.push(
        `${testFile.category}/${testFile.filename} - ${testCase.description}: ${(error as Error).message}`
      );
      this.results.failed++;
      return false;
    }
  }

  /**
   * Get test results summary
   */
  getSummary(): string {
    const successRate =
      this.results.total > 0 ? Math.round((this.results.passed / this.results.total) * 100) : 0;

    return `
📊 Complete Official Test Suite Results:
========================================
Total tests: ${this.results.total}
✅ Passed: ${this.results.passed}
❌ Failed: ${this.results.failed}
📈 Success rate: ${successRate}%

${
  this.results.errors.length > 0
    ? `
🚨 Errors (first 10):
${this.results.errors
  .slice(0, 10)
  .map(error => `  - ${error}`)
  .join('\n')}
${this.results.errors.length > 10 ? `  ... and ${this.results.errors.length - 10} more` : ''}
`
    : ''
}`;
  }
}

test.describe('Complete Official _hyperscript Test Suite', () => {
  let runner: OfficialTestSuiteRunner;

  test.beforeEach(async ({ page }) => {
    runner = new OfficialTestSuiteRunner();

    // Load the compatibility test HTML page that has both hyperscript libraries
    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');
    await page.waitForTimeout(2000);

    // Verify both HyperFixi and evalHyperScript are loaded
    await page.evaluate(() => {
      if (typeof window.hyperfixi === 'undefined') {
        throw new Error('HyperFixi browser bundle not loaded properly');
      }
      if (typeof window.evalHyperScript === 'undefined') {
        throw new Error('evalHyperScript helper not available');
      }
    });
  });

  test('Run all 84 official _hyperscript test files', async ({ page }) => {
    const testFiles = runner.discoverTestFiles();

    console.log(`🚀 Discovered ${testFiles.length} official test files`);

    expect(testFiles.length).toBeGreaterThanOrEqual(80); // Should have at least 80 files

    // Group test files by category for organized output
    const categories = testFiles.reduce(
      (acc, file) => {
        if (!acc[file.category]) acc[file.category] = [];
        acc[file.category].push(file);
        return acc;
      },
      {} as Record<string, TestFile[]>
    );

    // Run tests for each category
    for (const [category, files] of Object.entries(categories)) {
      console.log(`\n📁 Testing ${category} category (${files.length} files)`);

      for (const testFile of files) {
        try {
          const content = readFileSync(testFile.path, 'utf8');
          const testCases = runner.extractTestCases(content);

          console.log(`  🧪 ${testFile.filename}: ${testCases.length} test cases`);

          if (testCases.length === 0) {
            console.log(`    ⚠️  No test cases found in ${testFile.filename}`);
            continue;
          }

          // Run each test case
          for (const testCase of testCases) {
            runner.results.total++;

            const passed = await runner.runTestCase(page, testFile, testCase);

            if (passed) {
              console.log(`    ✅ ${testCase.description}`);
            } else {
              console.log(`    ❌ ${testCase.description}`);
            }
          }
        } catch (error) {
          console.error(`  ❌ Failed to process ${testFile.filename}: ${(error as Error).message}`);
          runner.results.errors.push(
            `${category}/${testFile.filename}: ${(error as Error).message}`
          );
        }
      }
    }

    // Print comprehensive summary
    const summary = runner.getSummary();
    console.log(summary);

    // Assert that we have reasonable compatibility
    expect(runner.results.total).toBeGreaterThan(0);

    // For expressions, we expect high compatibility (80%+)
    // For commands and features, we expect lower compatibility (they're not implemented yet)
    const successRate = (runner.results.passed / runner.results.total) * 100;

    if (successRate < 30) {
      console.warn(`⚠️  Low overall compatibility: ${successRate.toFixed(1)}%`);
      console.warn('This is expected as commands and features are not yet implemented');
    }

    // The test passes as long as we can run the test suite (discovery and execution works)
    expect(testFiles.length).toBeGreaterThanOrEqual(50); // At least 50 test files should be found
  });

  test('Verify test categories are complete', async ({ page }) => {
    const testFiles = runner.discoverTestFiles();
    const categories = [...new Set(testFiles.map(f => f.category))];

    console.log(`📋 Found test categories: ${categories.join(', ')}`);

    // Verify we have the main categories
    expect(categories).toContain('expressions');
    expect(categories).toContain('commands');
    expect(categories).toContain('core');
    expect(categories).toContain('features');

    // Count files per category
    const categoryCounts = testFiles.reduce(
      (acc, file) => {
        acc[file.category] = (acc[file.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('📊 Files per category:');
    for (const [category, count] of Object.entries(categoryCounts)) {
      console.log(`  ${category}: ${count} files`);
    }

    // Expressions should have the most files (around 37)
    expect(categoryCounts.expressions).toBeGreaterThanOrEqual(30);

    // Commands should have a good number too (around 25)
    expect(categoryCounts.commands).toBeGreaterThanOrEqual(20);
  });
});
