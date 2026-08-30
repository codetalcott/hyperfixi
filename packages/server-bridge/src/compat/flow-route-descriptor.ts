/**
 * Compile-time compatibility pin: domain-flow's `FlowRouteDescriptor` →
 * server-bridge's `RouteDescriptor`.
 *
 * `@lokascript/domains/flow` declares its route descriptor as "compatible with
 * server-bridge's RouteDescriptor but self-contained to avoid a hard dependency
 * on the server-bridge package", and its route extractor exists so that
 * "each fetch/poll/stream/submit URL becomes a RouteDescriptor that can be fed
 * into server-bridge". Those two claims live in a different repository now.
 * The adapter below is the only place either one is written as code rather than
 * prose, so it is what keeps them honest.
 *
 * WHY THIS IS ORDINARY SOURCE AND NOT A TEST: the predecessor of this pin was
 * `domain-flow/src/__test__/route-descriptor-compat.test.ts`, and it never
 * checked anything. That package's tsconfig excluded `**\/*.test.ts` and
 * `**\/__test__\/**`, so `tsc` never saw the `satisfies`; vitest strips types
 * with esbuild rather than checking them. The assertion was erased at both
 * gates. Here the file is inside `include: ["src/**\/*.ts"]`, so
 * `npm run typecheck` compiles it: if either shape drifts — a new required
 * field on `RouteDescriptor`, a widened method or response-format union on
 * `FlowRouteDescriptor` — this stops compiling.
 *
 * The import is `import type`, so nothing here survives to runtime and
 * `@lokascript/domains` stays a devDependency. Deliberately NOT re-exported
 * from `index.ts`: server-bridge does not take a dependency on the domain
 * family, it only promises to remain assignable from it.
 */

import type { FlowRouteDescriptor } from '@lokascript/domains/flow';
import type { RouteDescriptor, RouteSource } from '../types.js';

/**
 * The documented adaptation: supply the provenance server-bridge requires
 * (`source`, `notes`) and drop SSE routes, which server-bridge's
 * `responseFormat` union does not model.
 */
export function toServerBridgeRoute(
  flow: FlowRouteDescriptor,
  source: RouteSource
): RouteDescriptor | null {
  if (flow.responseFormat === 'sse') return null;

  return {
    path: flow.path,
    method: flow.method,
    responseFormat: flow.responseFormat,
    pathParams: flow.pathParams,
    handlerName: flow.handlerName,
    source,
    notes: [],
  } satisfies RouteDescriptor;
}
