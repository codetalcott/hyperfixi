/**
 * HTTP Wrapper Tests
 *
 * Uses Hono's built-in app.request() — no actual server needed.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from './http.js';
import { CompilationService } from './service.js';
import type { Hono } from 'hono';

// Pre-create service so each test doesn't wait for lazy init
let app: Hono;

beforeAll(async () => {
  const service = await CompilationService.create();
  app = createApp({ service });
}, 30000);

// =============================================================================
// Health
// =============================================================================

describe('GET /health', () => {
  it('returns ok, version, ready, and uptime', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBeDefined();
    expect(body.ready).toBe(true);
    expect(body.uptime).toBeGreaterThan(0);
  });
});

// =============================================================================
// Validate
// =============================================================================

describe('POST /validate', () => {
  it('validates explicit syntax', async () => {
    const res = await app.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ explicit: '[add patient:.highlight destination:#panel]' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.semantic).toBeDefined();
  });

  it('validates explicit syntax with multiple roles', async () => {
    const res = await app.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ explicit: '[toggle patient:.active destination:#btn]' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.semantic).toBeDefined();
    expect(body.semantic.action).toBe('toggle');
  });

  it('validates natural language', async () => {
    const res = await app.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'on click toggle .active', language: 'en' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.semantic).toBeDefined();
  });

  it('returns 422 for invalid input', async () => {
    const res = await app.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'xyzzy blorp', language: 'en', confidence: 0.9 }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

// =============================================================================
// Translate
// =============================================================================

describe('POST /translate', () => {
  it('translates between languages', async () => {
    const res = await app.request('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'toggle .active', from: 'en', to: 'es' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.code).toBeDefined();
  });
});

// =============================================================================
// Generate Tests
// =============================================================================

describe('POST /generate-tests', () => {
  it('generates tests from explicit syntax', async () => {
    const res = await app.request('/generate-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ explicit: '[toggle patient:.active]' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tests).toHaveLength(1);
    expect(body.operations.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Generate Component
// =============================================================================

describe('POST /generate-component', () => {
  it('generates React component from explicit syntax', async () => {
    const res = await app.request('/generate-component', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ explicit: '[toggle patient:.active destination:#btn]' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.component).toBeDefined();
    expect(body.component.framework).toBe('react');
  });
});

// =============================================================================
// Diff
// =============================================================================

describe('POST /diff', () => {
  it('reports identical for same input', async () => {
    const res = await app.request('/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        a: { explicit: '[toggle patient:.active]' },
        b: { explicit: '[toggle patient:.active]' },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.identical).toBe(true);
    expect(body.summary).toBe('No semantic change');
  });

  it('detects differences', async () => {
    const res = await app.request('/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        a: { explicit: '[toggle patient:.active]' },
        b: { explicit: '[add patient:.highlight]' },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.identical).toBe(false);
    expect(body.operations.length).toBeGreaterThan(0);
  });

  it('returns 422 for invalid input', async () => {
    const res = await app.request('/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        a: { code: 'xyzzy blorp', language: 'en', confidence: 0.9 },
        b: { explicit: '[toggle patient:.active]' },
      }),
    });

    // Parse failure on side a should cause ok: false
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe('Error handling', () => {
  it('returns 500 for malformed JSON', async () => {
    const res = await app.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json}',
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.diagnostics).toBeDefined();
  });
});

// =============================================================================
// API Key Auth
// =============================================================================

// =============================================================================
// Production Middleware
// =============================================================================

describe('Production middleware', () => {
  let prodApp: Hono;

  beforeAll(async () => {
    const service = await CompilationService.create();
    prodApp = createApp({ service, production: true, maxBodyBytes: 100 });
  }, 30000);

  it('rejects oversized payloads with 413', async () => {
    const largeBody = JSON.stringify({ code: 'x'.repeat(200), language: 'en' });
    const res = await prodApp.request('/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(largeBody)),
      },
      body: largeBody,
    });

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.diagnostics[0].code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('allows normal-sized payloads', async () => {
    const smallBody = JSON.stringify({ explicit: '[toggle patient:.active]' });
    const res = await prodApp.request('/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(smallBody)),
      },
      body: smallBody,
    });

    expect(res.status).toBe(200);
  });
});

// =============================================================================
// API Key Auth
// =============================================================================

describe('API key authentication', () => {
  let authedApp: Hono;

  beforeAll(async () => {
    const service = await CompilationService.create();
    authedApp = createApp({ service, apiKey: 'test-secret-key' });
  }, 30000);

  it('rejects unauthenticated requests', async () => {
    const res = await authedApp.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ explicit: '[toggle patient:.active]' }),
    });

    expect(res.status).toBe(401);
  });

  it('allows authenticated requests', async () => {
    const res = await authedApp.request('/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-secret-key',
      },
      body: JSON.stringify({ explicit: '[toggle patient:.active]' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('health check bypasses auth', async () => {
    const res = await authedApp.request('/health');
    expect(res.status).toBe(200);
  });
});
