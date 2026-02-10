/**
 * Global type augmentation for HyperFixi and LokaScript browser APIs
 *
 * This file augments the Window and globalThis interfaces to include
 * HyperFixi and LokaScript global variables, providing IDE autocomplete and type safety.
 */

import type { LokaScriptCoreAPI } from './core-api';
import type { LokaScriptSemanticAPI } from './semantic-api';
import type { LokaScriptI18nAPI } from './i18n-api';

declare global {
  /**
   * Window interface augmentation
   */
  interface Window {
    /**
     * HyperFixi - Modern hyperscript engine with fixi/htmx integration
     *
     * Loaded from: hyperfixi.js or hyperfixi-hx.js
     *
     * @example
     * ```typescript
     * window.hyperfixi.execute('toggle .active', document.body)
     * window.hyperfixi.compile('on click add .highlight')
     * ```
     */
    hyperfixi: LokaScriptCoreAPI;

    /**
     * @deprecated Use `hyperfixi` instead. Will be removed in v3.0.0.
     *
     * Loaded from: hyperfixi.js (backward-compat alias)
     */
    lokascript: LokaScriptCoreAPI;

    /**
     * Compatibility alias for official _hyperscript API compatibility
     *
     * @example
     * ```typescript
     * window._hyperscript.compile('on click toggle .active')
     * ```
     */
    _hyperscript: LokaScriptCoreAPI;

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
     * LokaScript I18n - Grammar transformation for natural language word order
     *
     * Loaded from: lokascript-i18n.min.js
     *
     * @example
     * ```typescript
     * const japanese = window.LokaScriptI18n.translate('on click toggle .active', 'en', 'ja')
     * // Result: 'クリック で .active を 切り替え' (SOV word order)
     * ```
     */
    LokaScriptI18n: LokaScriptI18nAPI;
  }

  /**
   * globalThis interface augmentation (same as Window for browser contexts)
   */
  var hyperfixi: LokaScriptCoreAPI;
  var lokascript: LokaScriptCoreAPI;
  var _hyperscript: LokaScriptCoreAPI;
  var LokaScriptSemantic: LokaScriptSemanticAPI;
  var LokaScriptI18n: LokaScriptI18nAPI;
}

// This export ensures the file is treated as a module
export {};
