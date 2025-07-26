// import { ComponentDefinition } from '@hyperfixi/component-schema';
// import { HyperFixiTemplateEngine, TemplateContext } from '@hyperfixi/template-integration';
import {
  ComponentDefinition,
  TemplateContext,
  CompilationResult,
  SSREngine,
  SSROptions,
  SSRContext,
  SSRResult,
  HydrationData,
  SEOData,
  SSRCache,
  SSRError,
} from './types';

// Placeholder for template engine until package is available
interface HyperFixiTemplateEngine {
  compile(template: string, options?: any): Promise<CompilationResult>;
  render(compiled: CompilationResult, context: TemplateContext): Promise<string>;
  registerComponent(component: ComponentDefinition): void;
}

class MockHyperFixiTemplateEngine implements HyperFixiTemplateEngine {
  constructor(options?: any) {}
  
  async compile(template: string, options?: any): Promise<CompilationResult> {
    return {
      html: template,
      css: [],
      javascript: [],
      components: []
    };
  }
  
  async render(compiled: CompilationResult, context: TemplateContext): Promise<string> {
    return compiled.html;
  }
  
  registerComponent(component: ComponentDefinition): void {
    // Mock implementation
  }
}
import { CriticalCSSExtractor } from './critical-css';
import { SEOGenerator } from './seo';

/**
 * HyperFixi Server-Side Rendering Engine
 */
export class HyperFixiSSREngine implements SSREngine {
  private templateEngine: HyperFixiTemplateEngine;
  private criticalCSS: CriticalCSSExtractor;
  private seoGenerator: SEOGenerator;
  private cache?: SSRCache;
  private components: Map<string, ComponentDefinition> = new Map();

  constructor() {
    this.templateEngine = new MockHyperFixiTemplateEngine({
      target: 'server',
      minify: false, // Will be handled at SSR level
    });
    this.criticalCSS = new CriticalCSSExtractor();
    this.seoGenerator = new SEOGenerator();
  }

  /**
   * Render template with server-side rendering
   */
  async render(
    template: string,
    context: SSRContext,
    options: SSROptions = {}
  ): Promise<SSRResult> {
    const startTime = performance.now();

    try {
      // Check cache first
      if (this.cache && options.cacheTTL && options.cacheTTL > 0) {
        const cacheKey = this.generateCacheKey(template, context, options);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Compile template with components
      const compiled = await this.templateEngine.compile(template, {
        target: 'server',
        minify: false,
      });

      // Render HTML with context
      const html = await this.templateEngine.render(compiled, context);

      // Extract critical CSS if needed
      let criticalCSS: string[] = [];
      if (options.inlineCSS && compiled.css.length > 0) {
        criticalCSS = await this.extractCriticalCSS(html, compiled.css);
      }

      // Generate SEO tags
      const metaTags = context.seo 
        ? this.generateSEOTags(this.transformSEOData(context.seo))
        : [];

      // Generate performance hints
      const linkTags = this.generateLinkTags(compiled, context, options);

      // Generate hydration script
      let hydrationScript: string | undefined;
      if (options.hydration) {
        const hydrationData: HydrationData = {
          components: this.extractComponentState(compiled.components, context),
          appState: context.variables ?? {},
          config: {
            ...(process.env.API_BASE_URL && { apiBaseUrl: process.env.API_BASE_URL }),
            debug: process.env.NODE_ENV === 'development',
          },
          route: {
            path: context.request?.url ?? '/',
            params: {},
            query: {},
          },
        };
        hydrationScript = this.generateHydration(hydrationData);
      }

      const renderTime = performance.now() - startTime;
      const result: SSRResult = {
        html: this.injectHydrationData(html, hydrationScript, options),
        ...(hydrationScript && { hydrationScript }),
        criticalCSS,
        externalCSS: compiled.css.filter(css => !criticalCSS.includes(css)),
        javascript: compiled.javascript,
        metaTags,
        linkTags,
        performance: {
          renderTime,
          hydrationSize: hydrationScript ? Buffer.byteLength(hydrationScript, 'utf8') : 0,
          criticalCSSSize: criticalCSS.reduce((size, css) => size + Buffer.byteLength(css, 'utf8'), 0),
          totalSize: Buffer.byteLength(html, 'utf8'),
        },
      };

      // Cache result if caching is enabled
      if (this.cache && options.cacheTTL && options.cacheTTL > 0) {
        const cacheKey = this.generateCacheKey(template, context, options);
        result.cache = {
          key: cacheKey,
          ttl: options.cacheTTL,
          tags: this.generateCacheTags(context),
        };
        await this.cache.set(cacheKey, result, options.cacheTTL);
      }

      return result;

    } catch (error) {
      const ssrError = new Error(`SSR rendering failed: ${error instanceof Error ? error.message : String(error)}`) as SSRError;
      ssrError.type = 'render';
      ssrError.context = { template: template.substring(0, 100), context };
      throw ssrError;
    }
  }

  /**
   * Generate hydration script for client-side initialization
   */
  generateHydration(data: HydrationData): string {
    const script = `
      (function() {
        if (typeof window === 'undefined') return;
        
        // Hydration data
        window.__HYPERFIXI_HYDRATION__ = ${JSON.stringify(data)};
        
        // Initialize components
        document.addEventListener('DOMContentLoaded', function() {
          const hydrationData = window.__HYPERFIXI_HYDRATION__;
          if (!hydrationData) return;
          
          // Initialize each component
          Object.entries(hydrationData.components).forEach(([selector, componentData]) => {
            const elements = document.querySelectorAll('[data-component="' + componentData.id + '"]');
            elements.forEach(element => {
              // Restore component state
              Object.entries(componentData.state).forEach(([key, value]) => {
                element.dataset[key] = JSON.stringify(value);
              });
              
              // Execute hyperscript
              componentData.hyperscript.forEach(script => {
                try {
                  if (typeof _hyperscript !== 'undefined') {
                    _hyperscript.processNode(element, script);
                  }
                } catch (e) {
                  console.warn('Failed to hydrate hyperscript:', script, e);
                }
              });
            });
          });
          
          // Set global app state
          if (hydrationData.appState) {
            window.__HYPERFIXI_STATE__ = hydrationData.appState;
          }
          
          // Configure client
          if (hydrationData.config) {
            window.__HYPERFIXI_CONFIG__ = hydrationData.config;
          }
          
          // Emit hydration complete event
          window.dispatchEvent(new CustomEvent('hyperfixi:hydrated', {
            detail: hydrationData
          }));
        });
      })();
    `;

    return script.trim();
  }

  /**
   * Extract critical CSS from rendered HTML
   */
  async extractCriticalCSS(html: string, allCSS: string[]): Promise<string[]> {
    const critical: string[] = [];

    for (const cssFile of allCSS) {
      try {
        // Load CSS content (in real implementation, would read from file system or CDN)
        const cssContent = await this.loadCSSContent(cssFile);
        const result = await this.criticalCSS.extract(html, [cssContent]);
        
        if (result.critical) {
          critical.push(result.critical);
        }
      } catch (error) {
        console.warn(`Failed to extract critical CSS from ${cssFile}:`, error);
      }
    }

    return critical;
  }

  /**
   * Generate SEO meta tags
   */
  generateSEOTags(seoData: SEOData): Array<{ name?: string; property?: string; content: string; }> {
    return this.seoGenerator.generateTags(seoData);
  }

  /**
   * Set cache implementation
   */
  setCache(cache: SSRCache): void {
    this.cache = cache;
  }

  /**
   * Register component for SSR usage
   */
  registerComponent(component: ComponentDefinition): void {
    this.components.set(component.id, component);
    // Also register with template engine
    this.templateEngine.registerComponent(component);
  }

  /**
   * Private helper methods
   */
  private generateCacheKey(template: string, context: SSRContext, options: SSROptions): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    
    hash.update(template);
    hash.update(JSON.stringify(context.variables ?? {}));
    hash.update(JSON.stringify(context.seo ?? {}));
    hash.update(JSON.stringify(options));
    hash.update(context.request?.url ?? '');
    
    return hash.digest('hex');
  }

  private generateCacheTags(context: SSRContext): string[] {
    const tags: string[] = ['ssr'];
    
    if (context.request?.url) {
      tags.push(`url:${context.request.url}`);
    }
    
    if (context.user?.id) {
      tags.push(`user:${context.user.id}`);
    }
    
    if (context.seo?.title) {
      tags.push('page');
    }
    
    return tags;
  }

  private extractComponentState(
    components: ComponentDefinition[], 
    context: SSRContext
  ): Record<string, { id: string; state: Record<string, any>; hyperscript: string[]; }> {
    const componentState: Record<string, any> = {};

    components.forEach(component => {
      const state = this.extractStateFromContext(component, context);
      const hyperscript = Array.isArray(component.hyperscript) 
        ? component.hyperscript 
        : [component.hyperscript];

      componentState[`#${component.id}`] = {
        id: component.id,
        state,
        hyperscript,
      };
    });

    return componentState;
  }

  private extractStateFromContext(component: ComponentDefinition, context: SSRContext): Record<string, any> {
    const state: Record<string, any> = {};
    
    if (component.template?.variables && context.variables) {
      Object.keys(component.template.variables).forEach(varName => {
        if (varName in context.variables!) {
          state[varName] = context.variables![varName];
        }
      });
    }

    return state;
  }

  private transformSEOData(seo: SSRContext['seo']): SEOData {
    return {
      title: seo?.title ?? '',
      description: seo?.description ?? '',
      keywords: seo?.keywords ?? [],
      ...(seo?.canonicalUrl && { canonical: seo.canonicalUrl }),
      openGraph: {
        title: seo?.ogTitle ?? seo?.title ?? '',
        description: seo?.ogDescription ?? seo?.description ?? '',
        ...(seo?.ogImage && { image: seo.ogImage }),
        type: 'website',
      },
      twitter: {
        card: seo?.twitterCard ?? 'summary',
        title: seo?.twitterTitle ?? seo?.title ?? '',
        description: seo?.twitterDescription ?? seo?.description ?? '',
        ...(seo?.twitterImage && { image: seo.twitterImage }),
      },
      structuredData: (seo?.structuredData ?? []).map(data => ({
        '@context': data['@context'] || 'https://schema.org',
        '@type': data['@type'] || 'WebPage',
        ...data,
      })),
    };
  }

  private generateLinkTags(
    compiled: any, 
    context: SSRContext, 
    options: SSROptions
  ): Array<{ rel: string; href: string; as?: string; type?: string; }> {
    const linkTags: Array<{ rel: string; href: string; as?: string; type?: string; }> = [];

    // Preload JavaScript if enabled
    if (options.preloadJS) {
      compiled.javascript.forEach((js: string) => {
        linkTags.push({
          rel: 'preload',
          href: js,
          as: 'script',
          type: 'text/javascript',
        });
      });
    }

    // Add CSS links
    compiled.css.forEach((css: string) => {
      linkTags.push({
        rel: 'stylesheet',
        href: css,
        type: 'text/css',
      });
    });

    // Add performance hints from context
    if (context.performance?.preconnect) {
      context.performance.preconnect.forEach(url => {
        linkTags.push({ rel: 'preconnect', href: url });
      });
    }

    if (context.performance?.prefetch) {
      context.performance.prefetch.forEach(url => {
        linkTags.push({ rel: 'prefetch', href: url });
      });
    }

    return linkTags;
  }

  private injectHydrationData(html: string, hydrationScript?: string, options: SSROptions = {}): string {
    if (!hydrationScript) {
      return html;
    }

    // Find insertion point (before closing body tag)
    const bodyCloseIndex = html.lastIndexOf('</body>');
    if (bodyCloseIndex === -1) {
      // No body tag, append to end
      return html + `\n<script>${hydrationScript}</script>`;
    }

    // Insert hydration script before </body>
    return html.substring(0, bodyCloseIndex) + 
           `\n<script>${hydrationScript}</script>\n` + 
           html.substring(bodyCloseIndex);
  }

  private async loadCSSContent(cssFile: string): Promise<string> {
    // In a real implementation, this would load CSS from file system or CDN
    // For now, return placeholder
    return `/* CSS content for ${cssFile} */`;
  }
}

/**
 * Default SSR engine instance
 */
export const ssrEngine = new HyperFixiSSREngine();

/**
 * Convenience functions
 */
export async function renderSSR(
  template: string,
  context: SSRContext,
  options?: SSROptions
): Promise<SSRResult> {
  return await ssrEngine.render(template, context, options);
}

export function generateHydrationScript(data: HydrationData): string {
  return ssrEngine.generateHydration(data);
}

export async function extractCriticalCSS(html: string, css: string[]): Promise<string[]> {
  return await ssrEngine.extractCriticalCSS(html, css);
}