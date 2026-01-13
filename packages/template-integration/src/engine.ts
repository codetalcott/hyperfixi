import {
  ComponentDefinition,
  ComponentRegistry,
  createRegistry,
} from '@hyperfixi/component-schema';

import {
  TemplateEngine,
  TemplateOptions,
  TemplateContext,
  CompilationResult,
  TemplateNode,
  DirectiveHandler,
  TemplateBundle,
  CacheEntry,
} from './types';

import { TemplateParser } from './parser';
import { TemplateCompiler } from './compiler';

/**
 * Complete template engine with caching and component registry
 */
export class HyperFixiTemplateEngine implements TemplateEngine {
  private parser: TemplateParser;
  private compiler: TemplateCompiler;
  private registry: ComponentRegistry;
  private cache: Map<string, CacheEntry> = new Map();
  private options: TemplateOptions;
  private registeredComponentCount: number = 0;

  constructor(options: TemplateOptions = {}) {
    this.options = {
      minify: false,
      sourceMaps: false,
      target: 'browser',
      development: false,
      ...options,
    };

    this.parser = new TemplateParser(this.options);
    this.compiler = new TemplateCompiler(this.options);
    this.registry = createRegistry('memory');
  }

  /**
   * Compile template with caching
   */
  async compile(template: string, options?: TemplateOptions): Promise<CompilationResult> {
    const mergedOptions = { ...this.options, ...options };
    const cacheKey = this.getCacheKey(template, mergedOptions);

    // Check cache first
    if (!mergedOptions.development) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        cached.metadata.hits++;
        cached.metadata.lastAccessed = Date.now();
        return cached.result;
      }
    }

    // Compile template
    const result = await this.compiler.compile(template, mergedOptions);

    // Cache result (if not in development mode)
    if (!mergedOptions.development) {
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        hash: this.hashTemplate(template),
        metadata: {
          hits: 1,
          lastAccessed: Date.now(),
          options: mergedOptions,
        },
      });
    }

    return result;
  }

  /**
   * Render compiled template with context
   */
  async render(compiled: CompilationResult, context: TemplateContext = {}): Promise<string> {
    return await this.compiler.render(compiled, context);
  }

  /**
   * Parse template into AST
   */
  parse(template: string): TemplateNode[] {
    return this.parser.parse(template);
  }

  /**
   * Add custom directive handler
   */
  addDirective(name: string, handler: DirectiveHandler): void {
    this.compiler.addDirective(name, handler);
  }

  /**
   * Register component for use in templates
   */
  async registerComponent(component: ComponentDefinition): Promise<void> {
    await this.registry.register(component);
    await this.compiler.registerComponent(component);
    this.registeredComponentCount++;
  }

  /**
   * Compile and render template in one step
   */
  async compileAndRender(
    template: string,
    context: TemplateContext = {},
    options?: TemplateOptions
  ): Promise<string> {
    const compiled = await this.compile(template, options);
    return await this.render(compiled, context);
  }

  /**
   * Create template bundle for deployment
   */
  async createBundle(
    templates: Record<string, string>,
    options?: TemplateOptions
  ): Promise<TemplateBundle> {
    const startTime = performance.now();
    const mergedOptions = { ...this.options, ...options };

    const compiledTemplates: Record<string, CompilationResult> = {};
    const allComponents = new Map<string, ComponentDefinition>();
    const allCss = new Set<string>();
    const allJavaScript = new Set<string>();
    const allHyperscript: string[] = [];

    // Compile all templates
    for (const [name, template] of Object.entries(templates)) {
      const compiled = await this.compile(template, mergedOptions);
      compiledTemplates[name] = compiled;

      // Collect dependencies
      compiled.components.forEach(comp => allComponents.set(comp.id, comp));
      compiled.css.forEach(css => allCss.add(css));
      compiled.javascript.forEach(js => allJavaScript.add(js));
      allHyperscript.push(...compiled.hyperscript);
    }

    // Create main HTML with all templates
    const mainHtml = Object.entries(compiledTemplates)
      .map(([name, compiled]) => `<!-- Template: ${name} -->\n${compiled.html}`)
      .join('\n\n');

    // Combine all hyperscript
    const combinedHyperscript = allHyperscript.join('\n');

    const buildTime = performance.now() - startTime;
    const bundleSize = Buffer.byteLength(mainHtml + combinedHyperscript, 'utf8');

    return {
      html: mainHtml,
      hyperscript: combinedHyperscript,
      css: Array.from(allCss),
      javascript: Array.from(allJavaScript),
      components: Array.from(allComponents.values()),
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        options: mergedOptions,
        performance: {
          bundleSize,
          compressionRatio: 1.0, // Would calculate actual compression in real implementation
          buildTime,
        },
      },
    };
  }

  /**
   * Get template compilation statistics
   */
  getStats(): {
    cacheHits: number;
    cacheMisses: number;
    totalCompilations: number;
    componentsRegistered: number;
  } {
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const entry of this.cache.values()) {
      if (entry.metadata.hits > 1) {
        cacheHits += entry.metadata.hits - 1;
        cacheMisses += 1;
      } else {
        cacheMisses += 1;
      }
    }

    return {
      cacheHits,
      cacheMisses,
      totalCompilations: cacheHits + cacheMisses,
      componentsRegistered: this.registeredComponentCount,
    };
  }

  /**
   * Clear compilation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Precompile templates for better performance
   */
  async precompile(
    templates: Record<string, string>,
    options?: TemplateOptions
  ): Promise<Record<string, CompilationResult>> {
    const results: Record<string, CompilationResult> = {};

    for (const [name, template] of Object.entries(templates)) {
      results[name] = await this.compile(template, options);
    }

    return results;
  }

  /**
   * Load components from registry
   */
  async loadComponents(componentIds: string[]): Promise<void> {
    for (const id of componentIds) {
      const component = await this.registry.get(id);
      if (component) {
        await this.compiler.registerComponent(component);
      }
    }
  }

  /**
   * Hot reload template (development mode)
   */
  async hotReload(template: string, templateId?: string): Promise<CompilationResult> {
    if (templateId) {
      // Remove from cache
      const cacheKeys = Array.from(this.cache.keys()).filter(key => key.includes(templateId));
      cacheKeys.forEach(key => this.cache.delete(key));
    }

    return await this.compile(template, { ...this.options, development: true });
  }

  /**
   * Private utility methods
   */
  private getCacheKey(template: string, options: TemplateOptions): string {
    const optionsHash = this.hashOptions(options);
    const templateHash = this.hashTemplate(template);
    return `${templateHash}-${optionsHash}`;
  }

  private hashTemplate(template: string): string {
    // Simple hash function - would use crypto.createHash in real implementation
    let hash = 0;
    for (let i = 0; i < template.length; i++) {
      const char = template.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private hashOptions(options: TemplateOptions): string {
    const optionsString = JSON.stringify(options, Object.keys(options).sort());
    return this.hashTemplate(optionsString);
  }

  private isCacheValid(entry: CacheEntry): boolean {
    const maxAge = 1000 * 60 * 60; // 1 hour
    return Date.now() - entry.timestamp < maxAge;
  }
}

/**
 * Default template engine instance
 */
export const templateEngine = new HyperFixiTemplateEngine();

/**
 * Convenience functions
 */
export async function compileTemplate(
  template: string,
  options?: TemplateOptions
): Promise<CompilationResult> {
  return await templateEngine.compile(template, options);
}

export async function renderTemplate(
  template: string,
  context: TemplateContext = {},
  options?: TemplateOptions
): Promise<string> {
  return await templateEngine.compileAndRender(template, context, options);
}

export async function createTemplateEngine(
  options?: TemplateOptions
): Promise<HyperFixiTemplateEngine> {
  return new HyperFixiTemplateEngine(options);
}
