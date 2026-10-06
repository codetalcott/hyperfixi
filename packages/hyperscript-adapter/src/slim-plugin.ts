/**
 * Slim Plugin
 *
 * Same plugin logic as plugin.ts but uses slim-preprocessor
 * (does not trigger all-language registration).
 */

import { resolveLanguage } from './language-resolver';
import { preprocessToEnglish } from './slim-preprocessor';
import type { PreprocessorConfig } from './preprocessor';
import type { PluginOptions } from './plugin';
import { installAttributeTranslator, type HyperscriptHost } from './attribute-translator';
import {
  acceptedByHost,
  warnLossyOnce,
  warnRejectedOnce,
  type HyperscriptParseHost,
  type LossyRefusal,
} from './host-validate';

export type { PluginOptions };

export function hyperscriptI18n(options: PluginOptions = {}) {
  return function plugin(hs: unknown): void {
    const host = hs as HyperscriptHost & HyperscriptParseHost;
    installAttributeTranslator(host, (src, elt) => {
      const lang = resolveLanguageWithOptions(elt, options);
      if (!lang || lang === 'en') return src;

      let refusal: LossyRefusal | undefined;
      const english = preprocessToEnglish(src, lang, {
        ...options,
        onLossy: r => void (refusal = r),
      });

      // Refused: the translation would lose part of the script. Keep the
      // author's text, which the host then reports as a parse error.
      if (refusal) {
        if (options.debug) {
          console.log(
            `[hyperscript-i18n] ${lang}: refused, would lose ${refusal.lost.join(', ')} — keeping "${src}"`
          );
        } else {
          warnLossyOnce(lang, src, refusal);
        }
        return src;
      }

      if (english !== src) {
        // Host-parser validity gate — see plugin.ts / host-validate.ts.
        if (options.validateWithHost !== false && !acceptedByHost(host, english)) {
          if (options.debug) {
            console.log(
              `[hyperscript-i18n] ${lang}: host rejected "${english}" — keeping "${src}"`
            );
          } else {
            warnRejectedOnce(lang, src, english);
          }
          return src;
        }
        if (options.debug) {
          console.log(`[hyperscript-i18n] ${lang}: "${src}" → "${english}"`);
        }
      }

      return english;
    });
  };
}

function resolveLanguageWithOptions(elt: Element, options: PluginOptions): string | null {
  if (options.languageAttribute) {
    const custom = elt.getAttribute(options.languageAttribute);
    if (custom) return custom.split('-')[0].toLowerCase();
  }

  const resolved = resolveLanguage(elt);
  if (resolved) return resolved;

  return options.defaultLanguage ?? null;
}

export function preprocess(
  src: string,
  lang: string,
  config: Partial<PreprocessorConfig> = {}
): string {
  if (lang === 'en') return src;
  return preprocessToEnglish(src, lang, config);
}
