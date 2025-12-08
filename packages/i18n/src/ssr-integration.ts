// packages/i18n/src/ssr-integration.ts

import { HyperscriptTranslator } from './translator';
import type { TranslationOptions } from './types';

/**
 * SSR integration for i18n support
 */
export interface SSRLocaleContext {
  locale: string;
  direction: 'ltr' | 'rtl';
  preferredLocales: string[];
  userAgent?: string;
  acceptLanguage?: string;
}

export interface SSRLocaleOptions {
  detectFromHeaders?: boolean;
  detectFromUrl?: boolean;
  fallbackLocale?: string;
  supportedLocales?: string[];
  urlPattern?: RegExp;
}

export class SSRLocaleManager {
  private translator: HyperscriptTranslator;
  private options: Required<SSRLocaleOptions>;

  constructor(
    translator: HyperscriptTranslator,
    options: SSRLocaleOptions = {}
  ) {
    this.translator = translator;
    this.options = {
      detectFromHeaders: options.detectFromHeaders ?? true,
      detectFromUrl: options.detectFromUrl ?? true,
      fallbackLocale: options.fallbackLocale ?? 'en',
      supportedLocales: options.supportedLocales ?? translator.getSupportedLocales(),
      urlPattern: options.urlPattern ?? /^\/([a-z]{2}(-[A-Z]{2})?)(\/|$)/,
    };
  }

  /**
   * Extract locale from SSR request
   */
  extractLocale(request: {
    url?: string;
    headers?: Record<string, string>;
    userAgent?: string;
  }): SSRLocaleContext {
    let locale = this.options.fallbackLocale;
    const preferredLocales: string[] = [];

    // Extract from URL first (highest priority)
    if (this.options.detectFromUrl && request.url) {
      const urlLocale = this.extractLocaleFromUrl(request.url);
      if (urlLocale && this.options.supportedLocales.includes(urlLocale)) {
        locale = urlLocale;
      }
    }

    // Extract from Accept-Language header
    if (this.options.detectFromHeaders && request.headers?.['accept-language']) {
      const headerLocales = this.parseAcceptLanguage(request.headers['accept-language']);
      preferredLocales.push(...headerLocales);
      
      // Use first supported locale from header if URL didn't provide one
      if (locale === this.options.fallbackLocale) {
        const supportedHeaderLocale = headerLocales.find(loc => 
          this.options.supportedLocales.includes(loc)
        );
        if (supportedHeaderLocale) {
          locale = supportedHeaderLocale;
        }
      }
    }

    const context: SSRLocaleContext = {
      locale,
      direction: this.translator.isRTL(locale) ? 'rtl' : 'ltr',
      preferredLocales,
    };
    if (request.userAgent) {
      context.userAgent = request.userAgent;
    }
    if (request.headers?.['accept-language']) {
      context.acceptLanguage = request.headers['accept-language'];
    }
    return context;
  }

  /**
   * Generate HTML lang and dir attributes
   */
  generateHtmlAttributes(context: SSRLocaleContext): string {
    return `lang="${context.locale}" dir="${context.direction}"`;
  }

  /**
   * Generate meta tags for SEO
   */
  generateMetaTags(context: SSRLocaleContext, alternateUrls?: Record<string, string>): string[] {
    const tags: string[] = [];

    // Content language
    tags.push(`<meta http-equiv="content-language" content="${context.locale}" />`);

    // Alternate languages for SEO
    if (alternateUrls) {
      Object.entries(alternateUrls).forEach(([locale, url]) => {
        tags.push(`<link rel="alternate" hreflang="${locale}" href="${url}" />`);
      });
    }

    return tags;
  }

  /**
   * Translate hyperscript code for SSR
   */
  translateForSSR(
    hyperscriptCode: string,
    targetLocale: string,
    options: Partial<Omit<TranslationOptions, 'to'>> = {}
  ): string {
    return this.translator.translate(hyperscriptCode, {
      from: 'en',
      ...options,
      to: targetLocale,
    });
  }

  /**
   * Generate client-side hydration data
   */
  generateHydrationData(context: SSRLocaleContext): object {
    return {
      __HYPERFIXI_I18N__: {
        locale: context.locale,
        direction: context.direction,
        preferredLocales: context.preferredLocales,
        supportedLocales: this.options.supportedLocales,
        fallbackLocale: this.options.fallbackLocale,
      },
    };
  }

  private extractLocaleFromUrl(url: string): string | null {
    const match = url.match(this.options.urlPattern);
    return match ? match[1] : null;
  }

  private parseAcceptLanguage(acceptLanguage: string): string[] {
    return acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, q] = lang.trim().split(';q=');
        return {
          locale: locale.trim(),
          quality: q ? parseFloat(q) : 1.0,
        };
      })
      .sort((a, b) => b.quality - a.quality)
      .map(item => item.locale);
  }
}

/**
 * Express middleware for SSR i18n
 */
export function createExpressI18nMiddleware(translator: HyperscriptTranslator, options?: SSRLocaleOptions) {
  const localeManager = new SSRLocaleManager(translator, options);

  return (req: any, _res: any, next: any) => {
    const localeContext = localeManager.extractLocale({
      url: req.originalUrl || req.url,
      headers: req.headers,
      userAgent: req.get('User-Agent'),
    });

    // Add to request for later use
    req.localeContext = localeContext;
    req.i18n = {
      translate: (code: string, targetLocale?: string) =>
        localeManager.translateForSSR(code, targetLocale || localeContext.locale),
      generateHtmlAttributes: () => localeManager.generateHtmlAttributes(localeContext),
      generateMetaTags: (alternateUrls?: Record<string, string>) =>
        localeManager.generateMetaTags(localeContext, alternateUrls),
      generateHydrationData: () => localeManager.generateHydrationData(localeContext),
    };

    next();
  };
}

/**
 * Next.js API for SSR i18n
 */
export function withI18n(handler: any, translator: HyperscriptTranslator, options?: SSRLocaleOptions) {
  const localeManager = new SSRLocaleManager(translator, options);

  return async (req: any, res: any) => {
    const localeContext = localeManager.extractLocale({
      url: req.url,
      headers: req.headers,
      userAgent: req.headers['user-agent'],
    });

    req.localeContext = localeContext;
    req.i18n = {
      translate: (code: string, targetLocale?: string) =>
        localeManager.translateForSSR(code, targetLocale || localeContext.locale),
      generateHtmlAttributes: () => localeManager.generateHtmlAttributes(localeContext),
      generateMetaTags: (alternateUrls?: Record<string, string>) =>
        localeManager.generateMetaTags(localeContext, alternateUrls),
      generateHydrationData: () => localeManager.generateHydrationData(localeContext),
    };

    return handler(req, res);
  };
}