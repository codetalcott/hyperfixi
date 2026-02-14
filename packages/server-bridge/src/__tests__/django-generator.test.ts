import { describe, it, expect } from 'vitest';
import { DjangoGenerator } from '../generators/django-generator.js';
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

describe('DjangoGenerator', () => {
  const gen = new DjangoGenerator();

  it('has correct framework name', () => {
    expect(gen.framework).toBe('django');
  });

  it('generates views.py, urls.py, __init__.py, and root urls.py', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const paths = result.files.map(f => f.path);
    expect(paths).toContain('api-users/views.py');
    expect(paths).toContain('api-users/urls.py');
    expect(paths).toContain('api-users/__init__.py');
    expect(paths).toContain('urls.py');
  });

  it('generates a view function with snake_case name', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const views = result.files.find(f => f.path.endsWith('views.py'))!;
    expect(views.content).toContain('def get_api_users(request):');
    expect(views.content).toContain("return JsonResponse({'message': 'Not implemented'})");
  });

  it('converts :param to <str:param> in urls.py', () => {
    const route = makeRoute({
      path: '/api/users/:id',
      pathParams: ['id'],
      handlerName: 'getApiUsersById',
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const urls = result.files.find(f => f.path === 'api-users/urls.py')!;
    expect(urls.content).toContain("path('api/users/<str:id>'");
    expect(urls.content).toContain('views.get_api_users_by_id');
  });

  it('includes path params in view function signature', () => {
    const route = makeRoute({
      path: '/api/users/:id',
      pathParams: ['id'],
      handlerName: 'getApiUsersById',
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const views = result.files.find(f => f.path.endsWith('views.py'))!;
    expect(views.content).toContain('def get_api_users_by_id(request, id):');
  });

  it('adds require_http_methods decorator for non-GET routes', () => {
    const route = makeRoute({ method: 'POST', handlerName: 'postApiUsers' });
    const result = gen.generate([route], { outputDir: '/out' });
    const views = result.files.find(f => f.path.endsWith('views.py'))!;
    expect(views.content).toContain('@require_http_methods(["POST"])');
    expect(views.content).toContain(
      'from django.views.decorators.http import require_http_methods'
    );
  });

  it('parses request body for POST routes', () => {
    const route = makeRoute({
      method: 'POST',
      handlerName: 'postApiUsers',
      requestBody: [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
      ],
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const views = result.files.find(f => f.path.endsWith('views.py'))!;
    expect(views.content).toContain('import json');
    expect(views.content).toContain('data = json.loads(request.body)');
    expect(views.content).toContain("name = data.get('name')");
    expect(views.content).toContain("email = data.get('email')");
  });

  it('generates HTML response for html format', () => {
    const route = makeRoute({ responseFormat: 'html' });
    const result = gen.generate([route], { outputDir: '/out' });
    const views = result.files.find(f => f.path.endsWith('views.py'))!;
    expect(views.content).toContain("return HttpResponse('<div>Not implemented</div>')");
  });

  it('generates root urls.py with include()', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const rootUrls = result.files.find(f => f.path === 'urls.py')!;
    expect(rootUrls.content).toContain('from django.urls import path, include');
    expect(rootUrls.content).toContain("include('api-users.urls')");
  });

  it('generates query param extraction', () => {
    const route = makeRoute({
      path: '/api/search',
      handlerName: 'getApiSearch',
      queryParams: [{ name: 'q', type: 'string', required: true }],
    });
    const result = gen.generate([route], { outputDir: '/out' });
    const views = result.files.find(f => f.path.endsWith('views.py'))!;
    expect(views.content).toContain("q = request.GET.get('q')");
  });

  it('warns when no routes provided', () => {
    const result = gen.generate([], { outputDir: '/out' });
    expect(result.warnings).toContain('No routes to generate');
    expect(result.files).toHaveLength(0);
  });

  it('includes serverbridge markers', () => {
    const result = gen.generate([makeRoute()], { outputDir: '/out' });
    const views = result.files.find(f => f.path.endsWith('views.py'))!;
    expect(views.content).toContain('# @serverbridge-route: GET /api/users');
    expect(views.content).toContain('# @serverbridge-user-start');
    expect(views.content).toContain('# @serverbridge-user-end');
  });
});
