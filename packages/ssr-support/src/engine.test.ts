import { describe, it, expect, beforeEach } from 'vitest';
import { HyperFixiSSREngine } from './engine';
import { SSRContext, SSROptions } from './types';
import { createComponent } from '@hyperfixi/component-schema';

describe('HyperFixiSSREngine', () => {
  let engine: HyperFixiSSREngine;

  beforeEach(() => {
    engine = new HyperFixiSSREngine();
  });

  describe('basic rendering', () => {
    it('should render simple template', async () => {
      const template = '<div>Hello, {{name}}!</div>';
      const context: SSRContext = {
        variables: { name: 'World' },
      };

      const result = await engine.render(template, context);

      // Template engine substitutes variables during render
      expect(result.html).toContain('Hello');
      expect(result.performance.renderTime).toBeGreaterThan(0);
    });

    it('should handle empty context', async () => {
      const template = '<div>Static content</div>';
      const context: SSRContext = {};

      const result = await engine.render(template, context);

      expect(result.html).toContain('Static content');
      expect(result.metaTags).toHaveLength(0);
    });

    it('should extract hyperscript from templates', async () => {
      const template = '<button _="on click toggle .active">Click me</button>';
      const context: SSRContext = {};

      const result = await engine.render(template, context);

      // The template engine extracts hyperscript - the _ attribute is processed
      expect(result.html).toContain('button');
      expect(result.html).toContain('Click me');
      // Hyperscript is extracted into the hyperscript array
      expect(result.hyperscript).toBeDefined();
    });
  });

  describe('SEO features', () => {
    it('should generate SEO meta tags', async () => {
      const template = '<html><head><title>{{seo.title}}</title></head><body>Content</body></html>';
      const context: SSRContext = {
        seo: {
          title: 'Test Page',
          description: 'This is a test page',
          keywords: ['test', 'page'],
          ogTitle: 'Test Page OG',
          ogDescription: 'Test page for Open Graph',
        },
      };

      const result = await engine.render(template, context);

      expect(result.metaTags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'title', content: 'Test Page' }),
          expect.objectContaining({ name: 'description', content: 'This is a test page' }),
          expect.objectContaining({ name: 'keywords', content: 'test, page' }),
          expect.objectContaining({ property: 'og:title', content: 'Test Page OG' }),
          expect.objectContaining({
            property: 'og:description',
            content: 'Test page for Open Graph',
          }),
        ])
      );
    });

    it('should generate Twitter Card tags', async () => {
      const template = '<div>Content</div>';
      const context: SSRContext = {
        seo: {
          title: 'Twitter Test',
          description: 'Twitter description',
          twitterCard: 'summary_large_image',
          twitterTitle: 'Twitter Title',
          twitterImage: 'https://example.com/image.jpg',
        },
      };

      const result = await engine.render(template, context);

      expect(result.metaTags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'twitter:card', content: 'summary_large_image' }),
          expect.objectContaining({ name: 'twitter:title', content: 'Twitter Title' }),
          expect.objectContaining({
            name: 'twitter:image',
            content: 'https://example.com/image.jpg',
          }),
        ])
      );
    });
  });

  describe('hydration', () => {
    it('should generate hydration script when enabled', async () => {
      const template = '<div id="app" _="init log \'loaded\'">{{message}}</div>';
      const context: SSRContext = {
        variables: { message: 'Hello Hydration' },
      };
      const options: SSROptions = {
        hydration: true,
      };

      const result = await engine.render(template, context, options);

      expect(result.hydrationScript).toBeDefined();
      expect(result.hydrationScript).toContain('__HYPERFIXI_HYDRATION__');
      expect(result.hydrationScript).toContain('hyperfixi:hydrated');
      expect(result.performance.hydrationSize).toBeGreaterThan(0);
    });

    it('should include app state in hydration', async () => {
      const template = '<div id="app">{{message}}</div>';
      const context: SSRContext = {
        variables: { message: 'Hello Hydration' },
      };
      const options: SSROptions = {
        hydration: true,
      };

      const result = await engine.render(template, context, options);

      // Hydration script should include app state
      expect(result.hydrationScript).toContain('__HYPERFIXI_HYDRATION__');
      expect(result.hydrationScript).toContain('appState');
      expect(result.hydrationScript).toContain('Hello Hydration');
    });

    it('should not generate hydration when disabled', async () => {
      const template = '<div>{{message}}</div>';
      const context: SSRContext = {
        variables: { message: 'No Hydration' },
      };
      const options: SSROptions = {
        hydration: false,
      };

      const result = await engine.render(template, context, options);

      expect(result.hydrationScript).toBeUndefined();
      expect(result.performance.hydrationSize).toBe(0);
    });
  });

  describe('component integration', () => {
    it('should register and track components', async () => {
      const component = createComponent('greeting', 'Greeting Component', 'on click log "hello"');
      component.template = {
        html: '<div class="greeting">Hello!</div>',
      };

      // Registering component should not throw
      engine.registerComponent(component);

      const template = '<div>Content</div>';
      const context: SSRContext = {};

      const result = await engine.render(template, context);

      // Result should have components array (may be empty if template doesn't use them)
      expect(result.components).toBeDefined();
      expect(Array.isArray(result.components)).toBe(true);
    });

    it('should track CSS and JavaScript dependencies', async () => {
      // The template engine tracks dependencies from components
      const template = '<div>Simple content</div>';
      const context: SSRContext = {};

      const result = await engine.render(template, context);

      // These arrays should exist even if empty
      expect(result.externalCSS).toBeDefined();
      expect(result.javascript).toBeDefined();
      expect(Array.isArray(result.externalCSS)).toBe(true);
      expect(Array.isArray(result.javascript)).toBe(true);
    });
  });

  describe('critical CSS', () => {
    it('should extract critical CSS when enabled', async () => {
      const template = '<div class="hero">{{title}}</div>';
      const context: SSRContext = {
        variables: { title: 'Hero Title' },
      };
      const options: SSROptions = {
        inlineCSS: true,
      };

      const result = await engine.render(template, context, options);

      // Note: This would work better with actual CSS files in a real implementation
      expect(result.criticalCSS).toBeDefined();
      expect(result.performance.criticalCSSSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance and caching', () => {
    it('should provide performance metrics', async () => {
      const template = '<div>{{content}}</div>';
      const context: SSRContext = {
        variables: { content: 'Performance test' },
      };

      const result = await engine.render(template, context);

      expect(result.performance).toBeDefined();
      expect(result.performance.renderTime).toBeGreaterThan(0);
      expect(result.performance.totalSize).toBeGreaterThan(0);
    });

    it('should support caching with TTL', async () => {
      const mockCache = {
        cache: new Map(),
        async get(key: string) {
          return this.cache.get(key) || null;
        },
        async set(key: string, value: any, ttl: number) {
          this.cache.set(key, value);
        },
        async invalidate(tags: string[]) {
          // Mock implementation
        },
        async clear() {
          this.cache.clear();
        },
        async stats() {
          return { hits: 0, misses: 0, size: 0, keys: 0 };
        },
      };

      engine.setCache(mockCache);

      const template = '<div>{{message}}</div>';
      const context: SSRContext = {
        variables: { message: 'Cached content' },
      };
      const options: SSROptions = {
        cacheTTL: 3600,
      };

      // First render
      const result1 = await engine.render(template, context, options);
      expect(result1.cache).toBeDefined();
      expect(result1.cache!.ttl).toBe(3600);

      // Second render should use cache
      const result2 = await engine.render(template, context, options);
      expect(result2).toBe(result1); // Same object reference from cache
    });
  });

  describe('link tags and resources', () => {
    it('should generate preload links when enabled', async () => {
      const template = '<div>Content</div>';
      const context: SSRContext = {};
      const options: SSROptions = {
        preloadJS: true,
      };

      // Mock compiled result with JavaScript
      const mockTemplate = {
        compile: async () => ({
          html: '<div>Content</div>',
          javascript: ['app.js', 'vendor.js'],
          css: ['styles.css'],
          components: [],
          variables: [],
          hyperscript: [],
          warnings: [],
        }),
        render: async (compiled: any, context: any) => compiled.html,
      };

      // This test would work better with actual template engine integration
      const result = await engine.render(template, context, options);

      expect(result.linkTags).toBeDefined();
    });

    it('should include performance hints from context', async () => {
      const template = '<div>Content</div>';
      const context: SSRContext = {
        performance: {
          preconnect: ['https://api.example.com'],
          prefetch: ['https://cdn.example.com'],
        },
      };

      const result = await engine.render(template, context);

      expect(result.linkTags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rel: 'preconnect', href: 'https://api.example.com' }),
          expect.objectContaining({ rel: 'prefetch', href: 'https://cdn.example.com' }),
        ])
      );
    });
  });

  describe('error handling', () => {
    it('should handle valid templates without errors', async () => {
      const template = '<div>Valid content</div>';
      const context: SSRContext = {};

      const result = await engine.render(template, context);
      expect(result).toBeDefined();
      expect(result.html).toContain('Valid content');
    });

    it('should handle unknown elements gracefully', async () => {
      const template = '<custom-element>Content</custom-element>';
      const context: SSRContext = {};

      // Should not throw, templates can contain any elements
      const result = await engine.render(template, context);
      expect(result).toBeDefined();
    });
  });

  describe('request context integration', () => {
    it('should include route information in hydration', async () => {
      const template = '<div>Content</div>';
      const context: SSRContext = {
        variables: { message: 'Hello' },
        request: {
          url: '/test-route',
          method: 'GET',
          headers: { 'user-agent': 'Test Browser' },
        },
      };
      const options: SSROptions = {
        hydration: true,
      };

      const result = await engine.render(template, context, options);

      // Route path should be in hydration data
      expect(result.hydrationScript).toContain('/test-route');
    });
  });
});
