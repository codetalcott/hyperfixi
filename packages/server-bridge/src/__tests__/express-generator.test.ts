import { describe, it, expect } from 'vitest';
import { ExpressGenerator } from '../generators/express-generator.js';
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

describe('ExpressGenerator', () => {
  const gen = new ExpressGenerator();

  it('has correct framework name', () => {
    expect(gen.framework).toBe('express');
  });

  it('generates route files for a GET endpoint', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    expect(result.files.length).toBeGreaterThanOrEqual(2); // router file + index
    const routerFile = result.files.find(f => f.path.includes('api-users'));
    expect(routerFile).toBeDefined();
    expect(routerFile!.content).toContain("router.get('/api/users'");
    expect(routerFile!.content).toContain('// @serverbridge-route: GET /api/users');
    expect(routerFile!.content).toContain('// @serverbridge-user-start');
    expect(routerFile!.content).toContain('// @serverbridge-user-end');
    expect(routerFile!.content).toContain("res.json({ message: 'Not implemented' })");
  });

  it('generates POST route with body destructuring', () => {
    const route = makeRoute({
      path: '/api/users',
      method: 'POST',
      handlerName: 'postApiUsers',
      requestBody: [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
      ],
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const routerFile = result.files.find(f => f.path.includes('api-users'));
    expect(routerFile!.content).toContain("router.post('/api/users'");
    expect(routerFile!.content).toContain('const { name, email } = req.body;');
    expect(routerFile!.content).toContain('// Expected body: { name: string, email: string }');
  });

  it('generates route with path params', () => {
    const route = makeRoute({
      path: '/api/users/:id',
      pathParams: ['id'],
      handlerName: 'getApiUsersById',
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const routerFile = result.files.find(f => f.path.includes('api-users'));
    expect(routerFile!.content).toContain('const { id } = req.params;');
  });

  it('generates html response for html format', () => {
    const route = makeRoute({ responseFormat: 'html' });
    const result = gen.generate([route], { outputDir: '/out' });
    const routerFile = result.files.find(f => f.path.includes('api-users'));
    expect(routerFile!.content).toContain("res.send('<div>Not implemented</div>')");
  });

  it('generates index file that imports all routers', () => {
    const routes = [
      makeRoute({ path: '/api/users' }),
      makeRoute({ path: '/api/products', handlerName: 'getApiProducts' }),
    ];
    const result = gen.generate(routes, { outputDir: '/out' });
    const indexFile = result.files.find(f => f.path.endsWith('index.ts'));
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain("import apiUsersRouter from './api-users.js'");
    expect(indexFile!.content).toContain("import apiProductsRouter from './api-products.js'");
    expect(indexFile!.content).toContain('router.use(apiUsersRouter)');
    expect(indexFile!.content).toContain('router.use(apiProductsRouter)');
  });

  it('warns when no routes provided', () => {
    const result = gen.generate([], { outputDir: '/out' });
    expect(result.warnings).toContain('No routes to generate');
    expect(result.files).toHaveLength(0);
  });
});
