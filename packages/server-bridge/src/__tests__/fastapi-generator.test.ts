import { describe, it, expect } from 'vitest';
import { FastAPIGenerator } from '../generators/fastapi-generator.js';
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

describe('FastAPIGenerator', () => {
  const gen = new FastAPIGenerator();

  it('has correct framework name', () => {
    expect(gen.framework).toBe('fastapi');
  });

  it('generates router files and main.py', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const paths = result.files.map(f => f.path);
    expect(paths).toContain('routers/api_users.py');
    expect(paths).toContain('main.py');
  });

  it('generates async endpoint with snake_case name', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const router = result.files.find(f => f.path.endsWith('api_users.py'))!;
    expect(router.content).toContain("@router.get('/api/users')");
    expect(router.content).toContain('async def get_api_users():');
    expect(router.content).toContain("return {'message': 'Not implemented'}");
  });

  it('converts :param to {param} in paths', () => {
    const route = makeRoute({
      path: '/api/users/:id',
      pathParams: ['id'],
      handlerName: 'getApiUsersById',
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const router = result.files.find(f => f.path.endsWith('api_users.py'))!;
    expect(router.content).toContain("@router.get('/api/users/{id}')");
    expect(router.content).toContain('async def get_api_users_by_id(id: str):');
  });

  it('generates Pydantic model for POST routes with body', () => {
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

    // Should generate models.py
    const models = result.files.find(f => f.path === 'models.py')!;
    expect(models).toBeDefined();
    expect(models.content).toContain('from pydantic import BaseModel');
    expect(models.content).toContain('class PostApiUsersBody(BaseModel):');
    expect(models.content).toContain('name: str');
    expect(models.content).toContain('email: str');
    expect(models.content).toContain('age: Optional[int] = None');

    // Router should reference the model
    const router = result.files.find(f => f.path.endsWith('api_users.py'))!;
    expect(router.content).toContain('from ..models import PostApiUsersBody');
    expect(router.content).toContain('body: PostApiUsersBody');
  });

  it('does not generate models.py when no routes have bodies', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const models = result.files.find(f => f.path === 'models.py');
    expect(models).toBeUndefined();
  });

  it('uses HTMLResponse for html format', () => {
    const route = makeRoute({ responseFormat: 'html' });
    const result = gen.generate([route], { outputDir: '/out' });
    const router = result.files.find(f => f.path.endsWith('api_users.py'))!;
    expect(router.content).toContain('from fastapi.responses import HTMLResponse');
    expect(router.content).toContain("return '<div>Not implemented</div>'");
  });

  it('generates main.py with include_router', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const main = result.files.find(f => f.path === 'main.py')!;
    expect(main.content).toContain('from fastapi import FastAPI');
    expect(main.content).toContain('app = FastAPI()');
    expect(main.content).toContain('app.include_router(api_users_router)');
  });

  it('generates Query() params in function signature', () => {
    const route = makeRoute({
      path: '/api/search',
      handlerName: 'getApiSearch',
      queryParams: [{ name: 'q', type: 'string', required: true }],
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const router = result.files.find(f => f.path.endsWith('api_search.py'))!;
    expect(router.content).toContain('q: str = Query(...)');
  });

  it('warns when no routes provided', () => {
    const result = gen.generate([], { outputDir: '/out' });
    expect(result.warnings).toContain('No routes to generate');
    expect(result.files).toHaveLength(0);
  });

  it('includes serverbridge markers', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const router = result.files.find(f => f.path.endsWith('api_users.py'))!;
    expect(router.content).toContain('# @serverbridge-route: GET /api/users');
    expect(router.content).toContain('# @serverbridge-user-start');
    expect(router.content).toContain('# @serverbridge-user-end');
  });
});
