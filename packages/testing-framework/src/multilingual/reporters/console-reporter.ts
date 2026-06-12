/**
 * Console Reporter - Minimal, helpful console output
 */

import type {
  Reporter,
  TestConfig,
  LanguageCode,
  LanguageResults,
  TestResults,
  RegressionResult,
} from '../types';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',

  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
};

/**
 * Console Reporter
 *
 * Outputs minimal, actionable test results to the console.
 */
export class ConsoleReporter implements Reporter {
  private verbose: boolean;
  private useColors: boolean;

  constructor(options: { verbose?: boolean; useColors?: boolean } = {}) {
    this.verbose = options.verbose ?? false;
    this.useColors = options.useColors ?? true;
  }

  /**
   * Report test start
   */
  reportStart(config: TestConfig): void {
    this.log('\n' + this.header('Multilingual Test Runner v1.0.0'));
    this.log(this.separator());
    this.log('');

    // Configuration summary
    const languages = config.languages?.join(', ') || 'all';
    const mode =
      config.mode === 'quick'
        ? `quick mode (${config.quickModeLimit || 10} patterns/lang)`
        : 'full mode';

    this.log(`${this.dim('Languages:')} ${languages} (${config.languages?.length || 'all'})`);
    if (config.bundle) {
      this.log(`${this.dim('Bundle:')} ${config.bundle}`);
    }
    this.log(`${this.dim('Mode:')} ${mode}`);
    if (config.confidenceThreshold) {
      this.log(`${this.dim('Min Confidence:')} ${config.confidenceThreshold}`);
    }
    this.log('');
  }

  /**
   * Report language test start
   */
  reportLanguageStart(language: LanguageCode, bundle: string): void {
    if (this.verbose) {
      this.log(
        `${this.cyan('→')} Testing ${this.bright(language.toUpperCase())} with ${bundle}...`
      );
    }
  }

  /**
   * Report language test complete
   */
  reportLanguageComplete(results: LanguageResults): void {
    const status =
      results.status === 'pass'
        ? this.green('✓')
        : results.status === 'warning'
          ? this.yellow('⚠')
          : this.red('✗');

    const rate = `${results.parseSuccess}/${results.parseSuccess + results.parseFailure}`;
    const percentage = `(${(results.parseRate * 100).toFixed(0)}%)`;
    const duration = `${(results.duration / 1000).toFixed(1)}s`;
    const confidence = results.avgConfidence > 0 ? `conf: ${results.avgConfidence.toFixed(2)}` : '';

    this.log(
      `  ${status} ${this.bright(results.language.toUpperCase())}: ` +
        `${rate} ${percentage}  ` +
        `${this.dim('⏱')}  ${duration}` +
        (confidence ? `  ${this.dim(confidence)}` : '')
    );

    // Show failures if verbose
    if (this.verbose && results.parseFailure > 0) {
      const failures = results.parseResults.filter(r => !r.success);
      this.log(`    ${this.dim(`Failed patterns (${failures.length}):`)}`);

      // Show all failures with pattern ID for tracking
      for (const failure of failures) {
        this.log(`    ${this.dim('✗')} ${failure.pattern.codeExampleId || 'unknown'}`);
        this.log(`      ${this.dim('Input:')} ${failure.pattern.hyperscript}`);
        if (failure.error) {
          this.log(`      ${this.red('Error:')} ${failure.error}`);
        }
        if (failure.confidence !== undefined) {
          this.log(`      ${this.dim('Confidence:')} ${failure.confidence.toFixed(2)}`);
        }
      }
    }
  }

  /**
   * Report complete test run
   */
  reportComplete(results: TestResults): void {
    this.log('');
    this.log(this.separator());

    const statusIcon =
      results.summary.overallStatus === 'pass'
        ? this.green('✓ PASS')
        : results.summary.overallStatus === 'warning'
          ? this.yellow('⚠ WARNING')
          : this.red('✗ FAIL');

    const summary = `${results.summary.totalSuccess}/${results.summary.totalPatterns}`;
    const duration = `${(results.summary.totalDuration / 1000).toFixed(1)}s`;

    this.log(
      `${this.bright('Summary:')} ${statusIcon}  ` +
        `${summary}  ` +
        `${this.dim('Duration:')} ${duration}`
    );

    // Show bundle sizes if available
    if (Object.keys(results.bundles).length > 0) {
      this.log('');
      this.log(this.dim('Bundle Sizes:'));
      for (const [bundle, info] of Object.entries(results.bundles)) {
        const size = this.formatSize(info.size);
        const gzipSize = info.gzipSize ? ` (${this.formatSize(info.gzipSize)} gzipped)` : '';
        this.log(`  ${bundle}: ${size}${gzipSize}`);
      }
    }

    this.reportDegeneratePasses(results);
    this.reportExecutionFailures(results);

    this.log('');
  }

  /**
   * R2 — surface curated-subset patterns whose jsdom execution diverged from
   * the en reference's DOM effects. These can score 1.0 on parse fidelity yet
   * behave differently at runtime, so they're reported separately.
   */
  private reportExecutionFailures(results: TestResults): void {
    // pattern id -> languages where execution diverged
    const byPattern = new Map<string, string[]>();
    const scored = results.languageResults.filter(l => l.avgExecutionFidelity !== undefined);
    for (const lang of scored) {
      for (const id of lang.executionFailures ?? []) {
        let langs = byPattern.get(id);
        if (!langs) {
          langs = [];
          byPattern.set(id, langs);
        }
        langs.push(lang.language);
      }
    }
    if (scored.length === 0) return;

    const avg = scored.reduce((sum, l) => sum + (l.avgExecutionFidelity ?? 0), 0) / scored.length;
    this.log('');
    this.log(
      this.bright(`Execution (R2): avgExecutionFidelity ${avg.toFixed(4)} over curated subset`)
    );
    if (byPattern.size === 0) return;

    const totalInstances = [...byPattern.values()].reduce((n, langs) => n + langs.length, 0);
    this.log(
      this.yellow(
        `⚠ Execution divergence: ${totalInstances} instance(s) across ${byPattern.size} pattern(s)`
      )
    );
    this.log(
      this.dim('  (DOM effects differ from the en reference in jsdom — not parse failures)')
    );
    for (const [id, langs] of [...byPattern.entries()].sort((a, b) => b[1].length - a[1].length)) {
      this.log(
        `  ${this.dim('-')} ${id} ${this.dim(`(${langs.length}: ${langs.sort().join(',')})`)}`
      );
    }
  }

  /**
   * Surface *degenerate* passes — patterns that parse non-null but drop most of
   * the English reference's command structure (structural fidelity below the
   * threshold). These pass the parse-rate gate yet aren't faithful translations,
   * so they're reported separately rather than silently counted as green.
   */
  private reportDegeneratePasses(results: TestResults): void {
    // pattern id -> languages where it's a degenerate pass
    const byPattern = new Map<string, string[]>();
    for (const lang of results.languageResults) {
      for (const id of lang.degeneratePasses ?? []) {
        let langs = byPattern.get(id);
        if (!langs) {
          langs = [];
          byPattern.set(id, langs);
        }
        langs.push(lang.language);
      }
    }
    if (byPattern.size === 0) return;

    const totalInstances = [...byPattern.values()].reduce((n, langs) => n + langs.length, 0);
    this.log('');
    this.log(
      this.yellow(
        `⚠ Degenerate passes: ${totalInstances} instance(s) across ${byPattern.size} pattern(s)`
      )
    );
    this.log(
      this.dim('  (parse non-null but lost >50% of the English command structure — not failures)')
    );
    for (const [id, langs] of [...byPattern.entries()].sort((a, b) => b[1].length - a[1].length)) {
      this.log(
        `  ${this.dim('-')} ${id} ${this.dim(`(${langs.length}: ${langs.sort().join(',')})`)}`
      );
    }
  }

  /**
   * Report regression comparison
   */
  reportRegression(results: RegressionResult[]): void {
    this.log('');
    this.log(this.header('Regression Analysis'));
    this.log(this.separator());

    for (const result of results) {
      const statusIcon =
        result.status === 'improved'
          ? this.green('↑')
          : result.status === 'regressed'
            ? this.red('↓')
            : this.gray('→');

      this.log(`${statusIcon} ${this.bright(result.language.toUpperCase())}`);

      // Parse rate delta
      if (Math.abs(result.parseRateDelta) > 0.01) {
        const delta =
          result.parseRateDelta > 0
            ? this.green(`+${result.parseRateDelta.toFixed(1)}%`)
            : this.red(`${result.parseRateDelta.toFixed(1)}%`);
        this.log(`  Parse Rate: ${delta}`);
      }

      // Confidence delta
      if (Math.abs(result.avgConfidenceDelta) > 0.01) {
        const delta =
          result.avgConfidenceDelta > 0
            ? this.green(`+${result.avgConfidenceDelta.toFixed(2)}`)
            : this.red(`${result.avgConfidenceDelta.toFixed(2)}`);
        this.log(`  Avg Confidence: ${delta}`);
      }

      // New failures
      if (result.newFailures.length > 0) {
        this.log(`  ${this.red('New Failures:')} ${result.newFailures.length}`);
        if (this.verbose) {
          result.newFailures.slice(0, 5).forEach(id => {
            this.log(`    ${this.dim('- ' + id)}`);
          });
        }
      }

      // New successes
      if (result.newSuccesses.length > 0) {
        this.log(`  ${this.green('New Successes:')} ${result.newSuccesses.length}`);
      }

      // Fidelity regressions (faithful pass → degenerate pass)
      if (result.newDegeneratePasses.length > 0) {
        this.log(
          `  ${this.yellow('Fidelity Regressions:')} ${result.newDegeneratePasses.length}` +
            ` ${this.dim(`(${result.newDegeneratePasses.join(', ')})`)}`
        );
      }

      // R2 — execution regressions (faithful execution → divergent DOM effects)
      if (result.newExecutionFailures.length > 0) {
        this.log(
          `  ${this.red('Execution Regressions:')} ${result.newExecutionFailures.length}` +
            ` ${this.dim(`(${result.newExecutionFailures.join(', ')})`)}`
        );
      }

      this.log('');
    }
  }

  /**
   * Report error
   */
  reportError(error: Error): void {
    this.log('');
    this.log(this.red('✗ Error: ') + error.message);
    if (this.verbose && error.stack) {
      this.log(this.dim(error.stack));
    }
    this.log('');
  }

  // =============================================================================
  // Formatting Helpers
  // =============================================================================

  private log(message: string): void {
    console.log(message);
  }

  private separator(char: string = '━', length: number = 60): string {
    return this.dim(char.repeat(length));
  }

  private header(text: string): string {
    return this.bright(text);
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // =============================================================================
  // Color Helpers
  // =============================================================================

  private color(text: string, color: string): string {
    return this.useColors ? `${color}${text}${colors.reset}` : text;
  }

  private bright(text: string): string {
    return this.color(text, colors.bright);
  }

  private dim(text: string): string {
    return this.color(text, colors.dim);
  }

  private green(text: string): string {
    return this.color(text, colors.green);
  }

  private yellow(text: string): string {
    return this.color(text, colors.yellow);
  }

  private red(text: string): string {
    return this.color(text, colors.red);
  }

  private cyan(text: string): string {
    return this.color(text, colors.cyan);
  }

  private gray(text: string): string {
    return this.color(text, colors.gray);
  }
}

/**
 * Create a default console reporter
 */
export function createConsoleReporter(verbose: boolean = false): ConsoleReporter {
  return new ConsoleReporter({ verbose, useColors: true });
}
