/**
 * Types for Smart Bundling System
 */

/**
 * Bundle configuration
 */
export interface BundleConfig {
  entry: string | string[];
  output: {
    dir: string;
    format: 'esm' | 'cjs' | 'umd' | 'iife';
    minify: boolean;
    sourcemap: boolean;
    chunkSizeWarningLimit: number;
  };
  optimization: {
    treeshaking: boolean;
    codeSplitting: boolean;
    compression: 'gzip' | 'brotli' | 'none';
    bundleAnalysis: boolean;
    deadCodeElimination: boolean;
    modulePreloading: boolean;
  };
  target: {
    browsers: string[];
    node: string;
    es: string;
  };
  externals: string[];
  alias: Record<string, string>;
}

/**
 * Usage pattern analysis result
 */
export interface UsageAnalysis {
  files: FileUsage[];
  dependencies: DependencyUsage[];
  components: ComponentUsage[];
  patterns: UsagePattern[];
  metrics: UsageMetrics;
  recommendations: BundleRecommendation[];
}

/**
 * File usage information
 */
export interface FileUsage {
  path: string;
  size: number;
  imports: ImportUsage[];
  exports: ExportUsage[];
  hyperscriptUsage: HyperscriptUsage[];
  accessFrequency: number;
  criticalPath: boolean;
  lastModified: number;
}

/**
 * Import usage tracking
 */
export interface ImportUsage {
  source: string;
  specifier: string;
  type: 'default' | 'named' | 'namespace' | 'dynamic';
  usageCount: number;
  locations: SourceLocation[];
  treeshakable: boolean;
}

/**
 * Export usage tracking
 */
export interface ExportUsage {
  name: string;
  type: 'default' | 'named' | 'namespace';
  usedBy: string[];
  external: boolean;
  treeshakable: boolean;
}

/**
 * HyperScript usage analysis
 */
export interface HyperscriptUsage {
  element: string;
  script: string;
  features: string[];
  complexity: number;
  dependencies: string[];
  frequency: number;
}

/**
 * Dependency usage information
 */
export interface DependencyUsage {
  name: string;
  version: string;
  size: number;
  usedExports: string[];
  unusedExports: string[];
  treeshakingPotential: number;
  replaceable: boolean;
  alternatives: DependencyAlternative[];
}

/**
 * Component usage tracking
 */
export interface ComponentUsage {
  name: string;
  path: string;
  usageCount: number;
  bundleImpact: number;
  dependencies: string[];
  lazyLoadable: boolean;
  preloadable: boolean;
}

/**
 * Usage pattern identification
 */
export interface UsagePattern {
  type: 'lazy-load' | 'preload' | 'critical' | 'vendor' | 'polyfill';
  modules: string[];
  condition: string;
  frequency: number;
  impact: number;
  recommendation: string;
}

/**
 * Usage metrics
 */
export interface UsageMetrics {
  totalSize: number;
  totalFiles: number;
  bundleCount: number;
  treeshakingPotential: number;
  compressionRatio: number;
  criticalPathSize: number;
  duplicateCode: number;
  unusedCode: number;
}

/**
 * Bundle recommendation
 */
export interface BundleRecommendation {
  type: 'split' | 'merge' | 'lazy' | 'preload' | 'eliminate' | 'replace';
  description: string;
  modules: string[];
  expectedSavings: number;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

/**
 * Dependency alternative
 */
export interface DependencyAlternative {
  name: string;
  version: string;
  size: number;
  compatibility: number;
  reason: string;
}

/**
 * Source location
 */
export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

/**
 * Bundle chunk information
 */
export interface BundleChunk {
  name: string;
  size: number;
  modules: ModuleInfo[];
  type: 'entry' | 'vendor' | 'common' | 'dynamic';
  preloadable: boolean;
  cacheable: boolean;
}

/**
 * Module information
 */
export interface ModuleInfo {
  id: string;
  path: string;
  size: number;
  dependencies: string[];
  exports: string[];
  sideEffects: boolean;
  treeshakable: boolean;
}

/**
 * Bundle analysis result
 */
export interface BundleAnalysis {
  chunks: BundleChunk[];
  totalSize: number;
  gzippedSize: number;
  brotliSize: number;
  duplicatedModules: string[];
  unusedExports: string[];
  circularDependencies: string[][];
  recommendations: OptimizationRecommendation[];
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  type: 'code-split' | 'tree-shake' | 'compress' | 'cache' | 'preload';
  description: string;
  impact: number;
  effort: number;
  implementation: string;
}

/**
 * Smart bundling strategy
 */
export interface BundlingStrategy {
  name: string;
  description: string;
  chunks: ChunkStrategy[];
  optimization: OptimizationSettings;
  loading: LoadingStrategy;
}

/**
 * Chunk strategy
 */
export interface ChunkStrategy {
  name: string;
  test: (module: ModuleInfo) => boolean;
  priority: number;
  minSize: number;
  maxSize: number;
  enforce: boolean;
}

/**
 * Optimization settings
 */
export interface OptimizationSettings {
  minify: boolean;
  treeshake: boolean;
  sideEffects: boolean;
  usedExports: boolean;
  concatenateModules: boolean;
  mangleProps: boolean;
}

/**
 * Loading strategy
 */
export interface LoadingStrategy {
  preload: string[];
  prefetch: string[];
  lazy: string[];
  critical: string[];
}

/**
 * Bundle optimizer configuration
 */
export interface OptimizerConfig {
  analysis: {
    enabled: boolean;
    threshold: number;
    excludeNodeModules: boolean;
  };
  treeshaking: {
    enabled: boolean;
    pureAnnotations: boolean;
    sideEffects: boolean;
  };
  splitting: {
    enabled: boolean;
    strategy: 'size' | 'usage' | 'route' | 'vendor';
    threshold: number;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli';
    level: number;
  };
  caching: {
    enabled: boolean;
    strategy: 'content-hash' | 'timestamp';
    maxAge: number;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  bundleTime: number;
  bundleSize: number;
  compressionRatio: number;
  treeshakingRatio: number;
  cacheHitRatio: number;
  loadTime: number;
  parseTime: number;
  executionTime: number;
}

/**
 * Bundle job configuration
 */
export interface BundleJob {
  id: string;
  config: BundleConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  progress: number;
  result?: BundleResult;
  error?: string;
}

/**
 * Bundle result
 */
export interface BundleResult {
  chunks: BundleChunk[];
  analysis: BundleAnalysis;
  metrics: PerformanceMetrics;
  warnings: string[];
  outputFiles: OutputFile[];
}

/**
 * Output file information
 */
export interface OutputFile {
  path: string;
  size: number;
  type: 'js' | 'css' | 'map' | 'html' | 'asset';
  hash: string;
  compressed?: {
    gzip: number;
    brotli: number;
  };
}

/**
 * Bundler plugin interface
 */
export interface BundlerPlugin {
  name: string;
  setup: (context: BundlerContext) => void | Promise<void>;
}

/**
 * Bundler context
 */
export interface BundlerContext {
  config: BundleConfig;
  addChunk: (chunk: ChunkStrategy) => void;
  addTransform: (transform: TransformPlugin) => void;
  addAsset: (asset: AssetInfo) => void;
  emitFile: (file: OutputFile) => void;
  getModuleInfo: (id: string) => ModuleInfo | null;
}

/**
 * Transform plugin
 */
export interface TransformPlugin {
  name: string;
  test: RegExp | ((id: string) => boolean);
  transform: (code: string, id: string) => string | Promise<string>;
}

/**
 * Asset information
 */
export interface AssetInfo {
  name: string;
  source: string | Buffer;
  type: string;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  key: string;
  hash: string;
  data: any;
  timestamp: number;
  size: number;
}

/**
 * Bundle cache
 */
export interface BundleCache {
  get: (key: string) => CacheEntry | null;
  set: (key: string, data: any, hash: string) => void;
  has: (key: string, hash: string) => boolean;
  clear: () => void;
  size: () => number;
}

/**
 * Development server integration
 */
export interface DevServerIntegration {
  hmr: boolean;
  reload: boolean;
  overlay: boolean;
  port: number;
  host: string;
}

/**
 * Build hook
 */
export interface BuildHook {
  name: string;
  handler: (context: BundlerContext) => void | Promise<void>;
}

/**
 * Bundle statistics
 */
export interface BundleStats {
  totalSize: number;
  chunkCount: number;
  moduleCount: number;
  assetCount: number;
  compressionRatio: number;
  buildTime: number;
  cacheHits: number;
  cacheMisses: number;
}
