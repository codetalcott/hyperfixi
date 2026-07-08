/**
 * @hyperfixi/realtime — socket / eventsource / worker top-level features.
 *
 * Adds three constructs matching upstream _hyperscript 0.9.93 (its official
 * socket / eventsource / worker extensions):
 *
 *   socket Chat ws://host:8080          named WebSocket; `on message …`
 *     on message put it into #chat      handler runs per message; reconnects
 *   end                                 with exponential backoff.
 *
 *   eventsource Feed from /events       named SSE source; one handler per
 *     on message put it into #log end   event name (`as json` to parse);
 *   end                                 browser auto-reconnect + backoff.
 *
 *   worker Calc                         named async function bundle:
 *     def add(a, b) return a + b end    `Calc.add(1, 2)` returns a Promise.
 *   end                                 v1 runs on the MAIN THREAD (async
 *                                       shim, no isolation — see worker.ts).
 *
 * Install:
 *
 * ```ts
 * import { createRuntime, installPlugin } from '@hyperfixi/core';
 * import { realtimePlugin } from '@hyperfixi/realtime';
 *
 * const runtime = createRuntime();
 * installPlugin(runtime, realtimePlugin);
 * ```
 *
 * The full `hyperfixi.js` browser bundle installs this plugin automatically.
 */

import type { HyperfixiPlugin, HyperfixiPluginContext } from '@hyperfixi/core';
import { parseSocketFeature, makeEvaluateSocketFeature } from './socket';
import { parseEventSourceFeature, makeEvaluateEventSourceFeature } from './eventsource';
import { parseWorkerFeature, makeEvaluateWorkerFeature } from './worker';

export { configureRealtime, realtime } from './connections';
export { SocketConnection } from './socket';
export { ESConnection } from './eventsource';
export type { SocketFeatureNode } from './socket';
export type { EventSourceFeatureNode } from './eventsource';
export type { WorkerFeatureNode, WorkerDef } from './worker';
export type { RealtimeConfig, BackoffOptions } from './connections';

/**
 * The plugin object. Install once at app startup; re-installing is idempotent
 * (guarded via a `parserExtensions.hasFeature('socket')` check, mirroring
 * @hyperfixi/reactivity).
 *
 * Registers:
 *   - Features: `socket`, `eventsource`, `worker` (top-level features)
 *   - Node evaluators: `socketFeature`, `eventsourceFeature`, `workerFeature`
 *
 * Connection cleanup: evaluators register teardown with the runtime's
 * cleanup registry keyed on the owning element; `realtime.stopElement(el)` /
 * `realtime.closeAll()` are exposed for explicit teardown.
 */
export const realtimePlugin: HyperfixiPlugin & { version: string } = {
  name: '@hyperfixi/realtime',
  version: '2.6.0',
  install(ctx: HyperfixiPluginContext) {
    const { parserExtensions, runtime } = ctx;

    // Idempotency: the parser-extension registry is process-singleton;
    // snapshot()/restore() in tests clears it, re-enabling a fresh install.
    if (parserExtensions.hasFeature('socket')) return;

    parserExtensions.registerFeature('socket', parseSocketFeature as never);
    parserExtensions.registerFeature('eventsource', parseEventSourceFeature as never);
    parserExtensions.registerFeature('worker', parseWorkerFeature as never);

    parserExtensions.registerNodeEvaluator(
      'socketFeature',
      makeEvaluateSocketFeature(runtime as never) as never
    );
    parserExtensions.registerNodeEvaluator(
      'eventsourceFeature',
      makeEvaluateEventSourceFeature(runtime as never) as never
    );
    parserExtensions.registerNodeEvaluator(
      'workerFeature',
      makeEvaluateWorkerFeature(runtime as never) as never
    );
  },
};

export default realtimePlugin;
