/**
 * Hybrid Plugin Loader
 * Combines compile-time optimization with runtime flexibility
 */

import { optimizedRegistry } from './optimized-registry';
import type { Plugin } from './types';

export interface HybridLoaderConfig {
  // Core plugins that are always loaded
  corePlugins: Plugin[];
  
  // Optional plugins that can be dynamically loaded
  optionalPlugins: Map<string, () => Promise<Plugin>>;
  
  // Auto-detect and load based on DOM
  autoDetect?: boolean;
  
  // Lazy load threshold (ms) - wait before loading optional plugins
  lazyLoadDelay?: number;
}

export class HybridPluginLoader {
  private config: HybridLoaderConfig;
  private loadedOptional = new Set<string>();
  private loadPromises = new Map<string, Promise<Plugin>>();

  constructor(config: HybridLoaderConfig) {
    this.config = {
      autoDetect: true,
      lazyLoadDelay: 100,
      ...config
    };
  }

  /**
   * Initialize with core plugins and setup lazy loading
   */
  async initialize(): Promise<void> {
    // Load core plugins immediately
    optimizedRegistry.load(...this.config.corePlugins);

    if (this.config.autoDetect) {
      // Setup observers for lazy loading
      if (this.config.lazyLoadDelay > 0) {
        setTimeout(() => this.detectAndLoadOptional(), this.config.lazyLoadDelay);
      } else {
        this.detectAndLoadOptional();
      }
    }

    // Apply to DOM
    optimizedRegistry.apply();
  }

  /**
   * Manually load an optional plugin
   */
  async loadOptional(pluginName: string): Promise<void> {
    if (this.loadedOptional.has(pluginName)) {
      return;
    }

    const loader = this.config.optionalPlugins.get(pluginName);
    if (!loader) {
      throw new Error(`Unknown optional plugin: ${pluginName}`);
    }

    // Check if already loading
    let promise = this.loadPromises.get(pluginName);
    if (!promise) {
      promise = loader().then(plugin => {
        optimizedRegistry.load(plugin);
        this.loadedOptional.add(pluginName);
        this.loadPromises.delete(pluginName);
        return plugin;
      });
      this.loadPromises.set(pluginName, promise);
    }

    await promise;
  }

  /**
   * Detect which optional plugins are needed based on DOM
   */
  private async detectAndLoadOptional(): Promise<void> {
    const detectionMap = {
      'websocket': '[data-ws], [_*="ws "], [_*="websocket"]',
      'worker': '[data-worker], [_*="worker "]',
      'intersection': '[data-intersect], [_*="on intersection"]',
      'animation': '[data-animate], [_*="animate "]',
      'drag': '[data-draggable], [_*="on drag"]'
    };

    const toLoad: string[] = [];

    for (const [pluginName, selector] of Object.entries(detectionMap)) {
      if (this.config.optionalPlugins.has(pluginName) && 
          !this.loadedOptional.has(pluginName) &&
          document.querySelector(selector)) {
        toLoad.push(pluginName);
      }
    }

    // Load all detected plugins in parallel
    if (toLoad.length > 0) {
      await Promise.all(toLoad.map(name => this.loadOptional(name)));
    }
  }

  /**
   * Setup mutation observer for dynamic plugin loading
   */
  setupDynamicLoading(): void {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node instanceof Element) {
              this.checkElementForPlugins(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check if an element requires any optional plugins
   */
  private checkElementForPlugins(element: Element): void {
    // Check for WebSocket usage
    if (element.matches('[data-ws], [_*="ws "]') && 
        !this.loadedOptional.has('websocket')) {
      this.loadOptional('websocket').catch(console.error);
    }

    // Check for other optional features
    // ... similar checks for other plugins
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      coreLoaded: this.config.corePlugins.length,
      optionalAvailable: this.config.optionalPlugins.size,
      optionalLoaded: this.loadedOptional.size,
      currentlyLoading: this.loadPromises.size
    };
  }
}

/**
 * Factory function for creating a hybrid loader with common setup
 */
export function createHybridLoader() {
  return new HybridPluginLoader({
    corePlugins: [
      // These would be imported from typed-commands
      // OnCommand, ToggleCommand, SendCommand
    ],
    
    optionalPlugins: new Map([
      ['websocket', async () => {
        const { WebSocketPlugin } = await import('./plugins/websocket');
        return WebSocketPlugin;
      }],
      ['worker', async () => {
        const { WorkerPlugin } = await import('./plugins/worker');
        return WorkerPlugin;
      }],
      ['animation', async () => {
        const { AnimationPlugin } = await import('./plugins/animation');
        return AnimationPlugin;
      }]
    ])
  });
}
