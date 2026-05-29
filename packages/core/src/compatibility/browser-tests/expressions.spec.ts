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

// Minimum pass rate (% of runnable upstream cases) the suite must hold.
// History (only ever ratchet UP — a drop means a regression):
//   - harness landing:           182/361 runnable = 50%  (floor 47)
//   - comparisonOperator cluster: 211/361 runnable = 58%  (floor 57)
// Ratchet this up as the remaining parity gaps are fixed in follow-ups.
const EXPRESSION_PASS_RATE_FLOOR = 57;

interface TestFile {
  filename: string;
  path: string;
}

interface TestCase {
  description: string;
  code: string;
  /** Fixtures the test destructures, e.g. ['run', 'html']. */
  fixtures: string[];
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Fixtures we can emulate inside a single page.evaluate sandbox.
 * `run`/`error` → evalHyperScript; `html` → processNode; `evaluate` → direct call.
 * `find`/`page` return Playwright locators / the page object and cannot run in
 * the sandbox, so tests needing them are skipped (counted separately).
 */
const SUPPORTED_FIXTURES = new Set(['run', 'error', 'html', 'evaluate', 'expect']);

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

/**
 * Find the index of the `}` that closes the block opened at `openIdx` (which
 * must point at the opening `{`). String-aware: skips over '...', "...",
 * `...` (template), line/block comments, and regex literals so braces inside
 * them don't affect depth. Returns -1 if unbalanced.
 */
function matchBrace(src: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      // skip string/template literal
      const quote = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === quote) break;
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      if (i === -1) return -1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extract test cases from an upstream Playwright-format test file:
 *   test("description", async ({ run, html }) => { ...body... })
 * Captures the description, the destructured fixtures, and the raw body. The
 * body is run as-is in a sandbox that supplies `run`/`error`/`html`/`evaluate`/
 * `expect` (see the harness below), so no source transformation is needed.
 */
function extractTestCases(content: string): TestCase[] {
  const testCases: TestCase[] = [];
  // Match `test("desc", async ({fixtures}) => {` (also `test.skip`, no fixtures).
  const header =
    /\btest(?:\.\w+)?\s*\(\s*(["'`])((?:\\.|(?!\1).)*?)\1\s*,\s*async\s*\(\s*(\{([^}]*)\})?\s*\)\s*=>\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = header.exec(content)) !== null) {
    const description = m[2];
    const fixtures = (m[4] || '')
      .split(',')
      .map(s => s.trim().split(':')[0].trim())
      .filter(Boolean);
    // m.index..header.lastIndex-1 ends at the body's opening `{`.
    const openIdx = header.lastIndex - 1;
    const closeIdx = matchBrace(content, openIdx);
    if (closeIdx === -1) continue;
    const body = content.slice(openIdx + 1, closeIdx);
    testCases.push({ description, code: body, fixtures });
    header.lastIndex = closeIdx + 1;
  }
  return testCases;
}

test.describe('Official _hyperscript Expressions Tests', () => {
  let results: TestResults;

  test.beforeEach(async ({ page }) => {
    results = { total: 0, passed: 0, failed: 0, skipped: 0, errors: [] };

    // Load the compatibility test HTML page
    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');
    await page.waitForTimeout(1000);

    // Verify HyperFixi and utilities are loaded
    await page.evaluate(() => {
      if (typeof window.hyperfixi === 'undefined') {
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
    // This harness reads the upstream _hyperscript test suite from a sibling
    // checkout (HYPERSCRIPT_TEST_ROOT). It's an opt-in parity check — skip
    // gracefully when upstream isn't present (e.g. CI without the sibling repo)
    // rather than failing.
    test.skip(
      testFiles.length === 0,
      `upstream _hyperscript test suite not found at ${HYPERSCRIPT_TEST_ROOT} ` +
        `(set HYPERSCRIPT_TEST_ROOT or check out _hyperscript as a sibling)`
    );

    for (const testFile of testFiles) {
      let filePass = 0;
      let fileFail = 0;
      let fileSkip = 0;
      try {
        const content = readFileSync(testFile.path, 'utf8');
        const testCases = extractTestCases(content);

        if (testCases.length === 0) {
          console.log(`🧪 ${testFile.filename}: no test cases found`);
          continue;
        }

        for (const testCase of testCases) {
          results.total++;

          // Skip tests needing fixtures we can't emulate in the sandbox
          // (find → Playwright locator, page → Playwright page).
          const unsupported = testCase.fixtures.filter(f => !SUPPORTED_FIXTURES.has(f));
          if (unsupported.length > 0) {
            results.skipped++;
            fileSkip++;
            continue;
          }

          try {
            const testResult = await page.evaluate(
              async ({ code }: { code: string }) => {
                const win = window as any;
                if (win.clearWorkArea) win.clearWorkArea();

                // Minimal Playwright-`expect` shim covering the matchers the
                // upstream expression suite uses. Throws on mismatch so the
                // test body's assertions surface as failures.
                const deepEqual = (a: unknown, b: unknown): boolean => {
                  if (Object.is(a, b)) return true;
                  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null)
                    return false;
                  if (Array.isArray(a) !== Array.isArray(b)) return false;
                  const ka = Object.keys(a as object);
                  const kb = Object.keys(b as object);
                  if (ka.length !== kb.length) return false;
                  return ka.every(k => deepEqual((a as any)[k], (b as any)[k]));
                };
                const show = (v: unknown) => {
                  try {
                    return typeof v === 'string' ? JSON.stringify(v) : String(v);
                  } catch {
                    return String(v);
                  }
                };
                const makeExpect = (actual: unknown, negate = false): any => {
                  const check = (pass: boolean, msg: string) => {
                    if (pass === negate) {
                      throw new Error(`expect(${show(actual)})${negate ? '.not' : ''} ${msg}`);
                    }
                  };
                  return {
                    get not() {
                      return makeExpect(actual, !negate);
                    },
                    toBe: (e: unknown) => check(Object.is(actual, e), `toBe ${show(e)}`),
                    toEqual: (e: unknown) => check(deepEqual(actual, e), `toEqual ${show(e)}`),
                    toStrictEqual: (e: unknown) =>
                      check(deepEqual(actual, e), `toStrictEqual ${show(e)}`),
                    toBeNull: () => check(actual === null, `toBeNull`),
                    toBeUndefined: () => check(actual === undefined, `toBeUndefined`),
                    toBeDefined: () => check(actual !== undefined, `toBeDefined`),
                    toBeTruthy: () => check(!!actual, `toBeTruthy`),
                    toBeFalsy: () => check(!actual, `toBeFalsy`),
                    toContain: (e: unknown) =>
                      check(
                        (typeof actual === 'string' && actual.includes(e as string)) ||
                          (Array.isArray(actual) && actual.includes(e)),
                        `toContain ${show(e)}`
                      ),
                    toMatch: (re: unknown) =>
                      check(
                        (re instanceof RegExp ? re : new RegExp(String(re))).test(String(actual)),
                        `toMatch ${show(re)}`
                      ),
                    toBeGreaterThan: (e: number) =>
                      check((actual as number) > e, `toBeGreaterThan ${show(e)}`),
                    toBeGreaterThanOrEqual: (e: number) =>
                      check((actual as number) >= e, `toBeGreaterThanOrEqual ${show(e)}`),
                    toBeLessThan: (e: number) =>
                      check((actual as number) < e, `toBeLessThan ${show(e)}`),
                    toBeCloseTo: (e: number, digits = 2) =>
                      check(
                        Math.abs((actual as number) - e) < Math.pow(10, -digits) / 2,
                        `toBeCloseTo ${show(e)}`
                      ),
                  };
                };

                try {
                  const testFn = new Function(
                    'run',
                    'error',
                    'html',
                    'evaluate',
                    'expect',
                    'make',
                    'byId',
                    'clearWorkArea',
                    'getWorkArea',
                    'assert',
                    'promiseAnIntIn',
                    'promiseValueBackIn',
                    `return (async () => {\n${code}\n})();`
                  );

                  const run = (src: string, ctx?: unknown) => win.evalHyperScript(src, ctx);
                  const error = async (src: string) => {
                    try {
                      await win.evalHyperScript(src);
                      return null;
                    } catch (e) {
                      return (e as Error).message;
                    }
                  };
                  const html = async (markup: string) => {
                    const wa = document.getElementById('work-area')!;
                    wa.innerHTML = markup;
                    await win.hyperfixi.processNode(wa);
                  };
                  const evaluate = (fn: (...a: unknown[]) => unknown, ...args: unknown[]) =>
                    fn(...args);

                  await testFn(
                    run,
                    error,
                    html,
                    evaluate,
                    makeExpect,
                    win.make,
                    win.byId,
                    win.clearWorkArea,
                    win.getWorkArea,
                    win.assert,
                    win.promiseAnIntIn,
                    win.promiseValueBackIn
                  );
                  return { success: true };
                } catch (error) {
                  return { success: false, error: (error as Error).message || String(error) };
                }
              },
              { code: testCase.code }
            );

            if (testResult.success) {
              results.passed++;
              filePass++;
            } else {
              console.log(
                `  ❌ ${testFile.filename} › ${testCase.description}: ${testResult.error}`
              );
              results.failed++;
              fileFail++;
              results.errors.push(
                `${testFile.filename} - ${testCase.description}: ${testResult.error}`
              );
            }
          } catch (error) {
            console.log(
              `  ❌ ${testFile.filename} › ${testCase.description}: ${(error as Error).message}`
            );
            results.failed++;
            fileFail++;
            results.errors.push(
              `${testFile.filename} - ${testCase.description}: ${(error as Error).message}`
            );
          }
        }
        console.log(
          `🧪 ${testFile.filename}: ${filePass} pass, ${fileFail} fail, ${fileSkip} skip`
        );
      } catch (error) {
        console.error(`❌ Failed to process ${testFile.filename}: ${(error as Error).message}`);
      }
    }

    // Print summary
    const runnable = results.passed + results.failed;
    const successRate = runnable > 0 ? Math.round((results.passed / runnable) * 100) : 0;
    console.log(`\n📊 Expressions Test Results (upstream _hyperscript parity):`);
    console.log(`   Discovered: ${results.total}`);
    console.log(`   ⏭️  Skipped (needs Playwright fixture): ${results.skipped}`);
    console.log(`   Runnable: ${runnable}`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📈 Pass rate (of runnable): ${successRate}%`);

    // Log first 30 errors for triage
    if (results.errors.length > 0) {
      console.log(`\n🚨 Failures (first 30):`);
      results.errors.slice(0, 30).forEach(err => console.log(`   - ${err}`));
    }

    // We must actually be running upstream cases (guards against the scraper
    // silently extracting nothing, which is how this suite previously "passed").
    expect(results.total).toBeGreaterThan(100);
    expect(runnable).toBeGreaterThan(50);
    // Pass-rate floor: ratchet up as compatibility bugs are fixed. Set below the
    // measured baseline so known upstream-parity gaps don't fail CI; failures are
    // logged above for triage rather than blocking.
    expect(successRate).toBeGreaterThanOrEqual(EXPRESSION_PASS_RATE_FLOOR);
  });
});
