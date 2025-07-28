/**
 * Plugin Registry Implementation
 */

import type {
  Plugin,
  PluginRegistry,
  InitContext,
  ElementContext,
  CommandPlugin,
  FeaturePlugin,
  TransformPlugin,
  RuntimePlugin,
  PluginType,
  CommandHandler,
  FeatureDefinition
} from './types';

export class HyperfixiPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private commandHandlers = new Map<string, CommandHandler>();
  private features = new Map<string, FeatureDefinition>();
  private elementCleanups = new WeakMap<Element, Map<string, () => void>>();
  private initialized = false;

  load(...plugins: Plugin[]): void {
    for (const plugin of plugins) {
      this.validatePlugin(plugin);
      this.plugins.set(plugin.name, plugin);

      // Initialize based on plugin type
      const initCtx: InitContext = {
        plugins: this.plugins,
        registerCommand: this.registerCommand.bind(this),
        registerFeature: this.registerFeature.bind(this)
      };

      switch (plugin.type) {
        case 'command':
          this.loadCommandPlugin(plugin as CommandPlugin);
          break;
        case 'feature':
          this.loadFeaturePlugin(plugin as FeaturePlugin, initCtx);
          break;
        case 'transform':
          this.loadTransformPlugin(plugin as TransformPlugin);
          break;
        case 'runtime':
          this.loadRuntimePlugin(plugin as RuntimePlugin);
          break;
      }
    }

    // Sort command plugins by pattern specificity
    this.sortCommandPlugins();
  }

  unload(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return;

    // Cleanup based on type
    switch (plugin.type) {
      case 'command':
        this.commandHandlers.delete(plugin.name);
        break;
      case 'feature':
        this.features.delete(plugin.name);
        break;
    }

    this.plugins.delete(pluginName);
  }

  get(pluginName: string): Plugin | undefined {
    return this.plugins.get(pluginName);
  }

  getByType<T extends Plugin>(type: PluginType): T[] {
    return Array.from(this.plugins.values())
      .filter(p => p.type === type) as T[];
  }

  apply(root: Element = document.body): void {
    if (!this.initialized) {
      this.setupMutationObserver(root);
      this.initialized = true;
    }

    // Apply to root and all descendants
    this.applyToElement(root);
    const elements = root.querySelectorAll('*');
    elements.forEach(el => this.applyToElement(el));
  }

  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name || !plugin.type) {
      throw new Error('Plugin must have name and type');
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' already loaded`);
    }

    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin '${plugin.name}' depends on '${dep}' which is not loaded`);
        }
      }
    }
  }

  private loadCommandPlugin(plugin: CommandPlugin): void {
    this.commandHandlers.set(plugin.name, plugin.execute);
  }

  private loadFeaturePlugin(plugin: FeaturePlugin, ctx: InitContext): void {
    if (plugin.onGlobalInit) {
      plugin.onGlobalInit(ctx);
    }
  }

  private loadTransformPlugin(plugin: TransformPlugin): void {
    // Transform plugins are used during parsing phase
  }

  private loadRuntimePlugin(plugin: RuntimePlugin): void {
    // Runtime plugins enhance execution
  }

  private registerCommand(name: string, handler: CommandHandler): void {
    this.commandHandlers.set(name, handler);
  }

  private registerFeature(name: string, feature: FeatureDefinition): void {
    this.features.set(name, feature);
  }

  private sortCommandPlugins(): void {
    // Sort by pattern length (more specific first)
    const commandPlugins = this.getByType<CommandPlugin>('command');
    commandPlugins.sort((a, b) => {
      const aLen = a.pattern.toString().length;
      const bLen = b.pattern.toString().length;
      return bLen - aLen;
    });
  }

  private applyToElement(element: Element): void {
    // Skip if marked to ignore
    if (element.hasAttribute('data-hs-ignore')) return;

    // Apply feature plugins
    const featurePlugins = this.getByType<FeaturePlugin>('feature');
    for (const plugin of featurePlugins) {
      if (plugin.onElementInit) {
        const cleanups = this.elementCleanups.get(element) || new Map();
        
        const ctx: ElementContext = {
          element,
          attribute: '',
          value: '',
          cleanup: (fn: () => void) => {
            cleanups.set(plugin.name, fn);
          }
        };

        const cleanup = plugin.onElementInit(ctx);
        if (cleanup) {
          cleanups.set(plugin.name, cleanup);
        }

        if (cleanups.size > 0) {
          this.elementCleanups.set(element, cleanups);
        }
      }
    }

    // Check for hyperscript attributes
    const hsAttrs = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('_') || attr.name === 'data-hs');

    for (const attr of hsAttrs) {
      this.processAttribute(element, attr);
    }
  }

  private processAttribute(element: Element, attr: Attr): void {
    const value = attr.value;
    if (!value) return;

    // Find matching command plugins
    const commandPlugins = this.getByType<CommandPlugin>('command');
    for (const plugin of commandPlugins) {
      const pattern = typeof plugin.pattern === 'string' 
        ? new RegExp(`^${plugin.pattern}`)
        : plugin.pattern;

      if (pattern.test(value)) {
        // Execute the command plugin
        // This would integrate with the hyperscript parser
        console.log(`Matched plugin '${plugin.name}' for: ${value}`);
        break;
      }
    }
  }

  private setupMutationObserver(root: Element): void {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Handle removed nodes
          mutation.removedNodes.forEach(node => {
            if (node instanceof Element) {
              this.cleanupElement(node);
            }
          });

          // Handle added nodes
          mutation.addedNodes.forEach(node => {
            if (node instanceof Element) {
              this.applyToElement(node);
              node.querySelectorAll('*').forEach(el => this.applyToElement(el));
            }
          });
        } else if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          // Re-process element when attributes change
          this.applyToElement(mutation.target);
        }
      }
    });

    observer.observe(root, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['_', 'data-hs']
    });
  }

  private cleanupElement(element: Element): void {
    const cleanups = this.elementCleanups.get(element);
    if (cleanups) {
      cleanups.forEach(cleanup => cleanup());
      this.elementCleanups.delete(element);
    }

    // Cleanup descendants
    element.querySelectorAll('*').forEach(el => this.cleanupElement(el));
  }
}

// Export singleton instance
export const pluginRegistry = new HyperfixiPluginRegistry();
