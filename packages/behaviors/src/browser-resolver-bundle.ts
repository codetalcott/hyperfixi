/**
 * The behaviors browser bundle: `resolver.browser.global.js`.
 *
 * Defines every standard behavior on the hyperscript host, so `install Toggleable`,
 * `install Draggable`, … just work. Include it after the host's script:
 *
 *   <script src="hyperfixi-hs.js"></script>
 *   <script src="resolver.browser.global.js"></script>
 *
 * The host is `@hyperfixi/engine` (`window.hyperfixi`, also `window._hyperscript`) or
 * upstream `_hyperscript` itself: each source is defined with `evaluate`, as a page's
 * `<script type="text/hyperscript">` would be. Loaded before the document is ready, this runs
 * before the host reads the page, so every `install` finds its behavior; loaded later, the
 * document is processed again so the installs can succeed now.
 */

import { defineBehaviors } from './behavior-resolver';
import { resolveRuntime } from './schemas/types';

function init(): void {
  const host = resolveRuntime();
  if (!host) {
    console.error('[behaviors] no hyperscript host: load hyperfixi-hs.js before this bundle');
    return;
  }
  defineBehaviors(host);
  if (document.readyState !== 'loading') host.processNode?.(document.body);
}

if (typeof window !== 'undefined') {
  init();
}
