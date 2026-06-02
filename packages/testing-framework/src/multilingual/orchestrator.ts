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
import type { TestConfig, TestResults, LanguageResults, LanguageCode, Reporter } from './types';

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

    // Select bundle for this language
    const bundle = this.config.bundle
      ? await getBundleInfo(this.config.bundle)
      : await selectBundle([language], this.config.build || false);

    if (!bundle || !bundle.exists) {
      throw new Error(`Bundle not found for language: ${language}`);
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
