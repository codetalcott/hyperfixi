import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import {
  StaticGenerator,
  StaticGenerationOptions,
  StaticGenerationResult,
  RobotsOptions,
  SSRContext,
  SSROptions,
} from './types';
import { HyperFixiSSREngine } from './engine';

/**
 * Static site generator for HyperFixi applications
 */
export class HyperFixiStaticGenerator implements StaticGenerator {
  private ssrEngine: HyperFixiSSREngine;

  constructor(ssrEngine?: HyperFixiSSREngine) {
    this.ssrEngine = ssrEngine ?? new HyperFixiSSREngine();
  }

  /**
   * Generate static site from routes
   */
  async generate(
    routes: string[],
    options: StaticGenerationOptions
  ): Promise<StaticGenerationResult> {
    const startTime = performance.now();
    const files: StaticGenerationResult['files'] = [];

    // Ensure output directory exists
    await this.ensureDirectory(options.outputDir);

    // Generate pages
    for (const route of routes) {
      try {
        const pageFiles = await this.generateRoute(route, options);
        files.push(...pageFiles);
      } catch (error) {
        console.error(`Failed to generate route ${route}:`, error);
      }
    }

    // Generate sitemap if requested
    let sitemapPath: string | undefined;
    if (options.sitemap) {
      const sitemapRoutes = routes.map(route => ({
        path: route,
        lastmod: new Date(),
        priority: route === '/' ? 1.0 : 0.8,
      }));

      const sitemapContent = this.generateSitemap(sitemapRoutes);
      sitemapPath = join(options.outputDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, sitemapContent, 'utf8');

      files.push({
        path: 'sitemap.xml',
        size: Buffer.byteLength(sitemapContent, 'utf8'),
      });
    }

    // Generate robots.txt if requested
    let robotsPath: string | undefined;
    if (options.robots) {
      const robotsContent = this.generateRobots({
        ...(options.sitemap && { sitemap: `${options.baseUrl}/sitemap.xml` }),
      });
      robotsPath = join(options.outputDir, 'robots.txt');
      await fs.writeFile(robotsPath, robotsContent, 'utf8');

      files.push({
        path: 'robots.txt',
        size: Buffer.byteLength(robotsContent, 'utf8'),
      });
    }

    // Apply compression if enabled
    if (options.compression?.enabled) {
      await this.compressFiles(files, options);
    }

    const endTime = performance.now();
    const totalSize = files.reduce((size, file) => size + file.size, 0);
    const compressionRatio = this.calculateCompressionRatio(files);

    return {
      files,
      stats: {
        totalFiles: files.length,
        totalSize,
        compressionRatio,
        generationTime: endTime - startTime,
      },
      ...(sitemapPath && { sitemapPath }),
      ...(robotsPath && { robotsPath }),
    };
  }

  /**
   * Generate sitemap.xml
   */
  generateSitemap(routes: Array<{ path: string; lastmod?: Date; priority?: number }>): string {
    const urlEntries = routes
      .map(route => {
        const lastmod = route.lastmod ? route.lastmod.toISOString().split('T')[0] : '';
        const priority = route.priority ?? 0.5;

        return `  <url>
    <loc>${route.path}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <priority>${priority}</priority>
  </url>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  /**
   * Generate robots.txt
   */
  generateRobots(options: RobotsOptions): string {
    const lines: string[] = [];

    lines.push(`User-agent: ${options.userAgent ?? '*'}`);

    if (options.allow) {
      options.allow.forEach(path => {
        lines.push(`Allow: ${path}`);
      });
    }

    if (options.disallow) {
      options.disallow.forEach(path => {
        lines.push(`Disallow: ${path}`);
      });
    } else {
      // Default: allow all
      lines.push('Allow: /');
    }

    if (options.crawlDelay) {
      lines.push(`Crawl-delay: ${options.crawlDelay}`);
    }

    if (options.sitemap) {
      lines.push('');
      lines.push(`Sitemap: ${options.sitemap}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Generate a single route
   */
  private async generateRoute(
    route: string,
    options: StaticGenerationOptions
  ): Promise<StaticGenerationResult['files']> {
    const files: StaticGenerationResult['files'] = [];

    // Create SSR context for this route
    const context: SSRContext = {
      variables: {},
      request: {
        url: route,
        method: 'GET',
        headers: {},
      },
      seo: {
        title: `Page ${route}`,
        description: `Generated page for ${route}`,
        keywords: ['static', 'generated'],
      },
    };

    const ssrOptions: SSROptions = {
      hydration: true,
      seoLevel: 'full',
      inlineCSS: true,
      preloadJS: true,
      target: 'static',
    };

    // Load template for this route (in real implementation, would load from file system)
    const template = await this.loadTemplate(route);

    // Render the route
    const result = await this.ssrEngine.render(template, context, ssrOptions);

    // Generate complete HTML page
    const fullHTML = this.generateFullHTML(result, options);

    // Determine output path
    const outputPath = this.getOutputPath(route, options.outputDir);
    await this.ensureDirectory(dirname(outputPath));

    // Apply optimization if enabled
    const optimizedHTML = options.optimization?.minifyHTML ? this.minifyHTML(fullHTML) : fullHTML;

    // Write HTML file
    await fs.writeFile(outputPath, optimizedHTML, 'utf8');

    const relativePath = this.getRelativePath(outputPath, options.outputDir);
    files.push({
      path: relativePath,
      size: Buffer.byteLength(optimizedHTML, 'utf8'),
    });

    // Generate additional assets (CSS, JS)
    const assetFiles = await this.generateAssets(result, options);
    files.push(...assetFiles);

    return files;
  }

  /**
   * Load template for a route
   */
  private async loadTemplate(route: string): Promise<string> {
    // In a real implementation, this would load templates from the file system
    // For now, return a basic template
    return `
      <html>
        <head>
          <title>{{seo.title}}</title>
          <meta name="description" content="{{seo.description}}" />
        </head>
        <body>
          <h1>Welcome to ${route}</h1>
          <p>This is a statically generated page for route: ${route}</p>
          <div _="on click toggle .active">Click me for interactivity</div>
        </body>
      </html>
    `;
  }

  /**
   * Generate full HTML page with all assets
   */
  private generateFullHTML(result: any, options: StaticGenerationOptions): string {
    const metaTags = result.metaTags
      .map((tag: any) => {
        if (tag.name) {
          return `<meta name="${tag.name}" content="${tag.content}" />`;
        } else if (tag.property) {
          return `<meta property="${tag.property}" content="${tag.content}" />`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n    ');

    const linkTags = result.linkTags
      .map((link: any) => {
        let attrs = `rel="${link.rel}" href="${link.href}"`;
        if (link.as) attrs += ` as="${link.as}"`;
        if (link.type) attrs += ` type="${link.type}"`;
        return `<link ${attrs} />`;
      })
      .join('\n    ');

    const criticalCSS =
      result.criticalCSS.length > 0 ? `<style>\n${result.criticalCSS.join('\n')}\n</style>` : '';

    const hydrationScript = result.hydrationScript
      ? `<script>\n${result.hydrationScript}\n</script>`
      : '';

    // Insert meta tags, styles, and scripts into the HTML
    let html = result.html;

    // Insert into head
    const headInsert = [metaTags, linkTags, criticalCSS].filter(Boolean).join('\n    ');
    if (headInsert) {
      html = html.replace('</head>', `    ${headInsert}\n  </head>`);
    }

    // Insert hydration script before closing body
    if (hydrationScript) {
      html = html.replace('</body>', `    ${hydrationScript}\n  </body>`);
    }

    return html;
  }

  /**
   * Generate asset files (CSS, JS)
   */
  private async generateAssets(
    result: any,
    options: StaticGenerationOptions
  ): Promise<StaticGenerationResult['files']> {
    const files: StaticGenerationResult['files'] = [];

    // Generate external CSS files
    for (const css of result.externalCSS) {
      const cssContent = await this.loadAssetContent(css);
      const optimizedCSS = options.optimization?.minifyCSS
        ? this.minifyCSS(cssContent)
        : cssContent;

      const outputPath = join(options.outputDir, 'assets', css);
      await this.ensureDirectory(dirname(outputPath));
      await fs.writeFile(outputPath, optimizedCSS, 'utf8');

      files.push({
        path: `assets/${css}`,
        size: Buffer.byteLength(optimizedCSS, 'utf8'),
      });
    }

    // Generate JavaScript files
    for (const js of result.javascript) {
      const jsContent = await this.loadAssetContent(js);
      const optimizedJS = options.optimization?.minifyJS ? this.minifyJS(jsContent) : jsContent;

      const outputPath = join(options.outputDir, 'assets', js);
      await this.ensureDirectory(dirname(outputPath));
      await fs.writeFile(outputPath, optimizedJS, 'utf8');

      files.push({
        path: `assets/${js}`,
        size: Buffer.byteLength(optimizedJS, 'utf8'),
      });
    }

    return files;
  }

  /**
   * Apply compression to generated files
   */
  private async compressFiles(
    files: StaticGenerationResult['files'],
    options: StaticGenerationOptions
  ): Promise<void> {
    const compressionAlgorithms = options.compression?.algorithms ?? ['gzip'];

    for (const file of files) {
      if (file.path.endsWith('.html') || file.path.endsWith('.css') || file.path.endsWith('.js')) {
        const compressed: any = {};

        for (const algorithm of compressionAlgorithms) {
          const compressedSize = await this.compressFile(file.path, algorithm, options.outputDir);
          if (compressedSize) {
            compressed[algorithm] = compressedSize;
          }
        }

        if (Object.keys(compressed).length > 0) {
          file.compressed = compressed;
        }
      }
    }
  }

  /**
   * Compress a single file
   */
  private async compressFile(
    relativePath: string,
    algorithm: 'gzip' | 'brotli',
    outputDir: string
  ): Promise<number | null> {
    try {
      const filePath = join(outputDir, relativePath);
      const content = await fs.readFile(filePath);

      let compressed: Buffer;
      let extension: string;

      if (algorithm === 'gzip') {
        const zlib = require('zlib');
        compressed = zlib.gzipSync(content);
        extension = '.gz';
      } else if (algorithm === 'brotli') {
        const zlib = require('zlib');
        compressed = zlib.brotliCompressSync(content);
        extension = '.br';
      } else {
        return null;
      }

      const compressedPath = filePath + extension;
      await fs.writeFile(compressedPath, compressed);

      return compressed.length;
    } catch (error) {
      console.warn(`Failed to compress ${relativePath} with ${algorithm}:`, error);
      return null;
    }
  }

  /**
   * Utility methods
   */
  private async ensureDirectory(path: string): Promise<void> {
    try {
      await fs.mkdir(path, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private getOutputPath(route: string, outputDir: string): string {
    if (route === '/') {
      return join(outputDir, 'index.html');
    }

    // Remove leading slash and add .html extension
    const cleanRoute = route.startsWith('/') ? route.slice(1) : route;
    return join(outputDir, `${cleanRoute}.html`);
  }

  private getRelativePath(fullPath: string, outputDir: string): string {
    return fullPath.replace(outputDir + '/', '');
  }

  private calculateCompressionRatio(files: StaticGenerationResult['files']): number {
    let totalOriginal = 0;
    let totalCompressed = 0;

    for (const file of files) {
      totalOriginal += file.size;

      if (file.compressed?.gzip) {
        totalCompressed += file.compressed.gzip;
      } else if (file.compressed?.brotli) {
        totalCompressed += file.compressed.brotli;
      } else {
        totalCompressed += file.size;
      }
    }

    return totalOriginal > 0 ? totalCompressed / totalOriginal : 1;
  }

  private async loadAssetContent(assetPath: string): Promise<string> {
    // In a real implementation, would load from file system or CDN
    return `/* Content for ${assetPath} */`;
  }

  private minifyHTML(html: string): string {
    // Basic HTML minification
    return html
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private minifyCSS(css: string): string {
    // Basic CSS minification
    return css
      .replace(/\s*{\s*/g, '{')
      .replace(/;\s*/g, ';')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*:\s*/g, ':')
      .replace(/;\s*}/g, '}')
      .trim();
  }

  private minifyJS(js: string): string {
    // Basic JavaScript minification (in real implementation, would use a proper minifier)
    return js
      .replace(/\s*{\s*/g, '{')
      .replace(/;\s*/g, ';')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*=\s*/g, '=')
      .trim();
  }
}
