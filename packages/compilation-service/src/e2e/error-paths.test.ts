/**
 * Error Path E2E Tests
 *
 * Tests error handling and edge cases across the full HTTP pipeline:
 * - Missing/invalid inputs
 * - Malformed requests
 * - Diagnostic quality (actionable messages)
 * - Empty operations
 * - 500 error handler
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../http.js';
import { CompilationService } from '../service.js';
import type { Hono } from 'hono';

// =============================================================================
// Setup
// =============================================================================

let app: Hono;

beforeAll(async () => {
  const service = await CompilationService.create();
  app = createApp({ service });
}, 30000);

async function post(path: string, body: unknown) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// =============================================================================
// Missing Input
// =============================================================================

describe('Missing input', () => {
  it('/compile with empty body returns diagnostics', async () => {
    const { status, body } = await post('/compile', {});

    expect(status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
    expect(body.diagnostics[0].severity).toBe('error');
  });

  it('/validate with empty body returns diagnostics', async () => {
    const { status, body } = await post('/validate', {});

    expect(status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });

  it('/generate-tests with empty body returns diagnostics', async () => {
    const { status, body } = await post('/generate-tests', {});

    expect(status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.tests).toEqual([]);
    expect(body.operations).toEqual([]);
  });

  it('/generate-component with empty body returns diagnostics', async () => {
    const { status, body } = await post('/generate-component', {});

    expect(status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.operations).toEqual([]);
  });

  it('/diff with empty a and b returns diagnostics', async () => {
    const { body } = await post('/diff', {
      a: {},
      b: {},
    });

    expect(body.ok).toBe(false);
    expect(body.identical).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Invalid JSON Payloads
// =============================================================================

describe('Invalid JSON payloads', () => {
  it('malformed JSON body returns 500', async () => {
    const res = await app.request('/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json!!!}',
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.diagnostics).toBeDefined();
    expect(body.diagnostics[0].code).toBe('INTERNAL_ERROR');
  });

  it('malformed JSON on /validate returns 500', async () => {
    const res = await app.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'broken',
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('malformed JSON on /diff returns 500', async () => {
    const res = await app.request('/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{{{}}}',
    });

    expect(res.status).toBe(500);
  });
});

// =============================================================================
// Invalid LLM JSON Structure
// =============================================================================

describe('Invalid LLM JSON input', () => {
  it('missing action field in semantic JSON', async () => {
    const { body } = await post('/compile', {
      semantic: {
        roles: { patient: { type: 'selector', value: '.active' } },
      },
    });

    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });

  it('invalid role value type in semantic JSON', async () => {
    const { body } = await post('/compile', {
      semantic: {
        action: 'toggle',
        roles: { patient: { type: 'banana', value: '.active' } },
      },
    });

    // Should still attempt to parse, may succeed or produce warnings
    expect(body.diagnostics).toBeDefined();
  });

  it('missing role value in semantic JSON', async () => {
    const { body } = await post('/compile', {
      semantic: {
        action: 'toggle',
        roles: { patient: { type: 'selector' } },
      },
    });

    expect(body.diagnostics).toBeDefined();
  });
});

// =============================================================================
// Diagnostic Quality
// =============================================================================

describe('Diagnostic quality', () => {
  it('diagnostics have required fields (severity, code, message)', async () => {
    const { body } = await post('/compile', {
      code: 'xyzzy blorp',
      language: 'en',
    });

    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);

    for (const diag of body.diagnostics) {
      expect(diag).toHaveProperty('severity');
      expect(diag).toHaveProperty('code');
      expect(diag).toHaveProperty('message');
      expect(['error', 'warning', 'info']).toContain(diag.severity);
      expect(diag.code.length).toBeGreaterThan(0);
      expect(diag.message.length).toBeGreaterThan(0);
    }
  });

  it('low confidence diagnostic mentions threshold', async () => {
    const { body } = await post('/compile', {
      code: 'toggle active',
      language: 'en',
      confidence: 0.99,
    });

    if (!body.ok) {
      const lowConf = body.diagnostics.find((d: { code: string }) => d.code === 'LOW_CONFIDENCE');
      if (lowConf) {
        expect(lowConf.message).toMatch(/confidence|threshold/i);
      }
    }
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge cases', () => {
  it('explicit syntax with no roles', async () => {
    const { body } = await post('/compile', {
      explicit: '[toggle]',
    });

    // May succeed with defaults or fail — either way, should not crash
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('diagnostics');
  });

  it('natural language with missing language code', async () => {
    const { body } = await post('/compile', {
      code: 'on click toggle .active',
      // No language field
    });

    // Should either default to 'en' or return a diagnostic
    expect(body).toHaveProperty('ok');
  });

  it('diff with both sides identical across formats (explicit vs JSON)', async () => {
    const { body } = await post('/diff', {
      a: { explicit: '[toggle patient:.active]' },
      b: {
        semantic: {
          action: 'toggle',
          roles: { patient: { type: 'selector', value: '.active' } },
        },
      },
    });

    expect(body.ok).toBe(true);
    expect(body.identical).toBe(true);
  });

  it('generate-tests returns framework=playwright', async () => {
    const { body } = await post('/generate-tests', {
      explicit: '[toggle patient:.active]',
    });

    expect(body.ok).toBe(true);
    expect(body.tests[0].framework).toBe('playwright');
  });

  it('generate-component returns framework=react', async () => {
    const { body } = await post('/generate-component', {
      explicit: '[toggle patient:.active]',
    });

    expect(body.ok).toBe(true);
    expect(body.component.framework).toBe('react');
  });

  it('health endpoint returns before service init', async () => {
    // Create a fresh app without pre-initialized service
    const freshApp = createApp();
    const res = await freshApp.request('/health');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.ready).toBe(false);
    // No cache stats when not ready
    expect(body.cache).toBeUndefined();
  });
});

// =============================================================================
// Response Shape Contracts
// =============================================================================

describe('Response shape contracts', () => {
  it('/compile success has required fields', async () => {
    const { body } = await post('/compile', {
      explicit: '[toggle patient:.active]',
    });

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('js');
    expect(body).toHaveProperty('semantic');
    expect(body).toHaveProperty('diagnostics');
    expect(body).toHaveProperty('size');
    expect(Array.isArray(body.diagnostics)).toBe(true);
  });

  it('/compile failure has required fields', async () => {
    const { body } = await post('/compile', {});

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('diagnostics');
    expect(body.ok).toBe(false);
    expect(Array.isArray(body.diagnostics)).toBe(true);
  });

  it('/validate success has required fields', async () => {
    const { body } = await post('/validate', {
      explicit: '[toggle patient:.active]',
    });

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('semantic');
    expect(body).toHaveProperty('diagnostics');
  });

  it('/diff success has required fields', async () => {
    const { body } = await post('/diff', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[toggle patient:.active]' },
    });

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('identical');
    expect(body).toHaveProperty('trigger');
    expect(body).toHaveProperty('operations');
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('diagnostics');
    expect(Array.isArray(body.operations)).toBe(true);
    expect(typeof body.summary).toBe('string');
  });

  it('/generate-tests success has required fields', async () => {
    const { body } = await post('/generate-tests', {
      explicit: '[toggle patient:.active]',
    });

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('tests');
    expect(body).toHaveProperty('operations');
    expect(body).toHaveProperty('diagnostics');
    expect(Array.isArray(body.tests)).toBe(true);
    expect(Array.isArray(body.operations)).toBe(true);

    // Test shape
    const test = body.tests[0];
    expect(test).toHaveProperty('name');
    expect(test).toHaveProperty('code');
    expect(test).toHaveProperty('html');
    expect(test).toHaveProperty('framework');
  });

  it('/generate-component success has required fields', async () => {
    const { body } = await post('/generate-component', {
      explicit: '[toggle patient:.active]',
    });

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('component');
    expect(body).toHaveProperty('operations');
    expect(body).toHaveProperty('diagnostics');

    // Component shape
    const comp = body.component;
    expect(comp).toHaveProperty('name');
    expect(comp).toHaveProperty('code');
    expect(comp).toHaveProperty('hooks');
    expect(comp).toHaveProperty('framework');
    expect(Array.isArray(comp.hooks)).toBe(true);
  });
});
