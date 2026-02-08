/**
 * Smart Bundler
 * Main bundler that orchestrates analysis, optimization, and bundle generation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { rollup, RollupBuild, RollupOptions, OutputOptions } from 'rollup';
import { build as esbuild } from 'esbuild';
import { UsageAnalyzer } from './analyzer';
import { BundleOptimizer } from './optimizer';
import type {
  BundleConfig,
  BundleJob,
  BundleResult,
  BundleChunk,
  BundleAnalysis,
  PerformanceMetrics,
  OutputFile,
  BundlerPlugin,
  BundlerContext,
  ModuleInfo,
  UsageAnalysis,
  BundlingStrategy,
} from './types';

/**
 * Smart Bundler - Main class for intelligent bundling
 */
export class SmartBundler {
  private analyzer: UsageAnalyzer;
  private optimizer: BundleOptimizer;
  private jobs: Map<string, BundleJob> = new Map();
  private plugins: BundlerPlugin[] = [];

  constructor() {
    this.analyzer = new UsageAnalyzer();
    this.optimizer = new BundleOptimizer();
  }

  /**
   * Add bundler plugin
   */
  addPlugin(plugin: BundlerPlugin): void {
    this.plugins.push(plugin);
  }

  /**
   * Create and execute bundle job
   */
  async bundle(config: BundleConfig): Promise<BundleResult> {
    const jobId = this.generateJobId();
    const job: BundleJob = {
      id: jobId,
      config,
      status: 'pending',
      startTime: Date.now(),
      progress: 0,
    };

    this.jobs.set(jobId, job);

    try {
      job.status = 'running';
      job.progress = 10;

      // Phase 1: Usage Analysis
      console.log('📊 Analyzing usage patterns...');
      const analysis = await this.analyzeUsage(config);
      job.progress = 30;

      // Phase 2: Strategy Generation
      console.log('🎯 Generating bundling strategy...');
      const strategy = this.optimizer.generateBundlingStrategy(analysis);
      job.progress = 50;

      // Phase 3: Bundle Optimization
      console.log('⚡ Optimizing bundle configuration...');
      const optimizedConfig = await this.optimizer.optimizeBundle(analysis, config);
      job.progress = 70;

      // Phase 4: Bundle Generation
      console.log('📦 Generating bundles...');
      const result = await this.generateBundles(optimizedConfig, analysis, strategy);
      job.progress = 90;

      // Phase 5: Analysis and Metrics
      console.log('📈 Calculating metrics...');
      result.analysis = await this.analyzeBundles(result.chunks);
      result.metrics = this.calculateMetrics(result.chunks, job.startTime, Date.now());
      job.progress = 100;

      job.status = 'completed';
      job.endTime = Date.now();
      job.result = result;

      console.log('✅ Bundle completed successfully!');
      return result;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.endTime = Date.now();

      console.error('❌ Bundle failed:', error);
      throw error;
    }
  }

  /**
   * Get bundle job status
   */
  getJob(jobId: string): BundleJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel bundle job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.endTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Analyze usage patterns
   */
  private async analyzeUsage(config: BundleConfig): Promise<UsageAnalysis> {
    const entryPoints = Array.isArray(config.entry) ? config.entry : [config.entry];
    const projectPath = path.dirname(entryPoints[0] ?? '.');

    return await this.analyzer.analyzeProject(projectPath, {
      include: ['**/*.{js,ts,jsx,tsx,html}'],
      exclude: ['node_modules/**', config.output.dir + '/**'],
      followDependencies: true,
      cacheResults: true,
    });
  }

  /**
   * Generate bundles using the specified strategy
   */
  private async generateBundles(
    config: BundleConfig,
    analysis: UsageAnalysis,
    strategy: BundlingStrategy
  ): Promise<BundleResult> {
    // Create bundler context
    const context = this.createBundlerContext(config);

    // Apply plugins
    for (const plugin of this.plugins) {
      await plugin.setup(context);
    }

    // Choose bundler based on configuration
    const bundler = this.chooseBundler(config);

    let chunks: BundleChunk[] = [];
    let outputFiles: OutputFile[] = [];
    const warnings: string[] = [];

    if (bundler === 'rollup') {
      const result = await this.bundleWithRollup(config, strategy, context);
      chunks = result.chunks;
      outputFiles = result.outputFiles;
      warnings.push(...result.warnings);
    } else if (bundler === 'esbuild') {
      const result = await this.bundleWithEsbuild(config, strategy, context);
      chunks = result.chunks;
      outputFiles = result.outputFiles;
      warnings.push(...result.warnings);
    } else {
      throw new Error(`Unsupported bundler: ${bundler}`);
    }

    // Optimize chunks
    chunks = this.optimizer.optimizeChunkSizes(chunks);

    return {
      chunks,
      analysis: {} as BundleAnalysis, // Will be filled later
      metrics: {} as PerformanceMetrics, // Will be filled later
      warnings,
      outputFiles,
    };
  }

  /**
   * Bundle with Rollup
   */
  private async bundleWithRollup(
    config: BundleConfig,
    strategy: BundlingStrategy,
    context: BundlerContext
  ): Promise<{ chunks: BundleChunk[]; outputFiles: OutputFile[]; warnings: string[] }> {
    const rollupConfig: RollupOptions = {
      input: config.entry,
      external: config.externals,
      plugins: [
        // Add Rollup plugins based on configuration
        ...(await this.createRollupPlugins(config, strategy)),
      ],
    };

    const outputConfig: OutputOptions = {
      dir: config.output.dir,
      format: config.output.format === 'esm' ? 'es' : config.output.format,
      sourcemap: config.output.sourcemap,
      chunkFileNames: '[name]-[hash].js',
      entryFileNames: '[name]-[hash].js',
      manualChunks: this.createManualChunks(strategy),
    };

    const bundle: RollupBuild = await rollup(rollupConfig);
    const { output } = await bundle.generate(outputConfig);
    await bundle.write(outputConfig);

    const chunks: BundleChunk[] = [];
    const outputFiles: OutputFile[] = [];

    for (const item of output) {
      if (item.type === 'chunk') {
        const modules: ModuleInfo[] = Object.keys(item.modules).map(id => ({
          id,
          path: id,
          size: item.modules[id]?.renderedLength || 0,
          dependencies: [],
          exports: [],
          sideEffects: false,
          treeshakable: true,
        }));

        chunks.push({
          name: item.fileName,
          size: Buffer.byteLength(item.code, 'utf-8'),
          modules,
          type: item.isEntry ? 'entry' : 'common',
          preloadable: true,
          cacheable: true,
        });

        outputFiles.push({
          path: path.join(config.output.dir, item.fileName),
          size: Buffer.byteLength(item.code, 'utf-8'),
          type: 'js',
          hash: this.calculateHash(item.code),
        });

        if (item.map) {
          outputFiles.push({
            path: path.join(config.output.dir, item.fileName + '.map'),
            size: Buffer.byteLength(JSON.stringify(item.map), 'utf-8'),
            type: 'map',
            hash: this.calculateHash(JSON.stringify(item.map)),
          });
        }
      } else if (item.type === 'asset') {
        outputFiles.push({
          path: path.join(config.output.dir, item.fileName),
          size: Buffer.byteLength(item.source as string, 'utf-8'),
          type: 'asset',
          hash: this.calculateHash(item.source as string),
        });
      }
    }

    return { chunks, outputFiles, warnings: [] };
  }

  /**
   * Bundle with esbuild
   */
  private async bundleWithEsbuild(
    config: BundleConfig,
    strategy: BundlingStrategy,
    context: BundlerContext
  ): Promise<{ chunks: BundleChunk[]; outputFiles: OutputFile[]; warnings: string[] }> {
    const entryPoints = Array.isArray(config.entry) ? config.entry : [config.entry];

    const result = await esbuild({
      entryPoints,
      outdir: config.output.dir,
      format: config.output.format === 'esm' ? 'esm' : 'cjs',
      bundle: true,
      minify: config.output.minify,
      sourcemap: config.output.sourcemap,
      splitting: config.optimization.codeSplitting,
      treeShaking: config.optimization.treeshaking,
      external: config.externals,
      target: config.target.es,
      write: true,
      metafile: true,
      chunkNames: '[name]-[hash]',
    });

    const chunks: BundleChunk[] = [];
    const outputFiles: OutputFile[] = [];
    const warnings = result.warnings.map(w => w.text);

    if (result.metafile) {
      for (const [outputPath, output] of Object.entries(result.metafile.outputs)) {
        const modules: ModuleInfo[] = Object.keys(output.inputs || {}).map(inputPath => ({
          id: inputPath,
          path: inputPath,
          size: result.metafile!.inputs[inputPath]?.bytes || 0,
          dependencies: [],
          exports: [],
          sideEffects: false,
          treeshakable: true,
        }));

        chunks.push({
          name: path.basename(outputPath),
          size: output.bytes,
          modules,
          type: output.entryPoint ? 'entry' : 'common',
          preloadable: true,
          cacheable: true,
        });

        outputFiles.push({
          path: outputPath,
          size: output.bytes,
          type: outputPath.endsWith('.js') ? 'js' : 'asset',
          hash: this.calculateHash(outputPath + output.bytes),
        });
      }
    }

    return { chunks, outputFiles, warnings };
  }

  /**
   * Analyze generated bundles
   */
  private async analyzeBundles(chunks: BundleChunk[]): Promise<BundleAnalysis> {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const duplicatedModules = this.findDuplicatedModules(chunks);
    const unusedExports = this.findUnusedExports(chunks);
    const circularDependencies = this.findCircularDependencies(chunks);

    // Estimate compressed sizes
    let gzippedSize = 0;
    let brotliSize = 0;

    for (const chunk of chunks) {
      // This would typically read the actual file and compress it
      gzippedSize += Math.floor(chunk.size * 0.7); // Estimate 30% compression
      brotliSize += Math.floor(chunk.size * 0.65); // Estimate 35% compression
    }

    return {
      chunks,
      totalSize,
      gzippedSize,
      brotliSize,
      duplicatedModules,
      unusedExports,
      circularDependencies,
      recommendations: this.generateOptimizationRecommendations(chunks),
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(
    chunks: BundleChunk[],
    startTime: number,
    endTime: number
  ): PerformanceMetrics {
    return this.optimizer.generateMetrics(chunks, startTime, endTime);
  }

  /**
   * Create bundler context
   */
  private createBundlerContext(config: BundleConfig): BundlerContext {
    const chunks: any[] = [];
    const transforms: any[] = [];
    const assets: any[] = [];
    const files: OutputFile[] = [];

    return {
      config,
      addChunk: chunk => chunks.push(chunk),
      addTransform: transform => transforms.push(transform),
      addAsset: asset => assets.push(asset),
      emitFile: file => files.push(file),
      getModuleInfo: id => null, // Would implement module info lookup
    };
  }

  /**
   * Choose appropriate bundler
   */
  private chooseBundler(config: BundleConfig): 'rollup' | 'esbuild' {
    // Choose esbuild for faster builds, rollup for more advanced features
    if (config.optimization.treeshaking || config.output.format === 'umd') {
      return 'rollup';
    }
    return 'esbuild';
  }

  /**
   * Create Rollup plugins
   */
  private async createRollupPlugins(config: BundleConfig, strategy: BundlingStrategy) {
    const plugins = [];

    // Add common plugins
    const { nodeResolve } = await import('@rollup/plugin-node-resolve');
    const { default: commonjs } = await import('@rollup/plugin-commonjs');
    const { default: typescript } = await import('@rollup/plugin-typescript');

    plugins.push(nodeResolve());
    plugins.push(commonjs());

    // Add TypeScript support if needed
    if (config.entry.toString().includes('.ts')) {
      plugins.push(typescript());
    }

    // Add minification if enabled
    if (config.output.minify) {
      const terser = (await import('@rollup/plugin-terser')).default;
      plugins.push(terser());
    }

    return plugins;
  }

  /**
   * Create manual chunks configuration for Rollup
   */
  private createManualChunks(strategy: BundlingStrategy) {
    return (id: string) => {
      // Apply chunk strategies
      for (const chunkStrategy of strategy.chunks) {
        const mockModule: ModuleInfo = {
          id,
          path: id,
          size: 0,
          dependencies: [],
          exports: [],
          sideEffects: false,
          treeshakable: true,
        };

        if (chunkStrategy.test(mockModule)) {
          return chunkStrategy.name;
        }
      }

      return undefined;
    };
  }

  /**
   * Find duplicated modules across chunks
   */
  private findDuplicatedModules(chunks: BundleChunk[]): string[] {
    const moduleCount = new Map<string, number>();

    for (const chunk of chunks) {
      for (const module of chunk.modules) {
        const count = moduleCount.get(module.id) || 0;
        moduleCount.set(module.id, count + 1);
      }
    }

    return Array.from(moduleCount.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => id);
  }

  /**
   * Find unused exports
   */
  private findUnusedExports(chunks: BundleChunk[]): string[] {
    // This would require more sophisticated analysis
    // For now, return empty array
    return [];
  }

  /**
   * Find circular dependencies
   */
  private findCircularDependencies(chunks: BundleChunk[]): string[][] {
    // This would require dependency graph analysis
    // For now, return empty array
    return [];
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(chunks: BundleChunk[]) {
    const recommendations = [];

    // Large chunk recommendation
    const largeChunks = chunks.filter(chunk => chunk.size > 500000); // 500KB
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'code-split' as const,
        description: `Consider splitting large chunks: ${largeChunks.map(c => c.name).join(', ')}`,
        impact: 0.8,
        effort: 0.6,
        implementation: 'Use dynamic imports or manual chunk configuration',
      });
    }

    // Many small chunks recommendation
    const smallChunks = chunks.filter(chunk => chunk.size < 10000); // 10KB
    if (smallChunks.length > 5) {
      recommendations.push({
        type: 'compress' as const,
        description: `Consider merging small chunks to reduce HTTP overhead`,
        impact: 0.4,
        effort: 0.3,
        implementation: 'Adjust chunk size thresholds in bundler configuration',
      });
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private generateJobId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private calculateHash(content: string): string {
    // Simple hash - in production, use a proper hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Quick start function for simple bundling
 */
export async function quickBundle(options: {
  entry: string | string[];
  output: string;
  minify?: boolean;
  sourcemap?: boolean;
  format?: 'esm' | 'cjs' | 'umd';
}): Promise<BundleResult> {
  const bundler = new SmartBundler();

  const config: BundleConfig = {
    entry: options.entry,
    output: {
      dir: options.output,
      format: options.format || 'esm',
      minify: options.minify || false,
      sourcemap: options.sourcemap || false,
      chunkSizeWarningLimit: 500000,
    },
    optimization: {
      treeshaking: true,
      codeSplitting: true,
      compression: 'gzip',
      bundleAnalysis: true,
      deadCodeElimination: true,
      modulePreloading: true,
    },
    target: {
      browsers: ['> 0.5%', 'last 2 versions'],
      node: '16',
      es: 'es2020',
    },
    externals: [],
    alias: {},
  };

  return await bundler.bundle(config);
}

/**
 * Create production-optimized bundle
 */
export async function productionBundle(options: {
  entry: string | string[];
  output: string;
  analyze?: boolean;
}): Promise<BundleResult> {
  const bundler = new SmartBundler();

  const config: BundleConfig = {
    entry: options.entry,
    output: {
      dir: options.output,
      format: 'esm',
      minify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 300000,
    },
    optimization: {
      treeshaking: true,
      codeSplitting: true,
      compression: 'brotli',
      bundleAnalysis: options.analyze || false,
      deadCodeElimination: true,
      modulePreloading: true,
    },
    target: {
      browsers: ['> 0.5%', 'last 2 versions'],
      node: '16',
      es: 'es2020',
    },
    externals: [],
    alias: {},
  };

  return await bundler.bundle(config);
}
