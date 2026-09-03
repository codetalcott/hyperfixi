/**
 * Runtime half of the domain-flow compatibility pin.
 *
 * The compile-time half — and the part that actually catches drift — lives in
 * `src/compat/flow-route-descriptor.ts`, because this directory is excluded
 * from the tsconfig and vitest strips types rather than checking them. Nothing
 * asserted about a *type* in this file would be enforced; these cases cover the
 * adapter's runtime behaviour only.
 */

import { describe, it, expect } from 'vitest';
import type { FlowRouteDescriptor } from '@lokascript/domains/flow';
import { toServerBridgeRoute } from '../compat/flow-route-descriptor.js';

const source = { file: 'app.html', kind: 'fetch' as const, raw: 'fetch /api/users/{id} as json' };

describe('FlowRouteDescriptor → server-bridge RouteDescriptor', () => {
  it('adapts a fetch route by supplying the two fields flow does not carry', () => {
    const flow: FlowRouteDescriptor = {
      path: '/api/users/{id}',
      method: 'GET',
      responseFormat: 'json',
      pathParams: ['id'],
      handlerName: 'getUsersId',
      sourceCommand: 'fetch',
    };

    const route = toServerBridgeRoute(flow, source);

    expect(route).not.toBeNull();
    expect(route!.path).toBe('/api/users/{id}');
    expect(route!.method).toBe('GET');
    expect(route!.responseFormat).toBe('json');
    expect(route!.pathParams).toEqual(['id']);
    expect(route!.handlerName).toBe('getUsersId');
    expect(route!.source).toEqual(source);
    expect(route!.notes).toEqual([]);
  });

  it('drops SSE routes — server-bridge has no sse response format', () => {
    const flow: FlowRouteDescriptor = {
      path: '/api/events',
      method: 'GET',
      responseFormat: 'sse',
      pathParams: [],
      handlerName: 'getEvents',
      sourceCommand: 'stream',
    };

    expect(toServerBridgeRoute(flow, source)).toBeNull();
  });

  it('carries every non-sse response format through unchanged', () => {
    for (const format of ['json', 'html', 'text'] as const) {
      const flow: FlowRouteDescriptor = {
        path: '/api/thing',
        method: 'POST',
        responseFormat: format,
        pathParams: [],
        handlerName: 'postThing',
        sourceCommand: 'submit',
      };
      expect(toServerBridgeRoute(flow, source)?.responseFormat).toBe(format);
    }
  });
});
