// Temporary: Import types or create placeholders until packages are built
// import { ComponentDefinition } from '@hyperfixi/component-schema';
// import { TemplateContext, CompilationResult } from '@hyperfixi/template-integration';

// Placeholder types until packages are available
export interface ComponentDefinition {
  id: string;
  name: string;
  hyperscript: string | string[];
  template?: {
    html?: string;
    variables?: Record<string, any>;
  };
  metadata?: any;
}

export interface TemplateContext {
  variables?: Record<string, any>;
  components?: ComponentDefinition[];
}

export interface CompilationResult {
  html: string;
  css: string[];
  javascript: string[];
  components: ComponentDefinition[];
}

/**
 * Server-side rendering and hydration types
 */

export interface SSROptions {
  /** Whether to enable client-side hydration */
  hydration?: boolean;
  /** SEO optimization level */
  seoLevel?: 'none' | 'basic' | 'full';
  /** Whether to inline critical CSS */
  inlineCSS?: boolean;
  /** Whether to preload JavaScript */
  preloadJS?: boolean;
  /** Target rendering environment */
  target?: 'server' | 'static';
  /** Whether to enable progressive enhancement */
  progressiveEnhancement?: boolean;
  /** Custom meta tags */
  metaTags?: Record<string, string>;
  /** Cache TTL in seconds */
  cacheTTL?: number;
}

export interface SSRContext extends TemplateContext {
  /** Template variables for server-side rendering */
  variables?: Record<string, any>;
  /** User information for context */
  user?: {
    id?: string;
    name?: string;
    email?: string;
    roles?: string[];
    authenticated?: boolean;
  };
  /** Request information */
  request?: {
    url: string;
    method?: string;
    headers: Record<string, string>;
    userAgent?: string;
    ip?: string;
  };
  /** Response configuration */
  response?: {
    status?: number;
    headers?: Record<string, string>;
    cookies?: Array<{
      name: string;
      value: string;
      options?: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
        maxAge?: number;
        expires?: Date;
      };
    }>;
  };
  /** SEO metadata */
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonicalUrl?: string;
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: 'summary' | 'summary_large_image';
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    structuredData?: Record<string, any>[];
  };
  /** Performance hints */
  performance?: {
    critical?: string[];
    preload?: string[];
    prefetch?: string[];
    preconnect?: string[];
  };
}

export interface SSRResult {
  /** Rendered HTML */
  html: string;
  /** Client-side hydration script */
  hydrationScript?: string;
  /** Critical CSS to inline */
  criticalCSS: string[];
  /** External CSS files */
  externalCSS: string[];
  /** JavaScript bundles */
  javascript: string[];
  /** Meta tags for SEO */
  metaTags: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
  /** Link tags for resources */
  linkTags: Array<{
    rel: string;
    href: string;
    as?: string;
    type?: string;
  }>;
  /** Performance metrics */
  performance: {
    renderTime: number;
    hydrationSize: number;
    criticalCSSSize: number;
    totalSize: number;
  };
  /** Cache information */
  cache?: {
    key: string;
    ttl: number;
    tags: string[];
  };
}

export interface HydrationData {
  /** Component state to hydrate */
  components: Record<string, {
    id: string;
    state: Record<string, any>;
    hyperscript: string[];
  }>;
  /** Global application state */
  appState: Record<string, any>;
  /** Client-side configuration */
  config: {
    apiBaseUrl?: string;
    cdnUrl?: string;
    debug?: boolean;
    features?: string[];
  };
  /** Route information */
  route?: {
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
  };
}

export interface SEOData {
  /** Page title */
  title: string;
  /** Meta description */
  description: string;
  /** Keywords */
  keywords: string[];
  /** Canonical URL */
  canonical?: string;
  /** Open Graph data */
  openGraph: {
    title: string;
    description: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  /** Twitter Card data */
  twitter: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    image?: string;
    site?: string;
    creator?: string;
  };
  /** Structured data (JSON-LD) */
  structuredData: Array<{
    '@context': string;
    '@type': string;
    [key: string]: any;
  }>;
}

export interface SSRCache {
  /** Get cached result */
  get(key: string): Promise<SSRResult | null>;
  /** Set cache entry */
  set(key: string, result: SSRResult, ttl?: number): Promise<void>;
  /** Invalidate cache entries */
  invalidate(tags: string[]): Promise<void>;
  /** Clear all cache */
  clear(): Promise<void>;
  /** Get cache statistics */
  stats(): Promise<{
    hits: number;
    misses: number;
    size: number;
    keys: number;
  }>;
}

export interface ProgressiveEnhancement {
  /** Feature detection tests */
  features: Record<string, {
    test: string;
    polyfill?: string;
    fallback?: string;
  }>;
  /** Enhancement levels */
  levels: Array<{
    name: string;
    requirements: string[];
    scripts: string[];
    styles: string[];
  }>;
  /** Default enhancement level */
  defaultLevel: string;
}

export interface SSREngine {
  /** Render template with SSR */
  render(template: string, context: SSRContext, options?: SSROptions): Promise<SSRResult>;
  /** Generate hydration script */
  generateHydration(data: HydrationData): string;
  /** Extract critical CSS */
  extractCriticalCSS(html: string, allCSS: string[]): Promise<string[]>;
  /** Generate SEO tags */
  generateSEOTags(seoData: SEOData): Array<{ name?: string; property?: string; content: string; }>;
  /** Set cache implementation */
  setCache(cache: SSRCache): void;
  /** Register component for SSR */
  registerComponent(component: ComponentDefinition): void;
}

export interface StaticGenerator {
  /** Generate static site */
  generate(routes: string[], options: StaticGenerationOptions): Promise<StaticGenerationResult>;
  /** Generate sitemap */
  generateSitemap(routes: Array<{ path: string; lastmod?: Date; priority?: number; }>): string;
  /** Generate robots.txt */
  generateRobots(options: RobotsOptions): string;
}

export interface StaticGenerationOptions {
  /** Output directory */
  outputDir: string;
  /** Base URL for absolute links */
  baseUrl: string;
  /** Generate sitemap */
  sitemap?: boolean;
  /** Generate robots.txt */
  robots?: boolean;
  /** Compression options */
  compression?: {
    enabled: boolean;
    algorithms: ('gzip' | 'brotli')[];
  };
  /** Asset optimization */
  optimization?: {
    minifyHTML: boolean;
    minifyCSS: boolean;
    minifyJS: boolean;
    optimizeImages: boolean;
  };
}

export interface StaticGenerationResult {
  /** Generated files */
  files: Array<{
    path: string;
    size: number;
    compressed?: {
      gzip?: number;
      brotli?: number;
    };
  }>;
  /** Generation statistics */
  stats: {
    totalFiles: number;
    totalSize: number;
    compressionRatio: number;
    generationTime: number;
  };
  /** Generated sitemap path */
  sitemapPath?: string;
  /** Generated robots.txt path */
  robotsPath?: string;
}

export interface RobotsOptions {
  /** User agent rules */
  userAgent?: string;
  /** Allowed paths */
  allow?: string[];
  /** Disallowed paths */
  disallow?: string[];
  /** Sitemap URL */
  sitemap?: string;
  /** Crawl delay */
  crawlDelay?: number;
}

export interface CriticalCSSExtractor {
  /** Extract critical CSS from HTML */
  extract(html: string, css: string[]): Promise<{
    critical: string;
    remaining: string;
    coverage: number;
  }>;
  /** Configure viewport dimensions */
  setViewport(width: number, height: number): void;
}

export interface SSRMiddleware {
  /** Express/Koa style middleware */
  (req: any, res: any, next?: () => void): Promise<void>;
}

export interface SSRError extends Error {
  /** Error type */
  type: 'render' | 'hydration' | 'cache' | 'seo';
  /** HTTP status code */
  statusCode?: number;
  /** Additional context */
  context?: Record<string, any>;
}