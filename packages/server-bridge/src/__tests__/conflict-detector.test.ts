import { describe, it, expect } from 'vitest';
import { detectConflicts, formatConflicts } from '../scanner/conflict-detector.js';
import type { RouteDescriptor } from '../types.js';

function makeRoute(overrides: Partial<RouteDescriptor>): RouteDescriptor {
  return {
    path: '/api/users',
    method: 'GET',
    responseFormat: 'json',
    source: { file: 'test.html', line: 1, kind: 'fetch', raw: 'fetch /api/users' },
    pathParams: [],
    handlerName: 'getApiUsers',
    notes: [],
    ...overrides,
  };
}

describe('detectConflicts', () => {
  it('returns empty array when no conflicts', () => {
    const routes = [
      makeRoute({ path: '/api/users', method: 'GET' }),
      makeRoute({ path: '/api/posts', method: 'GET' }),
    ];
    expect(detectConflicts(routes)).toEqual([]);
  });

  it('returns empty array for single-occurrence routes', () => {
    const routes = [makeRoute({})];
    expect(detectConflicts(routes)).toEqual([]);
  });

  it('returns empty array when duplicates have same expectations', () => {
    const routes = [
      makeRoute({
        responseFormat: 'json',
        source: { file: 'a.html', line: 1, kind: 'fetch', raw: '' },
      }),
      makeRoute({
        responseFormat: 'json',
        source: { file: 'b.html', line: 2, kind: 'hx-attr', raw: '' },
      }),
    ];
    expect(detectConflicts(routes)).toEqual([]);
  });

  it('detects responseFormat conflict', () => {
    const routes = [
      makeRoute({
        responseFormat: 'json',
        source: { file: 'a.html', line: 1, kind: 'fetch', raw: '' },
      }),
      makeRoute({
        responseFormat: 'html',
        source: { file: 'b.html', line: 2, kind: 'hx-attr', raw: '' },
      }),
    ];
    const conflicts = detectConflicts(routes);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].routeKey).toBe('GET:/api/users');
    expect(conflicts[0].conflicts[0].field).toBe('responseFormat');
    expect(conflicts[0].sources).toHaveLength(2);
  });

  it('detects requestBody conflict on POST routes', () => {
    const routes = [
      makeRoute({
        method: 'POST',
        requestBody: [{ name: 'name', type: 'string', required: true }],
        source: { file: 'a.html', line: 1, kind: 'fetch', raw: '' },
      }),
      makeRoute({
        method: 'POST',
        requestBody: [{ name: 'email', type: 'string', required: true }],
        source: { file: 'b.html', line: 2, kind: 'hx-attr', raw: '' },
      }),
    ];
    const conflicts = detectConflicts(routes);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflicts[0].field).toBe('requestBody');
  });

  it('detects queryParams conflict', () => {
    const routes = [
      makeRoute({
        queryParams: [{ name: 'q', type: 'string', required: true }],
        source: { file: 'a.html', line: 1, kind: 'fetch', raw: '' },
      }),
      makeRoute({
        queryParams: [{ name: 'search', type: 'string', required: true }],
        source: { file: 'b.html', line: 2, kind: 'hx-attr', raw: '' },
      }),
    ];
    const conflicts = detectConflicts(routes);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflicts[0].field).toBe('queryParams');
  });

  it('ignores requestBody conflicts on GET routes', () => {
    const routes = [
      makeRoute({ method: 'GET', source: { file: 'a.html', line: 1, kind: 'fetch', raw: '' } }),
      makeRoute({ method: 'GET', source: { file: 'b.html', line: 2, kind: 'hx-attr', raw: '' } }),
    ];
    expect(detectConflicts(routes)).toEqual([]);
  });
});

describe('formatConflicts', () => {
  it('formats conflict warnings for CLI output', () => {
    const routes = [
      makeRoute({
        responseFormat: 'json',
        source: { file: 'a.html', line: 1, kind: 'fetch', raw: '' },
      }),
      makeRoute({
        responseFormat: 'html',
        source: { file: 'b.html', line: 2, kind: 'hx-attr', raw: '' },
      }),
    ];
    const conflicts = detectConflicts(routes);
    const output = formatConflicts(conflicts);
    expect(output).toContain('GET:/api/users');
    expect(output).toContain('json vs html');
    expect(output).toContain('a.html:1');
    expect(output).toContain('b.html:2');
  });
});
