#!/usr/bin/env node
/**
 * Gallery Bundle Compatibility Test
 *
 * Tests each HyperFixi bundle against the examples gallery.
 * Outputs structured feedback for CI/CD and Claude Code.
 *
 * Usage:
 *   node scripts/test-gallery.mjs                    # Test all bundles
 *   node scripts/test-gallery.mjs --bundle=lite      # Test specific bundle
 *   node scripts/test-gallery.mjs --json             # JSON output
 *   node scripts/test-gallery.mjs --verbose          # Show details
 */

import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

// Fail fast if examples symlink is missing
if (!existsSync(join(repoRoot, 'examples', 'basics', '01-hello-world.html'))) {
  console.error(
    '\n  Missing examples/ directory at repo root.\n' +
    '  Create a symlink: ln -s ../_hyper_min/packages/examples examples\n'
  );
  process.exit(1);
}

// Configuration
const BASE_URL = 'http://127.0.0.1:3000';

// Bundle configurations with expected capabilities
const BUNDLES = {
  'lite': {
    file: 'lokascript-lite.js',
    size: '1.9 KB',
    features: {
      toggle: true,
      addClass: true,
      put: true,
      increment: false,
      show: false,
      blocks: false,
      eventModifiers: false,
      possessiveExpr: false,  // `my value` syntax
    }
  },
  'lite-plus': {
    file: 'lokascript-lite-plus.js',
    size: '2.6 KB',
    features: {
      toggle: true,
      addClass: true,
      put: true,
      increment: true,
      show: true,
      blocks: false,
      eventModifiers: false,
      possessiveExpr: false,  // `my value` syntax
    }
  },
  'hybrid-complete': {
    file: 'lokascript-hybrid-complete.js',
    size: '6.7 KB',
    features: {
      toggle: true,
      addClass: true,
      put: true,
      increment: true,
      show: true,
      blocks: true,
      eventModifiers: true,
      possessiveExpr: true,  // `my value` syntax
    }
  },
  'browser': {
    file: 'lokascript-browser.js',
    size: '224 KB',
    features: {
      toggle: true,
      addClass: true,
      put: true,
      increment: true,
      show: true,
      blocks: true,
      eventModifiers: true,
      possessiveExpr: true,  // `my value` syntax
    }
  }
};

// Gallery examples to test
const GALLERY_EXAMPLES = [
  {
    name: 'Toggle Class',
    path: '/examples/basics/02-toggle-class.html',
    requiredFeatures: ['toggle'],
    test: async (page) => {
      const box = page.locator('#box');
      const initialClasses = await box.getAttribute('class') ?? '';
      const hadActive = initialClasses.includes('active');

      await page.locator('button').first().click();
      await page.waitForTimeout(200);

      const newClasses = await box.getAttribute('class') ?? '';
      const hasActive = newClasses.includes('active');

      if (hasActive !== hadActive) {
        return { passed: true, reason: 'Toggle worked' };
      }
      return { passed: false, reason: 'Class did not toggle' };
    }
  },
  {
    name: 'Counter',
    path: '/examples/basics/05-counter.html',
    requiredFeatures: ['increment'],
    test: async (page) => {
      // Wait for hyperfixi to initialize
      await page.waitForFunction(() => window.hyperfixi !== undefined, { timeout: 5000 }).catch(() => null);
      await page.waitForTimeout(200);

      const incBtn = page.locator('button').filter({ hasText: /Increase|➕/ }).first();
      if (await incBtn.count() === 0) {
        return { passed: false, reason: 'No increment button found' };
      }

      const countEl = page.locator('#count');
      const initialText = await countEl.textContent() ?? '0';
      const initialCount = parseInt(initialText) || 0;

      await incBtn.click();
      await page.waitForTimeout(500);

      const newText = await countEl.textContent() ?? '0';
      const newCount = parseInt(newText) || 0;

      if (newCount > initialCount) {
        return { passed: true, reason: `Count: ${initialCount} -> ${newCount}` };
      }
      return { passed: false, reason: `Count unchanged: ${initialCount}` };
    }
  },
  {
    name: 'Input Mirror',
    path: '/examples/basics/04-input-mirror.html',
    requiredFeatures: ['put', 'possessiveExpr'],  // Uses `my value` syntax
    test: async (page) => {
      // Wait for hyperfixi to initialize
      await page.waitForFunction(() => window.hyperfixi !== undefined, { timeout: 5000 }).catch(() => null);
      await page.waitForTimeout(200);

      const input = page.locator('input').first();
      if (await input.count() === 0) {
        return { passed: false, reason: 'No input found' };
      }

      // Type character by character to trigger input events
      await input.click();
      await input.pressSequentially('test123', { delay: 50 });
      await page.waitForTimeout(300);

      const mirror = page.locator('#name-mirror');
      if (await mirror.count() > 0) {
        const text = await mirror.textContent();
        if (text?.includes('test123')) {
          return { passed: true, reason: 'Input mirrored correctly' };
        }
        return { passed: false, reason: `Mirror shows: "${text?.trim()}"` };
      }
      return { passed: false, reason: 'No mirror element found' };
    }
  },
  {
    name: 'Show/Hide',
    path: '/examples/basics/03-show-hide.html',
    requiredFeatures: ['show'],
    test: async (page) => {
      const btn = page.locator('button').first();
      if (await btn.count() === 0) {
        return { passed: false, reason: 'No button found' };
      }
      await btn.click();
      await page.waitForTimeout(200);
      return { passed: true, reason: 'Show/hide interaction worked' };
    }
  },
  {
    name: 'Hello World',
    path: '/examples/basics/01-hello-world.html',
    requiredFeatures: ['put'],
    test: async (page) => {
      const btn = page.locator('button').first();
      if (await btn.count() === 0) {
        return { passed: false, reason: 'No button found' };
      }
      await btn.click();
      await page.waitForTimeout(200);
      return { passed: true, reason: 'Hello world clicked' };
    }
  }
];

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  bundle: args.find(a => a.startsWith('--bundle='))?.split('=')[1] || null,
  json: args.includes('--json'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
Gallery Bundle Compatibility Test

Usage:
  node scripts/test-gallery.mjs [options]

Options:
  --bundle=NAME    Test specific bundle (lite, lite-plus, hybrid-complete, browser)
  --json           Output results as JSON
  --verbose        Show detailed test output
  --help, -h       Show this help

Examples:
  node scripts/test-gallery.mjs
  node scripts/test-gallery.mjs --bundle=hybrid-complete
  node scripts/test-gallery.mjs --json --verbose
`);
  process.exit(0);
}

/**
 * Test a single bundle against gallery examples
 */
async function testBundle(browser, bundleKey, bundleConfig) {
  const results = {
    bundle: bundleKey,
    size: bundleConfig.size,
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect errors
  page.on('pageerror', err => {
    results.errors.push(err.message);
  });

  for (const example of GALLERY_EXAMPLES) {
    const supportsExample = example.requiredFeatures.every(
      f => bundleConfig.features[f]
    );

    if (!supportsExample) {
      results.tests.push({
        name: example.name,
        status: 'skipped',
        reason: `Requires: ${example.requiredFeatures.join(', ')}`
      });
      results.skipped++;
      continue;
    }

    try {
      const url = `${BASE_URL}${example.path}?bundle=${bundleKey}`;
      await page.goto(url, { timeout: 10000 });
      await page.waitForTimeout(500);

      const result = await example.test(page);

      results.tests.push({
        name: example.name,
        status: result.passed ? 'passed' : 'failed',
        reason: result.reason
      });

      if (result.passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (err) {
      results.tests.push({
        name: example.name,
        status: 'error',
        reason: err.message
      });
      results.failed++;
    }
  }

  await context.close();
  return results;
}

/**
 * Format console output
 */
function formatConsole(allResults) {
  let output = '\n';
  output += '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║         HYPERFIXI GALLERY BUNDLE COMPATIBILITY TEST           ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';

  for (const result of allResults) {
    const status = result.failed === 0 ? '✅' : '❌';
    output += `${status} ${result.bundle} (${result.size}): ${result.passed}/${result.passed + result.failed} passed`;
    if (result.skipped > 0) {
      output += `, ${result.skipped} skipped`;
    }
    output += '\n';

    if (options.verbose || result.failed > 0) {
      for (const test of result.tests) {
        const icon = test.status === 'passed' ? '  ✅' :
                     test.status === 'skipped' ? '  ⏭️' : '  ❌';
        output += `${icon} ${test.name}: ${test.reason}\n`;
      }
      output += '\n';
    }
  }

  // Summary
  output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
  const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped, 0);

  output += `Total: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped\n`;

  if (totalFailed === 0) {
    output += '\n🎉 All tests passed!\n';
  } else {
    output += '\n⚠️  Some tests failed. See details above.\n';
  }

  // Compatibility Matrix
  output += '\n';
  output += '╔════════════════════════════════════════════════════════════╗\n';
  output += '║           BUNDLE FEATURE COMPATIBILITY MATRIX             ║\n';
  output += '╠════════════════════════════════════════════════════════════╣\n';
  output += '║ Feature        │ lite │ lite+ │ hybrid │ browser ║\n';
  output += '╟────────────────┼──────┼───────┼────────┼─────────╢\n';

  const features = ['toggle', 'addClass', 'put', 'increment', 'show', 'blocks', 'eventModifiers'];
  for (const feature of features) {
    const cols = Object.values(BUNDLES).map(config =>
      config.features[feature] ? ' ✅ ' : ' ❌ '
    );
    output += `║ ${feature.padEnd(14)} │${cols[0]}│ ${cols[1]} │  ${cols[2]} │   ${cols[3]}  ║\n`;
  }

  output += '╠════════════════════════════════════════════════════════════╣\n';
  output += '║ SIZE           │ 1.9KB│ 2.6KB │  6.7KB │  224KB  ║\n';
  output += '╚════════════════════════════════════════════════════════════╝\n';

  return output;
}

/**
 * Main
 */
async function main() {
  // Determine which bundles to test
  const bundlesToTest = options.bundle
    ? { [options.bundle]: BUNDLES[options.bundle] }
    : BUNDLES;

  if (options.bundle && !BUNDLES[options.bundle]) {
    console.error(`Unknown bundle: ${options.bundle}`);
    console.error(`Available: ${Object.keys(BUNDLES).join(', ')}`);
    process.exit(1);
  }

  console.log('🚀 Starting gallery bundle tests...\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    const allResults = [];

    for (const [bundleKey, bundleConfig] of Object.entries(bundlesToTest)) {
      if (options.verbose) {
        console.log(`Testing ${bundleKey}...`);
      }
      const result = await testBundle(browser, bundleKey, bundleConfig);
      allResults.push(result);
    }

    // Output results
    if (options.json) {
      console.log(JSON.stringify(allResults, null, 2));
    } else {
      console.log(formatConsole(allResults));
    }

    // Exit code
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
    process.exit(totalFailed > 0 ? 1 : 0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('\nMake sure the HTTP server is running:');
      console.error('  npx http-server . -p 3000 -c-1');
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
