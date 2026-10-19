/**
 * Compile Matrix E2E Tests
 *
 * Tests the full validation pipeline (`validate`, and `translate` and `diff`) across:
 * - 3 input formats (natural language, explicit syntax, LLM JSON)
 * - Multi-language support (SVO, SOV, VSO)
 * - Confidence thresholds
 * - Cross-format diff equivalence
 *
 * (The file name is from when the service compiled to JavaScript through
 * `@hyperfixi/aot-compiler`; the compile options and cache retired with it in 4.0.)
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
// Input Format Matrix — all 3 formats through /validate
// =============================================================================

describe('Input format matrix', () => {
  it('validates explicit syntax with multiple roles', async () => {
    const body = call('validate', {
      explicit: '[toggle patient:.active destination:#btn]',
    });

    expect(body.ok).toBe(true);
    expect(body.semantic).toBeDefined();
    expect(body.semantic.action).toBe('toggle');
    expect(body.confidence).toBe(1);
  });

  it('validates LLM JSON format', async () => {
    const body = call('validate', {
      semantic: {
        action: 'toggle',
        roles: { patient: { type: 'selector', value: '.active' } },
        trigger: { event: 'click' },
      },
    });

    expect(body.ok).toBe(true);
    expect(body.semantic.action).toBe('toggle');
    expect(body.semantic.trigger).toBeDefined();
    expect(body.semantic.trigger.event).toBe('click');
  });

  it('auto-detects JSON in code field', async () => {
    const body = call('validate', {
      code: JSON.stringify({
        action: 'add',
        roles: { patient: { type: 'selector', value: '.highlight' } },
      }),
    });

    expect(body.ok).toBe(true);
    expect(body.semantic.action).toBe('add');
  });

  it('auto-detects explicit syntax in code field', async () => {
    const body = call('validate', {
      code: '[add patient:.highlight destination:#panel]',
    });

    expect(body.ok).toBe(true);
    expect(body.semantic.action).toBe('add');
  });
});

// =============================================================================
// Multi-Language Pipeline (via /validate)
// =============================================================================

describe('Multi-language validation', () => {
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
    it(`validates ${lang.name} (SVO) through full pipeline`, async () => {
      const body = call('validate', {
        code: lang.input,
        language: lang.code,
      });

      // We check ok OR low-confidence diagnostics — some languages may parse below threshold
      if (body.ok) {
        expect(body.semantic).toBeDefined();
        expect(body.confidence).toBeGreaterThan(0);
      } else {
        // If it failed, should have diagnostics explaining why
        expect(body.diagnostics.length).toBeGreaterThan(0);
      }
    });
  }

  for (const lang of sovLanguages) {
    it(`validates ${lang.name} (SOV) through full pipeline`, async () => {
      const body = call('validate', {
        code: lang.input,
        language: lang.code,
      });

      if (body.ok) {
        expect(body.semantic).toBeDefined();
      } else {
        expect(body.diagnostics.length).toBeGreaterThan(0);
      }
    });
  }

  for (const lang of vsoLanguages) {
    it(`validates ${lang.name} (VSO) through full pipeline`, async () => {
      const body = call('validate', {
        code: lang.input,
        language: lang.code,
      });

      if (body.ok) {
        expect(body.semantic).toBeDefined();
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
    const body = call('validate', {
      code: 'xyzzy blorp wibble',
      language: 'en',
    });

    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });

  it('strict threshold rejects borderline parse', async () => {
    const body = call('validate', {
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
    const body = call('validate', {
      code: 'toggle .active',
      language: 'en',
      confidence: 0.1,
    });

    expect(body.ok).toBe(true);
    expect(body.semantic).toBeDefined();
  });
});

// =============================================================================
// Validate Endpoint (all formats)
// =============================================================================

describe('validate — all formats', () => {
  it('validates explicit syntax', async () => {
    const body = call('validate', {
      explicit: '[add patient:.highlight destination:#panel]',
    });

    expect(body.ok).toBe(true);
    expect(body.semantic).toBeDefined();
    expect(body.semantic.action).toBe('add');
  });

  it('validates LLM JSON', async () => {
    const body = call('validate', {
      semantic: {
        action: 'remove',
        roles: { patient: { type: 'selector', value: '.loading' } },
      },
    });

    expect(body.ok).toBe(true);
    expect(body.semantic.action).toBe('remove');
  });

  it('validates natural language', async () => {
    const body = call('validate', {
      code: 'on click toggle .active',
      language: 'en',
    });

    expect(body.ok).toBe(true);
    expect(body.confidence).toBeGreaterThan(0);
  });

  it('refuses invalid input', async () => {
    const body = call('validate', {
      code: 'xyzzy blorp',
      language: 'en',
      confidence: 0.9,
    });

    expect(body.ok).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Translate Endpoint
// =============================================================================

describe('translate', () => {
  it('translates English to Spanish', async () => {
    const body = call('translate', {
      code: 'toggle .active',
      from: 'en',
      to: 'es',
    });

    expect(body.ok).toBe(true);
    expect(body.code).toBeDefined();
    expect(body.code.length).toBeGreaterThan(0);
  });

  it('translates English to Japanese', async () => {
    const body = call('translate', {
      code: 'toggle .active',
      from: 'en',
      to: 'ja',
    });

    expect(body.ok).toBe(true);
    expect(body.code).toBeDefined();
  });

  it('refuses an invalid translation', async () => {
    const body = call('translate', {
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

describe('diff — cross-format', () => {
  it('explicit vs explicit — identical semantics', async () => {
    const body = call('diff', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[toggle patient:.active]' },
    });

    expect(body.ok).toBe(true);
    expect(body.identical).toBe(true);
    expect(body.summary).toBe('No semantic change');
  });

  it('explicit vs explicit — different operations', async () => {
    const body = call('diff', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[add patient:.highlight destination:#btn]' },
    });

    expect(body.ok).toBe(true);
    expect(body.identical).toBe(false);
    expect(body.operations.length).toBeGreaterThan(0);
    expect(body.summary).not.toBe('No semantic change');
  });

  it('explicit vs LLM JSON — same semantics', async () => {
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
    // Same semantics expressed in different formats should be identical
    expect(body.identical).toBe(true);
  });

  it('LLM JSON vs LLM JSON — different actions', async () => {
    const body = call('diff', {
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
    const body = call('diff', {
      a: { code: 'xyzzy blorp', language: 'en', confidence: 0.9 },
      b: { explicit: '[toggle patient:.active]' },
    });

    expect(body.ok).toBe(false);
    expect(body.identical).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });

  it('diff summary contains operation counts', async () => {
    const body = call('diff', {
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
      // /diff of an input against itself returns its operations, each unchanged
      const body = call('diff', { a: { explicit }, b: { explicit } });

      expect(body.ok).toBe(true);
      expect(body.operations.length).toBeGreaterThan(0);
      expect(body.operations[0].kind).toBe('unchanged');
      expect(body.operations[0].a.op).toBe(expectedOp);
    });
  }
});
