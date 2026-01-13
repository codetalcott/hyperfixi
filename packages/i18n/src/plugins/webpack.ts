// packages/i18n/src/plugins/webpack.ts

import { HyperscriptTranslator } from '../translator';

// node-html-parser is an optional dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let parse: any;
try {
  parse = require('node-html-parser').parse;
} catch {
  parse = null;
}

// Webpack types - optional peer dependency
interface Compiler {
  hooks: any;
  webpack: any;
}
interface WebpackPluginInstance {
  apply(compiler: Compiler): void;
}

export interface HyperscriptI18nWebpackOptions {
  sourceLocale?: string;
  targetLocale?: string;
  preserveOriginal?: boolean;
  attributes?: string[];
  test?: RegExp;
}

export class HyperscriptI18nWebpackPlugin implements WebpackPluginInstance {
  private options: Required<HyperscriptI18nWebpackOptions>;
  private translator: HyperscriptTranslator;

  constructor(options: HyperscriptI18nWebpackOptions = {}) {
    this.options = {
      sourceLocale: options.sourceLocale || 'en',
      targetLocale: options.targetLocale || 'en',
      preserveOriginal: options.preserveOriginal ?? false,
      attributes: options.attributes || ['_', 'script', 'data-script'],
      test: options.test || /\.(html)$/,
    };

    this.translator = new HyperscriptTranslator({
      locale: this.options.sourceLocale,
    });
  }

  apply(compiler: Compiler): void {
    const pluginName = 'HyperscriptI18nWebpackPlugin';

    // Skip if no translation needed
    if (this.options.sourceLocale === this.options.targetLocale) {
      return;
    }

    compiler.hooks.compilation.tap(pluginName, (compilation: any) => {
      // Hook into HTML processing
      compilation.hooks.processAssets.tapPromise(
        {
          name: pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        async (assets: any) => {
          const promises = Object.keys(assets)
            .filter(filename => this.options.test.test(filename))
            .map(filename => this.processAsset(compilation, filename));

          await Promise.all(promises);
        }
      );
    });
  }

  private async processAsset(compilation: any, filename: string): Promise<void> {
    const asset = compilation.assets[filename];
    const source = asset.source();

    try {
      const processed = this.processHtml(source);

      if (processed !== source) {
        compilation.assets[filename] = {
          source: () => processed,
          size: () => processed.length,
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      compilation.errors.push(new Error(`Failed to process ${filename}: ${message}`));
    }
  }

  private processHtml(html: string): string {
    const root = parse(html);
    let hasChanges = false;

    this.options.attributes.forEach(attr => {
      const elements = root.querySelectorAll(`[${attr}]`);

      elements.forEach((element: any) => {
        const original = element.getAttribute(attr);
        if (!original) return;

        const translated = this.translator.translate(original, {
          from: this.options.sourceLocale,
          to: this.options.targetLocale,
        });

        if (original !== translated) {
          hasChanges = true;

          if (this.options.preserveOriginal) {
            element.setAttribute(`${attr}-${this.options.sourceLocale}`, original);
          }

          element.setAttribute(attr, translated);
        }
      });
    });

    return hasChanges ? root.toString() : html;
  }
}
