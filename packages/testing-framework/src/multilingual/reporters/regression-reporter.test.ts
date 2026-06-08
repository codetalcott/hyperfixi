import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
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

function lang(parseResults: ParseResult[], degeneratePasses: string[]): LanguageResults {
  const parseSuccess = parseResults.filter(r => r.success).length;
  return {
    language: 'ja',
    bundle: 'browser-priority',
    parseResults,
    parseSuccess,
    parseFailure: parseResults.length - parseSuccess,
    parseRate: parseSuccess / parseResults.length,
    avgConfidence: 1,
    degeneratePasses,
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
        bundleSize: undefined,
        patterns: {
          'was-faithful': { success: true, confidence: 1 },
          'was-degenerate': { success: true, confidence: 1 },
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
