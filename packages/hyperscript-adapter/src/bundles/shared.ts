/**
 * Shared bundle boilerplate.
 * Each per-language entry imports languages, then calls setup().
 *
 * Also wires up the pattern generator so that registered languages
 * can have their patterns generated on demand from their profiles.
 * Without this, getPatternsForLanguage() throws for non-English
 * languages that only register a tokenizer + profile.
 */

import {
  setPatternGenerator,
  generatePatternsForLanguage,
  type LanguageProfile,
} from '@lokascript/semantic/core';
import { hyperscriptI18n, preprocess } from '../slim-plugin';
import { resolveLanguage } from '../language-resolver';

// Enable on-demand pattern generation for registered languages.
setPatternGenerator((profile: LanguageProfile) => generatePatternsForLanguage(profile));

export { hyperscriptI18n as plugin, preprocess, resolveLanguage };

declare const _hyperscript: { use: (plugin: unknown) => void } | undefined;

export function autoRegister(): void {
  if (typeof _hyperscript !== 'undefined' && _hyperscript.use) {
    _hyperscript.use(hyperscriptI18n());
  }
}
