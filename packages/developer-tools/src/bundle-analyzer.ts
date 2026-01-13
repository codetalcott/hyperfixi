/**
 * Bundle Analyzer - Analyzes build output for optimization opportunities
 *
 * Provides bundle size analysis, duplicate detection, tree-shaking insights,
 * and recommendations for optimization.
 */

import fs from 'fs-extra';
import path from 'path';
import { gzipSync } from 'zlib';
import type { Metafile } from 'esbuild';
import type { BundleAnalysis, BundleModule, BundleDependency } from './types';

/**
 * Treemap node for visualization
 */
export interface TreemapNode {
  name: string;
  path: string;
  size: number;
  gzippedSize: number;
  children?: TreemapNode[];
}

/**
 * Analysis options
 */
export interface AnalyzerOptions {
  /** Include gzipped size calculations (slower but more accurate) */
  includeGzipped?: boolean;
  /** Minimum module size to include in analysis (bytes) */
  minModuleSize?: number;
  /** Include source content in analysis */
  includeSource?: boolean;
}

/**
 * Bundle Analyzer class
 */
export class BundleAnalyzer {
  private options: Required<AnalyzerOptions>;

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      includeGzipped: options.includeGzipped !== false,
      minModuleSize: options.minModuleSize ?? 0,
      includeSource: options.includeSource ?? false,
    };
  }

  /**
   * Analyze esbuild metafile output
   */
  async analyzeFromMetafile(metafile: Metafile): Promise<BundleAnalysis> {
    const modules: BundleModule[] = [];
    const dependencies: BundleDependency[] = [];
    const seenModules = new Map<string, number>();
    const seenDependencies = new Set<string>();

    let totalSize = 0;

    // Process outputs
    for (const [outputPath, output] of Object.entries(metafile.outputs)) {
      totalSize += output.bytes;

      // Process inputs (modules) for this output
      for (const [inputPath, input] of Object.entries(output.inputs)) {
        const size = input.bytesInOutput;

        if (size < this.options.minModuleSize) continue;

        // Track for duplicate detection
        const existingSize = seenModules.get(inputPath);
        if (existingSize !== undefined) {
          // Duplicate module found
          seenModules.set(inputPath, existingSize + size);
        } else {
          seenModules.set(inputPath, size);
        }

        // Check if it's an external dependency
        if (inputPath.includes('node_modules')) {
          const depName = this.extractPackageName(inputPath);
          if (depName && !seenDependencies.has(depName)) {
            seenDependencies.add(depName);
            dependencies.push({
              name: depName,
              version: '', // Would need package.json lookup
              size: size,
              type: 'production',
              unused: false,
            });
          }
        }

        // Get imports from metafile
        const imports = metafile.inputs[inputPath]?.imports.map(i => i.path) || [];

        modules.push({
          id: inputPath,
          path: inputPath,
          size,
          imports,
          exports: [], // esbuild metafile doesn't provide export info directly
          used: true,
        });
      }
    }

    // Calculate gzipped sizes
    let gzippedSize = 0;
    let minifiedSize = totalSize;

    if (this.options.includeGzipped) {
      for (const outputPath of Object.keys(metafile.outputs)) {
        try {
          const content = await fs.readFile(outputPath);
          const gzipped = gzipSync(content);
          gzippedSize += gzipped.length;
        } catch {
          // File may not exist yet, estimate from raw size
          gzippedSize += Math.round(totalSize * 0.3);
        }
      }
    } else {
      gzippedSize = Math.round(totalSize * 0.3); // Rough estimate
    }

    // Find duplicates
    const duplicates = this.findDuplicates(seenModules);

    // Analyze tree-shaking
    const treeshaking = this.analyzeTreeshaking(metafile);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      size: { raw: totalSize, gzipped: gzippedSize, minified: minifiedSize },
      modules,
      dependencies,
      treeshaking,
      duplicates,
    });

    return {
      size: {
        raw: totalSize,
        gzipped: gzippedSize,
        minified: minifiedSize,
      },
      modules,
      dependencies,
      treeshaking,
      recommendations,
    };
  }

  /**
   * Analyze bundle from file paths
   */
  async analyzeFromFiles(filePaths: string[]): Promise<BundleAnalysis> {
    const modules: BundleModule[] = [];
    let totalSize = 0;
    let gzippedSize = 0;

    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath);
        const gzipped = gzipSync(content);

        totalSize += stats.size;
        gzippedSize += gzipped.length;

        modules.push({
          id: filePath,
          path: filePath,
          size: stats.size,
          imports: [],
          exports: [],
          used: true,
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return {
      size: {
        raw: totalSize,
        gzipped: gzippedSize,
        minified: totalSize, // No minification info without metafile
      },
      modules,
      dependencies: [],
      treeshaking: { eliminated: [], retained: [] },
      recommendations: this.generateRecommendations({
        size: { raw: totalSize, gzipped: gzippedSize, minified: totalSize },
        modules,
        dependencies: [],
        treeshaking: { eliminated: [], retained: [] },
        duplicates: [],
      }),
    };
  }

  /**
   * Extract package name from node_modules path
   */
  private extractPackageName(modulePath: string): string | null {
    const match = modulePath.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Find duplicate modules
   */
  private findDuplicates(seenModules: Map<string, number>): string[] {
    const duplicates: string[] = [];
    const nameCount = new Map<string, number>();

    for (const [modulePath] of seenModules) {
      const baseName = path.basename(modulePath);
      const count = (nameCount.get(baseName) || 0) + 1;
      nameCount.set(baseName, count);

      if (count > 1) {
        duplicates.push(modulePath);
      }
    }

    return duplicates;
  }

  /**
   * Analyze tree-shaking effectiveness
   */
  private analyzeTreeshaking(metafile: Metafile): {
    eliminated: string[];
    retained: string[];
  } {
    const eliminated: string[] = [];
    const retained: string[] = [];

    // Check inputs that weren't included in any output
    const includedInputs = new Set<string>();

    for (const output of Object.values(metafile.outputs)) {
      for (const inputPath of Object.keys(output.inputs)) {
        includedInputs.add(inputPath);
      }
    }

    for (const inputPath of Object.keys(metafile.inputs)) {
      if (includedInputs.has(inputPath)) {
        retained.push(inputPath);
      } else {
        eliminated.push(inputPath);
      }
    }

    return { eliminated, retained };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(analysis: {
    size: { raw: number; gzipped: number; minified: number };
    modules: BundleModule[];
    dependencies: BundleDependency[];
    treeshaking: { eliminated: string[]; retained: string[] };
    duplicates?: string[];
  }): string[] {
    const recommendations: string[] = [];

    // Check total bundle size
    if (analysis.size.gzipped > 250 * 1024) {
      recommendations.push(
        `Bundle size (${this.formatSize(analysis.size.gzipped)} gzipped) exceeds recommended 250KB. Consider code splitting.`
      );
    }

    // Check for large modules
    const largeModules = analysis.modules
      .filter(m => m.size > 50 * 1024)
      .sort((a, b) => b.size - a.size);

    if (largeModules.length > 0) {
      recommendations.push(
        `${largeModules.length} large module(s) detected. Consider lazy loading: ${largeModules
          .slice(0, 3)
          .map(m => path.basename(m.path))
          .join(', ')}`
      );
    }

    // Check for large dependencies
    const largeDeps = analysis.dependencies
      .filter(d => d.size > 100 * 1024)
      .sort((a, b) => b.size - a.size);

    if (largeDeps.length > 0) {
      recommendations.push(
        `Large dependencies detected: ${largeDeps
          .map(d => `${d.name} (${this.formatSize(d.size)})`)
          .join(', ')}. Consider lighter alternatives.`
      );
    }

    // Check duplicates
    if (analysis.duplicates && analysis.duplicates.length > 0) {
      recommendations.push(
        `${analysis.duplicates.length} duplicate module(s) detected. Check for multiple versions of the same package.`
      );
    }

    // Tree-shaking effectiveness
    const treeshakingRatio =
      analysis.treeshaking.eliminated.length /
      (analysis.treeshaking.eliminated.length + analysis.treeshaking.retained.length);

    if (treeshakingRatio < 0.1 && analysis.modules.length > 20) {
      recommendations.push(
        'Low tree-shaking effectiveness. Ensure dependencies support ES modules for better optimization.'
      );
    }

    // Compression ratio
    const compressionRatio = analysis.size.gzipped / analysis.size.raw;
    if (compressionRatio > 0.5) {
      recommendations.push(
        `High compression ratio (${Math.round(compressionRatio * 100)}%). Content may not be minified effectively.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Bundle is well-optimized. No immediate improvements suggested.');
    }

    return recommendations;
  }

  /**
   * Generate treemap data for visualization
   */
  generateTreemap(analysis: BundleAnalysis): TreemapNode {
    const root: TreemapNode = {
      name: 'bundle',
      path: '/',
      size: analysis.size.raw,
      gzippedSize: analysis.size.gzipped,
      children: [],
    };

    // Group modules by directory
    const groups = new Map<string, TreemapNode[]>();

    for (const module of analysis.modules) {
      const dir = path.dirname(module.path);
      if (!groups.has(dir)) {
        groups.set(dir, []);
      }

      const gzippedSize = this.options.includeGzipped ? Math.round(module.size * 0.3) : module.size;

      groups.get(dir)!.push({
        name: path.basename(module.path),
        path: module.path,
        size: module.size,
        gzippedSize,
      });
    }

    // Build tree structure
    for (const [dir, nodes] of groups) {
      const totalSize = nodes.reduce((sum, n) => sum + n.size, 0);
      const totalGzipped = nodes.reduce((sum, n) => sum + n.gzippedSize, 0);

      root.children!.push({
        name: dir || 'root',
        path: dir,
        size: totalSize,
        gzippedSize: totalGzipped,
        children: nodes,
      });
    }

    return root;
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Get a summary report as text
   */
  getSummaryReport(analysis: BundleAnalysis): string {
    const lines: string[] = [
      '=== Bundle Analysis Report ===',
      '',
      'Size:',
      `  Raw:      ${this.formatSize(analysis.size.raw)}`,
      `  Minified: ${this.formatSize(analysis.size.minified)}`,
      `  Gzipped:  ${this.formatSize(analysis.size.gzipped)}`,
      '',
      `Modules: ${analysis.modules.length}`,
      `Dependencies: ${analysis.dependencies.length}`,
      '',
      'Tree-shaking:',
      `  Eliminated: ${analysis.treeshaking.eliminated.length} modules`,
      `  Retained:   ${analysis.treeshaking.retained.length} modules`,
      '',
      'Recommendations:',
      ...analysis.recommendations.map(r => `  - ${r}`),
    ];

    return lines.join('\n');
  }
}

/**
 * Analyze a bundle from esbuild metafile
 */
export async function analyzeBundle(
  metafile: Metafile,
  options?: AnalyzerOptions
): Promise<BundleAnalysis> {
  const analyzer = new BundleAnalyzer(options);
  return analyzer.analyzeFromMetafile(metafile);
}

/**
 * Analyze bundle from file paths
 */
export async function analyzeBundleFiles(
  filePaths: string[],
  options?: AnalyzerOptions
): Promise<BundleAnalysis> {
  const analyzer = new BundleAnalyzer(options);
  return analyzer.analyzeFromFiles(filePaths);
}

export default BundleAnalyzer;
