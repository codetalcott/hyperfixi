/**
 * Parse Diagnostics - Enhanced debugging for multilingual parsing failures
 */

import type { PatternTranslation, LanguageCode, ParseResult } from '../types';

export interface ParseTrace {
  stage: string;
  timestamp: number;
  data: unknown;
  error: string | undefined;
}

export interface DiagnosticResult {
  pattern: PatternTranslation;
  traces: ParseTrace[];
  parseResult: ParseResult | undefined;
  analysisNotes: string[];
}

export interface FailurePattern {
  type: string;
  count: number;
  examples: string[];
  affectedLanguages: LanguageCode[];
}

/**
 * Parse Diagnostics Collector
 *
 * Captures detailed trace information during parsing for debugging
 */
export class ParseDiagnostics {
  private traces: Map<string, ParseTrace[]> = new Map();
  private enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  /**
   * Enable/disable diagnostics collection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Record a trace event
   */
  trace(patternId: string, stage: string, data?: unknown, error?: string): void {
    if (!this.enabled) return;

    const traces = this.traces.get(patternId) || [];
    traces.push({
      stage,
      timestamp: performance.now(),
      data,
      error,
    });
    this.traces.set(patternId, traces);
  }

  /**
   * Get traces for a pattern
   */
  getTraces(patternId: string): ParseTrace[] {
    return this.traces.get(patternId) || [];
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces.clear();
  }

  /**
   * Export all traces
   */
  exportTraces(): Map<string, ParseTrace[]> {
    return new Map(this.traces);
  }
}

/**
 * Failure Pattern Analyzer
 *
 * Analyzes parse failures to identify common patterns and issues
 */
export class FailureAnalyzer {
  /**
   * Analyze failures and group by common patterns
   */
  analyzeFailures(results: ParseResult[]): FailurePattern[] {
    const failures = results.filter(r => !r.success);
    const patterns: Map<string, FailurePattern> = new Map();

    for (const failure of failures) {
      // Categorize by error message
      const errorType = this.categorizeError(failure.error || 'Unknown error');

      if (!patterns.has(errorType)) {
        patterns.set(errorType, {
          type: errorType,
          count: 0,
          examples: [],
          affectedLanguages: [],
        });
      }

      const pattern = patterns.get(errorType)!;
      pattern.count++;

      if (pattern.examples.length < 5) {
        pattern.examples.push(failure.pattern.hyperscript);
      }

      if (!pattern.affectedLanguages.includes(failure.pattern.language)) {
        pattern.affectedLanguages.push(failure.pattern.language);
      }
    }

    return Array.from(patterns.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Categorize error by type
   */
  private categorizeError(error: string): string {
    if (error.includes('null or undefined')) {
      return 'Parse returned null';
    }
    if (error.includes('timeout')) {
      return 'Parse timeout';
    }
    if (error.includes('token')) {
      return 'Tokenization error';
    }
    if (error.includes('syntax')) {
      return 'Syntax error';
    }
    if (error.includes('semantic')) {
      return 'Semantic error';
    }
    return 'Other error';
  }

  /**
   * Analyze language-specific issues
   */
  analyzeByLanguage(results: ParseResult[]): Record<
    LanguageCode,
    {
      totalPatterns: number;
      failures: number;
      commonErrors: string[];
      problematicPatterns: string[];
    }
  > {
    const byLanguage: Record<string, any> = {};

    for (const result of results) {
      const lang = result.pattern.language;

      if (!byLanguage[lang]) {
        byLanguage[lang] = {
          totalPatterns: 0,
          failures: 0,
          commonErrors: [] as string[],
          problematicPatterns: [] as string[],
        };
      }

      byLanguage[lang].totalPatterns++;

      if (!result.success) {
        byLanguage[lang].failures++;

        const error = result.error || 'Unknown';
        if (!byLanguage[lang].commonErrors.includes(error)) {
          byLanguage[lang].commonErrors.push(error);
        }

        if (byLanguage[lang].problematicPatterns.length < 10) {
          byLanguage[lang].problematicPatterns.push(result.pattern.hyperscript);
        }
      }
    }

    return byLanguage as Record<LanguageCode, any>;
  }

  /**
   * Identify patterns in failed hyperscript
   */
  identifyFailurePatterns(failures: ParseResult[]): {
    multiClause: number;
    eventModifiers: number;
    styleProperties: number;
    conditionals: number;
    windowEvents: number;
    complexSelectors: number;
  } {
    const patterns = {
      multiClause: 0,
      eventModifiers: 0,
      styleProperties: 0,
      conditionals: 0,
      windowEvents: 0,
      complexSelectors: 0,
    };

    for (const failure of failures) {
      const code = failure.pattern.hyperscript;

      // Multi-clause (それから, ثم, then)
      if (
        code.includes('それから') ||
        code.includes('ثم') ||
        code.includes('then') ||
        code.includes('그러면') ||
        code.includes('그리고')
      ) {
        patterns.multiClause++;
      }

      // Event modifiers
      if (code.includes('[') || code.includes('debounced') || code.includes('throttled')) {
        patterns.eventModifiers++;
      }

      // Style properties (*background, *opacity, etc.)
      if (code.includes('*')) {
        patterns.styleProperties++;
      }

      // Conditionals (if, もし, إذا, etc.)
      if (
        code.includes('if ') ||
        code.includes('もし') ||
        code.includes('إذا') ||
        code.includes('一致する') ||
        code.includes('match')
      ) {
        patterns.conditionals++;
      }

      // Window events
      if (
        code.includes('ウィンドウ') ||
        code.includes('window') ||
        code.includes('النافذة') ||
        code.includes('창')
      ) {
        patterns.windowEvents++;
      }

      // Complex selectors
      if (
        code.includes('closest') ||
        code.includes('最も近い') ||
        code.includes('<') ||
        code.includes('first') ||
        code.includes('最初')
      ) {
        patterns.complexSelectors++;
      }
    }

    return patterns;
  }

  /**
   * Generate diagnostic report
   */
  generateReport(results: ParseResult[]): string {
    const failures = results.filter(r => !r.success);
    const failurePatterns = this.analyzeFailures(results);
    const byLanguage = this.analyzeByLanguage(results);
    const codePatterns = this.identifyFailurePatterns(failures);

    let report = '# Parse Failure Analysis Report\n\n';

    report += `## Summary\n`;
    report += `- Total patterns: ${results.length}\n`;
    report += `- Failures: ${failures.length} (${((failures.length / results.length) * 100).toFixed(1)}%)\n`;
    report += `- Success rate: ${(((results.length - failures.length) / results.length) * 100).toFixed(1)}%\n\n`;

    report += `## Common Failure Types\n\n`;
    for (const pattern of failurePatterns.slice(0, 5)) {
      report += `### ${pattern.type} (${pattern.count} occurrences)\n`;
      report += `- Affected languages: ${pattern.affectedLanguages.join(', ')}\n`;
      report += `- Examples:\n`;
      pattern.examples.forEach(ex => {
        report += `  - "${ex}"\n`;
      });
      report += '\n';
    }

    report += `## Failure Patterns in Code\n\n`;
    report += `- Multi-clause patterns: ${codePatterns.multiClause}\n`;
    report += `- Event modifiers: ${codePatterns.eventModifiers}\n`;
    report += `- Style properties: ${codePatterns.styleProperties}\n`;
    report += `- Conditionals: ${codePatterns.conditionals}\n`;
    report += `- Window events: ${codePatterns.windowEvents}\n`;
    report += `- Complex selectors: ${codePatterns.complexSelectors}\n\n`;

    report += `## By Language\n\n`;
    const sortedLangs = Object.entries(byLanguage).sort(([, a], [, b]) => b.failures - a.failures);

    for (const [lang, data] of sortedLangs.slice(0, 10)) {
      const failRate = ((data.failures / data.totalPatterns) * 100).toFixed(1);
      report += `### ${lang.toUpperCase()} - ${data.failures}/${data.totalPatterns} failures (${failRate}%)\n`;
      report += `Common errors:\n`;
      data.commonErrors.slice(0, 3).forEach((err: string) => {
        report += `- ${err}\n`;
      });
      report += '\n';
    }

    return report;
  }
}

/**
 * Create a diagnostic session
 */
export function createDiagnosticSession(enabled: boolean = true): {
  diagnostics: ParseDiagnostics;
  analyzer: FailureAnalyzer;
} {
  return {
    diagnostics: new ParseDiagnostics(enabled),
    analyzer: new FailureAnalyzer(),
  };
}
