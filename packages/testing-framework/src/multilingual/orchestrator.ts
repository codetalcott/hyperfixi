/**
 * Orchestrator - Main test runner that coordinates all components
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { loadPatterns } from './pattern-loader';
import { selectBundle, getBundleInfo } from './bundle-builder';
import { ParseValidator } from './validators/parse-validator';
import { SizeValidator } from './validators/size-validator';
import { ConsoleReporter } from './reporters/console-reporter';
import { JSONReporter } from './reporters/json-reporter';
import { RegressionReporter } from './reporters/regression-reporter';
import type {
  TestConfig,
  TestResults,
  LanguageResults,
  LanguageCode,
  Reporter,
  BundleInfo,
} from './types';
import { computeFidelity, FIDELITY_THRESHOLD } from './fidelity';

const execAsync = promisify(exec);

/**
 * Test Orchestrator
 *
 * Coordinates the entire multilingual test workflow:
 * 1. Load patterns from database
 * 2. Select/build bundles
 * 3. Run validators
 * 4. Report results
 */
export class TestOrchestrator {
  private config: TestConfig;
  private reporters: Reporter[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.setupReporters();
  }

  /**
   * Setup default reporters
   */
  private setupReporters(): void {
    // Always add console reporter
    this.reporters.push(
      new ConsoleReporter({
        verbose: this.config.verbose || false,
        useColors: true,
      })
    );

    // Add JSON reporter for structured output
    this.reporters.push(new JSONReporter('./test-results/results.json'));

    // Add regression reporter if requested. Default to the COMMITTED baseline
    // (test-results/ is gitignored), overridable via --baseline.
    if (this.config.regression) {
      this.reporters.push(
        new RegressionReporter(this.config.baselinePath ?? './baselines/multilingual-priority.json')
      );
    }
  }

  /**
   * Add custom reporter
   */
  addReporter(reporter: Reporter): void {
    this.reporters.push(reporter);
  }

  /**
   * Run the test suite
   */
  async run(): Promise<TestResults> {
    // Notify reporters of test start
    for (const reporter of this.reporters) {
      reporter.reportStart(this.config);
    }

    try {
      // Get git commit for tracking
      const commit = await this.getGitCommit();

      // Load patterns
      const patterns = await loadPatterns(this.config);

      // Group patterns by language
      const patternsByLanguage = this.groupByLanguage(patterns);

      // Test each language
      const languageResults: LanguageResults[] = [];

      for (const [language, langPatterns] of patternsByLanguage.entries()) {
        const result = await this.testLanguage(language as LanguageCode, langPatterns);
        languageResults.push(result);
      }

      // Score structural fidelity against the English reference parse. This
      // surfaces *degenerate* passes — patterns that parse non-null but drop most
      // of the source's commands — which the parse-rate metric alone can't see.
      this.scoreFidelity(languageResults);

      // Collect bundle information
      const bundles: TestResults['bundles'] = {};
      for (const langResult of languageResults) {
        if (!bundles[langResult.bundle]) {
          const bundleInfo = await getBundleInfo(langResult.bundle);
          if (bundleInfo && bundleInfo.exists) {
            bundles[langResult.bundle] = {
              size: bundleInfo.size,
              languages: bundleInfo.languages,
            };
          }
        }
      }

      // Calculate summary
      const summary = {
        totalPatterns: patterns.length,
        totalSuccess: languageResults.reduce((sum, r) => sum + r.parseSuccess, 0),
        totalFailure: languageResults.reduce((sum, r) => sum + r.parseFailure, 0),
        totalDuration: languageResults.reduce((sum, r) => sum + r.duration, 0),
        overallStatus: this.calculateOverallStatus(languageResults),
      };

      const results: TestResults = {
        timestamp: new Date().toISOString(),
        commit,
        config: this.config,
        languageResults,
        bundles,
        summary,
      };

      // Report completion
      for (const reporter of this.reporters) {
        reporter.reportComplete(results);
      }

      // Report regression if enabled
      if (this.config.regression) {
        const regressionReporter = this.reporters.find(r => r instanceof RegressionReporter) as
          | RegressionReporter
          | undefined;

        if (regressionReporter?.hasBaseline()) {
          const regressionResults = regressionReporter.getRegressionResults();
          for (const reporter of this.reporters) {
            if (reporter.reportRegression) {
              reporter.reportRegression(regressionResults);
            }
          }
        }
      }

      return results;
    } catch (error) {
      // Report error
      const err = error instanceof Error ? error : new Error(String(error));
      for (const reporter of this.reporters) {
        reporter.reportError(err);
      }
      throw err;
    }
  }

  /**
   * Test a single language
   */
  private async testLanguage(language: LanguageCode, patterns: any[]): Promise<LanguageResults> {
    const startTime = performance.now();

    // Select bundle for this language. The bundle is consumed only for size
    // reporting — parse validation below runs in-process via parseSemantic — so a
    // missing display bundle is a warning, not a fatal error that aborts the sweep.
    const selected = this.config.bundle
      ? await getBundleInfo(this.config.bundle)
      : await selectBundle([language], this.config.build || false);

    const bundle: BundleInfo = selected ?? {
      name: `browser-${language}`,
      path: '',
      languages: [language],
      size: 0,
      exists: false,
    };

    if (!bundle.exists) {
      console.warn(
        `⚠ No display bundle for '${language}' (${bundle.name}); reporting size 0 and continuing with in-process parse.`
      );
    }

    // Notify reporters
    for (const reporter of this.reporters) {
      reporter.reportLanguageStart(language, bundle.name);
    }

    // Run parse validation
    const parseValidator = new ParseValidator();
    const parseResults = await parseValidator.validate(patterns);

    // Calculate statistics
    const parseSuccess = parseResults.filter(r => r.success).length;
    const parseFailure = parseResults.length - parseSuccess;
    const parseRate = parseResults.length > 0 ? parseSuccess / parseResults.length : 0;
    const avgConfidence =
      parseResults
        .filter(r => r.success && r.confidence !== undefined)
        .reduce((sum, r) => sum + (r.confidence || 0), 0) / (parseSuccess || 1);

    // Determine status
    const status = parseRate >= 0.95 ? 'pass' : parseRate >= 0.8 ? 'warning' : 'fail';

    const result: LanguageResults = {
      language,
      bundle: bundle.name,
      bundleSize: bundle.size,
      parseResults,
      parseSuccess,
      parseFailure,
      parseRate,
      avgConfidence,
      duration: performance.now() - startTime,
      status,
    };

    // Notify reporters
    for (const reporter of this.reporters) {
      reporter.reportLanguageComplete(result);
    }

    return result;
  }

  /**
   * Score structural fidelity of every parse against the English reference parse
   * of the same pattern, in-place. Fills `ParseResult.fidelity` plus per-language
   * `avgFidelity` / `degeneratePasses`. English is the reference, so its own
   * results are left unscored. No-op when English wasn't part of the run.
   */
  private scoreFidelity(languageResults: LanguageResults[]): void {
    const en = languageResults.find(r => r.language === 'en');
    if (!en) return;

    // codeExampleId -> English action signature (only successful en parses).
    const reference = new Map<string, string[]>();
    // R1: codeExampleId -> English role signature (action.role:valueType set).
    const roleReference = new Map<string, string[]>();
    for (const r of en.parseResults) {
      if (r.success && r.actionSignature && r.actionSignature.length > 0) {
        reference.set(r.pattern.codeExampleId, r.actionSignature);
      }
      if (r.success && r.roleSignature && r.roleSignature.length > 0) {
        roleReference.set(r.pattern.codeExampleId, r.roleSignature);
      }
    }

    for (const lang of languageResults) {
      if (lang.language === 'en') continue;

      const degenerate: string[] = [];
      const lossy: string[] = [];
      const scores: number[] = [];
      const roleScores: number[] = [];

      for (const result of lang.parseResults) {
        if (!result.success || !result.actionSignature) continue;
        const ref = reference.get(result.pattern.codeExampleId);
        if (!ref) continue;

        const fidelity = computeFidelity(ref, result.actionSignature);
        if (fidelity === undefined) continue;

        result.fidelity = fidelity;
        scores.push(fidelity);
        if (fidelity < FIDELITY_THRESHOLD) degenerate.push(result.pattern.codeExampleId);
        else if (fidelity < 1) lossy.push(result.pattern.codeExampleId);

        // R1 — role recall vs the en role signature (role name + value type).
        const roleRef = roleReference.get(result.pattern.codeExampleId);
        if (roleRef && result.roleSignature) {
          const roleFidelity = computeFidelity(roleRef, result.roleSignature);
          if (roleFidelity !== undefined) {
            result.roleFidelity = roleFidelity;
            roleScores.push(roleFidelity);
          }
        }
      }

      lang.avgFidelity =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
      lang.avgRoleFidelity =
        roleScores.length > 0
          ? roleScores.reduce((a, b) => a + b, 0) / roleScores.length
          : undefined;
      lang.degeneratePasses = degenerate.sort();
      lang.lossyPasses = lossy.sort();
    }
  }

  /**
   * Group patterns by language
   */
  private groupByLanguage(patterns: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    for (const pattern of patterns) {
      const lang = pattern.language;
      if (!grouped.has(lang)) {
        grouped.set(lang, []);
      }
      grouped.get(lang)!.push(pattern);
    }

    return grouped;
  }

  /**
   * Calculate overall test status
   */
  private calculateOverallStatus(results: LanguageResults[]): 'pass' | 'warning' | 'fail' {
    const hasFail = results.some(r => r.status === 'fail');
    const hasWarning = results.some(r => r.status === 'warning');

    if (hasFail) return 'fail';
    if (hasWarning) return 'warning';
    return 'pass';
  }

  /**
   * Get current git commit
   */
  private async getGitCommit(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('git rev-parse --short HEAD');
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Get regression reporter
   */
  getRegressionReporter(): RegressionReporter | undefined {
    return this.reporters.find(r => r instanceof RegressionReporter) as
      | RegressionReporter
      | undefined;
  }
}

/**
 * Quick run helper
 */
export async function runMultilingualTests(config: Partial<TestConfig>): Promise<TestResults> {
  const fullConfig: TestConfig = {
    mode: 'quick',
    quickModeLimit: 10,
    ...config,
  };

  const orchestrator = new TestOrchestrator(fullConfig);
  return await orchestrator.run();
}
