/**
 * Global type augmentation for HyperFixi and LokaScript browser APIs
 *
 * This file augments the Window and globalThis interfaces to include
 * HyperFixi and LokaScript global variables, providing IDE autocomplete and type safety.
 */

import type { HyperfixiAPI } from './core-api';
import type { LokaScriptSemanticAPI } from './semantic-api';
import type { LokaScriptI18nAPI } from './i18n-api';

declare global {
  /**
   * Window interface augmentation
   */
  interface Window {
    /**
     * The hyperscript engine (`@hyperfixi/engine`'s public object).
     *
     * Loaded from: hyperfixi-hs.js (or hyperfixi.js, the same file under `@hyperfixi/core`'s name)
     *
     * @example
     * ```typescript
     * window.hyperfixi.evaluate('add .highlight to me', { me: document.body })
     * window.hyperfixi.parse('on click toggle .active').errors // []
     * ```
     */
    hyperfixi: HyperfixiAPI;

    /**
     * The same object as `window.hyperfixi`, under upstream `_hyperscript`'s name — set by
     * hyperfixi-hs.js, and by upstream `_hyperscript` itself.
     *
     * @example
     * ```typescript
     * window._hyperscript.processNode(document.body)
     * ```
     */
    _hyperscript: HyperfixiAPI;

    /**
     * LokaScript Semantic - Multilingual semantic parsing (24 languages)
     *
     * Loaded from: lokascript-semantic.browser.global.js
     *
     * @example
     * ```typescript
     * const result = window.LokaScriptSemantic.parse('トグル .active', 'ja')
     * const korean = window.LokaScriptSemantic.translate('toggle .active', 'en', 'ko')
     * ```
     */
    LokaScriptSemantic: LokaScriptSemanticAPI;

    /**
     * LokaScript I18n - per-language vocabulary and word-order profiles (24 languages).
     * Translation is `window.LokaScriptSemantic.translate`.
     *
     * Loaded from: lokascript-i18n.min.js
     *
     * @example
     * ```typescript
     * window.LokaScriptI18n.getProfile('ja')?.wordOrder // 'SOV'
     * ```
     */
    LokaScriptI18n: LokaScriptI18nAPI;
  }

  /**
   * globalThis interface augmentation (same as Window for browser contexts)
   */
  var hyperfixi: HyperfixiAPI;
  var _hyperscript: HyperfixiAPI;
  var LokaScriptSemantic: LokaScriptSemanticAPI;
  var LokaScriptI18n: LokaScriptI18nAPI;
}

// This export ensures the file is treated as a module
export {};
