// packages/i18n/src/plugins/vite.ts

import type { Plugin } from 'vite';
import { HyperscriptTranslator } from '../translator';

// node-html-parser is an optional dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let parse: any;
try {
  // Dynamic require for optional dependency
  parse = require('node-html-parser').parse;
} catch {
  parse = null;
}

export interface HyperscriptI18nViteOptions {
  sourceLocale?: string;
  targetLocale?: string;
  preserveOriginal?: boolean;
  attributes?: string[];
  include?: RegExp | string[];
  exclude?: RegExp | string[];
}

export function hyperscriptI18nVitePlugin(options: HyperscriptI18nViteOptions = {}): Plugin {
  const {
    sourceLocale = 'en',
    targetLocale = 'en',
    preserveOriginal = false,
    attributes = ['_', 'script', 'data-script'],
    include = /\.(html|vue|svelte)$/,
    exclude = /node_modules/,
  } = options;

  const translator = new HyperscriptTranslator({ locale: sourceLocale });

  return {
    name: 'vite-plugin-hyperscript-i18n',

    transform(code: string, id: string) {
      // Check if file should be processed
      if (!shouldProcess(id, include, exclude)) {
        return null;
      }

      // Skip if no translation needed
      if (sourceLocale === targetLocale) {
        return null;
      }

      try {
        // Process HTML files
        if (id.endsWith('.html')) {
          return transformHtml(code, translator, {
            sourceLocale,
            targetLocale,
            preserveOriginal,
            attributes,
          });
        }

        // Process Vue SFCs
        if (id.endsWith('.vue')) {
          return transformVue(code, translator, {
            sourceLocale,
            targetLocale,
            preserveOriginal,
            attributes,
          });
        }

        // Process Svelte components
        if (id.endsWith('.svelte')) {
          return transformSvelte(code, translator, {
            sourceLocale,
            targetLocale,
            preserveOriginal,
            attributes,
          });
        }

        return null;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.error(`Failed to process ${id}: ${message}`);
      }
    },

    configureServer(server) {
      // Add middleware for development
      server.middlewares.use((_req, res, next) => {
        // Add i18n headers
        res.setHeader('X-Hyperscript-I18n-Source', sourceLocale);
        res.setHeader('X-Hyperscript-I18n-Target', targetLocale);
        next();
      });
    },
  };
}

function shouldProcess(
  id: string,
  include: RegExp | string[],
  exclude: RegExp | string[]
): boolean {
  const includePattern = Array.isArray(include) ? new RegExp(include.join('|')) : include;

  const excludePattern = Array.isArray(exclude) ? new RegExp(exclude.join('|')) : exclude;

  return includePattern.test(id) && !excludePattern.test(id);
}

function transformHtml(
  html: string,
  translator: HyperscriptTranslator,
  options: {
    sourceLocale: string;
    targetLocale: string;
    preserveOriginal: boolean;
    attributes: string[];
  }
): { code: string; map?: any } {
  const root = parse(html);
  let hasTransformations = false;

  // Find all elements with hyperscript attributes
  options.attributes.forEach(attr => {
    const elements = root.querySelectorAll(`[${attr}]`);

    elements.forEach((element: any) => {
      const original = element.getAttribute(attr);
      if (!original) return;

      const translated = translator.translate(original, {
        from: options.sourceLocale,
        to: options.targetLocale,
      });

      if (original !== translated) {
        hasTransformations = true;

        if (options.preserveOriginal) {
          element.setAttribute(`${attr}-${options.sourceLocale}`, original);
        }

        element.setAttribute(attr, translated);
      }
    });
  });

  if (!hasTransformations) {
    return { code: html };
  }

  return {
    code: root.toString(),
    map: null, // Source maps could be added here
  };
}

function transformVue(
  code: string,
  translator: HyperscriptTranslator,
  options: any
): { code: string; map?: any } {
  // Extract template section
  const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (!templateMatch) {
    return { code };
  }

  const template = templateMatch[1];
  const transformed = transformHtml(template, translator, options);

  if (transformed.code === template) {
    return { code };
  }

  // Replace template content
  const newCode = code.replace(templateMatch[0], `<template>${transformed.code}</template>`);

  return { code: newCode };
}

function transformSvelte(
  code: string,
  translator: HyperscriptTranslator,
  options: any
): { code: string; map?: any } {
  // Svelte components have HTML at the top level
  const scriptMatch = code.match(/<script[^>]*>[\s\S]*?<\/script>/g);
  const styleMatch = code.match(/<style[^>]*>[\s\S]*?<\/style>/g);

  // Extract HTML portion
  let html = code;
  if (scriptMatch) {
    scriptMatch.forEach(script => {
      html = html.replace(script, '');
    });
  }
  if (styleMatch) {
    styleMatch.forEach(style => {
      html = html.replace(style, '');
    });
  }

  const transformed = transformHtml(html, translator, options);

  if (transformed.code === html) {
    return { code };
  }

  // Reconstruct Svelte component
  let newCode = '';
  if (scriptMatch) {
    newCode += scriptMatch.join('\n') + '\n\n';
  }
  newCode += transformed.code;
  if (styleMatch) {
    newCode += '\n\n' + styleMatch.join('\n');
  }

  return { code: newCode };
}
