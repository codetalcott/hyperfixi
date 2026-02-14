import { describe, it, expect } from 'vitest';
import { scanRoutes } from '../scanner/route-scanner.js';
import { ExpressGenerator } from '../generators/express-generator.js';
import { HonoGenerator } from '../generators/hono-generator.js';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<body>
  <h1>User Management</h1>

  <!-- Hyperscript fetch -->
  <div _="on load fetch /api/users as json then put it into me">
    Loading users...
  </div>

  <!-- htmx GET -->
  <button hx-get="/api/users/:id" hx-target="#detail">
    View Details
  </button>

  <!-- htmx POST with form -->
  <form hx-post="/api/users" hx-target="#result">
    <input name="name" type="text" required>
    <input name="email" type="email" required>
    <input name="age" type="number">
    <button type="submit">Create User</button>
  </form>

  <!-- htmx DELETE -->
  <button hx-delete="/api/users/:id" hx-target="#user-row">
    Delete User
  </button>

  <!-- fixi -->
  <button fx-action="/api/search" fx-method="GET" fx-target="#results">
    Search
  </button>

  <div id="detail"></div>
  <div id="result"></div>
  <div id="results"></div>
</body>
</html>
`;

describe('integration: full pipeline', () => {
  it('extracts all routes from a realistic HTML page', () => {
    const routes = scanRoutes(SAMPLE_HTML, 'users.html');

    // Should find: GET /api/users, GET /api/users/:id, POST /api/users,
    // DELETE /api/users/:id, GET /api/search
    expect(routes.length).toBeGreaterThanOrEqual(4);

    const paths = routes.map(r => `${r.method} ${r.path}`);
    expect(paths).toContain('GET /api/users');
    expect(paths).toContain('POST /api/users');
    expect(paths).toContain('DELETE /api/users/:id');
    expect(paths).toContain('GET /api/search');

    // POST route should have form body fields
    const postRoute = routes.find(r => r.method === 'POST' && r.path === '/api/users');
    expect(postRoute?.requestBody).toBeDefined();
    expect(postRoute!.requestBody!.length).toBeGreaterThanOrEqual(2);
  });

  it('generates valid Express routes from extracted routes', () => {
    const routes = scanRoutes(SAMPLE_HTML, 'users.html');
    const gen = new ExpressGenerator();
    const result = gen.generate(routes, { outputDir: '/out' });

    expect(result.files.length).toBeGreaterThanOrEqual(2);

    // All route files should contain Express Router setup
    const routeFiles = result.files.filter(f => !f.path.endsWith('index.ts'));
    for (const file of routeFiles) {
      expect(file.content).toContain('import { Router');
      expect(file.content).toContain('const router = Router()');
      expect(file.content).toContain('export default router');
    }

    // Index file should import and wire all routers
    const indexFile = result.files.find(f => f.path.endsWith('index.ts'));
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('router.use(');
  });

  it('generates valid Hono routes from extracted routes', () => {
    const routes = scanRoutes(SAMPLE_HTML, 'users.html');
    const gen = new HonoGenerator();
    const result = gen.generate(routes, { outputDir: '/out' });

    expect(result.files.length).toBeGreaterThanOrEqual(2);

    const routeFiles = result.files.filter(f => !f.path.endsWith('index.ts'));
    for (const file of routeFiles) {
      expect(file.content).toContain("import { Hono } from 'hono'");
      expect(file.content).toContain('const app = new Hono()');
      expect(file.content).toContain('export default app');
    }
  });
});
