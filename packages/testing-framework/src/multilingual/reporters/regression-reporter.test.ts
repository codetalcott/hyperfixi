import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RegressionReporter } from './regression-reporter';
import type { TestResults, LanguageResults, ParseResult, Baseline } from '../types';

/** Minimal ParseResult for a successful pattern. */
function pass(id: string): ParseResult {
  return {
    pattern: {
      codeExampleId: id,
      language: 'ja',
      hyperscript: '',
      wordOrder: 'SOV',
      confidence: 1,
      verifiedParses: 0,
      roleAlignmentScore: 0,
    },
    success: true,
    duration: 0,
  };
}

function lang(
  parseResults: ParseResult[],
  degeneratePasses: string[],
  lossyPasses: string[] = [],
  avgFidelity = 1
): LanguageResults {
  const parseSuccess = parseResults.filter(r => r.success).length;
  return {
    language: 'ja',
    bundle: 'browser-priority',
    parseResults,
    parseSuccess,
    parseFailure: parseResults.length - parseSuccess,
    parseRate: parseSuccess / parseResults.length,
    avgConfidence: 1,
    avgFidelity,
    degeneratePasses,
    lossyPasses,
    duration: 0,
    status: 'pass',
  };
}

function results(language: LanguageResults): TestResults {
  return {
    timestamp: '',
    commit: 'test',
    config: {} as TestResults['config'],
    languageResults: [language],
    bundles: {},
    summary: {
      totalPatterns: language.parseResults.length,
      totalSuccess: language.parseSuccess,
      totalFailure: language.parseFailure,
      totalDuration: 0,
      overallStatus: 'pass',
    },
  };
}

describe('RegressionReporter fidelity ratchet', () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function reporterWith(baseline: Baseline): RegressionReporter {
    dir = mkdtempSync(join(tmpdir(), 'fidelity-'));
    const path = join(dir, 'baseline.json');
    writeFileSync(path, JSON.stringify(baseline));
    return new RegressionReporter(path);
  }

  const baseline: Baseline = {
    timestamp: '',
    commit: 'base',
    languages: {
      ja: {
        parseSuccess: 3,
        parseFailure: 1,
        parseRate: 0.75,
        avgConfidence: 1,
        avgFidelity: 0.9,
        // `was-degenerate` already degenerate; `was-faithful` is a clean pass;
        // `was-fail` failed in baseline.
        degeneratePasses: ['was-degenerate'],
        lossyPasses: ['was-lossy'],
        bundleSize: undefined,
        patterns: {
          'was-faithful': { success: true, confidence: 1 },
          'was-degenerate': { success: true, confidence: 1 },
          'was-lossy': { success: true, confidence: 1 },
          stable: { success: true, confidence: 1 },
          'was-fail': { success: false, confidence: undefined },
        },
      },
    },
    bundles: {},
  };

  it('flags a faithful baseline pass that became degenerate', () => {
    const reporter = reporterWith(baseline);
    // `was-faithful` is now degenerate; `was-fail` now parses degenerately (improvement).
    reporter.reportComplete(
      results(
        lang(
          [pass('was-faithful'), pass('was-degenerate'), pass('stable'), pass('was-fail')],
          ['was-faithful', 'was-degenerate', 'was-fail']
        )
      )
    );
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    // Only the faithful→degenerate transition is a regression.
    expect(r.newDegeneratePasses).toEqual(['was-faithful']);
    // `was-degenerate` (already degenerate) and `was-fail` (was failing) are excluded.
    expect(r.newDegeneratePasses).not.toContain('was-degenerate');
    expect(r.newDegeneratePasses).not.toContain('was-fail');
    expect(r.status).toBe('regressed');
  });

  it('does not flag anything when fidelity is unchanged', () => {
    const reporter = reporterWith(baseline);
    reporter.reportComplete(
      results(
        lang([pass('was-faithful'), pass('was-degenerate'), pass('stable')], ['was-degenerate'])
      )
    );
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newDegeneratePasses).toEqual([]);
  });

  it('never retro-flags when the baseline has no fidelity data', () => {
    const noFidelity: Baseline = structuredClone(baseline);
    delete noFidelity.languages.ja!.degeneratePasses;
    const reporter = reporterWith(noFidelity);
    reporter.reportComplete(
      results(lang([pass('was-faithful'), pass('stable')], ['was-faithful', 'stable']))
    );
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newDegeneratePasses).toEqual([]);
  });
});

describe('RegressionReporter correctness (lossy) ratchet — R0', () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function reporterWith(baseline: Baseline): RegressionReporter {
    dir = mkdtempSync(join(tmpdir(), 'lossy-'));
    const path = join(dir, 'baseline.json');
    writeFileSync(path, JSON.stringify(baseline));
    return new RegressionReporter(path);
  }

  const baseline: Baseline = {
    timestamp: '',
    commit: 'base',
    languages: {
      ja: {
        parseSuccess: 4,
        parseFailure: 0,
        parseRate: 1,
        avgConfidence: 1,
        avgFidelity: 0.9,
        degeneratePasses: ['was-degenerate'],
        lossyPasses: ['was-lossy'],
        bundleSize: undefined,
        patterns: {
          'was-faithful': { success: true, confidence: 1 },
          'was-lossy': { success: true, confidence: 1 },
          'was-degenerate': { success: true, confidence: 1 },
          stable: { success: true, confidence: 1 },
        },
      },
    },
    bundles: {},
  };

  it('flags a faithful baseline pass that became lossy (silent command-drop)', () => {
    const reporter = reporterWith(baseline);
    // `was-faithful` is now lossy; `was-lossy` stays lossy (not re-flagged).
    reporter.reportComplete(
      results(
        lang(
          [pass('was-faithful'), pass('was-lossy'), pass('stable')],
          [],
          ['was-faithful', 'was-lossy'],
          0.85
        )
      )
    );
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newLossyPasses).toEqual(['was-faithful']);
    expect(r.newLossyPasses).not.toContain('was-lossy'); // already lossy in baseline
    expect(r.avgFidelityDelta).toBeCloseTo(-0.05, 5);
    expect(r.status).toBe('regressed');
  });

  it('does not flag when lossy set is unchanged', () => {
    const reporter = reporterWith(baseline);
    reporter.reportComplete(
      results(
        lang([pass('was-faithful'), pass('was-lossy'), pass('stable')], [], ['was-lossy'], 0.9)
      )
    );
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newLossyPasses).toEqual([]);
    expect(r.avgFidelityDelta).toBeCloseTo(0, 5);
  });

  it('treats faithful→lossy as improvement-neutral for an already-lossy or failing pattern', () => {
    // A pattern lossy in baseline that becomes faithful is not a regression (and not
    // listed); only faithful→lossy is flagged.
    const reporter = reporterWith(baseline);
    reporter.reportComplete(
      results(lang([pass('was-faithful'), pass('was-lossy'), pass('stable')], [], [], 0.95))
    );
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newLossyPasses).toEqual([]);
  });

  it('never retro-flags when the baseline has no lossy data', () => {
    const noLossy: Baseline = structuredClone(baseline);
    delete noLossy.languages.ja!.lossyPasses;
    const reporter = reporterWith(noLossy);
    reporter.reportComplete(
      results(lang([pass('was-faithful'), pass('stable')], [], ['was-faithful', 'stable'], 0.5))
    );
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newLossyPasses).toEqual([]);
  });
});

describe('RegressionReporter execution ratchet — R2 (session 5)', () => {
  // LOCK: the R2 execution ratchet flags ONLY pass→fail transitions on the
  // curated execution subset, with the same never-retro-flag guard as the
  // degenerate/lossy ratchets (an un-regenerated baseline carries no
  // `executionFailures`, so nothing is flagged until one is saved). Trapped
  // runtime errors are deliberately NOT part of the match signal — only the
  // deterministic DOM-effect comparison is (see execution-validator.ts).
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function reporterWith(baseline: Baseline): RegressionReporter {
    dir = mkdtempSync(join(tmpdir(), 'execution-'));
    const path = join(dir, 'baseline.json');
    writeFileSync(path, JSON.stringify(baseline));
    return new RegressionReporter(path);
  }

  function langWithExecution(
    executionFailures: string[],
    avgExecutionFidelity: number
  ): LanguageResults {
    const l = lang([pass('stable')], []);
    l.avgExecutionFidelity = avgExecutionFidelity;
    l.executionFailures = executionFailures;
    return l;
  }

  const baseline: Baseline = {
    timestamp: '',
    commit: 'base',
    languages: {
      ja: {
        parseSuccess: 1,
        parseFailure: 0,
        parseRate: 1,
        avgConfidence: 1,
        avgFidelity: 1,
        avgExecutionFidelity: 0.8,
        executionFailures: ['was-failing'],
        degeneratePasses: [],
        lossyPasses: [],
        bundleSize: undefined,
        patterns: { stable: { success: true, confidence: 1 } },
      },
    },
    bundles: {},
  };

  it('flags a faithfully-executing baseline pattern that now diverges', () => {
    const reporter = reporterWith(baseline);
    reporter.reportComplete(results(langWithExecution(['was-failing', 'was-passing'], 0.7)));
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newExecutionFailures).toEqual(['was-passing']);
    // Already failing in baseline = burn-down list, not a regression.
    expect(r.newExecutionFailures).not.toContain('was-failing');
    expect(r.avgExecutionFidelityDelta).toBeCloseTo(-0.1, 5);
    expect(r.status).toBe('regressed');
  });

  it('does not flag when the failure set is unchanged', () => {
    const reporter = reporterWith(baseline);
    reporter.reportComplete(results(langWithExecution(['was-failing'], 0.8)));
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newExecutionFailures).toEqual([]);
    expect(r.avgExecutionFidelityDelta).toBeCloseTo(0, 5);
  });

  it('never retro-flags when the baseline has no execution data', () => {
    const noExecution: Baseline = structuredClone(baseline);
    delete noExecution.languages.ja!.executionFailures;
    delete noExecution.languages.ja!.avgExecutionFidelity;
    const reporter = reporterWith(noExecution);
    reporter.reportComplete(results(langWithExecution(['anything', 'everything'], 0.1)));
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.newExecutionFailures).toEqual([]);
    expect(r.avgExecutionFidelityDelta).toBe(0);
  });

  it('persists execution data when saving a baseline', () => {
    const reporter = reporterWith(baseline);
    const res = results(langWithExecution(['was-failing'], 0.8));
    reporter.reportComplete(res);
    reporter.saveAsBaseline(res);
    const saved = JSON.parse(readFileSync(join(dir, 'baseline.json'), 'utf-8')) as Baseline;
    expect(saved.languages.ja!.avgExecutionFidelity).toBeCloseTo(0.8, 5);
    expect(saved.languages.ja!.executionFailures).toEqual(['was-failing']);
  });
});

describe('RegressionReporter precision ratchet — R0-precision (trust floor)', () => {
  // LOCK: avgPrecision is the phantom-command signal recall (avgFidelity) cannot
  // see — the fraction of each parse's actions justified by the en reference. The
  // reporter computes avgPrecisionDelta with the SAME both-sides guard as R1/R2 (an
  // un-regenerated baseline carries no avgPrecision, so the delta is 0 and nothing
  // retro-flags). The CLI turns a delta < -0.02 into a CI failure.
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function reporterWith(baseline: Baseline): RegressionReporter {
    dir = mkdtempSync(join(tmpdir(), 'precision-'));
    const path = join(dir, 'baseline.json');
    writeFileSync(path, JSON.stringify(baseline));
    return new RegressionReporter(path);
  }

  function langWithPrecision(avgPrecision: number): LanguageResults {
    const l = lang([pass('stable')], []);
    l.avgPrecision = avgPrecision;
    return l;
  }

  const baseline: Baseline = {
    timestamp: '',
    commit: 'base',
    languages: {
      ja: {
        parseSuccess: 1,
        parseFailure: 0,
        parseRate: 1,
        avgConfidence: 1,
        avgFidelity: 1,
        avgPrecision: 1,
        degeneratePasses: [],
        lossyPasses: [],
        bundleSize: undefined,
        patterns: { stable: { success: true, confidence: 1 } },
      },
    },
    bundles: {},
  };

  it('reports a negative avgPrecisionDelta when precision drops (phantom commands injected)', () => {
    const reporter = reporterWith(baseline);
    reporter.reportComplete(results(langWithPrecision(0.9)));
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.avgPrecisionDelta).toBeCloseTo(-0.1, 5);
  });

  it('reports ~0 delta when precision is unchanged', () => {
    const reporter = reporterWith(baseline);
    reporter.reportComplete(results(langWithPrecision(1)));
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.avgPrecisionDelta).toBeCloseTo(0, 5);
  });

  it('never retro-flags when the baseline has no precision data', () => {
    const noPrecision: Baseline = structuredClone(baseline);
    delete noPrecision.languages.ja!.avgPrecision;
    const reporter = reporterWith(noPrecision);
    reporter.reportComplete(results(langWithPrecision(0.1)));
    const r = reporter.getRegressionResults().find(x => x.language === 'ja')!;
    expect(r.avgPrecisionDelta).toBe(0);
  });

  it('persists avgPrecision when saving a baseline', () => {
    const reporter = reporterWith(baseline);
    const res = results(langWithPrecision(0.95));
    reporter.reportComplete(res);
    reporter.saveAsBaseline(res);
    const saved = JSON.parse(readFileSync(join(dir, 'baseline.json'), 'utf-8')) as Baseline;
    expect(saved.languages.ja!.avgPrecision).toBeCloseTo(0.95, 5);
  });
});
