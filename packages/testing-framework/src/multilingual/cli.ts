#!/usr/bin/env node
/**
 * Multilingual Testing CLI
 *
 * Command-line interface for running multilingual tests.
 */

import { TestOrchestrator } from './orchestrator';
import type { TestConfig, LanguageCode } from './types';

/**
 * Parse command-line arguments
 */
function parseArgs(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    mode: 'quick',
    quickModeLimit: 10,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--language':
      case '-l': {
        const lang = args[++i];
        if (lang) config.languages = [lang as LanguageCode];
        break;
      }

      case '--languages': {
        const langs = args[++i];
        if (langs) config.languages = langs.split(',') as LanguageCode[];
        break;
      }

      case '--bundle':
      case '-b': {
        const bundle = args[++i];
        if (bundle) config.bundle = bundle;
        break;
      }

      case '--build':
        config.build = true;
        break;

      case '--mode':
      case '-m':
        config.mode = args[++i] as 'quick' | 'full';
        break;

      case '--quick':
        config.mode = 'quick';
        break;

      case '--full':
        config.mode = 'full';
        break;

      case '--verbose':
      case '-v':
        config.verbose = true;
        break;

      case '--regression':
      case '-r':
        config.regression = true;
        break;

      case '--baseline': {
        const path = args[++i];
        if (path) config.baselinePath = path;
        break;
      }

      case '--confidence':
      case '-c': {
        const conf = args[++i];
        if (conf) config.confidenceThreshold = parseFloat(conf);
        break;
      }

      case '--verified-only':
        config.verifiedOnly = true;
        break;

      case '--categories': {
        const cats = args[++i];
        if (cats) config.categories = cats.split(',');
        break;
      }

      case '--limit': {
        const lim = args[++i];
        if (lim) config.quickModeLimit = parseInt(lim, 10);
        break;
      }

      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;

      case '--save-baseline':
        // Run the suite, then persist the results as the committed baseline
        // (handled in main() — see saveBaseline below).
        config.saveBaseline = true;
        break;

      default:
        if (arg && arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return config;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Multilingual Test Runner

USAGE:
  npm run test:multilingual [OPTIONS]

OPTIONS:
  -l, --language <code>        Test specific language (en, ja, es, etc.)
      --languages <codes>      Test multiple languages (comma-separated)
  -b, --bundle <name>          Use specific bundle
      --build                  Build bundle before testing
  -m, --mode <mode>            Test mode: 'quick' or 'full' (default: quick)
      --quick                  Quick mode (10 patterns per language)
      --full                   Full mode (all patterns)
  -v, --verbose                Enable verbose output
  -r, --regression             Gate on regressions vs baseline (exit 1 if any)
      --baseline <path>        Baseline file (default: ./baselines/multilingual-priority.json)
  -c, --confidence <n>         Minimum confidence threshold (0-1)
      --verified-only          Only test verified translations
      --categories <cats>      Filter by categories (comma-separated)
      --limit <n>              Patterns per language in quick mode (default: 10)
      --save-baseline          Save current results as new baseline
  -h, --help                   Show this help message

EXAMPLES:
  # Test all languages in quick mode
  npm run test:multilingual

  # Test specific language with verbose output
  npm run test:multilingual -- --language ja --verbose

  # Test multiple languages in full mode
  npm run test:multilingual -- --languages ja,ko,es --full

  # Build bundle and test with regression comparison
  npm run test:multilingual -- --build --regression

  # Save current results as baseline
  npm run test:multilingual -- --save-baseline
`);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    const config = parseArgs();

    // --save-baseline needs the regression reporter wired so it can persist.
    if (config.saveBaseline) config.regression = true;

    const orchestrator = new TestOrchestrator(config);
    const results = await orchestrator.run();

    // --save-baseline: write the current results as the committed baseline, done.
    if (config.saveBaseline) {
      const reporter = orchestrator.getRegressionReporter();
      if (!reporter) {
        console.error('✗ Could not create regression reporter to save baseline.');
        process.exit(1);
      }
      reporter.saveAsBaseline(results);
      process.exit(0);
    }

    // Exit code:
    //  - `--regression`: gate on regressions vs the committed baseline, NOT the
    //    absolute pass rate. The full multilingual sweep has a KNOWN, documented
    //    gap (newer feature patterns lack complete non-English coverage), so a
    //    100%-or-fail gate would never go green. A language fails the gate when
    //    its parse rate drops more than REGRESSION_TOLERANCE_PTS below baseline.
    //    We deliberately gate on the RATE, not on per-pattern flips: a handful of
    //    borderline-confidence patterns can flip pass/fail between builds without
    //    a real regression (the per-pattern `newFailures` is kept for reporting
    //    only). The baseline must be generated against a freshly `populate`d
    //    patterns.db (CI re-populates), or every language reads as shifted.
    //    Missing baseline → fail.
    //  - otherwise: the normal absolute pass/fail (used by the quick-mode gate,
    //    which is genuinely expected at 100%).
    const REGRESSION_TOLERANCE_PTS = 2;
    let exitCode: number;
    if (config.regression) {
      const reporter = orchestrator.getRegressionReporter();
      if (!reporter?.hasBaseline()) {
        console.error(
          `✗ --regression set but no baseline found at ${config.baselinePath ?? './baselines/multilingual-priority.json'}. ` +
            `Generate one with --save-baseline.`
        );
        exitCode = 1;
      } else {
        const allResults = reporter.getRegressionResults();
        const regressed = allResults.filter(r => r.parseRateDelta < -REGRESSION_TOLERANCE_PTS);

        // Fidelity ratchet: faithful baseline passes that became degenerate
        // (parse non-null but lost most of the English command structure). A
        // small tolerance absorbs residual baseline/DB noise — consistent with
        // the parse-rate tolerance above — while catching real backsliding (a
        // transformer change that degrades a whole cluster). Regenerate the
        // baseline (with --save-baseline) after an intentional fidelity change.
        const FIDELITY_REGRESSION_TOLERANCE = 3;
        const fidelityRegressions = allResults.flatMap(r =>
          r.newDegeneratePasses.map(id => `${r.language}/${id}`)
        );

        if (regressed.length > 0) {
          console.error(
            `\n✗ Regression vs baseline in ${regressed.length} language(s) ` +
              `(parse rate dropped > ${REGRESSION_TOLERANCE_PTS}pts):`
          );
          for (const r of regressed) {
            const fails = r.newFailures.length
              ? ` — newly failing: ${r.newFailures.join(', ')}`
              : '';
            console.error(`   ${r.language}: ΔparseRate ${r.parseRateDelta.toFixed(1)}pts${fails}`);
          }
          exitCode = 1;
        } else if (fidelityRegressions.length > FIDELITY_REGRESSION_TOLERANCE) {
          console.error(
            `\n✗ Fidelity regression vs baseline: ${fidelityRegressions.length} faithful pass(es) ` +
              `became degenerate (tolerance ${FIDELITY_REGRESSION_TOLERANCE}):`
          );
          for (const id of fidelityRegressions) console.error(`   ${id}`);
          console.error(
            `   (parse non-null but lost >50% of the English command structure — ` +
              `if intentional, regenerate the baseline with --save-baseline)`
          );
          exitCode = 1;
        } else {
          if (fidelityRegressions.length > 0) {
            console.warn(
              `\n⚠ ${fidelityRegressions.length} fidelity regression(s) within tolerance ` +
                `(${FIDELITY_REGRESSION_TOLERANCE}): ${fidelityRegressions.join(', ')}`
            );
          }
          console.log(`\n✓ No regression vs baseline (tolerance ${REGRESSION_TOLERANCE_PTS}pts).`);
          exitCode = 0;
        }
      }
    } else {
      exitCode = results.summary.overallStatus === 'pass' ? 0 : 1;
    }
    process.exit(exitCode);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Check if running as CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for programmatic use
export { main, parseArgs, showHelp };
