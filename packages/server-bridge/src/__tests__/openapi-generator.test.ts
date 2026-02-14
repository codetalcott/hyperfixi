import { describe, it, expect } from 'vitest';
import { OpenAPIGenerator } from '../generators/openapi-generator.js';
import type { RouteDescriptor } from '../types.js';

function makeRoute(overrides: Partial<RouteDescriptor> = {}): RouteDescriptor {
  return {
    path: '/api/users',
    method: 'GET',
    responseFormat: 'json',
    source: { file: 'test.html', line: 5, kind: 'fetch', raw: 'fetch /api/users' },
    pathParams: [],
    handlerName: 'getApiUsers',
    notes: [],
    ...overrides,
  };
}

describe('OpenAPIGenerator', () => {
  const gen = new OpenAPIGenerator();

  it('has correct framework name', () => {
    expect(gen.framework).toBe('openapi');
  });

  it('generates a valid OpenAPI 3.1 spec', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('openapi.yaml');

    const yaml = result.files[0].content;
    expect(yaml).toContain("openapi: '3.1.0'");
    expect(yaml).toContain('title: ServerBridge Generated API');
    expect(yaml).toContain('/api/users:');
    expect(yaml).toContain('get:');
    expect(yaml).toContain('operationId: getApiUsers');
  });

  it('converts :param to {param} in paths', () => {
    const route = makeRoute({
      path: '/api/users/:id',
      pathParams: ['id'],
      handlerName: 'getApiUsersById',
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const yaml = result.files[0].content;
    expect(yaml).toContain('/api/users/{id}:');
    expect(yaml).toContain('name: id');
    expect(yaml).toContain('in: path');
    expect(yaml).toContain('required: true');
  });

  it('groups multiple methods under same path', () => {
    const routes = [
      makeRoute({ path: '/api/users', method: 'GET', handlerName: 'getApiUsers' }),
      makeRoute({ path: '/api/users', method: 'POST', handlerName: 'postApiUsers' }),
    ];
    const result = gen.generate(routes, { outputDir: '/out' });
    const yaml = result.files[0].content;

    // Should have one /api/users path with both get: and post:
    const pathCount = (yaml.match(/\/api\/users:/g) || []).length;
    expect(pathCount).toBe(1);
    expect(yaml).toContain('get:');
    expect(yaml).toContain('post:');
  });

  it('includes request body for POST routes with fields', () => {
    const route = makeRoute({
      method: 'POST',
      handlerName: 'postApiUsers',
      requestBody: [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
        { name: 'age', type: 'number', required: false },
      ],
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const yaml = result.files[0].content;
    expect(yaml).toContain('requestBody:');
    expect(yaml).toContain("required: ['name', 'email']");
    expect(yaml).toContain('name:');
    expect(yaml).toContain('email:');
    expect(yaml).toContain('age:');
  });

  it('uses text/html content type for html format', () => {
    const route = makeRoute({ responseFormat: 'html' });
    const result = gen.generate([route], { outputDir: '/out' });
    const yaml = result.files[0].content;
    expect(yaml).toContain('text/html:');
  });

  it('includes source file in summary', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const yaml = result.files[0].content;
    expect(yaml).toContain("summary: 'Source: test.html:5 (fetch)'");
  });

  it('generates query parameter specs', () => {
    const route = makeRoute({
      path: '/api/search',
      handlerName: 'getApiSearch',
      queryParams: [{ name: 'q', type: 'string', required: true }],
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const yaml = result.files[0].content;
    expect(yaml).toContain('name: q');
    expect(yaml).toContain('in: query');
  });

  it('warns when no routes provided', () => {
    const result = gen.generate([], { outputDir: '/out' });
    expect(result.warnings).toContain('No routes to generate');
    expect(result.files).toHaveLength(0);
  });
});
