/**
 * Compile-time Plugin Analysis
 * Analyzes HTML/templates to determine which plugins are needed
 */

import type { Plugin } from '../types';

export interface AnalysisResult {
  requiredPlugins: Set<string>;
  attributePatterns: Map<string, string[]>;
  usageStats: Map<string, number>;
}

export class PluginAnalyzer {
  private plugins: Map<string, Plugin> = new Map();
  
  constructor(plugins: Plugin[]) {
    plugins.forEach(p => this.plugins.set(p.name, p));
  }

  /**
   * Analyze HTML content to determine required plugins
   */
  analyzeHTML(html: string): AnalysisResult {
    const requiredPlugins = new Set<string>();
    const attributePatterns = new Map<string, string[]>();
    const usageStats = new Map<string, number>();

    // Parse HTML to find all hyperscript attributes
    const hsAttributeRegex = /(?:_|data-hs)="([^"]*)"/g;
    const matches = html.matchAll(hsAttributeRegex);

    for (const match of matches) {
      const expression = match[1];
      this.analyzeExpression(expression, requiredPlugins, attributePatterns, usageStats);
    }

    // Also check for feature attributes
    const featureRegex = /data-(?:fetch|state|intersect|ws)[^=]*(?:="[^"]*")?/g;
    const featureMatches = html.matchAll(featureRegex);

    for (const match of featureMatches) {
      const attr = match[0];
      const pluginName = this.getFeaturePluginName(attr);
      if (pluginName) {
        requiredPlugins.add(pluginName);
        this.incrementUsage(usageStats, pluginName);
      }
    }

    return { requiredPlugins, attributePatterns, usageStats };
  }

  /**
   * Analyze a directory of files
   */
  async analyzeDirectory(dir: string, extensions = ['.html', '.htm', '.tsx', '.jsx']): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      requiredPlugins: new Set(),
      attributePatterns: new Map(),
      usageStats: new Map()
    };

    // In a real implementation, this would recursively scan the directory
    // For now, we'll return a placeholder
    console.log(`Would analyze directory: ${dir} for extensions: ${extensions}`);

    return result;
  }

  /**
   * Generate optimized plugin bundle based on analysis
   */
  generateOptimizedBundle(analysis: AnalysisResult): string {
    const imports: string[] = [];
    const loads: string[] = [];

    // Sort plugins by usage frequency for optimal loading order
    const sortedPlugins = Array.from(analysis.requiredPlugins)
      .sort((a, b) => (analysis.usageStats.get(b) || 0) - (analysis.usageStats.get(a) || 0));

    for (const pluginName of sortedPlugins) {
      const plugin = this.plugins.get(pluginName);
      if (plugin) {
        const importName = this.getImportName(plugin);
        imports.push(`import { ${importName} } from '../plugins/${plugin.type}s';`);
        loads.push(importName);
      }
    }

    return `/**
 * Auto-generated optimized bundle
 * Generated at: ${new Date().toISOString()}
 * Required plugins: ${sortedPlugins.join(', ')}
 */

import { pluginRegistry } from '../registry';
${imports.join('\n')}

// Load plugins in order of usage frequency
pluginRegistry.load(
  ${loads.join(',\n  ')}
);

// Apply immediately if DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pluginRegistry.apply());
  } else {
    pluginRegistry.apply();
  }
}

export { pluginRegistry };
`;
  }

  private analyzeExpression(
    expression: string,
    requiredPlugins: Set<string>,
    attributePatterns: Map<string, string[]>,
    usageStats: Map<string, number>
  ): void {
    // Check command plugins
    const commands = ['on', 'toggle', 'send', 'add', 'remove', 'set', 'call'];
    for (const cmd of commands) {
      const regex = new RegExp(`\\b${cmd}\\b`);
      if (regex.test(expression)) {
        requiredPlugins.add(cmd);
        this.incrementUsage(usageStats, cmd);
        
        // Track patterns for optimization
        const patterns = attributePatterns.get(cmd) || [];
        if (!patterns.includes(expression)) {
          patterns.push(expression);
          attributePatterns.set(cmd, patterns);
        }
      }
    }
  }

  private getFeaturePluginName(attr: string): string | null {
    if (attr.startsWith('data-fetch')) return 'auto-fetch';
    if (attr.startsWith('data-state')) return 'reactive-state';
    if (attr.startsWith('data-intersect')) return 'intersection';
    if (attr.startsWith('data-ws')) return 'websocket';
    return null;
  }

  private getImportName(plugin: Plugin): string {
    return plugin.name
      .split('-')
      .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Plugin';
  }

  private incrementUsage(stats: Map<string, number>, plugin: string): void {
    stats.set(plugin, (stats.get(plugin) || 0) + 1);
  }
}

/**
 * Build-time plugin optimization
 */
export async function optimizePluginsForBuild(config: {
  srcDir: string;
  plugins: Plugin[];
  outputPath: string;
}): Promise<void> {
  const analyzer = new PluginAnalyzer(config.plugins);
  const analysis = await analyzer.analyzeDirectory(config.srcDir);
  const bundleCode = analyzer.generateOptimizedBundle(analysis);
  
  // Write to file system
  console.log(`Would write optimized bundle to: ${config.outputPath}`);
  console.log(bundleCode);
}
