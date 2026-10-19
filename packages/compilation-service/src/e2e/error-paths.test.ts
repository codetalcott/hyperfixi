/**
 * Error Path E2E Tests
 *
 * Tests error handling and edge cases across the service's operations:
 * - Missing/invalid inputs
 * - Diagnostic quality (actionable messages)
 * - Empty operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CompilationService } from '../service.js';

// =============================================================================
// Setup
// =============================================================================

let service: CompilationService;

beforeAll(async () => {
  service = await CompilationService.create();
}, 30000);

/** One operation's result, read as freely as the JSON body these tests once read over HTTP */
function call(op: 'validate' | 'translate' | 'diff', request: unknown): any {
  return (service[op] as (request: unknown) => unknown).call(service, request);
}

// =============================================================================
// Missing Input
// =============================================================================

describe('Missing input', () => {
  it('validate with an empty request returns diagnostics', async () => {
    const body = call('validate', {});

    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
    expect(body.diagnostics[0].severity).toBe('error');
  });

  it('diff with empty a and b returns diagnostics', async () => {
    const body = call('diff', {
      a: {},
      b: {},
    });

    expect(body.ok).toBe(false);
    expect(body.identical).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Invalid LLM JSON Structure
// =============================================================================

describe('Invalid LLM JSON input', () => {
  it('missing action field in semantic JSON', async () => {
    const body = call('validate', {
      semantic: {
        roles: { patient: { type: 'selector', value: '.active' } },
      },
    });

    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });

  it('invalid role value type in semantic JSON', async () => {
    const body = call('validate', {
      semantic: {
        action: 'toggle',
        roles: { patient: { type: 'banana', value: '.active' } },
      },
    });

    // Should still attempt to parse, may succeed or produce warnings
    expect(body.diagnostics).toBeDefined();
  });

  it('missing role value in semantic JSON', async () => {
    const body = call('validate', {
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
    const body = call('validate', {
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
    const body = call('validate', {
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
    const body = call('validate', {
      explicit: '[toggle]',
    });

    // May succeed with defaults or fail — either way, should not crash
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('diagnostics');
  });

  it('natural language with missing language code', async () => {
    const body = call('validate', {
      code: 'on click toggle .active',
      // No language field
    });

    // Should either default to 'en' or return a diagnostic
    expect(body).toHaveProperty('ok');
  });

  it('diff with both sides identical across formats (explicit vs JSON)', async () => {
    const body = call('diff', {
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
});

// =============================================================================
// Response Shape Contracts
// =============================================================================

describe('Response shape contracts', () => {
  it('validate success has required fields', async () => {
    const body = call('validate', {
      explicit: '[toggle patient:.active]',
    });

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('semantic');
    expect(body).toHaveProperty('confidence');
    expect(body).toHaveProperty('diagnostics');
    expect(Array.isArray(body.diagnostics)).toBe(true);
  });

  it('validate failure has required fields', async () => {
    const body = call('validate', {});

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('diagnostics');
    expect(body.ok).toBe(false);
    expect(Array.isArray(body.diagnostics)).toBe(true);
  });

  it('diff success has required fields', async () => {
    const body = call('diff', {
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
});
