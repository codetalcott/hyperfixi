/**
 * Optimized Plugin Registry
 * Performance-focused implementation
 */

import type {
  Plugin,
  PluginRegistry,
  CommandPlugin,
  FeaturePlugin,
  ElementContext,
  PluginType
} from './types';
import type { OptimizedPlugin, PluginMetrics } from './typed';
import { HyperfixiPluginRegistry } from './registry';

export class OptimizedPluginRegistry extends HyperfixiPluginRegistry implements PluginRegistry {
  private compiledPatterns = new Map<string, RegExp>();
  private patternCache = new Map<string, string | null>();
  private metrics = new Map<string, PluginMetrics>();
  private sortedCommands: CommandPlugin[] = [];

  load(...plugins: Plugin[]): void {
    super.load(...plugins);
    
    // Pre-compile patterns and optimize
    for (const plugin of plugins) {
      if (this.isCommandPlugin(plugin)) {
        this.compilePattern(plugin);
      }
      
      // Initialize metrics
      this.metrics.set(plugin.name, {
        executionTime: [],
        callCount: 0,
        errorCount: 0
      });
    }
    
    // Pre-sort command plugins for faster matching
    this.updateSortedCommands();
  }

  /**
   * Optimized attribute processing with caching
   */
  protected processAttribute(element: Element, attr: Attr): void {
    const value = attr.value;
    if (!value) return;

    // Check cache first
    const cachedPlugin = this.patternCache.get(value);
    if (cachedPlugin !== undefined) {
      if (cachedPlugin) {
        this.executePlugin(cachedPlugin, element, value);
      }
      return;
    }

    // Find matching plugin using optimized search
    const pluginName = this.findMatchingPlugin(value);
    this.patternCache.set(value, pluginName);
    
    if (pluginName) {
      this.executePlugin(pluginName, element, value);
    }
  }

  /**
   * Use binary search for pattern matching when possible
   */
  private findMatchingPlugin(value: string): string | null {
    // For simple patterns, use optimized lookup
    const firstWord = value.split(/\s+/)[0];
    
    // Check if it's a known command
    for (const plugin of this.sortedCommands) {
      if (plugin.name === firstWord) {
        return plugin.name;
      }
      
      const pattern = this.compiledPatterns.get(plugin.name);
      if (pattern && pattern.test(value)) {
        return plugin.name;
      }
    }
    
    return null;
  }

  /**
   * Execute plugin with performance tracking
   */
  private executePlugin(pluginName: string, element: Element, value: string): void {
    const plugin = this.get(pluginName) as CommandPlugin;
    if (!plugin) return;

    const metrics = this.metrics.get(pluginName)!;
    const startTime = performance.now();
    
    try {
      // Execute plugin
      // In real implementation, this would parse and execute
      metrics.callCount++;
      
      const executionTime = performance.now() - startTime;
      metrics.executionTime.push(executionTime);
      
      // Keep only last 100 execution times
      if (metrics.executionTime.length > 100) {
        metrics.executionTime.shift();
      }
    } catch (error) {
      metrics.errorCount++;
      metrics.lastError = error as Error;
    }
  }

  /**
   * Pre-compile regex patterns for better performance
   */
  private compilePattern(plugin: CommandPlugin): void {
    if (typeof plugin.pattern === 'string') {
      this.compiledPatterns.set(
        plugin.name,
        new RegExp(`^${plugin.pattern}`)
      );
    } else if (plugin.pattern) {
      this.compiledPatterns.set(plugin.name, plugin.pattern);
    } else {
      // Default pattern based on plugin name
      this.compiledPatterns.set(
        plugin.name,
        new RegExp(`^${plugin.name}\\s+`)
      );
    }
  }

  /**
   * Update sorted command list for optimized searching
   */
  private updateSortedCommands(): void {
    this.sortedCommands = this.getByType<CommandPlugin>('command')
      .sort((a, b) => {
        // Sort by specificity and usage frequency
        const aMetrics = this.metrics.get(a.name);
        const bMetrics = this.metrics.get(b.name);
        
        // Prioritize frequently used plugins
        const aUsage = aMetrics?.callCount || 0;
        const bUsage = bMetrics?.callCount || 0;
        
        if (aUsage !== bUsage) {
          return bUsage - aUsage;
        }
        
        // Then by pattern length (more specific first)
        const aPattern = this.compiledPatterns.get(a.name)?.source || '';
        const bPattern = this.compiledPatterns.get(b.name)?.source || '';
        
        return bPattern.length - aPattern.length;
      });
  }

  /**
   * Get performance metrics for monitoring
   */
  getMetrics(pluginName?: string): Map<string, PluginMetrics> | PluginMetrics | undefined {
    if (pluginName) {
      return this.metrics.get(pluginName);
    }
    return new Map(this.metrics);
  }

  /**
   * Clear pattern cache (useful after adding/removing plugins)
   */
  clearCache(): void {
    this.patternCache.clear();
  }

  /**
   * Optimize based on usage patterns
   */
  optimize(): void {
    // Re-sort based on actual usage
    this.updateSortedCommands();
    
    // Clear cache entries for rarely used patterns
    const cacheThreshold = 10;
    for (const [pattern, pluginName] of this.patternCache.entries()) {
      if (pluginName) {
        const metrics = this.metrics.get(pluginName);
        if (metrics && metrics.callCount < cacheThreshold) {
          this.patternCache.delete(pattern);
        }
      }
    }
  }

  private isCommandPlugin(plugin: Plugin): plugin is CommandPlugin {
    return plugin.type === 'command';
  }
}

// Export optimized singleton
export const optimizedRegistry = new OptimizedPluginRegistry();
