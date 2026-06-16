/**
 * Regression Reporter - Compares current results against baseline
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import type {
  Reporter,
  TestConfig,
  LanguageCode,
  LanguageResults,
  TestResults,
  Baseline,
  RegressionResult,
} from '../types';

/**
 * Regression Reporter
 *
 * Compares test results against a baseline and reports regressions.
 */
export class RegressionReporter implements Reporter {
  private baselinePath: string;
  private baseline: Baseline | null = null;
  private currentResults: TestResults | null = null;
  private regressionResults: RegressionResult[] = [];

  constructor(baselinePath: string = './test-results/baseline.json') {
    this.baselinePath = baselinePath;
    this.loadBaseline();
  }

  /**
   * Load baseline from file
   */
  private loadBaseline(): void {
    if (!existsSync(this.baselinePath)) {
      console.warn(`Warning: Baseline file not found at ${this.baselinePath}`);
      return;
    }

    try {
      const data = readFileSync(this.baselinePath, 'utf-8');
      this.baseline = JSON.parse(data);
    } catch (error) {
      console.error(
        `Error loading baseline: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Report test start
   */
  reportStart(_config: TestConfig): void {
    // No-op
  }

  /**
   * Report language start
   */
  reportLanguageStart(_language: LanguageCode, _bundle: string): void {
    // No-op
  }

  /**
   * Report language complete
   */
  reportLanguageComplete(_results: LanguageResults): void {
    // No-op
  }

  /**
   * Report complete test run - compare to baseline
   */
  reportComplete(results: TestResults): void {
    this.currentResults = results;

    if (!this.baseline) {
      console.log('No baseline available - skipping regression analysis');
      return;
    }

    this.regressionResults = this.compareToBaseline(results);
  }

  /**
   * Get regression results
   */
  getRegressionResults(): RegressionResult[] {
    return this.regressionResults;
  }

  /**
   * Report error
   */
  reportError(_error: Error): void {
    // No-op
  }

  /**
   * Compare current results to baseline
   */
  private compareToBaseline(results: TestResults): RegressionResult[] {
    if (!this.baseline) return [];

    const regressions: RegressionResult[] = [];

    for (const langResult of results.languageResults) {
      const baselineLang = this.baseline.languages[langResult.language];
      if (!baselineLang) continue;

      const parseRateDelta = (langResult.parseRate - baselineLang.parseRate) * 100;
      const avgConfidenceDelta = langResult.avgConfidence - baselineLang.avgConfidence;
      const avgFidelityDelta = (langResult.avgFidelity ?? 0) - (baselineLang.avgFidelity ?? 0);
      // R0-precision — both-sides guard: an un-regenerated baseline (no
      // avgPrecision yet) must never retro-flag.
      const avgPrecisionDelta =
        langResult.avgPrecision !== undefined && baselineLang.avgPrecision !== undefined
          ? langResult.avgPrecision - baselineLang.avgPrecision
          : 0;
      // R1 — only meaningful when BOTH sides carry role data; an un-regenerated
      // baseline (no avgRoleFidelity yet) must never retro-flag.
      const avgRoleFidelityDelta =
        langResult.avgRoleFidelity !== undefined && baselineLang.avgRoleFidelity !== undefined
          ? langResult.avgRoleFidelity - baselineLang.avgRoleFidelity
          : 0;
      // R2 — same both-sides guard: an un-regenerated baseline (no execution
      // data yet) must never retro-flag.
      const avgExecutionFidelityDelta =
        langResult.avgExecutionFidelity !== undefined &&
        baselineLang.avgExecutionFidelity !== undefined
          ? langResult.avgExecutionFidelity - baselineLang.avgExecutionFidelity
          : 0;
      const bundleSizeDelta = this.getBundleSizeDelta(langResult, baselineLang);

      // Identify new failures and successes
      const newFailures = this.findNewFailures(langResult, baselineLang);
      const newSuccesses = this.findNewSuccesses(langResult, baselineLang);
      // Fidelity ratchet: faithful pass in baseline → degenerate pass now.
      const newDegeneratePasses = this.findNewDegeneratePasses(langResult, baselineLang);
      // Correctness ratchet (R0): faithful pass in baseline → lossy pass now.
      const newLossyPasses = this.findNewLossyPasses(langResult, baselineLang);
      // Execution ratchet (R2): faithful execution in baseline → divergent now.
      const newExecutionFailures = this.findNewExecutionFailures(langResult, baselineLang);

      // Determine status
      let status: 'improved' | 'regressed' | 'unchanged' = 'unchanged';
      if (
        parseRateDelta < -5 ||
        newFailures.length > 0 ||
        newDegeneratePasses.length > 0 ||
        newLossyPasses.length > 0 ||
        newExecutionFailures.length > 0
      ) {
        status = 'regressed';
      } else if (parseRateDelta > 5 || newSuccesses.length > 0) {
        status = 'improved';
      }

      regressions.push({
        language: langResult.language,
        parseRateDelta,
        avgConfidenceDelta,
        avgFidelityDelta,
        avgPrecisionDelta,
        avgRoleFidelityDelta,
        avgExecutionFidelityDelta,
        bundleSizeDelta: bundleSizeDelta !== undefined ? bundleSizeDelta : undefined,
        newFailures,
        newSuccesses,
        newDegeneratePasses,
        newLossyPasses,
        newExecutionFailures,
        status,
      });
    }

    return regressions;
  }

  /**
   * Get bundle size delta
   */
  private getBundleSizeDelta(
    current: LanguageResults,
    baseline: { bundleSize: number | undefined }
  ): number | undefined {
    if (!current.bundleSize || !baseline.bundleSize) return undefined;
    return ((current.bundleSize - baseline.bundleSize) / baseline.bundleSize) * 100;
  }

  /**
   * Find patterns that failed in current but passed in baseline
   */
  private findNewFailures(
    current: LanguageResults,
    baseline: {
      parseSuccess: number;
      patterns: Record<string, { success: boolean; confidence: number | undefined }> | undefined;
    }
  ): string[] {
    // If no pattern-level baseline, return empty array
    if (!baseline.patterns) return [];

    const newFailures: string[] = [];

    for (const result of current.parseResults) {
      const baselinePattern = baseline.patterns[result.pattern.codeExampleId];
      if (baselinePattern && baselinePattern.success && !result.success) {
        newFailures.push(result.pattern.codeExampleId);
      }
    }

    return newFailures.slice(0, 10); // Limit to 10 for reporting
  }

  /**
   * Find patterns that passed in current but failed in baseline
   */
  private findNewSuccesses(
    current: LanguageResults,
    baseline: {
      parseSuccess: number;
      patterns: Record<string, { success: boolean; confidence: number | undefined }> | undefined;
    }
  ): string[] {
    // If no pattern-level baseline, return empty array
    if (!baseline.patterns) return [];

    const newSuccesses: string[] = [];

    for (const result of current.parseResults) {
      const baselinePattern = baseline.patterns[result.pattern.codeExampleId];
      if (baselinePattern && !baselinePattern.success && result.success) {
        newSuccesses.push(result.pattern.codeExampleId);
      }
    }

    return newSuccesses.slice(0, 10); // Limit to 10 for reporting
  }

  /**
   * Find patterns that *regressed in fidelity*: a faithful (non-degenerate) pass
   * in the baseline that is now a degenerate pass (still parses, but lost most of
   * the English command structure). This is the fidelity ratchet's signal.
   *
   * Returns [] when the baseline carries no fidelity data yet (`degeneratePasses`
   * undefined) so adopting the signal never retro-flags the whole corpus. A
   * pattern that went FAIL → degenerate-pass is an improvement (it now parses),
   * not a regression, and is excluded because it wasn't a baseline pass.
   */
  private findNewDegeneratePasses(
    current: LanguageResults,
    baseline: {
      patterns: Record<string, { success: boolean; confidence: number | undefined }> | undefined;
      degeneratePasses?: string[] | undefined;
    }
  ): string[] {
    if (!baseline.degeneratePasses || !baseline.patterns) return [];
    const baselineDegenerate = new Set(baseline.degeneratePasses);
    const currentDegenerate = new Set(current.degeneratePasses ?? []);

    const regressed: string[] = [];
    for (const id of currentDegenerate) {
      const wasPass = baseline.patterns[id]?.success === true;
      // Faithful baseline pass (passed, not already degenerate) that is now degenerate.
      if (wasPass && !baselineDegenerate.has(id)) regressed.push(id);
    }
    return regressed.sort();
  }

  /**
   * Correctness ratchet (R0): patterns that were a *faithful* pass (fidelity 1.0) in
   * the baseline but are now a *lossy* pass (0.5 ≤ fid < 1.0 — still parses, clears the
   * degenerate floor, but silently drops ≥1 command). This is the band the degenerate
   * ratchet misses (it only catches drops below 0.5). "Faithful in baseline" = a pass
   * that was neither degenerate nor lossy.
   *
   * Returns [] when the baseline carries no lossy data yet (`lossyPasses` undefined) so
   * adopting the signal never retro-flags the whole corpus — same guard as the
   * degenerate ratchet. A pattern already lossy in the baseline is not re-flagged.
   */
  private findNewLossyPasses(
    current: LanguageResults,
    baseline: {
      patterns: Record<string, { success: boolean; confidence: number | undefined }> | undefined;
      degeneratePasses?: string[] | undefined;
      lossyPasses?: string[] | undefined;
    }
  ): string[] {
    if (!baseline.lossyPasses || !baseline.patterns) return [];
    const baselineDegenerate = new Set(baseline.degeneratePasses ?? []);
    const baselineLossy = new Set(baseline.lossyPasses);
    const currentLossy = new Set(current.lossyPasses ?? []);

    const regressed: string[] = [];
    for (const id of currentLossy) {
      const wasPass = baseline.patterns[id]?.success === true;
      // Faithful baseline pass = passed AND not degenerate AND not already lossy.
      if (wasPass && !baselineDegenerate.has(id) && !baselineLossy.has(id)) regressed.push(id);
    }
    return regressed.sort();
  }

  /**
   * Execution ratchet (R2): curated-subset patterns that executed faithfully in
   * the baseline (scored, and not in its `executionFailures`) but diverge from
   * the en reference now. Returns [] when the baseline carries no execution
   * data yet (`executionFailures` undefined) so adopting the signal never
   * retro-flags — same guard as the degenerate/lossy ratchets. A pattern
   * already failing in the baseline is not re-flagged (that's the burn-down
   * list, not a regression).
   */
  private findNewExecutionFailures(
    current: LanguageResults,
    baseline: { executionFailures?: string[] | undefined }
  ): string[] {
    if (!baseline.executionFailures) return [];
    const baselineFailures = new Set(baseline.executionFailures);
    return (current.executionFailures ?? []).filter(id => !baselineFailures.has(id)).sort();
  }

  /**
   * Save current results as new baseline
   */
  saveAsBaseline(results: TestResults): void {
    const baseline: Baseline = {
      timestamp: results.timestamp,
      commit: results.commit || 'unknown',
      languages: {},
      bundles: {} as Record<
        string,
        { size: number; languages: LanguageCode[]; gzipSize: number | undefined }
      >,
    };

    // Convert bundles to proper format
    for (const [name, info] of Object.entries(results.bundles)) {
      baseline.bundles[name] = {
        size: info.size,
        languages: info.languages,
        gzipSize: info.gzipSize ?? undefined,
      };
    }

    for (const langResult of results.languageResults) {
      // Build pattern-level tracking
      const patterns: Record<string, { success: boolean; confidence: number | undefined }> = {};
      for (const result of langResult.parseResults) {
        patterns[result.pattern.codeExampleId] = {
          success: result.success,
          confidence: result.confidence,
        };
      }

      baseline.languages[langResult.language] = {
        parseSuccess: langResult.parseSuccess,
        parseFailure: langResult.parseFailure,
        parseRate: langResult.parseRate,
        avgConfidence: langResult.avgConfidence,
        // Structural fidelity vs the English reference parse — tracks degenerate
        // (non-null but shallow) passes that the parse rate alone can't surface.
        avgFidelity: langResult.avgFidelity ?? undefined,
        // R0-precision — fraction of each parse's actions justified by the en
        // reference (phantom-command signal recall can't see). Recorded + ratcheted.
        avgPrecision: langResult.avgPrecision ?? undefined,
        // R1 — role fidelity (role name + value type vs the en reference).
        // Recorded + ratcheted; burn-down is NOT part of the parsing-track goal.
        avgRoleFidelity: langResult.avgRoleFidelity ?? undefined,
        // R2 — execution fidelity over the curated subset (DOM effects vs the
        // en reference in jsdom). Recorded + ratcheted; burn-down deferred.
        avgExecutionFidelity: langResult.avgExecutionFidelity ?? undefined,
        executionFailures: langResult.executionFailures ?? undefined,
        degeneratePasses: langResult.degeneratePasses ?? undefined,
        lossyPasses: langResult.lossyPasses ?? undefined,
        bundleSize: langResult.bundleSize ?? undefined,
        patterns,
      };
    }

    writeFileSync(this.baselinePath, JSON.stringify(baseline, null, 2));
    console.log(`Baseline saved to ${this.baselinePath}`);
  }

  /**
   * Check if baseline exists
   */
  hasBaseline(): boolean {
    return this.baseline !== null;
  }
}

/**
 * Create a regression reporter
 */
export function createRegressionReporter(baselinePath?: string): RegressionReporter {
  return new RegressionReporter(baselinePath);
}
