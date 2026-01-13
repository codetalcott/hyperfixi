/**
 * Bundle Optimizer
 * Optimizes bundles based on usage analysis and performance requirements
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';
import * as Terser from 'terser';
import type {
  BundleConfig,
  UsageAnalysis,
  BundlingStrategy,
  ChunkStrategy,
  OptimizationSettings,
  LoadingStrategy,
  OptimizerConfig,
  PerformanceMetrics,
  BundleCache,
  CacheEntry,
  ModuleInfo,
  BundleChunk,
} from './types';

/**
 * Bundle Optimizer
 */
export class BundleOptimizer {
  private cache: BundleCache;
  private config: OptimizerConfig;

  constructor(config: Partial<OptimizerConfig> = {}) {
    this.config = {
      analysis: {
        enabled: true,
        threshold: 10000, // 10KB threshold for analysis
        excludeNodeModules: false,
        ...config.analysis,
      },
      treeshaking: {
        enabled: true,
        pureAnnotations: true,
        sideEffects: false,
        ...config.treeshaking,
      },
      splitting: {
        enabled: true,
        strategy: 'usage',
        threshold: 50000, // 50KB threshold for splitting
        ...config.splitting,
      },
      compression: {
        enabled: true,
        algorithm: 'gzip',
        level: 6,
        ...config.compression,
      },
      caching: {
        enabled: true,
        strategy: 'content-hash',
        maxAge: 86400000, // 24 hours
        ...config.caching,
      },
    };

    this.cache = new MemoryBundleCache();
  }

  /**
   * Optimize bundle configuration based on usage analysis
   */
  async optimizeBundle(analysis: UsageAnalysis, baseConfig: BundleConfig): Promise<BundleConfig> {
    const optimizedConfig = { ...baseConfig };

    // Apply tree-shaking optimizations
    if (this.config.treeshaking.enabled) {
      optimizedConfig.optimization = {
        ...optimizedConfig.optimization,
        treeshaking: true,
        deadCodeElimination: true,
      };
    }

    // Apply code splitting optimizations
    if (this.config.splitting.enabled) {
      optimizedConfig.optimization = {
        ...optimizedConfig.optimization,
        codeSplitting: true,
      };
    }

    // Apply compression optimizations
    if (this.config.compression.enabled) {
      optimizedConfig.optimization = {
        ...optimizedConfig.optimization,
        compression: this.config.compression.algorithm,
      };
    }

    // Optimize externals based on dependency analysis
    const externalDeps = analysis.dependencies
      .filter(dep => dep.size > this.config.splitting.threshold && dep.usedExports.length > 0)
      .map(dep => dep.name);

    optimizedConfig.externals = [...(optimizedConfig.externals || []), ...externalDeps];

    return optimizedConfig;
  }

  /**
   * Generate optimal bundling strategy
   */
  generateBundlingStrategy(analysis: UsageAnalysis): BundlingStrategy {
    const chunks = this.generateChunkStrategies(analysis);
    const optimization = this.generateOptimizationSettings(analysis);
    const loading = this.generateLoadingStrategy(analysis);

    return {
      name: 'Smart Bundling Strategy',
      description: 'AI-generated bundling strategy based on usage patterns',
      chunks,
      optimization,
      loading,
    };
  }

  /**
   * Generate chunk strategies
   */
  private generateChunkStrategies(analysis: UsageAnalysis): ChunkStrategy[] {
    const strategies: ChunkStrategy[] = [];

    // Vendor chunk strategy
    const vendorPattern = analysis.patterns.find(p => p.type === 'vendor');
    if (vendorPattern) {
      strategies.push({
        name: 'vendor',
        test: module => this.isVendorModule(module),
        priority: 10,
        minSize: 30000,
        maxSize: 500000,
        enforce: true,
      });
    }

    // Critical chunk strategy
    const criticalPattern = analysis.patterns.find(p => p.type === 'critical');
    if (criticalPattern) {
      strategies.push({
        name: 'critical',
        test: module => this.isCriticalModule(module, analysis),
        priority: 20,
        minSize: 0,
        maxSize: 100000,
        enforce: true,
      });
    }

    // Lazy chunk strategy
    const lazyPattern = analysis.patterns.find(p => p.type === 'lazy-load');
    if (lazyPattern) {
      strategies.push({
        name: 'lazy',
        test: module => this.isLazyModule(module, analysis),
        priority: 5,
        minSize: 10000,
        maxSize: 200000,
        enforce: false,
      });
    }

    // Common chunk strategy
    strategies.push({
      name: 'common',
      test: module => this.isCommonModule(module, analysis),
      priority: 1,
      minSize: 20000,
      maxSize: 300000,
      enforce: false,
    });

    return strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate optimization settings
   */
  private generateOptimizationSettings(analysis: UsageAnalysis): OptimizationSettings {
    return {
      minify: true,
      treeshake: analysis.metrics.treeshakingPotential > 0.3,
      sideEffects: false,
      usedExports: true,
      concatenateModules: analysis.metrics.totalFiles < 100,
      mangleProps: analysis.metrics.totalSize > 1000000, // 1MB
    };
  }

  /**
   * Generate loading strategy
   */
  private generateLoadingStrategy(analysis: UsageAnalysis): LoadingStrategy {
    const preload: string[] = [];
    const prefetch: string[] = [];
    const lazy: string[] = [];
    const critical: string[] = [];

    // Categorize modules based on usage patterns
    for (const file of analysis.files) {
      if (file.criticalPath) {
        critical.push(file.path);
      } else if (file.accessFrequency > 0.8) {
        preload.push(file.path);
      } else if (file.accessFrequency > 0.5) {
        prefetch.push(file.path);
      } else {
        lazy.push(file.path);
      }
    }

    return { preload, prefetch, lazy, critical };
  }

  /**
   * Optimize individual modules
   */
  async optimizeModules(modules: ModuleInfo[]): Promise<ModuleInfo[]> {
    const optimizedModules: ModuleInfo[] = [];

    for (const module of modules) {
      const optimized = await this.optimizeModule(module);
      optimizedModules.push(optimized);
    }

    return optimizedModules;
  }

  /**
   * Optimize single module
   */
  private async optimizeModule(module: ModuleInfo): Promise<ModuleInfo> {
    const cacheKey = `module:${module.id}`;
    const contentHash = this.calculateContentHash(module.path);

    // Check cache
    if (this.config.caching.enabled && this.cache.has(cacheKey, contentHash)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    let optimizedModule = { ...module };

    // Apply tree-shaking if enabled
    if (this.config.treeshaking.enabled && module.treeshakable) {
      optimizedModule = await this.applyTreeShaking(optimizedModule);
    }

    // Apply minification
    if (module.path.endsWith('.js') || module.path.endsWith('.ts')) {
      optimizedModule = await this.minifyModule(optimizedModule);
    }

    // Cache result
    if (this.config.caching.enabled) {
      this.cache.set(cacheKey, optimizedModule, contentHash);
    }

    return optimizedModule;
  }

  /**
   * Apply tree-shaking to module
   */
  private async applyTreeShaking(module: ModuleInfo): Promise<ModuleInfo> {
    // This would integrate with a tree-shaking library
    // For now, estimate the reduction
    const reductionFactor = 0.8; // Assume 20% reduction from tree-shaking

    return {
      ...module,
      size: Math.floor(module.size * reductionFactor),
      exports: module.exports.filter(
        exp =>
          // Keep exports that are likely to be used
          !exp.startsWith('_') && exp !== 'unused'
      ),
    };
  }

  /**
   * Minify module
   */
  private async minifyModule(module: ModuleInfo): Promise<ModuleInfo> {
    try {
      if (await fs.pathExists(module.path)) {
        const content = await fs.readFile(module.path, 'utf-8');
        const result = await Terser.minify(content, {
          compress: {
            dead_code: true,
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info'],
          },
          mangle: {
            toplevel: true,
          },
          format: {
            comments: false,
          },
        });

        if (result.code) {
          const originalSize = Buffer.byteLength(content, 'utf-8');
          const minifiedSize = Buffer.byteLength(result.code, 'utf-8');

          return {
            ...module,
            size: minifiedSize,
          };
        }
      }
    } catch (error) {
      console.warn(`Failed to minify module ${module.path}:`, error);
    }

    return module;
  }

  /**
   * Optimize chunk sizes
   */
  optimizeChunkSizes(chunks: BundleChunk[]): BundleChunk[] {
    const optimizedChunks: BundleChunk[] = [];
    const targetSize = this.config.splitting.threshold;

    for (const chunk of chunks) {
      if (chunk.size > targetSize * 2) {
        // Split large chunks
        const splitChunks = this.splitChunk(chunk, targetSize);
        optimizedChunks.push(...splitChunks);
      } else if (chunk.size < targetSize * 0.3) {
        // Merge small chunks (would need more logic to determine merge candidates)
        optimizedChunks.push(chunk);
      } else {
        optimizedChunks.push(chunk);
      }
    }

    return optimizedChunks;
  }

  /**
   * Split large chunk into smaller chunks
   */
  private splitChunk(chunk: BundleChunk, targetSize: number): BundleChunk[] {
    const chunks: BundleChunk[] = [];
    const modules = [...chunk.modules];
    let currentChunk: ModuleInfo[] = [];
    let currentSize = 0;
    let chunkIndex = 0;

    for (const module of modules) {
      if (currentSize + module.size > targetSize && currentChunk.length > 0) {
        // Create new chunk
        chunks.push({
          name: `${chunk.name}-${chunkIndex++}`,
          size: currentSize,
          modules: currentChunk,
          type: chunk.type,
          preloadable: chunk.preloadable,
          cacheable: chunk.cacheable,
        });

        currentChunk = [module];
        currentSize = module.size;
      } else {
        currentChunk.push(module);
        currentSize += module.size;
      }
    }

    // Add remaining modules
    if (currentChunk.length > 0) {
      chunks.push({
        name: `${chunk.name}-${chunkIndex}`,
        size: currentSize,
        modules: currentChunk,
        type: chunk.type,
        preloadable: chunk.preloadable,
        cacheable: chunk.cacheable,
      });
    }

    return chunks;
  }

  /**
   * Calculate compression savings
   */
  calculateCompressionSavings(content: string): { gzip: number; brotli: number } {
    const originalSize = Buffer.byteLength(content, 'utf-8');

    const gzipped = gzipSync(content);
    const brotlied = brotliCompressSync(content);

    return {
      gzip: (originalSize - gzipped.length) / originalSize,
      brotli: (originalSize - brotlied.length) / originalSize,
    };
  }

  /**
   * Generate performance metrics
   */
  generateMetrics(chunks: BundleChunk[], startTime: number, endTime: number): PerformanceMetrics {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const bundleTime = endTime - startTime;

    // Estimate compression ratio (would be calculated from actual compression)
    const compressionRatio = 0.7; // 30% compression

    // Estimate tree-shaking ratio
    const treeshakingRatio =
      chunks.reduce((sum, chunk) => {
        const treeshakableModules = chunk.modules.filter(m => m.treeshakable);
        return sum + treeshakableModules.length / chunk.modules.length;
      }, 0) / chunks.length;

    return {
      bundleTime,
      bundleSize: totalSize,
      compressionRatio,
      treeshakingRatio,
      cacheHitRatio: 0.5, // Would be calculated from actual cache hits
      loadTime: 0, // Would be measured in runtime
      parseTime: 0, // Would be measured in runtime
      executionTime: 0, // Would be measured in runtime
    };
  }

  /**
   * Helper methods for chunk strategies
   */
  private isVendorModule(module: ModuleInfo): boolean {
    return (
      module.path.includes('node_modules') ||
      module.id.startsWith('@') ||
      !module.path.startsWith('.')
    );
  }

  private isCriticalModule(module: ModuleInfo, analysis: UsageAnalysis): boolean {
    return analysis.files.some(file => file.path === module.path && file.criticalPath);
  }

  private isLazyModule(module: ModuleInfo, analysis: UsageAnalysis): boolean {
    return analysis.files.some(
      file => file.path === module.path && file.accessFrequency < 0.5 && !file.criticalPath
    );
  }

  private isCommonModule(module: ModuleInfo, analysis: UsageAnalysis): boolean {
    // Module is common if it's imported by multiple files
    const usageCount = analysis.files.reduce((count, file) => {
      return (
        count +
        file.imports.filter(
          imp => imp.source === module.id || imp.source.endsWith(path.basename(module.path))
        ).length
      );
    }, 0);

    return usageCount > 2;
  }

  private calculateContentHash(filePath: string): string {
    // Simple hash calculation - in production, use a proper hash function
    return Buffer.from(filePath + Date.now())
      .toString('base64')
      .slice(0, 16);
  }
}

/**
 * Memory-based bundle cache implementation
 */
class MemoryBundleCache implements BundleCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);

    if (entry && Date.now() - entry.timestamp < 86400000) {
      // 24 hours
      return entry;
    }

    if (entry) {
      this.cache.delete(key);
    }

    return null;
  }

  set(key: string, data: any, hash: string): void {
    this.cache.set(key, {
      key,
      hash,
      data,
      timestamp: Date.now(),
      size: JSON.stringify(data).length,
    });
  }

  has(key: string, hash: string): boolean {
    const entry = this.cache.get(key);
    return entry ? entry.hash === hash : false;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * File-based bundle cache implementation
 */
export class FileBundleCache implements BundleCache {
  private cacheDir: string;

  constructor(cacheDir: string = '.cache/hyperfixi-bundling') {
    this.cacheDir = cacheDir;
    fs.ensureDirSync(this.cacheDir);
  }

  get(key: string): CacheEntry | null {
    try {
      const filePath = path.join(this.cacheDir, `${this.sanitizeKey(key)}.json`);

      if (fs.existsSync(filePath)) {
        const entry: CacheEntry = fs.readJsonSync(filePath);

        // Check if entry is still valid (24 hours)
        if (Date.now() - entry.timestamp < 86400000) {
          return entry;
        } else {
          fs.removeSync(filePath);
        }
      }
    } catch (error) {
      // Ignore cache read errors
    }

    return null;
  }

  set(key: string, data: any, hash: string): void {
    try {
      const entry: CacheEntry = {
        key,
        hash,
        data,
        timestamp: Date.now(),
        size: JSON.stringify(data).length,
      };

      const filePath = path.join(this.cacheDir, `${this.sanitizeKey(key)}.json`);
      fs.writeJsonSync(filePath, entry);
    } catch (error) {
      // Ignore cache write errors
    }
  }

  has(key: string, hash: string): boolean {
    const entry = this.get(key);
    return entry ? entry.hash === hash : false;
  }

  clear(): void {
    try {
      fs.emptyDirSync(this.cacheDir);
    } catch (error) {
      // Ignore clear errors
    }
  }

  size(): number {
    try {
      const files = fs.readdirSync(this.cacheDir);
      return files.length;
    } catch (error) {
      return 0;
    }
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9-_]/g, '_');
  }
}
