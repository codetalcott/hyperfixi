import { describe, it, expect } from 'vitest';
import { hashRoute, createManifest, extractUserCode, diffRoutes } from '../generators/manifest.js';
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

describe('hashRoute', () => {
  it('produces consistent hashes', () => {
    const route = makeRoute();
    expect(hashRoute(route)).toBe(hashRoute(route));
  });

  it('changes hash when route changes', () => {
    const a = makeRoute({ method: 'GET' });
    const b = makeRoute({ method: 'POST' });
    expect(hashRoute(a)).not.toBe(hashRoute(b));
  });
});

describe('createManifest', () => {
  it('creates manifest from routes', () => {
    const routes = [
      makeRoute(),
      makeRoute({ path: '/api/users/:id', handlerName: 'getApiUsersById', pathParams: ['id'] }),
    ];
    const manifest = createManifest(routes);
    expect(manifest.version).toBe(1);
    expect(Object.keys(manifest.routes)).toHaveLength(2);
    expect(manifest.routes['GET:/api/users']).toBeDefined();
    expect(manifest.routes['GET:/api/users/:id']).toBeDefined();
  });
});

describe('extractUserCode', () => {
  it('extracts user code between markers', () => {
    const content = `
// @serverbridge-route: GET /api/users
router.get('/api/users', async (req, res) => {
  // @serverbridge-user-start
  const users = await db.query('SELECT * FROM users');
  res.json(users);
  // @serverbridge-user-end
});
`;
    const userCode = extractUserCode(content);
    expect(userCode.size).toBe(1);
    expect(userCode.get('GET:/api/users')).toContain('db.query');
  });

  it('ignores TODO stubs', () => {
    const content = `
// @serverbridge-route: GET /api/users
router.get('/api/users', async (req, res) => {
  // @serverbridge-user-start
  // TODO: Implement GET /api/users
  res.json([]);
  // @serverbridge-user-end
});
`;
    const userCode = extractUserCode(content);
    expect(userCode.size).toBe(0);
  });

  it('handles multiple routes in one file', () => {
    const content = `
// @serverbridge-route: GET /api/users
router.get('/api/users', async (req, res) => {
  // @serverbridge-user-start
  res.json(await getUsers());
  // @serverbridge-user-end
});

// @serverbridge-route: POST /api/users
router.post('/api/users', async (req, res) => {
  // @serverbridge-user-start
  // TODO: Implement POST /api/users
  res.json({});
  // @serverbridge-user-end
});
`;
    const userCode = extractUserCode(content);
    // Only GET has real user code; POST still has TODO
    expect(userCode.size).toBe(1);
    expect(userCode.has('GET:/api/users')).toBe(true);
    expect(userCode.has('POST:/api/users')).toBe(false);
  });
});

describe('diffRoutes', () => {
  it('detects added routes', () => {
    const newRoutes = [makeRoute()];
    const diff = diffRoutes(null, newRoutes);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  it('detects removed routes', () => {
    const oldManifest = createManifest([makeRoute()]);
    const diff = diffRoutes(oldManifest, []);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toHaveLength(0);
  });

  it('detects changed routes', () => {
    const oldRoute = makeRoute({ responseFormat: 'json' });
    const oldManifest = createManifest([oldRoute]);
    const newRoute = makeRoute({ responseFormat: 'html' });
    const diff = diffRoutes(oldManifest, [newRoute]);
    expect(diff.changed).toHaveLength(1);
    expect(diff.unchanged).toHaveLength(0);
  });

  it('identifies unchanged routes', () => {
    const route = makeRoute();
    const oldManifest = createManifest([route]);
    const diff = diffRoutes(oldManifest, [route]);
    expect(diff.unchanged).toHaveLength(1);
    expect(diff.added).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });
});
