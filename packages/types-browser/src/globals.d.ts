/**
 * Global type augmentation for HyperFixi browser APIs
 *
 * This file augments the Window and globalThis interfaces to include
 * HyperFixi global variables, providing IDE autocomplete and type safety.
 */

import type { HyperFixiCoreAPI } from './core-api';
import type { HyperFixiSemanticAPI } from './semantic-api';
import type { HyperFixiI18nAPI } from './i18n-api';

declare global {
  /**
   * Window interface augmentation
   */
  interface Window {
    /**
     * HyperFixi Core - Main hyperscript runtime and parser
     *
     * Loaded from: hyperfixi-browser.js or hyperfixi-multilingual.js
     *
     * @example
     * ```typescript
     * window.hyperfixi.execute('toggle .active', document.body)
     * window.hyperfixi.compile('on click add .highlight')
     * ```
     */
    hyperfixi: HyperFixiCoreAPI;

    /**
     * Compatibility alias for hyperfixi (follows _hyperscript naming)
     *
     * @example
     * ```typescript
     * window._hyperscript.compile('on click toggle .active')
     * ```
     */
    _hyperscript: HyperFixiCoreAPI;

    /**
     * HyperFixi Semantic - Multilingual semantic parsing (13 languages)
     *
     * Loaded from: hyperfixi-semantic.browser.global.js
     *
     * @example
     * ```typescript
     * const result = window.HyperFixiSemantic.parse('トグル .active', 'ja')
     * const korean = window.HyperFixiSemantic.translate('toggle .active', 'en', 'ko')
     * ```
     */
    HyperFixiSemantic: HyperFixiSemanticAPI;

    /**
     * HyperFixi I18n - Grammar transformation for natural language word order
     *
     * Loaded from: hyperfixi-i18n.min.js
     *
     * @example
     * ```typescript
     * const japanese = window.HyperFixiI18n.translate('on click toggle .active', 'en', 'ja')
     * // Result: 'クリック で .active を 切り替え' (SOV word order)
     * ```
     */
    HyperFixiI18n: HyperFixiI18nAPI;
  }

  /**
   * globalThis interface augmentation (same as Window for browser contexts)
   */
  var hyperfixi: HyperFixiCoreAPI;
  var _hyperscript: HyperFixiCoreAPI;
  var HyperFixiSemantic: HyperFixiSemanticAPI;
  var HyperFixiI18n: HyperFixiI18nAPI;
}

// This export ensures the file is treated as a module
export {};
