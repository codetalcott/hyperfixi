import { describe, it, expect } from 'vitest';
import { HonoGenerator } from '../generators/hono-generator.js';
import type { RouteDescriptor } from '../types.js';

function makeRoute(overrides: Partial<RouteDescriptor> = {}): RouteDescriptor {
  return {
    path: '/api/users',
    method: 'GET',
    responseFormat: 'json',
    source: { file: 'test.html', kind: 'fetch', raw: 'fetch /api/users' },
    pathParams: [],
    handlerName: 'getApiUsers',
    notes: [],
    ...overrides,
  };
}

describe('HonoGenerator', () => {
  const gen = new HonoGenerator();

  it('has correct framework name', () => {
    expect(gen.framework).toBe('hono');
  });

  it('generates route files for a GET endpoint', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    expect(result.files.length).toBeGreaterThanOrEqual(2);
    const routeFile = result.files.find(f => f.path.includes('api-users'));
    expect(routeFile).toBeDefined();
    expect(routeFile!.content).toContain("app.get('/api/users'");
    expect(routeFile!.content).toContain("import { Hono } from 'hono'");
    expect(routeFile!.content).toContain("return c.json({ message: 'Not implemented' })");
  });

  it('generates POST route with body parsing', () => {
    const route = makeRoute({
      method: 'POST',
      handlerName: 'postApiUsers',
      requestBody: [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
      ],
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const routeFile = result.files.find(f => f.path.includes('api-users'));
    expect(routeFile!.content).toContain("app.post('/api/users'");
    expect(routeFile!.content).toContain('const body = await c.req.json()');
    expect(routeFile!.content).toContain('const { name, email } = body');
  });

  it('generates route with path params', () => {
    const route = makeRoute({
      path: '/api/users/:id',
      pathParams: ['id'],
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const routeFile = result.files.find(f => f.path.includes('api-users'));
    expect(routeFile!.content).toContain("const id = c.req.param('id')");
  });

  it('generates html response for html format', () => {
    const route = makeRoute({ responseFormat: 'html' });
    const result = gen.generate([route], { outputDir: '/out' });
    const routeFile = result.files.find(f => f.path.includes('api-users'));
    expect(routeFile!.content).toContain("return c.html('<div>Not implemented</div>')");
  });

  it('generates index file that composes route apps', () => {
    const routes = [
      makeRoute({ path: '/api/users' }),
      makeRoute({ path: '/api/products', handlerName: 'getApiProducts' }),
    ];
    const result = gen.generate(routes, { outputDir: '/out' });
    const indexFile = result.files.find(f => f.path.endsWith('index.ts'));
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain("import apiUsersRoutes from './api-users.js'");
    expect(indexFile!.content).toContain("app.route('/', apiUsersRoutes)");
  });
});
