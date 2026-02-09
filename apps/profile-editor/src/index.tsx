/**
 * LokaScript Profile Editor
 *
 * A hypermedia-driven language profile editor built with Bun + Elysia + LokaScript.
 * Dogfoods the LokaScript hybrid-hx bundle for all interactivity.
 */

import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';
import { resolve } from 'path';

import { dashboardRoutes } from './routes/dashboard';
import { profileRoutes } from './routes/profile';
import { keywordRoutes } from './routes/keywords';
import { exportRoutes } from './routes/export';
import { auditRoutes } from './routes/audit';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Resolve paths
const publicDir = resolve(import.meta.dir, '../public');
const stylesDir = resolve(import.meta.dir, 'styles');
const coreDistDir = resolve(import.meta.dir, '../../../packages/core/dist');

const app = new Elysia()
  // HTML plugin for JSX support
  .use(html())

  // Static files
  .use(
    staticPlugin({
      prefix: '/public',
      assets: publicDir,
    })
  )

  // Serve styles
  .get('/public/theme.css', () => Bun.file(resolve(stylesDir, 'theme.css')))

  // Serve LokaScript hybrid-hx bundle from core package
  .get('/public/lokascript-hybrid-hx.js', () =>
    Bun.file(resolve(coreDistDir, 'lokascript-hybrid-hx.js'))
  )

  // Routes
  .use(dashboardRoutes)
  .use(profileRoutes)
  .use(keywordRoutes)
  .use(exportRoutes)
  .use(auditRoutes)

  // Error handling
  .onError(({ code, error }) => {
    console.error(`Error [${code}]:`, error);
    const message = error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : String(error);
    return {
      error: code,
      message,
    };
  })

  .listen(PORT);

console.log(`
  LokaScript Profile Editor

  Local:   http://localhost:${app.server?.port}
  Network: http://${app.server?.hostname}:${app.server?.port}

  Press Ctrl+C to stop
`);

export type App = typeof app;
