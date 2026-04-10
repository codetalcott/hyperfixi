/**
 * CompilationService end-to-end tests.
 *
 * Tests the full pipeline: input detection → normalization → validation → compilation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CompilationService } from './service.js';
import { detectFormat } from './input/detect.js';
import { SemanticCache, generateCacheKey } from './compile/cache.js';

// =============================================================================
// Input Detection (unit tests — no service needed)
// =============================================================================

describe('detectFormat', () => {
  it('detects explicit syntax', () => {
    expect(detectFormat('[toggle patient:.active]')).toBe('explicit');
    expect(detectFormat('  [add patient:.highlight destination:#btn]  ')).toBe('explicit');
  });

  it('detects LLM JSON', () => {
    expect(detectFormat('{"action":"toggle","roles":{}}')).toBe('json');
    expect(detectFormat('  { "action": "add" }  ')).toBe('json');
  });

  it('falls back to natural language', () => {
    expect(detectFormat('on click toggle .active')).toBe('natural');
    expect(detectFormat('toggle .active on #btn')).toBe('natural');
    expect(detectFormat('')).toBe('natural');
  });

  it('treats invalid JSON as natural language', () => {
    expect(detectFormat('{not valid json}')).toBe('natural');
    expect(detectFormat('{ "noAction": true }')).toBe('natural');
  });
});

// =============================================================================
// Cache (unit tests)
// =============================================================================

describe('SemanticCache', () => {
  it('stores and retrieves entries', () => {
    const cache = new SemanticCache(10);
    const response = { ok: true, diagnostics: [] };
    cache.set('key1', response as never);
    expect(cache.get('key1')).toBe(response);
    expect(cache.hits).toBe(1);
  });

  it('returns undefined for missing entries', () => {
    const cache = new SemanticCache(10);
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.misses).toBe(1);
  });

  it('evicts oldest entries when full', () => {
    const cache = new SemanticCache(2);
    cache.set('a', { ok: true, diagnostics: [] } as never);
    cache.set('b', { ok: true, diagnostics: [] } as never);
    cache.set('c', { ok: true, diagnostics: [] } as never);
    expect(cache.get('a')).toBeUndefined(); // Evicted
    expect(cache.get('b')).toBeDefined();
    expect(cache.get('c')).toBeDefined();
    expect(cache.size).toBe(2);
  });

  it('generates deterministic cache keys', () => {
    const node = {
      kind: 'command',
      action: 'toggle',
      roles: new Map([['patient', { type: 'selector', value: '.active' }]]),
    };
    const key1 = generateCacheKey(node, { optimization: 2 });
    const key2 = generateCacheKey(node, { optimization: 2 });
    expect(key1).toBe(key2);
  });
});

// =============================================================================
// Full Service Integration Tests
// =============================================================================

describe('CompilationService', () => {
  let service: CompilationService;

  beforeAll(async () => {
    service = await CompilationService.create();
  }, 30000);

  // ---------------------------------------------------------------------------
  // Natural Language Compilation
  // ---------------------------------------------------------------------------

  describe('natural language', () => {
    it('compiles English hyperscript', () => {
      const result = service.compile({
        code: 'on click toggle .active',
        language: 'en',
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
      expect(result.js).toContain('function');
      expect(result.semantic).toBeDefined();
      expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    });

    it('compiles Japanese hyperscript', () => {
      const result = service.compile({
        code: 'クリック で .active を 切り替え',
        language: 'ja',
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
      expect(result.semantic).toBeDefined();
    });

    it('compiles Spanish hyperscript', () => {
      const result = service.compile({
        code: 'al hacer clic alternar .active',
        language: 'es',
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
    });

    it('serializes property-path destination for set command', () => {
      const result = service.compile({
        code: 'on click set #output.innerHTML to "Hello!"',
        language: 'en',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic?.action).toBe('set');
      expect(result.semantic?.roles.destination).toEqual({
        type: 'property-path',
        value: '#output.innerHTML',
      });
      expect(result.semantic?.roles.patient).toEqual({
        type: 'literal',
        value: 'Hello!',
      });
    });

    it('compiles set with dotted me property (me.style.color)', () => {
      // The semantic parser may not resolve bare `me.prop` chains to property-path,
      // but compilation via the AST pipeline should still succeed.
      const result = service.compile({
        code: 'on click set me.style.color to "red"',
        language: 'en',
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
    });

    it('rejects low-confidence parses', () => {
      const result = service.compile({
        code: 'xyzzy blorp grunk',
        language: 'en',
        confidence: 0.9,
      });

      expect(result.ok).toBe(false);
      expect(
        result.diagnostics.some(
          d => d.code === 'LOW_CONFIDENCE' || d.code === 'PARSE_FAILED' || d.code === 'PARSE_ERROR'
        )
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Explicit Syntax Compilation
  // ---------------------------------------------------------------------------

  describe('explicit syntax', () => {
    it('compiles explicit toggle', () => {
      const result = service.compile({
        explicit: '[toggle patient:.active]',
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
      expect(result.confidence).toBe(1.0);
      expect(result.semantic?.action).toBe('toggle');
    });

    it('compiles explicit with destination', () => {
      const result = service.compile({
        explicit: '[add patient:.highlight destination:#button]',
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
    });

    it('rejects malformed explicit syntax', () => {
      const result = service.compile({
        explicit: '[not valid explicit',
      });

      expect(result.ok).toBe(false);
      expect(result.diagnostics.some(d => d.severity === 'error')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // LLM JSON Compilation
  // ---------------------------------------------------------------------------

  describe('LLM JSON', () => {
    it('compiles semantic JSON', () => {
      const result = service.compile({
        semantic: {
          action: 'toggle',
          roles: {
            patient: { type: 'selector', value: '.active' },
          },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
      expect(result.confidence).toBe(1.0);
    });

    it('compiles JSON with event trigger', () => {
      const result = service.compile({
        semantic: {
          action: 'toggle',
          roles: {
            patient: { type: 'selector', value: '.active' },
            destination: { type: 'selector', value: '#btn' },
          },
          trigger: { event: 'click' },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
      expect(result.semantic?.trigger?.event).toBe('click');
    });

    it('rejects invalid JSON structure', () => {
      const result = service.compile({
        semantic: {
          action: '',
          roles: {},
        },
      });

      expect(result.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-detected JSON in code field
  // ---------------------------------------------------------------------------

  describe('auto-detection', () => {
    it('detects JSON in code field', () => {
      const result = service.compile({
        code: '{"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}}}',
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
    });

    it('detects explicit syntax in code field', () => {
      const result = service.compile({
        code: '[toggle patient:.active]',
      });

      expect(result.ok).toBe(true);
      expect(result.js).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Validation Only
  // ---------------------------------------------------------------------------

  describe('validate()', () => {
    it('validates without compiling', () => {
      const result = service.validate({
        explicit: '[toggle patient:.active]',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic).toBeDefined();
      expect(result.semantic?.action).toBe('toggle');
    });

    it('returns errors for invalid input', () => {
      const result = service.validate({
        code: '',
      });

      expect(result.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Translation
  // ---------------------------------------------------------------------------

  describe('translate()', () => {
    it('translates between languages', () => {
      const result = service.translate({
        code: 'toggle .active',
        from: 'en',
        to: 'es',
      });

      expect(result.ok).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code).not.toBe('toggle .active');
    });
  });

  // ---------------------------------------------------------------------------
  // Caching
  // ---------------------------------------------------------------------------

  describe('caching', () => {
    it('caches compilation results', () => {
      // First call
      const result1 = service.compile({
        explicit: '[remove patient:.loading]',
      });
      expect(result1.ok).toBe(true);

      // Second call — should be cached
      const result2 = service.compile({
        explicit: '[remove patient:.loading]',
      });
      expect(result2.ok).toBe(true);
      expect(result2.js).toBe(result1.js);

      const stats = service.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('cache can be cleared', () => {
      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Error Cases
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('handles no input', () => {
      const result = service.compile({});
      expect(result.ok).toBe(false);
      expect(result.diagnostics.some(d => d.code === 'NO_INPUT')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Pluggable Renderers
  // ---------------------------------------------------------------------------

  describe('pluggable renderers', () => {
    it('uses default playwright renderer for generateTests()', () => {
      const result = service.generateTests({
        explicit: '[toggle patient:.active]',
      });
      expect(result.ok).toBe(true);
      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].framework).toBe('playwright');
    });

    it('uses default react renderer for generateComponent()', () => {
      const result = service.generateComponent({
        explicit: '[toggle patient:.active]',
      });
      expect(result.ok).toBe(true);
      expect(result.component?.framework).toBe('react');
    });

    it('returns error for unknown test framework', () => {
      const result = service.generateTests({
        explicit: '[toggle patient:.active]',
        framework: 'vitest',
      });
      expect(result.ok).toBe(false);
      expect(result.diagnostics.some(d => d.code === 'UNKNOWN_FRAMEWORK')).toBe(true);
    });

    it('returns error for unknown component framework', () => {
      const result = service.generateComponent({
        explicit: '[toggle patient:.active]',
        framework: 'angular',
      });
      expect(result.ok).toBe(false);
      expect(result.diagnostics.some(d => d.code === 'UNKNOWN_FRAMEWORK')).toBe(true);
    });

    it('uses default vue renderer for generateComponent()', () => {
      const result = service.generateComponent({
        explicit: '[toggle patient:.active]',
        framework: 'vue',
      });
      expect(result.ok).toBe(true);
      expect(result.component?.framework).toBe('vue');
    });

    it('uses default svelte renderer for generateComponent()', () => {
      const result = service.generateComponent({
        explicit: '[toggle patient:.active]',
        framework: 'svelte',
      });
      expect(result.ok).toBe(true);
      expect(result.component?.framework).toBe('svelte');
    });

    it('accepts custom test renderer via registerTestRenderer()', () => {
      const mockRenderer = {
        framework: 'mock-test',
        render: () => ({
          name: 'mock test',
          code: '// mock test code',
          html: '<div></div>',
          framework: 'mock-test',
          operations: [],
        }),
      };

      service.registerTestRenderer('mock-test', mockRenderer);
      const result = service.generateTests({
        explicit: '[toggle patient:.active]',
        framework: 'mock-test',
      });

      expect(result.ok).toBe(true);
      expect(result.tests[0].framework).toBe('mock-test');
      expect(result.tests[0].code).toBe('// mock test code');
    });

    it('accepts custom component renderer via registerComponentRenderer()', () => {
      const mockRenderer = {
        framework: 'mock-component',
        render: () => ({
          name: 'MockComponent',
          code: '// mock component code',
          framework: 'mock-component',
          operations: [],
          hooks: [],
        }),
      };

      service.registerComponentRenderer('mock-component', mockRenderer);
      const result = service.generateComponent({
        explicit: '[toggle patient:.active]',
        framework: 'mock-component',
      });

      expect(result.ok).toBe(true);
      expect(result.component?.framework).toBe('mock-component');
      expect(result.component?.code).toBe('// mock component code');
    });
  });
});

// =============================================================================
// Custom Renderers via ServiceOptions
// =============================================================================

describe('CompilationService with custom renderers', () => {
  let service: CompilationService;

  beforeAll(async () => {
    service = await CompilationService.create({
      testRenderers: {
        custom: {
          framework: 'custom',
          render: () => ({
            name: 'custom test',
            code: '// custom renderer',
            html: '<div></div>',
            framework: 'custom',
            operations: [],
          }),
        },
      },
      componentRenderers: {
        vue: {
          framework: 'vue',
          render: () => ({
            name: 'VueComponent',
            code: '// vue component',
            framework: 'vue',
            operations: [],
            hooks: [],
          }),
        },
      },
    });
  }, 30000);

  it('uses custom test renderer from ServiceOptions', () => {
    const result = service.generateTests({
      explicit: '[toggle patient:.active]',
      framework: 'custom',
    });
    expect(result.ok).toBe(true);
    expect(result.tests[0].framework).toBe('custom');
  });

  it('uses custom component renderer from ServiceOptions', () => {
    const result = service.generateComponent({
      explicit: '[toggle patient:.active]',
      framework: 'vue',
    });
    expect(result.ok).toBe(true);
    expect(result.component?.framework).toBe('vue');
  });

  it('does not have default renderers when custom ones are provided', () => {
    const result = service.generateTests({
      explicit: '[toggle patient:.active]',
      framework: 'playwright',
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(d => d.code === 'UNKNOWN_FRAMEWORK')).toBe(true);
  });
});

// =============================================================================
// intent-element target (generates <lse-intent> HTML snippets)
// =============================================================================

describe('CompilationService — intent-element target', () => {
  let service: CompilationService;

  beforeAll(async () => {
    service = await CompilationService.create();
  }, 30000);

  it('emits trigger="load" for a bare command node', async () => {
    const result = await service.generate({
      lse: '[toggle patient:.active]',
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<lse-intent trigger="load">');
  });

  it('emits trigger="click" for an event-handler node (explicit syntax)', async () => {
    const result = await service.generate({
      lse: '[on event:click body:[toggle patient:.active]]',
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<lse-intent trigger="click">');
  });

  it('emits trigger="click" for a command with JSON trigger.event sugar', async () => {
    // Wire-format trigger sugar — fromProtocolJSON unwraps this into an
    // event-handler node, so the output should carry trigger="click".
    const json = JSON.stringify({
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
      trigger: { event: 'click' },
    });
    const result = await service.generate({
      lse: json,
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<lse-intent trigger="click">');
  });

  it('emits trigger="mouseenter" for a custom event name', async () => {
    const result = await service.generate({
      lse: '[on event:mouseenter body:[add patient:.hover]]',
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<lse-intent trigger="mouseenter">');
  });

  it('includes the task comment when provided', async () => {
    const result = await service.generate({
      lse: '[toggle patient:.active]',
      target: 'intent-element',
      task: 'Toggle the active class',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<!-- Task: Toggle the active class -->');
  });

  it('embeds the protocol JSON as an inline script child', async () => {
    const result = await service.generate({
      lse: '[toggle patient:.active]',
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<script type="application/lse+json">');
    expect(result.output).toContain('"action": "toggle"');
  });
});
