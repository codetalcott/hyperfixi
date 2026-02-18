/**
 * Svelte 5 Component Renderer Tests
 *
 * Unit tests for SvelteRenderer + integration tests via CompilationService.generateComponent().
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SvelteRenderer } from './svelte.js';
import { CompilationService } from '../service.js';
import type { BehaviorSpec } from '../operations/types.js';

// =============================================================================
// SvelteRenderer Unit Tests
// =============================================================================

describe('SvelteRenderer', () => {
  const renderer = new SvelteRenderer();

  it('has framework = svelte', () => {
    expect(renderer.framework).toBe('svelte');
  });

  // --- Class operations ---

  it('generates toggleClass with $state', () => {
    const spec = makeSpec([
      { op: 'toggleClass', className: 'active', target: { kind: 'selector', value: '#btn' } },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('$state(false)');
    expect(result.code).toContain('hasActive = !hasActive');
    expect(result.hooks).toContain('$state');
  });

  it('generates addClass with direct assignment true', () => {
    const spec = makeSpec([
      { op: 'addClass', className: 'highlight', target: { kind: 'selector', value: '#panel' } },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('$state(false)');
    expect(result.code).toContain('= true');
  });

  it('generates removeClass with direct assignment false', () => {
    const spec = makeSpec([{ op: 'removeClass', className: 'loading', target: { kind: 'self' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('$state(true)');
    expect(result.code).toContain('= false');
  });

  // --- Visibility ---

  it('generates show with $state', () => {
    const spec = makeSpec([{ op: 'show', target: { kind: 'selector', value: '#modal' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('$state(');
    expect(result.code).toContain('= true');
  });

  it('generates hide with {#if} block', () => {
    const spec = makeSpec([{ op: 'hide', target: { kind: 'selector', value: '#modal' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('$state(true)');
    expect(result.code).toContain('= false');
    expect(result.code).toContain('{#if');
    expect(result.code).toContain('{/if}');
  });

  // --- Content ---

  it('generates setContent with direct assignment', () => {
    const spec = makeSpec([
      {
        op: 'setContent',
        content: 'hello world',
        target: { kind: 'selector', value: '#output' },
        position: 'into' as const,
      },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain("$state('')");
    expect(result.code).toContain('hello world');
    expect(result.code).toContain('{');
  });

  it('generates appendContent with += operator', () => {
    const spec = makeSpec([
      {
        op: 'appendContent',
        content: ' more',
        target: { kind: 'selector', value: '#output' },
      },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain("+= ' more'");
  });

  // --- Numeric ---

  it('generates increment with += operator', () => {
    const spec = makeSpec([
      { op: 'increment', target: { kind: 'selector', value: '#count' }, amount: 1 },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('$state(0)');
    expect(result.code).toContain('+= 1');
  });

  it('generates decrement with -= operator', () => {
    const spec = makeSpec([
      { op: 'decrement', target: { kind: 'selector', value: '#count' }, amount: 1 },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('-= 1');
  });

  // --- Variables ---

  it('generates setVariable with $state', () => {
    const spec = makeSpec([
      { op: 'setVariable', name: 'score', value: '42', scope: 'local' as const },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('$state(42)');
    expect(result.code).toContain('= 42');
  });

  // --- Navigation ---

  it('generates navigate with window.location', () => {
    const spec = makeSpec([{ op: 'navigate', url: '/home' }]);

    const result = renderer.render(spec);
    expect(result.code).toContain("window.location.href = '/home'");
  });

  it('generates historyBack', () => {
    const spec = makeSpec([{ op: 'historyBack' }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('window.history.back()');
  });

  // --- Fetch ---

  it('generates fetch with async handler', () => {
    const spec: BehaviorSpec = {
      trigger: { event: 'click' },
      triggerTarget: { kind: 'self' },
      operations: [
        {
          op: 'fetch',
          url: '/api/data',
          format: 'json',
          target: { kind: 'selector', value: '#output' },
        },
      ],
      async: true,
    };

    const result = renderer.render(spec);
    expect(result.code).toContain('async function');
    expect(result.code).toContain("fetch('/api/data')");
    expect(result.code).toContain('response.json()');
  });

  // --- Focus / Blur ---

  it('generates focus with bind:this ref', () => {
    const spec = makeSpec([{ op: 'focus', target: { kind: 'selector', value: '#input' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('let inputRef');
    expect(result.code).toContain('bind:this={inputRef}');
    expect(result.code).toContain('inputRef?.focus()');
  });

  it('generates blur with bind:this ref', () => {
    const spec = makeSpec([{ op: 'blur', target: { kind: 'selector', value: '#input' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('inputRef?.blur()');
  });

  // --- Utility ---

  it('generates log with console.log', () => {
    const spec = makeSpec([{ op: 'log', values: ['clicked'] }]);

    const result = renderer.render(spec);
    expect(result.code).toContain("console.log('clicked')");
  });

  it('generates wait with setTimeout promise', () => {
    const spec = makeSpec([{ op: 'wait', durationMs: 500 }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('setTimeout(resolve, 500)');
  });

  it('generates triggerEvent with dispatchEvent', () => {
    const spec = makeSpec([
      { op: 'triggerEvent', eventName: 'custom-event', target: { kind: 'selector', value: '#el' } },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain("new CustomEvent('custom-event'");
    expect(result.code).toContain('dispatchEvent');
  });

  // --- Component naming ---

  it('auto-generates name from toggle operation', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec);
    expect(result.name).toBe('ToggleActive');
  });

  it('uses custom componentName when provided', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec, { componentName: 'MyButton' });
    expect(result.name).toBe('MyButton');
  });

  it('includes non-click event in name', () => {
    const spec: BehaviorSpec = {
      trigger: { event: 'mouseenter' },
      triggerTarget: { kind: 'self' },
      operations: [{ op: 'addClass', className: 'hover', target: { kind: 'self' } }],
      async: false,
    };

    const result = renderer.render(spec);
    expect(result.name).toContain('OnMouseenter');
  });

  // --- Svelte component structure ---

  it('generates valid Svelte component structure', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('<script lang="ts">');
    expect(result.code).toContain('</script>');
    expect(result.code).toContain('onclick={');
    expect(result.code).not.toContain('<template>');
    expect(result.framework).toBe('svelte');
  });

  it('uses class: directive for dynamic classes', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('class:active={hasActive}');
  });

  it('uses correct Svelte event for dblclick', () => {
    const spec: BehaviorSpec = {
      trigger: { event: 'dblclick' },
      triggerTarget: { kind: 'self' },
      operations: [{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }],
      async: false,
    };

    const result = renderer.render(spec);
    expect(result.code).toContain('ondblclick={');
  });

  it('uses onsubmit for submit events', () => {
    const spec: BehaviorSpec = {
      trigger: { event: 'submit' },
      triggerTarget: { kind: 'self' },
      operations: [{ op: 'navigate', url: '/success' }],
      async: false,
    };

    const result = renderer.render(spec);
    expect(result.code).toContain('<form');
    expect(result.code).toContain('onsubmit={');
  });

  // --- TypeScript option ---

  it('omits lang="ts" when typescript is false', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec, { typescript: false });
    expect(result.code).not.toContain('lang="ts"');
    expect(result.code).toContain('<script>');
  });

  it('includes HTMLElement type for refs when typescript is true', () => {
    const spec = makeSpec([{ op: 'focus', target: { kind: 'selector', value: '#input' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('let inputRef: HTMLElement');
  });

  it('omits type for refs when typescript is false', () => {
    const spec = makeSpec([{ op: 'focus', target: { kind: 'selector', value: '#input' } }]);

    const result = renderer.render(spec, { typescript: false });
    expect(result.code).toContain('let inputRef');
    expect(result.code).not.toContain(': HTMLElement');
  });

  // --- No imports needed ---

  it('has no import statements (Svelte runes need no imports)', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec);
    expect(result.code).not.toContain('import');
  });

  // --- Multiple operations ---

  it('handles multiple operations in one handler', () => {
    const spec = makeSpec([
      { op: 'addClass', className: 'loading', target: { kind: 'self' } },
      {
        op: 'fetch',
        url: '/api/data',
        format: 'json',
        target: { kind: 'selector', value: '#output' },
      },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('= true');
    expect(result.code).toContain("fetch('/api/data')");
    expect(result.operations).toHaveLength(2);
  });
});

// =============================================================================
// CompilationService.generateComponent() Integration Tests
// =============================================================================

describe('CompilationService.generateComponent() with Svelte', () => {
  let service: CompilationService;

  beforeAll(async () => {
    service = await CompilationService.create();
  }, 30000);

  it('generates Svelte component from explicit syntax', () => {
    const result = service.generateComponent({
      explicit: '[toggle patient:.active destination:#btn]',
      framework: 'svelte',
    });

    expect(result.ok).toBe(true);
    expect(result.component).toBeDefined();
    expect(result.component!.framework).toBe('svelte');
    expect(result.component!.code).toContain('$state');
    expect(result.component!.hooks).toContain('$state');
  });

  it('generates Svelte component from LLM JSON', () => {
    const result = service.generateComponent({
      semantic: {
        action: 'toggle',
        roles: {
          patient: { type: 'selector', value: '.active' },
          destination: { type: 'selector', value: '#btn' },
        },
        trigger: { event: 'click' },
      },
      framework: 'svelte',
    });

    expect(result.ok).toBe(true);
    expect(result.component).toBeDefined();
    expect(result.component!.code).toContain('onclick={');
    expect(result.component!.code).not.toContain('<template>');
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function makeSpec(
  operations: BehaviorSpec['operations'],
  overrides: Partial<BehaviorSpec> = {}
): BehaviorSpec {
  return {
    trigger: { event: 'click' },
    triggerTarget: { kind: 'self' },
    operations,
    async: false,
    ...overrides,
  };
}
