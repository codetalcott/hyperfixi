/**
 * Quick Start Analyzer
 * Simplified API for code analysis
 */

import { analyzeProject, analyzeFile, generateReport } from '../analyzer';
import type { AnalysisResult } from '../types';

/**
 * Quick start analyzer with sensible defaults
 */
export function quickStartAnalyzer(
  options: {
    projectPath?: string;
    recursive?: boolean;
    format?: 'table' | 'json' | 'detailed';
    include?: string[];
    exclude?: string[];
  } = {}
) {
  const {
    projectPath = '.',
    recursive = true,
    format = 'table',
    include = ['**/*.html', '**/*.htm'],
    exclude = ['node_modules/**', 'dist/**', 'build/**'],
  } = options;

  return {
    /**
     * Analyze entire project
     */
    async analyzeProject(): Promise<AnalysisResult[]> {
      return analyzeProject(projectPath, {
        recursive,
        format,
        include,
        exclude,
      });
    },

    /**
     * Analyze single file
     */
    async analyzeFile(filePath: string): Promise<AnalysisResult> {
      return analyzeFile(filePath);
    },

    /**
     * Generate analysis report
     */
    generateReport(results: AnalysisResult[]): string {
      return generateReport(results, format);
    },

    /**
     * Quick analysis with report
     */
    async quickAnalysis(): Promise<string> {
      const results = await this.analyzeProject();
      return this.generateReport(results);
    },

    /**
     * Get project health score
     */
    async getHealthScore(): Promise<{
      score: number;
      grade: string;
      issues: number;
      suggestions: string[];
    }> {
      const results = await this.analyzeProject();

      const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
      const totalScripts = results.reduce((sum, r) => sum + r.scripts.length, 0);
      const avgComplexity =
        results.length > 0 ? results.reduce((sum, r) => sum + r.complexity, 0) / results.length : 0;

      // Calculate score (0-100)
      let score = 100;

      // Deduct for issues
      const errorCount = results.reduce(
        (sum, r) => sum + r.issues.filter(i => i.type === 'error').length,
        0
      );
      const warningCount = results.reduce(
        (sum, r) => sum + r.issues.filter(i => i.type === 'warning').length,
        0
      );

      score -= errorCount * 10; // -10 for each error
      score -= warningCount * 2; // -2 for each warning

      // Deduct for high complexity
      if (avgComplexity > 10) {
        score -= (avgComplexity - 10) * 2;
      }

      score = Math.max(0, Math.min(100, score));

      // Determine grade
      let grade = 'F';
      if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';

      // Generate suggestions
      const suggestions: string[] = [];

      if (errorCount > 0) {
        suggestions.push(`Fix ${errorCount} critical error${errorCount > 1 ? 's' : ''}`);
      }

      if (warningCount > 5) {
        suggestions.push('Address code warnings to improve maintainability');
      }

      if (avgComplexity > 10) {
        suggestions.push('Break down complex scripts into smaller components');
      }

      if (totalScripts === 0) {
        suggestions.push('Add HyperScript to make your pages interactive');
      }

      return {
        score: Math.round(score),
        grade,
        issues: totalIssues,
        suggestions,
      };
    },

    /**
     * Watch for file changes and re-analyze
     */
    watch(callback: (results: AnalysisResult[]) => void): void {
      const chokidar = require('chokidar');

      const watcher = chokidar.watch(include, {
        ignored: exclude,
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('change', async (filePath: string) => {
        try {
          const results = await this.analyzeProject();
          callback(results);
        } catch (error) {
          console.error('Analysis error:', error);
        }
      });

      // Initial analysis
      this.analyzeProject().then(callback);
    },
  };
}
