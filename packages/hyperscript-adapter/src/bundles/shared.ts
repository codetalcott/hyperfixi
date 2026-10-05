/**
 * Shared bundle boilerplate.
 * Each per-language entry imports languages, then calls autoRegister().
 *
 * The pattern generator comes from `@lokascript/semantic/core` itself (since
 * 4.0 it installs the full builder: hand-crafted + generated patterns). This
 * file used to install its own GENERATE-ONLY generator over it, which threw the
 * hand-crafted patterns away: de, fr, qu and zh could not read even
 * `on click toggle .active` in these bundles, and 1106 of the corpus's 3772
 * translations read differently from the full package. test/adapter-iife.test.ts
 * runs every built bundle on the engine.
 */

import { hyperscriptI18n, preprocess } from '../slim-plugin';
import { resolveLanguage } from '../language-resolver';

export { hyperscriptI18n as plugin, preprocess, resolveLanguage };

declare const _hyperscript: { use: (plugin: unknown) => void } | undefined;

// hyperscriptI18n() registers an addBeforeProcessHook, which _hyperscript.org's
// own initial page scan is guaranteed to run after (that scan is deferred to
// DOMContentLoaded/ready(), well after this synchronous <script> tag runs) —
// no separate reprocessing pass is needed.
export function autoRegister(): void {
  if (typeof _hyperscript !== 'undefined' && _hyperscript.use) {
    _hyperscript.use(hyperscriptI18n());
  }
}
