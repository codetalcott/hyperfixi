import { HyperFixiSSREngine } from './engine';
import { SSRContext, SSROptions, SSRMiddleware } from './types';

/**
 * Express.js middleware for SSR
 */
export function createExpressSSRMiddleware(
  engine: HyperFixiSSREngine,
  options: {
    templatePath?: string;
    ssrOptions?: SSROptions;
    contextExtractor?: (req: any, res: any) => SSRContext;
  } = {}
): SSRMiddleware {
  return async (req: any, res: any, next?: () => void) => {
    try {
      // Extract context from request
      const context = options.contextExtractor
        ? options.contextExtractor(req, res)
        : extractExpressContext(req, res);

      // Load template (in real implementation, would be configurable)
      const template = await loadTemplateForRoute(req.path, options.templatePath);

      // Render with SSR
      const result = await engine.render(template, context, options.ssrOptions);

      // Set response headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      // Add cache headers if caching is enabled
      if (result.cache) {
        res.setHeader('Cache-Control', `public, max-age=${result.cache.ttl}`);
        res.setHeader('ETag', `"${result.cache.key}"`);
      }

      // Generate full HTML response
      const fullHTML = generateFullHTMLResponse(result);

      res.send(fullHTML);
    } catch (error) {
      console.error('SSR middleware error:', error);

      if (next) {
        next(); // Fall back to next middleware
      } else {
        res.status(500).send('Internal Server Error');
      }
    }
  };
}

/**
 * Koa.js middleware for SSR
 */
export function createKoaSSRMiddleware(
  engine: HyperFixiSSREngine,
  options: {
    templatePath?: string;
    ssrOptions?: SSROptions;
    contextExtractor?: (ctx: any) => SSRContext;
  } = {}
) {
  return async (ctx: any, next: () => Promise<any>) => {
    try {
      // Extract context from Koa context
      const context = options.contextExtractor
        ? options.contextExtractor(ctx)
        : extractKoaContext(ctx);

      // Load template
      const template = await loadTemplateForRoute(ctx.path, options.templatePath);

      // Render with SSR
      const result = await engine.render(template, context, options.ssrOptions);

      // Set response headers
      ctx.type = 'text/html; charset=utf-8';

      if (result.cache) {
        ctx.set('Cache-Control', `public, max-age=${result.cache.ttl}`);
        ctx.set('ETag', `"${result.cache.key}"`);
      }

      // Generate and set response body
      ctx.body = generateFullHTMLResponse(result);
    } catch (error) {
      console.error('SSR middleware error:', error);
      await next(); // Fall back to next middleware
    }
  };
}

/**
 * Fastify plugin for SSR
 */
export function createFastifySSRPlugin(
  engine: HyperFixiSSREngine,
  options: {
    templatePath?: string;
    ssrOptions?: SSROptions;
    contextExtractor?: (request: any, reply: any) => SSRContext;
  } = {}
) {
  return async function ssrPlugin(fastify: any, opts: any) {
    fastify.addHook('onRequest', async (request: any, reply: any) => {
      // Add SSR render method to reply
      reply.renderSSR = async (templateOverride?: string) => {
        try {
          const context = options.contextExtractor
            ? options.contextExtractor(request, reply)
            : extractFastifyContext(request, reply);

          const template =
            templateOverride || (await loadTemplateForRoute(request.url, options.templatePath));

          const result = await engine.render(template, context, options.ssrOptions);

          reply.type('text/html; charset=utf-8');

          if (result.cache) {
            reply.header('Cache-Control', `public, max-age=${result.cache.ttl}`);
            reply.header('ETag', `"${result.cache.key}"`);
          }

          const fullHTML = generateFullHTMLResponse(result);
          reply.send(fullHTML);
        } catch (error) {
          console.error('SSR plugin error:', error);
          reply.code(500).send('Internal Server Error');
        }
      };
    });
  };
}

/**
 * Next.js API route handler for SSR
 */
export function createNextSSRHandler(
  engine: HyperFixiSSREngine,
  options: {
    ssrOptions?: SSROptions;
    contextExtractor?: (req: any, res: any) => SSRContext;
  } = {}
) {
  return async (req: any, res: any) => {
    try {
      const context = options.contextExtractor
        ? options.contextExtractor(req, res)
        : extractNextContext(req, res);

      // In Next.js, template would typically come from pages or components
      const template = await loadNextTemplate(req.query);

      const result = await engine.render(template, context, options.ssrOptions);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      if (result.cache) {
        res.setHeader('Cache-Control', `public, max-age=${result.cache.ttl}`);
        res.setHeader('ETag', `"${result.cache.key}"`);
      }

      const fullHTML = generateFullHTMLResponse(result);
      res.status(200).send(fullHTML);
    } catch (error) {
      console.error('Next.js SSR handler error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Context extractors for different frameworks
 */
function extractExpressContext(req: any, res: any): SSRContext {
  return {
    variables: { ...req.query, ...req.params, ...res.locals },
    request: {
      url: req.originalUrl || req.url,
      method: req.method,
      headers: req.headers,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    },
    user: req.user,
  };
}

function extractKoaContext(ctx: any): SSRContext {
  return {
    variables: { ...ctx.query, ...ctx.params, ...ctx.state },
    request: {
      url: ctx.originalUrl || ctx.url,
      method: ctx.method,
      headers: ctx.headers,
      userAgent: ctx.get('User-Agent'),
      ip: ctx.ip,
    },
    user: ctx.state.user,
  };
}

function extractFastifyContext(request: any, reply: any): SSRContext {
  return {
    variables: { ...request.query, ...request.params },
    request: {
      url: request.url,
      method: request.method,
      headers: request.headers,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    },
    user: request.user,
  };
}

function extractNextContext(req: any, res: any): SSRContext {
  return {
    variables: { ...req.query },
    request: {
      url: req.url,
      method: req.method,
      headers: req.headers,
      userAgent: req.headers['user-agent'],
      ip: req.connection?.remoteAddress,
    },
    user: (req as any).user,
  };
}

/**
 * Template loaders for different scenarios
 */
async function loadTemplateForRoute(route: string, templatePath?: string): Promise<string> {
  // In a real implementation, this would load templates from the file system
  // based on route patterns or explicit template paths

  if (templatePath) {
    try {
      const fs = require('fs').promises;
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      console.warn(`Failed to load template from ${templatePath}:`, error);
    }
  }

  // Default template
  return `
    <html>
      <head>
        <title>{{seo.title}}</title>
        <meta name="description" content="{{seo.description}}" />
      </head>
      <body>
        <div id="app" _="init log 'HyperFixi SSR loaded'">
          <h1>{{pageTitle || 'Welcome'}}</h1>
          <p>Route: ${route}</p>
          <div _="on click toggle .active">Interactive element</div>
        </div>
      </body>
    </html>
  `;
}

async function loadNextTemplate(query: any): Promise<string> {
  // For Next.js, templates would typically be React components
  // This is a simplified example
  return `
    <html>
      <head>
        <title>{{title}}</title>
      </head>
      <body>
        <div id="__next">
          <main _="init add .loaded">
            <h1>{{title}}</h1>
            <pre>{{JSON.stringify(query)}}</pre>
          </main>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate complete HTML response with all meta tags and assets
 */
function generateFullHTMLResponse(result: any): string {
  // Generate meta tags
  const metaTags = result.metaTags
    .map((tag: any) => {
      if (tag.name) {
        return `<meta name="${tag.name}" content="${escapeHtml(tag.content)}" />`;
      } else if (tag.property) {
        return `<meta property="${tag.property}" content="${escapeHtml(tag.content)}" />`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n    ');

  // Generate link tags
  const linkTags = result.linkTags
    .map((link: any) => {
      let attrs = `rel="${link.rel}" href="${escapeHtml(link.href)}"`;
      if (link.as) attrs += ` as="${link.as}"`;
      if (link.type) attrs += ` type="${link.type}"`;
      return `<link ${attrs} />`;
    })
    .join('\n    ');

  // Generate critical CSS
  const criticalCSS =
    result.criticalCSS.length > 0
      ? `\n    <style>\n${result.criticalCSS.join('\n')}\n    </style>`
      : '';

  // Generate hydration script
  const hydrationScript = result.hydrationScript
    ? `\n    <script>\n${result.hydrationScript}\n    </script>`
    : '';

  // Insert everything into the HTML
  let html = result.html;

  // Insert into head
  const headInsert = [metaTags, linkTags, criticalCSS].filter(Boolean).join('\n    ');
  if (headInsert) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', `    ${headInsert}\n  </head>`);
    } else {
      // If no head tag, insert at the beginning
      html = `<head>\n    ${headInsert}\n  </head>\n${html}`;
    }
  }

  // Insert hydration script before closing body
  if (hydrationScript) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `    ${hydrationScript}\n  </body>`);
    } else {
      // If no body tag, append at the end
      html = `${html}${hydrationScript}`;
    }
  }

  // Ensure we have a complete HTML document
  if (!html.includes('<html')) {
    html = `<!DOCTYPE html>\n<html lang="en">\n${html}\n</html>`;
  }

  return html;
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char] ?? char);
}

/**
 * Configuration helper for SSR middleware
 */
export interface SSRMiddlewareConfig {
  engine?: HyperFixiSSREngine;
  cache?: 'memory' | 'redis' | 'tiered';
  templateDir?: string;
  staticDir?: string;
  ssrOptions?: SSROptions;
  devMode?: boolean;
}

export function configureSSRMiddleware(config: SSRMiddlewareConfig = {}) {
  const engine = config.engine || new HyperFixiSSREngine();

  // Configure cache if specified
  if (config.cache) {
    const { createSSRCache } = require('./cache');
    const cache = createSSRCache({ type: config.cache });
    engine.setCache(cache);
  }

  return {
    express: createExpressSSRMiddleware(engine, {
      ...(config.templateDir && { templatePath: config.templateDir }),
      ...(config.ssrOptions && { ssrOptions: config.ssrOptions }),
    }),
    koa: createKoaSSRMiddleware(engine, {
      ...(config.templateDir && { templatePath: config.templateDir }),
      ...(config.ssrOptions && { ssrOptions: config.ssrOptions }),
    }),
    fastify: createFastifySSRPlugin(engine, {
      ...(config.templateDir && { templatePath: config.templateDir }),
      ...(config.ssrOptions && { ssrOptions: config.ssrOptions }),
    }),
    next: createNextSSRHandler(engine, {
      ...(config.ssrOptions && { ssrOptions: config.ssrOptions }),
    }),
  };
}
