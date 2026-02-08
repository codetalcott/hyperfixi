/**
 * Usage Pattern Analyzer
 * Analyzes code usage patterns to inform intelligent bundling decisions
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import * as acorn from 'acorn';
import { simple as walk } from 'acorn-walk';
import type {
  UsageAnalysis,
  FileUsage,
  ImportUsage,
  ExportUsage,
  HyperscriptUsage,
  DependencyUsage,
  ComponentUsage,
  UsagePattern,
  UsageMetrics,
  BundleRecommendation,
  SourceLocation,
  DependencyAlternative,
} from './types';

/**
 * Usage Pattern Analyzer
 */
export class UsageAnalyzer {
  private cache: Map<string, any> = new Map();
  private fileStats: Map<string, fs.Stats> = new Map();

  /**
   * Analyze project usage patterns
   */
  async analyzeProject(
    projectPath: string,
    options: {
      include?: string[];
      exclude?: string[];
      followDependencies?: boolean;
      cacheResults?: boolean;
    } = {}
  ): Promise<UsageAnalysis> {
    const {
      include = ['**/*.{js,ts,jsx,tsx,html,htm}'],
      exclude = ['node_modules/**', 'dist/**', 'build/**'],
      followDependencies = true,
      cacheResults = true,
    } = options;

    // Find all relevant files
    const files = await this.findFiles(projectPath, include, exclude);

    // Analyze each file
    const fileUsages: FileUsage[] = [];
    for (const filePath of files) {
      const usage = await this.analyzeFile(filePath, cacheResults);
      fileUsages.push(usage);
    }

    // Analyze dependencies if requested
    const dependencyUsages = followDependencies
      ? await this.analyzeDependencies(projectPath, fileUsages)
      : [];

    // Analyze components
    const componentUsages = await this.analyzeComponents(fileUsages);

    // Identify usage patterns
    const patterns = await this.identifyPatterns(fileUsages, dependencyUsages);

    // Calculate metrics
    const metrics = this.calculateMetrics(fileUsages, dependencyUsages);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      fileUsages,
      dependencyUsages,
      patterns,
      metrics
    );

    return {
      files: fileUsages,
      dependencies: dependencyUsages,
      components: componentUsages,
      patterns,
      metrics,
      recommendations,
    };
  }

  /**
   * Find files matching patterns
   */
  private async findFiles(
    projectPath: string,
    include: string[],
    exclude: string[]
  ): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of include) {
      const matches = await glob(pattern, {
        cwd: projectPath,
        ignore: exclude,
        absolute: true,
      });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  /**
   * Analyze individual file
   */
  private async analyzeFile(filePath: string, useCache: boolean): Promise<FileUsage> {
    const cacheKey = `file:${filePath}`;

    // Check cache
    if (useCache && this.cache.has(cacheKey)) {
      const stats = await fs.stat(filePath);
      const cached = this.cache.get(cacheKey);

      if (cached.lastModified >= stats.mtime.getTime()) {
        return cached.usage;
      }
    }

    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    let imports: ImportUsage[] = [];
    let exports: ExportUsage[] = [];
    let hyperscriptUsage: HyperscriptUsage[] = [];

    // Analyze based on file type
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
      const jsAnalysis = await this.analyzeJavaScript(content, filePath);
      imports = jsAnalysis.imports;
      exports = jsAnalysis.exports;
    }

    if (['.html', '.htm'].includes(ext)) {
      hyperscriptUsage = await this.analyzeHTML(content, filePath);
    }

    const usage: FileUsage = {
      path: filePath,
      size: stats.size,
      imports,
      exports,
      hyperscriptUsage,
      accessFrequency: await this.calculateAccessFrequency(filePath),
      criticalPath: await this.isCriticalPath(filePath),
      lastModified: stats.mtime.getTime(),
    };

    // Cache result
    if (useCache) {
      this.cache.set(cacheKey, {
        usage,
        lastModified: stats.mtime.getTime(),
      });
    }

    return usage;
  }

  /**
   * Analyze JavaScript/TypeScript file
   */
  private async analyzeJavaScript(
    content: string,
    filePath: string
  ): Promise<{
    imports: ImportUsage[];
    exports: ExportUsage[];
  }> {
    const imports: ImportUsage[] = [];
    const exports: ExportUsage[] = [];

    try {
      const ast = acorn.parse(content, {
        ecmaVersion: 2022,
        sourceType: 'module',
        allowImportExportEverywhere: true,
      });

      walk(ast, {
        ImportDeclaration: (node: any) => {
          const source = node.source.value;

          for (const specifier of node.specifiers) {
            const importUsage: ImportUsage = {
              source,
              specifier: specifier.local.name,
              type: this.getImportType(specifier),
              usageCount: this.countUsages(content, specifier.local.name),
              locations: this.findUsageLocations(content, specifier.local.name, filePath),
              treeshakable: this.isTreeshakable(source, specifier),
            };

            imports.push(importUsage);
          }
        },

        ExportNamedDeclaration: (node: any) => {
          if (node.declaration) {
            // export const/let/var/function/class
            const names = this.extractExportNames(node.declaration);
            for (const name of names) {
              exports.push({
                name,
                type: 'named',
                usedBy: [],
                external: false,
                treeshakable: true,
              });
            }
          } else if (node.specifiers) {
            // export { name }
            for (const specifier of node.specifiers) {
              exports.push({
                name: specifier.exported.name,
                type: 'named',
                usedBy: [],
                external: !!node.source,
                treeshakable: true,
              });
            }
          }
        },

        ExportDefaultDeclaration: (node: any) => {
          exports.push({
            name: 'default',
            type: 'default',
            usedBy: [],
            external: false,
            treeshakable: false,
          });
        },

        ExportAllDeclaration: (node: any) => {
          exports.push({
            name: '*',
            type: 'namespace',
            usedBy: [],
            external: true,
            treeshakable: false,
          });
        },
      });
    } catch (error) {
      console.warn(`Failed to parse JavaScript file ${filePath}:`, error);
    }

    return { imports, exports };
  }

  /**
   * Analyze HTML file for HyperScript usage
   */
  private async analyzeHTML(content: string, filePath: string): Promise<HyperscriptUsage[]> {
    const usage: HyperscriptUsage[] = [];

    // Simple regex-based parsing for HyperScript attributes
    const hyperscriptRegex = /_\s*=\s*["']([^"']+)["']/g;
    const dataScriptRegex = /data-script\s*=\s*["']([^"']+)["']/g;

    let match;

    // Find _ attributes
    while ((match = hyperscriptRegex.exec(content)) !== null) {
      const script = match[1];
      if (!script) continue;

      const element = this.findElementForScript(content, match.index);

      usage.push({
        element,
        script,
        features: this.extractHyperscriptFeatures(script),
        complexity: this.calculateScriptComplexity(script),
        dependencies: this.extractScriptDependencies(script),
        frequency: 1, // Would need runtime data for actual frequency
      });
    }

    // Find data-script attributes
    while ((match = dataScriptRegex.exec(content)) !== null) {
      const script = match[1];
      if (!script) continue;

      const element = this.findElementForScript(content, match.index);

      usage.push({
        element,
        script,
        features: this.extractHyperscriptFeatures(script),
        complexity: this.calculateScriptComplexity(script),
        dependencies: this.extractScriptDependencies(script),
        frequency: 1,
      });
    }

    return usage;
  }

  /**
   * Analyze project dependencies
   */
  private async analyzeDependencies(
    projectPath: string,
    fileUsages: FileUsage[]
  ): Promise<DependencyUsage[]> {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!(await fs.pathExists(packageJsonPath))) {
      return [];
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const dependencyUsages: DependencyUsage[] = [];

    for (const [name, version] of Object.entries(dependencies)) {
      const usage = await this.analyzeDependency(name, version as string, fileUsages, projectPath);
      dependencyUsages.push(usage);
    }

    return dependencyUsages;
  }

  /**
   * Analyze single dependency
   */
  private async analyzeDependency(
    name: string,
    version: string,
    fileUsages: FileUsage[],
    projectPath: string
  ): Promise<DependencyUsage> {
    // Count usage across files
    const usedExports = new Set<string>();
    const unusedExports = new Set<string>();

    for (const fileUsage of fileUsages) {
      for (const importUsage of fileUsage.imports) {
        if (importUsage.source === name || importUsage.source.startsWith(`${name}/`)) {
          usedExports.add(importUsage.specifier);
        }
      }
    }

    // Estimate dependency size
    const size = await this.estimateDependencySize(name, projectPath);

    // Calculate treeshaking potential
    const treeshakingPotential = this.calculateTreeshakingPotential(name, usedExports);

    // Find alternatives
    const alternatives = await this.findDependencyAlternatives(name, version);

    return {
      name,
      version,
      size,
      usedExports: Array.from(usedExports),
      unusedExports: Array.from(unusedExports),
      treeshakingPotential,
      replaceable: alternatives.length > 0,
      alternatives,
    };
  }

  /**
   * Analyze components
   */
  private async analyzeComponents(fileUsages: FileUsage[]): Promise<ComponentUsage[]> {
    const components: ComponentUsage[] = [];
    const componentRegex = /\.(component|comp)\.(js|ts|jsx|tsx)$/;

    for (const fileUsage of fileUsages) {
      if (componentRegex.test(fileUsage.path)) {
        const name = path.basename(fileUsage.path, path.extname(fileUsage.path));
        const usageCount = this.countComponentUsage(name, fileUsages);

        components.push({
          name,
          path: fileUsage.path,
          usageCount,
          bundleImpact: fileUsage.size,
          dependencies: fileUsage.imports.map(imp => imp.source),
          lazyLoadable: this.isLazyLoadable(fileUsage),
          preloadable: this.isPreloadable(fileUsage),
        });
      }
    }

    return components;
  }

  /**
   * Identify usage patterns
   */
  private async identifyPatterns(
    fileUsages: FileUsage[],
    dependencyUsages: DependencyUsage[]
  ): Promise<UsagePattern[]> {
    const patterns: UsagePattern[] = [];

    // Identify lazy-loadable modules
    const lazyModules = fileUsages.filter(
      f => f.imports.some(imp => imp.type === 'dynamic') && !f.criticalPath
    );

    if (lazyModules.length > 0) {
      patterns.push({
        type: 'lazy-load',
        modules: lazyModules.map(m => m.path),
        condition: 'user interaction or route change',
        frequency: 0.3,
        impact: lazyModules.reduce((sum, m) => sum + m.size, 0),
        recommendation: 'Split these modules into separate chunks for lazy loading',
      });
    }

    // Identify vendor modules
    const vendorDeps = dependencyUsages.filter(
      d =>
        d.size > 50000 && // Large dependencies
        d.usedExports.length > 0
    );

    if (vendorDeps.length > 0) {
      patterns.push({
        type: 'vendor',
        modules: vendorDeps.map(d => d.name),
        condition: 'application startup',
        frequency: 1.0,
        impact: vendorDeps.reduce((sum, d) => sum + d.size, 0),
        recommendation: 'Bundle vendor dependencies separately for better caching',
      });
    }

    // Identify critical path modules
    const criticalModules = fileUsages.filter(f => f.criticalPath);

    if (criticalModules.length > 0) {
      patterns.push({
        type: 'critical',
        modules: criticalModules.map(m => m.path),
        condition: 'application startup',
        frequency: 1.0,
        impact: criticalModules.reduce((sum, m) => sum + m.size, 0),
        recommendation: 'Inline or preload critical modules for faster startup',
      });
    }

    return patterns;
  }

  /**
   * Calculate usage metrics
   */
  private calculateMetrics(
    fileUsages: FileUsage[],
    dependencyUsages: DependencyUsage[]
  ): UsageMetrics {
    const totalSize =
      fileUsages.reduce((sum, f) => sum + f.size, 0) +
      dependencyUsages.reduce((sum, d) => sum + d.size, 0);

    const treeshakingPotential = dependencyUsages.reduce(
      (sum, d) => sum + d.size * d.treeshakingPotential,
      0
    );

    const criticalPathSize = fileUsages
      .filter(f => f.criticalPath)
      .reduce((sum, f) => sum + f.size, 0);

    return {
      totalSize,
      totalFiles: fileUsages.length,
      bundleCount: 1, // Default single bundle
      treeshakingPotential: treeshakingPotential / totalSize,
      compressionRatio: 0.7, // Estimated
      criticalPathSize,
      duplicateCode: 0, // Would need deeper analysis
      unusedCode: treeshakingPotential,
    };
  }

  /**
   * Generate bundle recommendations
   */
  private generateRecommendations(
    fileUsages: FileUsage[],
    dependencyUsages: DependencyUsage[],
    patterns: UsagePattern[],
    metrics: UsageMetrics
  ): BundleRecommendation[] {
    const recommendations: BundleRecommendation[] = [];

    // Recommend code splitting for large bundles
    if (metrics.totalSize > 500000) {
      // 500KB
      recommendations.push({
        type: 'split',
        description: 'Split large bundle into smaller chunks',
        modules: fileUsages.filter(f => f.size > 50000).map(f => f.path),
        expectedSavings: metrics.totalSize * 0.2,
        priority: 'high',
        effort: 'medium',
      });
    }

    // Recommend tree shaking for unused dependencies
    const treeshakableDeps = dependencyUsages.filter(d => d.treeshakingPotential > 0.5);
    if (treeshakableDeps.length > 0) {
      recommendations.push({
        type: 'eliminate',
        description: 'Remove unused exports from dependencies',
        modules: treeshakableDeps.map(d => d.name),
        expectedSavings: treeshakableDeps.reduce(
          (sum, d) => sum + d.size * d.treeshakingPotential,
          0
        ),
        priority: 'medium',
        effort: 'low',
      });
    }

    // Recommend lazy loading for non-critical modules
    const lazyPattern = patterns.find(p => p.type === 'lazy-load');
    if (lazyPattern) {
      recommendations.push({
        type: 'lazy',
        description: 'Implement lazy loading for non-critical modules',
        modules: lazyPattern.modules,
        expectedSavings: lazyPattern.impact * 0.8, // Assume 80% can be deferred
        priority: 'medium',
        effort: 'medium',
      });
    }

    // Recommend dependency alternatives
    const replaceableDeps = dependencyUsages.filter(
      d => d.replaceable && d.alternatives.length > 0
    );
    for (const dep of replaceableDeps) {
      const bestAlternative = dep.alternatives[0]; // Assume sorted by best first
      if (!bestAlternative) continue;
      if (bestAlternative.size < dep.size * 0.8) {
        recommendations.push({
          type: 'replace',
          description: `Replace ${dep.name} with lighter alternative ${bestAlternative.name}`,
          modules: [dep.name],
          expectedSavings: dep.size - bestAlternative.size,
          priority: 'low',
          effort: 'high',
        });
      }
    }

    return recommendations.sort((a, b) => {
      // Sort by priority and expected savings
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (
        priorityWeight[b.priority] - priorityWeight[a.priority] ||
        b.expectedSavings - a.expectedSavings
      );
    });
  }

  /**
   * Helper methods
   */
  private getImportType(specifier: any): ImportUsage['type'] {
    if (specifier.type === 'ImportDefaultSpecifier') return 'default';
    if (specifier.type === 'ImportNamespaceSpecifier') return 'namespace';
    return 'named';
  }

  private extractExportNames(declaration: any): string[] {
    const names: string[] = [];

    if (declaration.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === 'Identifier') {
          names.push(declarator.id.name);
        }
      }
    } else if (
      declaration.type === 'FunctionDeclaration' ||
      declaration.type === 'ClassDeclaration'
    ) {
      if (declaration.id) {
        names.push(declaration.id.name);
      }
    }

    return names;
  }

  private countUsages(content: string, name: string): number {
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    const matches = content.match(regex);
    return matches ? matches.length - 1 : 0; // Subtract 1 for the declaration
  }

  private findUsageLocations(content: string, name: string, filePath: string): SourceLocation[] {
    const locations: SourceLocation[] = [];
    const lines = content.split('\n');
    const regex = new RegExp(`\\b${name}\\b`, 'g');

    for (let i = 0; i < lines.length; i++) {
      let match;
      const line = lines[i] ?? '';
      while ((match = regex.exec(line)) !== null) {
        locations.push({
          file: filePath,
          line: i + 1,
          column: match.index,
        });
      }
    }

    return locations;
  }

  private isTreeshakable(source: string, specifier: any): boolean {
    // Simple heuristics for tree-shaking compatibility
    if (source.startsWith('.') || source.startsWith('/')) {
      return true; // Local modules are usually tree-shakable
    }

    if (specifier.type === 'ImportNamespaceSpecifier') {
      return false; // import * as is not tree-shakable
    }

    // Known tree-shakable libraries
    const treeShakableLibs = ['lodash-es', 'ramda', 'date-fns'];
    return treeShakableLibs.some(lib => source.startsWith(lib));
  }

  private findElementForScript(content: string, scriptIndex: number): string {
    // Find the element tag that contains this script
    const beforeScript = content.substring(0, scriptIndex);
    const tagMatch = beforeScript.match(/<(\w+)[^>]*$/);
    return tagMatch?.[1] ?? 'unknown';
  }

  private extractHyperscriptFeatures(script: string): string[] {
    const features: string[] = [];

    // Common HyperScript features
    const patterns = {
      events: /on\s+\w+/g,
      commands: /\b(add|remove|toggle|put|take|make|wait|send|trigger|call|get|set|log|halt)\b/g,
      selectors: /<[^>]+>|#[\w-]+|\.[\w-]+/g,
      references: /\b(me|my|you|your|it|its)\b/g,
    };

    for (const [feature, pattern] of Object.entries(patterns)) {
      if (pattern.test(script)) {
        features.push(feature);
      }
    }

    return features;
  }

  private calculateScriptComplexity(script: string): number {
    let complexity = 1;

    // Add complexity for different constructs
    complexity += (script.match(/\b(if|then|else|unless|when)\b/g) || []).length * 2;
    complexity += (script.match(/\b(for|while|repeat|until)\b/g) || []).length * 3;
    complexity += (script.match(/\(/g) || []).length; // Function calls

    return complexity;
  }

  private extractScriptDependencies(script: string): string[] {
    const dependencies: string[] = [];

    // Look for references to external functions or libraries
    const functionCalls = script.match(/\b\w+\(/g);
    if (functionCalls) {
      for (const call of functionCalls) {
        const funcName = call.slice(0, -1);
        if (!['log', 'put', 'add', 'remove', 'toggle'].includes(funcName)) {
          dependencies.push(funcName);
        }
      }
    }

    return [...new Set(dependencies)];
  }

  private async calculateAccessFrequency(filePath: string): Promise<number> {
    // This would typically analyze access logs or usage analytics
    // For now, return a simple heuristic based on file type and location
    const ext = path.extname(filePath);
    const isInRoot = path.dirname(filePath).split(path.sep).length <= 2;

    let frequency = 0.5; // Base frequency

    if (['.html', '.htm'].includes(ext)) frequency += 0.3;
    if (isInRoot) frequency += 0.2;
    if (filePath.includes('index')) frequency += 0.3;

    return Math.min(1.0, frequency);
  }

  private async isCriticalPath(filePath: string): Promise<boolean> {
    // Determine if file is on critical path
    const fileName = path.basename(filePath, path.extname(filePath));
    const criticalNames = ['index', 'main', 'app', 'bootstrap', 'init'];

    return criticalNames.some(name => fileName.toLowerCase().includes(name));
  }

  private async estimateDependencySize(name: string, projectPath: string): Promise<number> {
    try {
      const nodeModulesPath = path.join(projectPath, 'node_modules', name);

      if (await fs.pathExists(nodeModulesPath)) {
        const packageJsonPath = path.join(nodeModulesPath, 'package.json');
        const packageJson = await fs.readJson(packageJsonPath);

        // Try to estimate size from main file
        const mainFile = packageJson.main || 'index.js';
        const mainPath = path.join(nodeModulesPath, mainFile);

        if (await fs.pathExists(mainPath)) {
          const stats = await fs.stat(mainPath);
          return stats.size;
        }
      }
    } catch (error) {
      // Ignore errors, return default estimate
    }

    // Default size estimates for common libraries
    const sizeEstimates: Record<string, number> = {
      react: 45000,
      'react-dom': 120000,
      lodash: 500000,
      axios: 15000,
      express: 200000,
    };

    return sizeEstimates[name] || 10000; // Default 10KB
  }

  private calculateTreeshakingPotential(name: string, usedExports: Set<string>): number {
    // Estimate how much of the dependency can be tree-shaken
    const knownTreeshakable: Record<string, number> = {
      lodash: 0.9, // Very tree-shakable
      'lodash-es': 0.95,
      'date-fns': 0.8,
      ramda: 0.85,
      rxjs: 0.7,
      '@material-ui/core': 0.6,
    };

    const baseTreeshaking = knownTreeshakable[name] || 0.3; // Default 30%

    // Reduce potential if many exports are used
    const usageReduction = Math.min(0.5, usedExports.size * 0.1);

    return Math.max(0, baseTreeshaking - usageReduction);
  }

  private async findDependencyAlternatives(
    name: string,
    version: string
  ): Promise<DependencyAlternative[]> {
    // This would typically query a database of dependency alternatives
    // For now, return some common alternatives
    const alternatives: Record<string, DependencyAlternative[]> = {
      lodash: [
        {
          name: 'lodash-es',
          version: '4.17.21',
          size: 500000,
          compatibility: 1.0,
          reason: 'ES modules version with better tree-shaking',
        },
        {
          name: 'ramda',
          version: '0.28.0',
          size: 200000,
          compatibility: 0.8,
          reason: 'Functional programming alternative',
        },
      ],
      moment: [
        {
          name: 'date-fns',
          version: '2.29.0',
          size: 50000,
          compatibility: 0.9,
          reason: 'Modular date library with tree-shaking',
        },
        {
          name: 'dayjs',
          version: '1.11.0',
          size: 8000,
          compatibility: 0.8,
          reason: 'Lightweight moment.js alternative',
        },
      ],
    };

    return alternatives[name] || [];
  }

  private countComponentUsage(name: string, fileUsages: FileUsage[]): number {
    let count = 0;

    for (const fileUsage of fileUsages) {
      for (const importUsage of fileUsage.imports) {
        if (importUsage.specifier.toLowerCase().includes(name.toLowerCase())) {
          count += importUsage.usageCount;
        }
      }
    }

    return count;
  }

  private isLazyLoadable(fileUsage: FileUsage): boolean {
    // Components that are not on critical path and are not heavily used can be lazy loaded
    return !fileUsage.criticalPath && fileUsage.accessFrequency < 0.7;
  }

  private isPreloadable(fileUsage: FileUsage): boolean {
    // Components with high access frequency but not on critical path can be preloaded
    return !fileUsage.criticalPath && fileUsage.accessFrequency > 0.8;
  }
}
