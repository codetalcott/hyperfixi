/**
 * Vue 3 Component Renderer Tests
 *
 * Unit tests for VueRenderer + integration tests via CompilationService.generateComponent().
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { VueRenderer } from './vue.js';
import { CompilationService } from '../service.js';
import type { BehaviorSpec } from '../operations/types.js';

// =============================================================================
// VueRenderer Unit Tests
// =============================================================================

describe('VueRenderer', () => {
  const renderer = new VueRenderer();

  it('has framework = vue', () => {
    expect(renderer.framework).toBe('vue');
  });

  // --- Class operations ---

  it('generates toggleClass with ref', () => {
    const spec = makeSpec([
      { op: 'toggleClass', className: 'active', target: { kind: 'selector', value: '#btn' } },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain("import { ref } from 'vue'");
    expect(result.code).toContain('ref<boolean>(false)');
    expect(result.code).toContain('hasActive.value = !hasActive.value');
    expect(result.hooks).toContain('ref');
  });

  it('generates addClass with ref set true', () => {
    const spec = makeSpec([
      { op: 'addClass', className: 'highlight', target: { kind: 'selector', value: '#panel' } },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('ref<boolean>(false)');
    expect(result.code).toContain('.value = true');
  });

  it('generates removeClass with ref set false', () => {
    const spec = makeSpec([{ op: 'removeClass', className: 'loading', target: { kind: 'self' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('ref<boolean>(true)');
    expect(result.code).toContain('.value = false');
  });

  // --- Visibility ---

  it('generates show with visibility ref', () => {
    const spec = makeSpec([{ op: 'show', target: { kind: 'selector', value: '#modal' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('ref<boolean>');
    expect(result.code).toContain('.value = true');
  });

  it('generates hide with v-if directive', () => {
    const spec = makeSpec([{ op: 'hide', target: { kind: 'selector', value: '#modal' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('ref<boolean>(true)');
    expect(result.code).toContain('.value = false');
    expect(result.code).toContain('v-if=');
  });

  // --- Content ---

  it('generates setContent with ref and interpolation', () => {
    const spec = makeSpec([
      {
        op: 'setContent',
        content: 'hello world',
        target: { kind: 'selector', value: '#output' },
        position: 'into' as const,
      },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain("ref<string>('')");
    expect(result.code).toContain('hello world');
    expect(result.code).toContain('{{ ');
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
    expect(result.code).toContain(".value += ' more'");
  });

  // --- Numeric ---

  it('generates increment with += operator', () => {
    const spec = makeSpec([
      { op: 'increment', target: { kind: 'selector', value: '#count' }, amount: 1 },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('ref<number>(0)');
    expect(result.code).toContain('.value += 1');
  });

  it('generates decrement with -= operator', () => {
    const spec = makeSpec([
      { op: 'decrement', target: { kind: 'selector', value: '#count' }, amount: 1 },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('.value -= 1');
  });

  // --- Variables ---

  it('generates setVariable with ref', () => {
    const spec = makeSpec([
      { op: 'setVariable', name: 'score', value: '42', scope: 'local' as const },
    ]);

    const result = renderer.render(spec);
    expect(result.code).toContain('ref<number>(42)');
    expect(result.code).toContain('.value = 42');
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

  it('generates focus with template ref', () => {
    const spec = makeSpec([{ op: 'focus', target: { kind: 'selector', value: '#input' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('ref<HTMLElement | null>(null)');
    expect(result.code).toContain('.value?.focus()');
    expect(result.hooks).toContain('ref');
  });

  it('generates blur with template ref', () => {
    const spec = makeSpec([{ op: 'blur', target: { kind: 'selector', value: '#input' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('.value?.blur()');
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

  // --- Vue SFC structure ---

  it('generates valid Vue SFC structure', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain('<script setup lang="ts">');
    expect(result.code).toContain('</script>');
    expect(result.code).toContain('<template>');
    expect(result.code).toContain('</template>');
    expect(result.code).toContain('@click=');
    expect(result.framework).toBe('vue');
  });

  it('uses :class binding for dynamic classes', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec);
    expect(result.code).toContain(':class=');
    expect(result.code).toContain('active: hasActive');
  });

  it('uses correct Vue event directive for dblclick', () => {
    const spec: BehaviorSpec = {
      trigger: { event: 'dblclick' },
      triggerTarget: { kind: 'self' },
      operations: [{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }],
      async: false,
    };

    const result = renderer.render(spec);
    expect(result.code).toContain('@dblclick=');
  });

  it('uses @submit for submit events', () => {
    const spec: BehaviorSpec = {
      trigger: { event: 'submit' },
      triggerTarget: { kind: 'self' },
      operations: [{ op: 'navigate', url: '/success' }],
      async: false,
    };

    const result = renderer.render(spec);
    expect(result.code).toContain('<form');
    expect(result.code).toContain('@submit=');
  });

  // --- TypeScript option ---

  it('omits lang="ts" when typescript is false', () => {
    const spec = makeSpec([{ op: 'toggleClass', className: 'active', target: { kind: 'self' } }]);

    const result = renderer.render(spec, { typescript: false });
    expect(result.code).not.toContain('lang="ts"');
    expect(result.code).toContain('<script setup>');
    // No type annotations
    expect(result.code).not.toContain('<boolean>');
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
    expect(result.code).toContain('.value = true');
    expect(result.code).toContain("fetch('/api/data')");
    expect(result.operations).toHaveLength(2);
  });
});

// =============================================================================
// CompilationService.generateComponent() Integration Tests
// =============================================================================

describe('CompilationService.generateComponent() with Vue', () => {
  let service: CompilationService;

  beforeAll(async () => {
    service = await CompilationService.create();
  }, 30000);

  it('generates Vue component from explicit syntax', () => {
    const result = service.generateComponent({
      explicit: '[toggle patient:.active destination:#btn]',
      framework: 'vue',
    });

    expect(result.ok).toBe(true);
    expect(result.component).toBeDefined();
    expect(result.component!.framework).toBe('vue');
    expect(result.component!.code).toContain('<script setup');
    expect(result.component!.code).toContain("from 'vue'");
    expect(result.component!.hooks).toContain('ref');
  });

  it('generates Vue component from LLM JSON', () => {
    const result = service.generateComponent({
      semantic: {
        action: 'toggle',
        roles: {
          patient: { type: 'selector', value: '.active' },
          destination: { type: 'selector', value: '#btn' },
        },
        trigger: { event: 'click' },
      },
      framework: 'vue',
    });

    expect(result.ok).toBe(true);
    expect(result.component).toBeDefined();
    expect(result.component!.code).toContain('@click=');
    expect(result.component!.code).toContain('<template>');
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
