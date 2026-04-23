/**
 * navigator.serviceWorker registration + postMessage bridge.
 *
 * Split out from `parse.ts` so tests can exercise the registration logic with
 * a mock `navigator.serviceWorker` without reaching into the parser surface.
 *
 * Upstream parity (`_hyperscript/src/ext/intercept.js:install`):
 *   - Only one intercept declaration per app — subsequent calls warn & return.
 *   - Register the SW at the configured scope.
 *   - Post `{ type: 'hs:intercept:config', config }` once the SW is activated.
 *   - Surface actionable hint on SecurityError (scope too wide for SW directory).
 */

import type { InterceptConfig } from './types';

/**
 * Module-level guard matching upstream's `InterceptFeature.installed` flag.
 * Exposed via `resetInstalledForTest` so integration tests can run multiple
 * scenarios in the same process.
 */
let INSTALLED = false;

/** Test-only: reset the install guard. */
export function resetInstalledForTest(): void {
  INSTALLED = false;
}

/**
 * Attempt to register the service worker and post the config. Fire-and-forget:
 * any failure is logged but does not throw (upstream behavior).
 */
export async function registerSW(config: InterceptConfig, swUrl: string): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[hyperfixi/intercept] service worker not supported in this environment');
    return;
  }
  if (INSTALLED) {
    console.warn(
      '[hyperfixi/intercept] only one intercept declaration is allowed per app — ignoring subsequent declarations'
    );
    return;
  }
  INSTALLED = true;

  try {
    const registration = await navigator.serviceWorker.register(swUrl, { scope: config.scope });
    const sw: ServiceWorker | null =
      registration.installing || registration.waiting || registration.active;
    if (!sw) return;

    const send = (): void => {
      sw.postMessage({ type: 'hs:intercept:config', config });
    };

    if (sw.state === 'activated') {
      send();
    } else {
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') send();
      });
    }
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    if (name === 'SecurityError') {
      console.error(
        `[hyperfixi/intercept] scope '${config.scope}' is wider than the service worker's directory. Either:\n` +
          `  1. Serve ${swUrl} from the site root, or\n` +
          `  2. Add the response header: Service-Worker-Allowed: ${config.scope}`
      );
    } else {
      console.error('[hyperfixi/intercept] registration failed:', err);
    }
  }
}
