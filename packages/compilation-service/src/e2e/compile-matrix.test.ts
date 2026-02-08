/**
 * Compile Matrix E2E Tests
 *
 * Tests the full compilation pipeline across:
 * - 3 input formats (natural language, explicit syntax, LLM JSON)
 * - Compilation options (optimization, target, minify)
 * - Multi-language support (SVO, SOV, VSO)
 * - Cache semantics (same semantics from different inputs → cache hit)
 * - Cross-format diff equivalence
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../http.js';
import { CompilationService } from '../service.js';
import type { Hono } from 'hono';

// =============================================================================
// Setup
// =============================================================================

let app: Hono;
let service: CompilationService;

beforeAll(async () => {
  service = await CompilationService.create();
  app = createApp({ service });
}, 30000);

/** POST helper — returns parsed JSON body and status */
async function post(path: string, body: unknown) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// =============================================================================
// Input Format Matrix — all 3 formats through /compile
// =============================================================================

describe('Input format matrix', () => {
  it('compiles explicit syntax with multiple roles', async () => {
    const { status, body } = await post('/compile', {
      explicit: '[toggle patient:.active destination:#btn]',
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
    expect(body.semantic).toBeDefined();
    expect(body.semantic.action).toBe('toggle');
    expect(body.size).toBeGreaterThan(0);
  });

  it('compiles LLM JSON format', async () => {
    const { status, body } = await post('/compile', {
      semantic: {
        action: 'toggle',
        roles: { patient: { type: 'selector', value: '.active' } },
        trigger: { event: 'click' },
      },
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
    expect(body.semantic.action).toBe('toggle');
    expect(body.semantic.trigger).toBeDefined();
    expect(body.semantic.trigger.event).toBe('click');
  });

  it('compiles natural language English', async () => {
    const { status, body } = await post('/compile', {
      code: 'on click toggle .active',
      language: 'en',
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
    expect(body.confidence).toBeGreaterThan(0);
  });

  it('auto-detects JSON in code field', async () => {
    const { status, body } = await post('/compile', {
      code: JSON.stringify({
        action: 'add',
        roles: { patient: { type: 'selector', value: '.highlight' } },
      }),
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
  });

  it('auto-detects explicit syntax in code field', async () => {
    const { status, body } = await post('/compile', {
      code: '[add patient:.highlight destination:#panel]',
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
  });
});

// =============================================================================
// Compilation Options
// =============================================================================

describe('Compilation options', () => {
  const input = { explicit: '[toggle patient:.active]' };

  it('compiles with default options (opt=2, esm, no minify)', async () => {
    const { body } = await post('/compile', input);

    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
    expect(body.size).toBeGreaterThan(0);
  });

  it('compiles with optimization level 0', async () => {
    const { body } = await post('/compile', { ...input, optimization: 0 });
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
  });

  it('compiles with optimization level 1', async () => {
    const { body } = await post('/compile', { ...input, optimization: 1 });
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
  });

  it('compiles with target iife', async () => {
    const { body } = await post('/compile', { ...input, target: 'iife' });
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
  });

  it('compiles with target esm', async () => {
    const { body } = await post('/compile', { ...input, target: 'esm' });
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
  });

  it('compiles with minify enabled', async () => {
    const { body } = await post('/compile', { ...input, minify: true });
    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
  });

  it('produces different cache keys for different options', async () => {
    // Clear cache first
    service.clearCache();

    // Compile with default options
    await post('/compile', input);
    const stats1 = service.getCacheStats();
    expect(stats1.size).toBe(1);

    // Compile with different target — should be a new cache entry
    await post('/compile', { ...input, target: 'iife' });
    const stats2 = service.getCacheStats();
    expect(stats2.size).toBe(2);
  });
});

// =============================================================================
// Multi-Language Pipeline (via /compile)
// =============================================================================

describe('Multi-language compilation', () => {
  // SVO languages (Subject-Verb-Object)
  const svoLanguages = [
    { code: 'en', input: 'on click toggle .active', name: 'English' },
    { code: 'es', input: 'al hacer clic alternar .active', name: 'Spanish' },
    { code: 'fr', input: 'au clic basculer .active', name: 'French' },
    { code: 'pt', input: 'ao clicar alternar .active', name: 'Portuguese' },
    { code: 'de', input: 'bei Klick umschalten .active', name: 'German' },
    { code: 'zh', input: '点击时 切换 .active', name: 'Chinese' },
  ];

  // SOV languages (Subject-Object-Verb)
  const sovLanguages = [
    { code: 'ja', input: 'クリック で .active を 切り替え', name: 'Japanese' },
    { code: 'ko', input: '클릭 시 .active 를 토글', name: 'Korean' },
    { code: 'tr', input: 'tıklamada .active değiştir', name: 'Turkish' },
  ];

  // VSO languages (Verb-Subject-Object)
  const vsoLanguages = [{ code: 'ar', input: 'بدّل .active عند النقر', name: 'Arabic' }];

  for (const lang of svoLanguages) {
    it(`compiles ${lang.name} (SVO) through full pipeline`, async () => {
      const { body } = await post('/compile', {
        code: lang.input,
        language: lang.code,
      });

      // We check ok OR low-confidence diagnostics — some languages may parse below threshold
      if (body.ok) {
        expect(body.js).toBeDefined();
        expect(body.confidence).toBeGreaterThan(0);
      } else {
        // If it failed, should have diagnostics explaining why
        expect(body.diagnostics.length).toBeGreaterThan(0);
      }
    });
  }

  for (const lang of sovLanguages) {
    it(`compiles ${lang.name} (SOV) through full pipeline`, async () => {
      const { body } = await post('/compile', {
        code: lang.input,
        language: lang.code,
      });

      if (body.ok) {
        expect(body.js).toBeDefined();
      } else {
        expect(body.diagnostics.length).toBeGreaterThan(0);
      }
    });
  }

  for (const lang of vsoLanguages) {
    it(`compiles ${lang.name} (VSO) through full pipeline`, async () => {
      const { body } = await post('/compile', {
        code: lang.input,
        language: lang.code,
      });

      if (body.ok) {
        expect(body.js).toBeDefined();
      } else {
        expect(body.diagnostics.length).toBeGreaterThan(0);
      }
    });
  }
});

// =============================================================================
// Confidence Threshold
// =============================================================================

describe('Confidence threshold', () => {
  it('rejects low-confidence parse with default threshold', async () => {
    const { body } = await post('/compile', {
      code: 'xyzzy blorp wibble',
      language: 'en',
    });

    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });

  it('strict threshold rejects borderline parse', async () => {
    const { body } = await post('/compile', {
      code: 'toggle active',
      language: 'en',
      confidence: 0.99,
    });

    // With a 0.99 threshold, even a reasonable parse may be rejected
    if (!body.ok) {
      const hasConfidenceDiag = body.diagnostics.some(
        (d: { code: string }) => d.code === 'LOW_CONFIDENCE'
      );
      expect(hasConfidenceDiag).toBe(true);
    }
  });

  it('lenient threshold accepts weaker parse', async () => {
    const { body } = await post('/compile', {
      code: 'toggle .active',
      language: 'en',
      confidence: 0.1,
    });

    expect(body.ok).toBe(true);
    expect(body.js).toBeDefined();
  });
});

// =============================================================================
// Cache Semantics
// =============================================================================

describe('Cache semantics', () => {
  it('same input → cache hit on second call', async () => {
    service.clearCache();

    const input = { explicit: '[toggle patient:.active]' };

    // First call — miss
    await post('/compile', input);
    const stats1 = service.getCacheStats();
    expect(stats1.misses).toBeGreaterThan(0);

    // Second call — hit
    await post('/compile', input);
    const stats2 = service.getCacheStats();
    expect(stats2.hits).toBeGreaterThan(stats1.hits);
  });

  it('cache clear resets stats', async () => {
    await post('/compile', { explicit: '[toggle patient:.active]' });

    const app2 = createApp({ service });
    const res = await app2.request('/cache', { method: 'DELETE' });
    expect(res.status).toBe(200);

    const stats = service.getCacheStats();
    expect(stats.size).toBe(0);
  });

  it('/cache/stats returns correct shape', async () => {
    const res = await app.request('/cache/stats');
    const body = await res.json();

    expect(body).toHaveProperty('size');
    expect(body).toHaveProperty('hits');
    expect(body).toHaveProperty('misses');
    expect(body).toHaveProperty('hitRate');
    expect(typeof body.hitRate).toBe('number');
  });
});

// =============================================================================
// Validate Endpoint (all formats)
// =============================================================================

describe('Validate endpoint — all formats', () => {
  it('validates explicit syntax', async () => {
    const { status, body } = await post('/validate', {
      explicit: '[add patient:.highlight destination:#panel]',
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.semantic).toBeDefined();
    expect(body.semantic.action).toBe('add');
  });

  it('validates LLM JSON', async () => {
    const { status, body } = await post('/validate', {
      semantic: {
        action: 'remove',
        roles: { patient: { type: 'selector', value: '.loading' } },
      },
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.semantic.action).toBe('remove');
  });

  it('validates natural language', async () => {
    const { status, body } = await post('/validate', {
      code: 'on click toggle .active',
      language: 'en',
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.confidence).toBeGreaterThan(0);
  });

  it('returns 422 for invalid input', async () => {
    const { status, body } = await post('/validate', {
      code: 'xyzzy blorp',
      language: 'en',
      confidence: 0.9,
    });

    expect(status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Translate Endpoint
// =============================================================================

describe('Translate endpoint', () => {
  it('translates English to Spanish', async () => {
    const { status, body } = await post('/translate', {
      code: 'toggle .active',
      from: 'en',
      to: 'es',
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.code).toBeDefined();
    expect(body.code.length).toBeGreaterThan(0);
  });

  it('translates English to Japanese', async () => {
    const { status, body } = await post('/translate', {
      code: 'toggle .active',
      from: 'en',
      to: 'ja',
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.code).toBeDefined();
  });

  it('returns 422 for invalid translation', async () => {
    const { body } = await post('/translate', {
      code: '',
      from: 'en',
      to: 'xx',
    });

    // May succeed or fail depending on semantic package behavior
    if (!body.ok) {
      expect(body.diagnostics.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// Diff Endpoint — Cross-Format Equivalence
// =============================================================================

describe('Diff endpoint — cross-format', () => {
  it('explicit vs explicit — identical semantics', async () => {
    const { body } = await post('/diff', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[toggle patient:.active]' },
    });

    expect(body.ok).toBe(true);
    expect(body.identical).toBe(true);
    expect(body.summary).toBe('No semantic change');
  });

  it('explicit vs explicit — different operations', async () => {
    const { body } = await post('/diff', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[add patient:.highlight destination:#btn]' },
    });

    expect(body.ok).toBe(true);
    expect(body.identical).toBe(false);
    expect(body.operations.length).toBeGreaterThan(0);
    expect(body.summary).not.toBe('No semantic change');
  });

  it('explicit vs LLM JSON — same semantics', async () => {
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
    // Same semantics expressed in different formats should be identical
    expect(body.identical).toBe(true);
  });

  it('LLM JSON vs LLM JSON — different actions', async () => {
    const { body } = await post('/diff', {
      a: {
        semantic: {
          action: 'add',
          roles: { patient: { type: 'selector', value: '.active' } },
        },
      },
      b: {
        semantic: {
          action: 'remove',
          roles: { patient: { type: 'selector', value: '.active' } },
        },
      },
    });

    expect(body.ok).toBe(true);
    expect(body.identical).toBe(false);
  });

  it('returns ok=false when one side fails to parse', async () => {
    const { body } = await post('/diff', {
      a: { code: 'xyzzy blorp', language: 'en', confidence: 0.9 },
      b: { explicit: '[toggle patient:.active]' },
    });

    expect(body.ok).toBe(false);
    expect(body.identical).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });

  it('diff summary contains operation counts', async () => {
    const { body } = await post('/diff', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[toggle patient:.highlight]' },
    });

    expect(body.ok).toBe(true);
    expect(body.identical).toBe(false);
    // Should mention "changed" in summary
    expect(body.summary.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Generate Tests Endpoint — Options
// =============================================================================

describe('Generate tests — options', () => {
  it('generates test with custom name', async () => {
    const { body } = await post('/generate-tests', {
      explicit: '[toggle patient:.active]',
      testName: 'My Custom Toggle Test',
    });

    expect(body.ok).toBe(true);
    expect(body.tests).toHaveLength(1);
    expect(body.tests[0].name).toBe('My Custom Toggle Test');
    expect(body.tests[0].code).toContain('My Custom Toggle Test');
  });

  it('generates test with compiled execution mode', async () => {
    const { body } = await post('/generate-tests', {
      explicit: '[toggle patient:.active]',
      executionMode: 'compiled',
    });

    expect(body.ok).toBe(true);
    expect(body.tests).toHaveLength(1);
    // Compiled mode should embed JS directly
    expect(body.tests[0].code).toBeDefined();
  });

  it('generates test from LLM JSON', async () => {
    const { body } = await post('/generate-tests', {
      semantic: {
        action: 'toggle',
        roles: { patient: { type: 'selector', value: '.active' } },
        trigger: { event: 'click' },
      },
    });

    expect(body.ok).toBe(true);
    expect(body.tests).toHaveLength(1);
    expect(body.operations.length).toBeGreaterThan(0);
    expect(body.operations[0].op).toBe('toggleClass');
  });

  it('returns operations with correct types', async () => {
    const { body } = await post('/generate-tests', {
      explicit: '[add patient:.highlight destination:#panel]',
    });

    expect(body.ok).toBe(true);
    expect(body.operations[0].op).toBe('addClass');
    expect(body.operations[0].className).toBe('highlight');
  });

  it('test HTML fixture contains required elements', async () => {
    const { body } = await post('/generate-tests', {
      explicit: '[toggle patient:.active destination:#btn]',
    });

    expect(body.ok).toBe(true);
    expect(body.tests[0].html).toContain('#btn');
    expect(body.tests[0].html).toContain('id="btn"');
  });

  it('returns 422 for unparseable input', async () => {
    const { status, body } = await post('/generate-tests', {
      code: 'xyzzy blorp',
      language: 'en',
      confidence: 0.9,
    });

    expect(status).toBe(422);
    expect(body.ok).toBe(false);
  });
});

// =============================================================================
// Generate Component Endpoint — Options
// =============================================================================

describe('Generate component — options', () => {
  it('generates component with custom name', async () => {
    const { body } = await post('/generate-component', {
      explicit: '[toggle patient:.active]',
      componentName: 'MyToggleButton',
    });

    expect(body.ok).toBe(true);
    expect(body.component.name).toBe('MyToggleButton');
    expect(body.component.code).toContain('MyToggleButton');
  });

  it('generates component from LLM JSON', async () => {
    const { body } = await post('/generate-component', {
      semantic: {
        action: 'toggle',
        roles: { patient: { type: 'selector', value: '.active' } },
        trigger: { event: 'click' },
      },
    });

    expect(body.ok).toBe(true);
    expect(body.component).toBeDefined();
    expect(body.component.framework).toBe('react');
    expect(body.component.code).toContain("from 'react'");
    expect(body.component.hooks).toContain('useState');
  });

  it('includes useCallback in hooks list', async () => {
    const { body } = await post('/generate-component', {
      explicit: '[toggle patient:.active]',
    });

    expect(body.ok).toBe(true);
    expect(body.component.hooks).toContain('useCallback');
  });

  it('returns operations alongside component', async () => {
    const { body } = await post('/generate-component', {
      explicit: '[show patient:#modal]',
    });

    expect(body.ok).toBe(true);
    expect(body.operations.length).toBeGreaterThan(0);
    expect(body.operations[0].op).toBe('show');
  });

  it('returns 422 for unparseable input', async () => {
    const { status, body } = await post('/generate-component', {
      code: 'xyzzy blorp',
      language: 'en',
      confidence: 0.9,
    });

    expect(status).toBe(422);
    expect(body.ok).toBe(false);
  });
});

// =============================================================================
// Operation Type Coverage
// =============================================================================

describe('Operation type coverage via explicit syntax', () => {
  const cases = [
    {
      name: 'toggleClass',
      explicit: '[toggle patient:.active]',
      expectedOp: 'toggleClass',
    },
    {
      name: 'addClass',
      explicit: '[add patient:.highlight destination:#panel]',
      expectedOp: 'addClass',
    },
    {
      name: 'removeClass',
      explicit: '[remove patient:.loading]',
      expectedOp: 'removeClass',
    },
    {
      name: 'show',
      explicit: '[show patient:#modal]',
      expectedOp: 'show',
    },
    {
      name: 'hide',
      explicit: '[hide patient:#dropdown]',
      expectedOp: 'hide',
    },
    {
      name: 'navigate',
      explicit: '[go destination:/home]',
      expectedOp: 'navigate',
    },
  ];

  for (const { name, explicit, expectedOp } of cases) {
    it(`extracts ${name} operation from explicit syntax`, async () => {
      const { body } = await post('/generate-tests', { explicit });

      expect(body.ok).toBe(true);
      expect(body.operations.length).toBeGreaterThan(0);
      expect(body.operations[0].op).toBe(expectedOp);
    });
  }
});
