/**
 * Compile-time compatibility pin: FlowRouteDescriptor → server-bridge's
 * RouteDescriptor.
 *
 * The route-extractor header claims a FlowRouteDescriptor becomes a
 * server-bridge RouteDescriptor by supplying `source`/`notes` and excluding
 * SSE routes. This file makes that claim checked instead of prose: if either
 * shape drifts (a new required field, diverging method/format unions), the
 * `satisfies` below stops compiling and this suite fails.
 *
 * Type-only dev dependency — no runtime import of server-bridge.
 */

import { describe, it, expect } from 'vitest';
import type { RouteDescriptor } from '@hyperfixi/server-bridge';
import { extractRoute } from '../generators/route-extractor.js';
import type { FlowRouteDescriptor } from '../generators/route-extractor.js';

/** The documented adapter: supply provenance, exclude SSE. */
function toServerBridgeRoute(
  flow: FlowRouteDescriptor,
  file: string,
  raw: string
): RouteDescriptor | null {
  if (flow.responseFormat === 'sse') return null;
  return {
    path: flow.path,
    method: flow.method,
    responseFormat: flow.responseFormat,
    pathParams: flow.pathParams,
    handlerName: flow.handlerName,
    source: { file, kind: 'fetch', raw },
    notes: [],
  } satisfies RouteDescriptor;
}

describe('FlowRouteDescriptor → server-bridge RouteDescriptor', () => {
  it('adapts a fetch route with the two supplied fields', () => {
    const flow = extractRoute({
      action: 'fetch',
      url: '/api/users/{id}',
      responseFormat: 'json',
    } as Parameters<typeof extractRoute>[0]);
    expect(flow).not.toBeNull();

    const route = toServerBridgeRoute(flow!, 'app.html', 'fetch /api/users/{id} as json');
    expect(route).not.toBeNull();
    expect(route!.path).toBe('/api/users/{id}');
    expect(route!.pathParams).toEqual(['id']);
    expect(route!.source.kind).toBe('fetch');
    expect(route!.notes).toEqual([]);
  });

  it('excludes SSE routes (server-bridge has no sse response format)', () => {
    const flow = extractRoute({
      action: 'stream',
      url: '/api/events',
      responseFormat: 'sse',
    } as Parameters<typeof extractRoute>[0]);
    expect(flow).not.toBeNull();
    expect(toServerBridgeRoute(flow!, 'app.html', 'stream /api/events')).toBeNull();
  });
});
