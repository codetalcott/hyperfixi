import { createHash as cryptoCreateHash } from 'crypto';
import { SSRContext, HydrationData, SEOData } from './types';

/**
 * Utility functions for SSR support
 */

/**
 * Create SSR context from request data
 */
export function createSSRContext(data: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  variables?: Record<string, any>;
  user?: any;
  seo?: Partial<SEOData>;
}): SSRContext {
  return {
    variables: data.variables ?? {},
    request: {
      url: data.url ?? '/',
      method: data.method ?? 'GET',
      headers: data.headers ?? {},
      ...(data.headers?.['user-agent'] && { userAgent: data.headers['user-agent'] }),
    },
    user: data.user,
    ...(data.seo && {
      seo: {
        ...(data.seo.title && { title: data.seo.title }),
        ...(data.seo.description && { description: data.seo.description }),
        ...(data.seo.keywords && { keywords: data.seo.keywords }),
        ...(data.seo.canonical && { canonicalUrl: data.seo.canonical }),
        ...(data.seo.openGraph?.title && { ogTitle: data.seo.openGraph.title }),
        ...(data.seo.openGraph?.description && { ogDescription: data.seo.openGraph.description }),
        ...(data.seo.openGraph?.image && { ogImage: data.seo.openGraph.image }),
        ...(data.seo.twitter?.card && { twitterCard: data.seo.twitter.card }),
        ...(data.seo.twitter?.title && { twitterTitle: data.seo.twitter.title }),
        ...(data.seo.twitter?.description && { twitterDescription: data.seo.twitter.description }),
        ...(data.seo.twitter?.image && { twitterImage: data.seo.twitter.image }),
        ...(data.seo.structuredData && { structuredData: data.seo.structuredData }),
      }
    }),
  };
}

/**
 * Extract hydration data from SSR context
 */
export function extractHydrationData(
  context: SSRContext,
  components: Array<{ id: string; state: Record<string, any>; hyperscript: string[]; }>
): HydrationData {
  const componentData: HydrationData['components'] = {};
  
  components.forEach(component => {
    componentData[`#${component.id}`] = {
      id: component.id,
      state: component.state,
      hyperscript: component.hyperscript,
    };
  });

  return {
    components: componentData,
    appState: context.variables ?? {},
    config: {
      ...(process.env.API_BASE_URL && { apiBaseUrl: process.env.API_BASE_URL }),
      ...(process.env.CDN_URL && { cdnUrl: process.env.CDN_URL }),
      debug: process.env.NODE_ENV === 'development',
      features: [],
    },
    route: {
      path: context.request?.url ?? '/',
      params: {},
      query: {},
    },
  };
}

/**
 * Generate SEO-friendly URL slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Calculate reading time for content
 */
export function calculateReadingTime(content: string, wordsPerMinute: number = 200): {
  minutes: number;
  words: number;
  text: string;
} {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  return {
    minutes,
    words,
    text: `${minutes} min read`,
  };
}

/**
 * Extract text content from HTML
 */
export function extractTextFromHTML(html: string): string {
  // Simple HTML tag removal (in production, would use a proper HTML parser)
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Generate breadcrumb data from URL path
 */
export function generateBreadcrumbs(
  path: string,
  baseUrl: string = '',
  labels?: Record<string, string>
): Array<{ name: string; url?: string; }> {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: Array<{ name: string; url?: string; }> = [];
  
  // Add home
  breadcrumbs.push({
    name: 'Home',
    url: baseUrl + '/',
  });

  // Add path segments
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += '/' + segment;
    const isLast = index === segments.length - 1;
    
    breadcrumbs.push({
      name: labels?.[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ...(!isLast && { url: baseUrl + currentPath }),
    });
  });

  return breadcrumbs;
}

/**
 * Validate HTML structure for SSR
 */
export function validateHTMLStructure(html: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for basic HTML structure
  if (!html.includes('<html')) {
    warnings.push('Missing <html> tag');
  }

  if (!html.includes('<head')) {
    warnings.push('Missing <head> tag');
  }

  if (!html.includes('<body')) {
    warnings.push('Missing <body> tag');
  }

  // Check for required meta tags
  if (!html.includes('<title')) {
    errors.push('Missing <title> tag');
  }

  if (!html.includes('name="viewport"')) {
    warnings.push('Missing viewport meta tag');
  }

  // Check for accessibility
  if (!html.includes('lang=')) {
    warnings.push('Missing language attribute on html tag');
  }

  // Check for unclosed tags (basic check)
  const openTags = (html.match(/<[^/][^>]*>/g) || []).filter(tag => !tag.endsWith('/>'));
  const closeTags = html.match(/<\/[^>]*>/g) || [];
  
  if (openTags.length !== closeTags.length) {
    warnings.push('Possible unclosed HTML tags detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Optimize images in HTML for SSR
 */
export function optimizeImagesForSSR(html: string, options: {
  lazyLoading?: boolean;
  responsiveImages?: boolean;
  webpSupport?: boolean;
  baseUrl?: string;
} = {}): string {
  let optimizedHTML = html;

  // Add lazy loading
  if (options.lazyLoading) {
    optimizedHTML = optimizedHTML.replace(
      /<img([^>]*)>/g,
      '<img$1 loading="lazy">'
    );
  }

  // Add responsive image attributes
  if (options.responsiveImages) {
    optimizedHTML = optimizedHTML.replace(
      /<img([^>]*)\ssrc="([^"]*)"([^>]*)>/g,
      (match, before, src, after) => {
        // Generate srcset for different sizes (simplified)
        const baseSrc = src.replace(/\.[^.]+$/, '');
        const ext = src.match(/\.[^.]+$/)?.[0] || '.jpg';
        
        const srcset = [
          `${baseSrc}-320w${ext} 320w`,
          `${baseSrc}-640w${ext} 640w`,
          `${baseSrc}-1024w${ext} 1024w`,
        ].join(', ');

        return `<img${before} src="${src}" srcset="${srcset}" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"${after}>`;
      }
    );
  }

  // Add WebP support with fallback
  if (options.webpSupport) {
    optimizedHTML = optimizedHTML.replace(
      /<img([^>]*)\ssrc="([^"]*\.(jpg|jpeg|png))"([^>]*)>/g,
      (match, before, src, ext, after) => {
        const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        return `<picture>
  <source srcset="${webpSrc}" type="image/webp">
  <img${before} src="${src}"${after}>
</picture>`;
      }
    );
  }

  return optimizedHTML;
}

/**
 * Extract performance metrics from SSR result
 */
export function extractPerformanceMetrics(result: any): {
  renderTime: number;
  hydrationSize: number;
  criticalCSSSize: number;
  totalSize: number;
  compressionRatio?: number;
  cacheHit: boolean;
} {
  return {
    renderTime: result.performance?.renderTime ?? 0,
    hydrationSize: result.performance?.hydrationSize ?? 0,
    criticalCSSSize: result.performance?.criticalCSSSize ?? 0,
    totalSize: result.performance?.totalSize ?? 0,
    compressionRatio: result.performance?.compressionRatio,
    cacheHit: Boolean(result.cache),
  };
}

/**
 * Generate cache key for SSR result
 */
export function generateCacheKey(
  template: string,
  context: SSRContext,
  options: any = {}
): string {
  const hash = cryptoCreateHash('sha256');

  // Include template content
  hash.update(template);

  // Include context variables
  hash.update(JSON.stringify(context.variables ?? {}));

  // Include request URL and method
  hash.update(context.request?.url ?? '');
  hash.update(context.request?.method ?? 'GET');

  // Include user-specific data (if any)
  if (context.user?.id) {
    hash.update(`user:${context.user.id}`);
  }

  // Include options
  hash.update(JSON.stringify(options));

  return hash.digest('hex');
}

/**
 * Check if request is from a bot/crawler
 */
export function isBotRequest(userAgent: string = ''): boolean {
  const botPatterns = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'sogou',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest',
    'developers.google.com/+/web/snippet',
    'slackbot',
    'vkshare',
    'w3c_validator',
    'redditbot',
    'applebot',
    'whatsapp',
    'flipboard',
    'tumblr',
    'bitlybot',
    'skypeuripreview',
    'nuzzel',
    'discordbot',
    'google page speed',
    'qwantbot',
  ];

  const lowerUserAgent = userAgent.toLowerCase();
  return botPatterns.some(pattern => lowerUserAgent.includes(pattern));
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Sanitize HTML content for SSR
 */
export function sanitizeHTML(html: string): string {
  // Basic HTML sanitization (in production, would use a proper sanitizer like DOMPurify)
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/on\w+="[^"]*"/gi, '') // Remove inline event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/<iframe[^>]*>/gi, '') // Remove iframes
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '') // Remove objects
    .replace(/<embed[^>]*>/gi, ''); // Remove embeds
}