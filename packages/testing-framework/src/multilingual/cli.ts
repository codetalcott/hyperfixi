#!/usr/bin/env node
/**
 * Multilingual Testing CLI
 *
 * Command-line interface for running multilingual tests.
 */

import { checkDbStamp, getDefaultDbPath } from '@hyperfixi/patterns-reference';
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

  // Track whether quick mode was explicitly requested, so --regression can safely
  // upgrade the default-quick run to full (where the fidelity/degenerate ratchet
  // actually runs) without overriding an explicit --quick.
  let explicitQuick = false;

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
      case '-m': {
        const mode = args[++i] as 'quick' | 'full';
        config.mode = mode;
        if (mode === 'quick') explicitQuick = true;
        break;
      }

      case '--quick':
        config.mode = 'quick';
        explicitQuick = true;
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

  // The regression gate ratchets on degenerate/fidelity passes, which are only
  // computed in full mode. A default-quick --regression run silently checks just
  // parse rate — a much weaker gate. Upgrade to full unless the caller explicitly
  // asked for quick (in which case warn that the fidelity ratchet is skipped).
  if (config.regression && config.mode === 'quick') {
    if (explicitQuick) {
      console.warn(
        '⚠ --regression in --quick mode only checks parse rate; the degenerate/fidelity ratchet requires --full.'
      );
    } else {
      config.mode = 'full';
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
  -r, --regression             Gate on regressions vs baseline (exit 1 if any).
                               Implies --full (the degenerate/fidelity ratchet
                               needs full mode); pass --quick to force parse-rate-
                               only and skip it.
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

    // DB freshness guard: refuse to run a regression/baseline compare against a
    // patterns.db generated from *different* source than is currently checked out
    // (the cross-branch "phantom regression" footgun). The committed baseline only
    // pairs with a DB synced from the matching source. CI re-syncs before the gate,
    // so it always passes; locally this catches a stale DB after a branch switch or
    // an un-re-synced source edit.
    if (config.regression) {
      const dbPath = getDefaultDbPath();
      const stamp = checkDbStamp(dbPath);
      if (stamp.status === 'stale') {
        console.error(
          '\n✗ patterns.db is STALE — it was generated from different source than is currently\n' +
            '  checked out, so a comparison against the committed baseline would report phantom\n' +
            '  regressions. Re-sync it before running the gate:\n\n' +
            '    npm run db:init:force --prefix packages/patterns-reference\n' +
            '    npm run sync:translations --prefix packages/patterns-reference\n'
        );
        process.exit(1);
      } else if (stamp.status === 'unstamped') {
        console.warn(
          '⚠ patterns.db has no provenance stamp (generated before the freshness guard); ' +
            'cannot verify it is fresh. Re-sync if results look surprising.'
        );
      }
    }

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

        // R0 — correctness ratchet: catch *silent command-drops* the degenerate
        // ratchet misses (a faithful 1.0 pass that becomes lossy, 0.5 ≤ fid < 1.0).
        // Two complementary signals: (1) per-pattern faithful→lossy flips (precise),
        // and (2) a per-language avgFidelity drop (coarse backstop — also catches
        // lossy→more-lossy that the per-pattern flip can't see). Both are guarded by
        // the baseline carrying the new `lossyPasses`/`avgFidelity` data, so an
        // un-regenerated baseline never retro-flags. avgFidelity is deterministic
        // (parse-derived, independent of the patterns.db confidence column), so the
        // tolerance can be tight.
        const LOSSY_REGRESSION_TOLERANCE = 3;
        // 0.02 ≈ six single-pattern drops in a ~154-pattern language — absorbs any
        // rare populate jitter while still catching real per-language cluster
        // regressions (typically ≥0.03). The per-pattern lossy ratchet above is the
        // precise primary signal; this is the coarse lossy→more-lossy backstop.
        const AVG_FIDELITY_DROP_TOLERANCE = 0.02;
        const lossyRegressions = allResults.flatMap(r =>
          r.newLossyPasses.map(id => `${r.language}/${id}`)
        );
        const fidelityDrops = allResults.filter(
          r => r.avgFidelityDelta < -AVG_FIDELITY_DROP_TOLERANCE
        );

        let failed = false;

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
          failed = true;
        }

        if (fidelityRegressions.length > FIDELITY_REGRESSION_TOLERANCE) {
          console.error(
            `\n✗ Fidelity regression vs baseline: ${fidelityRegressions.length} faithful pass(es) ` +
              `became degenerate (tolerance ${FIDELITY_REGRESSION_TOLERANCE}):`
          );
          for (const id of fidelityRegressions) console.error(`   ${id}`);
          console.error(
            `   (parse non-null but lost >50% of the English command structure — ` +
              `if intentional, regenerate the baseline with --save-baseline)`
          );
          failed = true;
        } else if (fidelityRegressions.length > 0) {
          console.warn(
            `\n⚠ ${fidelityRegressions.length} fidelity regression(s) within tolerance ` +
              `(${FIDELITY_REGRESSION_TOLERANCE}): ${fidelityRegressions.join(', ')}`
          );
        }

        if (lossyRegressions.length > LOSSY_REGRESSION_TOLERANCE) {
          console.error(
            `\n✗ Correctness regression vs baseline: ${lossyRegressions.length} faithful pass(es) ` +
              `became lossy (silently dropped a command; tolerance ${LOSSY_REGRESSION_TOLERANCE}):`
          );
          for (const id of lossyRegressions) console.error(`   ${id}`);
          console.error(
            `   (still parses but lost ≥1 command vs the English reference — ` +
              `if intentional, regenerate the baseline with --save-baseline)`
          );
          failed = true;
        } else if (lossyRegressions.length > 0) {
          console.warn(
            `\n⚠ ${lossyRegressions.length} correctness regression(s) within tolerance ` +
              `(${LOSSY_REGRESSION_TOLERANCE}): ${lossyRegressions.join(', ')}`
          );
        }

        if (fidelityDrops.length > 0) {
          console.error(
            `\n✗ avgFidelity dropped > ${AVG_FIDELITY_DROP_TOLERANCE} in ` +
              `${fidelityDrops.length} language(s):`
          );
          for (const r of fidelityDrops) {
            console.error(`   ${r.language}: ΔavgFidelity ${r.avgFidelityDelta.toFixed(4)}`);
          }
          console.error(`   (if intentional, regenerate the baseline with --save-baseline)`);
          failed = true;
        }

        if (failed) {
          exitCode = 1;
        } else {
          console.log(
            `\n✓ No regression vs baseline ` +
              `(parse-rate ${REGRESSION_TOLERANCE_PTS}pts, fidelity + correctness ratchets).`
          );
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
