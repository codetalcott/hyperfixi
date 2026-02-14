import { describe, it, expect } from 'vitest';
import { diffRoutes, createManifest } from '../generators/manifest.js';
import type { RouteDescriptor } from '../types.js';

function makeRoute(overrides: Partial<RouteDescriptor>): RouteDescriptor {
  return {
    path: '/api/users',
    method: 'GET',
    responseFormat: 'json',
    source: { file: 'test.html', line: 1, kind: 'fetch', raw: '' },
    pathParams: [],
    handlerName: 'getApiUsers',
    notes: [],
    ...overrides,
  };
}

describe('diff command logic', () => {
  it('detects added routes against empty manifest', () => {
    const manifest = { version: 1, generatedAt: '2024-01-01', routes: {} };
    const routes = [makeRoute({})];
    const diff = diffRoutes(manifest, routes);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
  });

  it('detects removed routes', () => {
    const routes = [makeRoute({})];
    const manifest = createManifest(routes);
    const diff = diffRoutes(manifest, []);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toHaveLength(0);
  });

  it('detects changed routes (format changed)', () => {
    const original = [makeRoute({ responseFormat: 'json' })];
    const manifest = createManifest(original);
    const updated = [makeRoute({ responseFormat: 'html' })];
    const diff = diffRoutes(manifest, updated);
    expect(diff.changed).toHaveLength(1);
    expect(diff.unchanged).toHaveLength(0);
  });

  it('detects unchanged routes', () => {
    const routes = [makeRoute({})];
    const manifest = createManifest(routes);
    const diff = diffRoutes(manifest, routes);
    expect(diff.unchanged).toHaveLength(1);
    expect(diff.added).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('handles null manifest (no previous generation)', () => {
    const routes = [makeRoute({}), makeRoute({ path: '/api/posts' })];
    const diff = diffRoutes(null, routes);
    expect(diff.added).toHaveLength(2);
  });

  it('detects change when queryParams added', () => {
    const original = [makeRoute({})];
    const manifest = createManifest(original);
    const updated = [makeRoute({ queryParams: [{ name: 'q', type: 'string', required: true }] })];
    const diff = diffRoutes(manifest, updated);
    expect(diff.changed).toHaveLength(1);
  });
});
