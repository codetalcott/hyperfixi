/**
 * Quick Start Functions for Smart Bundling
 * Simplified APIs for common bundling scenarios
 */

import { UsageAnalyzer } from './analyzer';
import { BundleOptimizer } from './optimizer';
import { SmartBundler, quickBundle, productionBundle } from './bundler';
import type {
  BundleConfig,
  UsageAnalysis,
  BundleResult,
  BundlingStrategy,
  BundleRecommendation,
} from './types';

/**
 * Quick start smart bundling with intelligent defaults
 */
export function quickStartSmartBundling(
  options: {
    projectPath?: string;
    entry: string | string[];
    output: string;
    mode?: 'development' | 'production';
    analyze?: boolean;
    cache?: boolean;
  } = { entry: 'src/index.js', output: 'dist' }
) {
  const {
    projectPath = process.cwd(),
    entry,
    output,
    mode = 'development',
    analyze = true,
    cache = true,
  } = options;

  const bundler = new SmartBundler();
  const analyzer = new UsageAnalyzer();
  const optimizer = new BundleOptimizer({
    caching: { enabled: cache },
    analysis: { enabled: analyze },
  });

  return {
    /**
     * Analyze project usage patterns
     */
    async analyzeUsage(): Promise<UsageAnalysis> {
      return await analyzer.analyzeProject(projectPath, {
        include: ['**/*.{js,ts,jsx,tsx,html,htm}'],
        exclude: ['node_modules/**', output + '/**'],
        followDependencies: true,
        cacheResults: cache,
      });
    },

    /**
     * Generate optimal bundle configuration
     */
    async createConfig(customConfig: Partial<BundleConfig> = {}): Promise<BundleConfig> {
      const analysis = await this.analyzeUsage();

      const baseConfig: BundleConfig = {
        entry,
        output: {
          dir: output,
          format: 'esm',
          minify: mode === 'production',
          sourcemap: mode === 'development',
          chunkSizeWarningLimit: mode === 'production' ? 300000 : 500000,
        },
        optimization: {
          treeshaking: true,
          codeSplitting: true,
          compression: mode === 'production' ? 'brotli' : 'gzip',
          bundleAnalysis: analyze,
          deadCodeElimination: mode === 'production',
          modulePreloading: true,
        },
        target: {
          browsers: ['> 0.5%', 'last 2 versions'],
          node: '16',
          es: 'es2020',
        },
        externals: [],
        alias: {},
        ...customConfig,
      };

      return await optimizer.optimizeBundle(analysis, baseConfig);
    },

    /**
     * Bundle with smart optimizations
     */
    async bundle(customConfig: Partial<BundleConfig> = {}): Promise<BundleResult> {
      const config = await this.createConfig(customConfig);
      return await bundler.bundle(config);
    },

    /**
     * Get bundling recommendations
     */
    async getRecommendations(): Promise<BundleRecommendation[]> {
      const analysis = await this.analyzeUsage();
      return analysis.recommendations;
    },

    /**
     * Generate bundling strategy
     */
    async createStrategy(): Promise<BundlingStrategy> {
      const analysis = await this.analyzeUsage();
      return optimizer.generateBundlingStrategy(analysis);
    },

    /**
     * Quick development build
     */
    async dev(): Promise<BundleResult> {
      return await quickBundle({
        entry,
        output,
        minify: false,
        sourcemap: true,
        format: 'esm',
      });
    },

    /**
     * Quick production build
     */
    async prod(): Promise<BundleResult> {
      return await productionBundle({
        entry,
        output,
        analyze,
      });
    },

    /**
     * Watch mode for development
     */
    async watch(callback: (result: BundleResult) => void): Promise<void> {
      const chokidar = await import('chokidar');

      // Initial build
      let result = await this.dev();
      callback(result);

      // Watch for changes
      const watcher = chokidar.watch(
        ['**/*.{js,ts,jsx,tsx,html,htm}', '!node_modules/**', `!${output}/**`],
        {
          ignoreInitial: true,
          persistent: true,
        }
      );

      watcher.on('change', async filePath => {
        console.log(`📁 Changed: ${filePath}`);
        try {
          result = await this.dev();
          callback(result);
          console.log('✅ Rebuild complete');
        } catch (error) {
          console.error('❌ Rebuild failed:', error);
        }
      });

      // Handle cleanup
      process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
      });
    },

    /**
     * Bundle analysis and reporting
     */
    async analyze(): Promise<{
      usage: UsageAnalysis;
      strategy: BundlingStrategy;
      recommendations: BundleRecommendation[];
      report: string;
    }> {
      const usage = await this.analyzeUsage();
      const strategy = await this.createStrategy();
      const recommendations = usage.recommendations;

      const report = this.generateAnalysisReport(usage, strategy, recommendations);

      return { usage, strategy, recommendations, report };
    },

    /**
     * Generate human-readable analysis report
     */
    generateAnalysisReport(
      usage: UsageAnalysis,
      strategy: BundlingStrategy,
      recommendations: BundleRecommendation[]
    ): string {
      const lines: string[] = [];

      lines.push('# Smart Bundling Analysis Report');
      lines.push('');
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push(`Project: ${projectPath}`);
      lines.push('');

      // Usage Summary
      lines.push('## Usage Summary');
      lines.push('');
      lines.push(`- **Total Files**: ${usage.metrics.totalFiles}`);
      lines.push(`- **Total Size**: ${(usage.metrics.totalSize / 1024).toFixed(2)} KB`);
      lines.push(
        `- **Tree-shaking Potential**: ${(usage.metrics.treeshakingPotential * 100).toFixed(1)}%`
      );
      lines.push(
        `- **Critical Path Size**: ${(usage.metrics.criticalPathSize / 1024).toFixed(2)} KB`
      );
      lines.push(`- **Unused Code**: ${(usage.metrics.unusedCode / 1024).toFixed(2)} KB`);
      lines.push('');

      // Dependencies
      if (usage.dependencies.length > 0) {
        lines.push('## Dependencies Analysis');
        lines.push('');

        const largeDeps = usage.dependencies
          .filter(dep => dep.size > 50000)
          .sort((a, b) => b.size - a.size)
          .slice(0, 10);

        if (largeDeps.length > 0) {
          lines.push('### Largest Dependencies');
          lines.push('');
          for (const dep of largeDeps) {
            const sizeKB = (dep.size / 1024).toFixed(1);
            const treeshaking = (dep.treeshakingPotential * 100).toFixed(1);
            lines.push(`- **${dep.name}**: ${sizeKB} KB (${treeshaking}% tree-shakable)`);
          }
          lines.push('');
        }
      }

      // Patterns
      if (usage.patterns.length > 0) {
        lines.push('## Usage Patterns');
        lines.push('');
        for (const pattern of usage.patterns) {
          lines.push(`### ${pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)} Pattern`);
          lines.push('');
          lines.push(`- **Modules**: ${pattern.modules.length}`);
          lines.push(`- **Impact**: ${(pattern.impact / 1024).toFixed(2)} KB`);
          lines.push(`- **Frequency**: ${(pattern.frequency * 100).toFixed(1)}%`);
          lines.push(`- **Recommendation**: ${pattern.recommendation}`);
          lines.push('');
        }
      }

      // Strategy
      lines.push('## Bundling Strategy');
      lines.push('');
      lines.push(`**Strategy**: ${strategy.name}`);
      lines.push(`**Description**: ${strategy.description}`);
      lines.push('');

      if (strategy.chunks.length > 0) {
        lines.push('### Chunk Configuration');
        lines.push('');
        for (const chunk of strategy.chunks) {
          lines.push(
            `- **${chunk.name}**: Priority ${chunk.priority}, Size ${(chunk.minSize / 1024).toFixed(1)}-${(chunk.maxSize / 1024).toFixed(1)} KB`
          );
        }
        lines.push('');
      }

      // Recommendations
      if (recommendations.length > 0) {
        lines.push('## Optimization Recommendations');
        lines.push('');

        const sortedRecs = recommendations.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        for (const rec of sortedRecs) {
          const priority = rec.priority.toUpperCase();
          const savings = (rec.expectedSavings / 1024).toFixed(2);

          lines.push(
            `### ${priority} Priority: ${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}`
          );
          lines.push('');
          lines.push(`**Description**: ${rec.description}`);
          lines.push(`**Expected Savings**: ${savings} KB`);
          lines.push(`**Effort**: ${rec.effort.charAt(0).toUpperCase() + rec.effort.slice(1)}`);
          lines.push(
            `**Modules**: ${rec.modules.length > 5 ? rec.modules.slice(0, 5).join(', ') + '...' : rec.modules.join(', ')}`
          );
          lines.push('');
        }
      }

      // Summary
      const totalSavings = recommendations.reduce((sum, rec) => sum + rec.expectedSavings, 0);
      if (totalSavings > 0) {
        lines.push('## Summary');
        lines.push('');
        lines.push(`**Total Potential Savings**: ${(totalSavings / 1024).toFixed(2)} KB`);
        lines.push(
          `**Optimization Potential**: ${((totalSavings / usage.metrics.totalSize) * 100).toFixed(1)}%`
        );
        lines.push('');
      }

      return lines.join('\n');
    },

    /**
     * Get bundler instance for advanced usage
     */
    getBundler(): SmartBundler {
      return bundler;
    },

    /**
     * Get analyzer instance for advanced usage
     */
    getAnalyzer(): UsageAnalyzer {
      return analyzer;
    },

    /**
     * Get optimizer instance for advanced usage
     */
    getOptimizer(): BundleOptimizer {
      return optimizer;
    },
  };
}

/**
 * Create optimized bundle configuration
 */
export async function createOptimizedConfig(options: {
  entry: string | string[];
  output: string;
  projectPath?: string;
  mode?: 'development' | 'production';
}): Promise<BundleConfig> {
  const smartBundling = quickStartSmartBundling(options);
  return await smartBundling.createConfig();
}

/**
 * Analyze project usage patterns
 */
export async function analyzeProjectUsage(options: {
  projectPath?: string;
  include?: string[];
  exclude?: string[];
}): Promise<UsageAnalysis> {
  const smartBundling = quickStartSmartBundling({
    entry: 'src/index.js',
    output: 'dist',
    ...options,
  });
  return await smartBundling.analyzeUsage();
}

/**
 * Bundle size calculator
 */
export function calculateBundleSize(result: BundleResult): {
  totalSize: number;
  gzippedSize: number;
  brotliSize: number;
  chunkCount: number;
  largestChunk: string;
  smallestChunk: string;
} {
  const totalSize = result.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const chunkCount = result.chunks.length;

  const sortedChunks = result.chunks.sort((a, b) => b.size - a.size);
  const largestChunk = sortedChunks[0]?.name || 'none';
  const smallestChunk = sortedChunks[sortedChunks.length - 1]?.name || 'none';

  return {
    totalSize,
    gzippedSize: result.analysis.gzippedSize,
    brotliSize: result.analysis.brotliSize,
    chunkCount,
    largestChunk,
    smallestChunk,
  };
}

/**
 * Performance estimator
 */
export function estimatePerformance(result: BundleResult): {
  loadTime: number;
  parseTime: number;
  cacheability: number;
  score: number;
  grade: string;
} {
  const sizeScore = Math.max(0, 100 - result.analysis.totalSize / 10000); // Deduct 1 point per 10KB
  const chunkScore = Math.max(0, 100 - result.chunks.length * 5); // Deduct 5 points per chunk
  const compressionScore = (result.analysis.gzippedSize / result.analysis.totalSize) * 100;

  const score = (sizeScore + chunkScore + compressionScore) / 3;

  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  return {
    loadTime: result.analysis.totalSize / 100000, // Rough estimate: 100KB/s
    parseTime: result.analysis.totalSize / 1000000, // Rough estimate: 1MB/s
    cacheability: result.chunks.filter(c => c.cacheable).length / result.chunks.length,
    score: Math.round(score),
    grade,
  };
}
