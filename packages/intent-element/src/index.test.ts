/**
 * Tests for @hyperfixi/intent-element
 *
 * Uses jsdom for DOM simulation. Execution tests stub window.hyperfixi.evalLSENode
 * so the suite runs without the full hyperfixi browser bundle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LSEIntentElement } from './lse-intent.js';
import { intentRegistry } from './schema-registry.js';
import { sandboxed } from './sandbox.js';

// Register the element for all tests
if (!customElements.get('lse-intent')) {
  customElements.define('lse-intent', LSEIntentElement);
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const VALID_JSON = JSON.stringify({
  action: 'toggle',
  roles: { patient: { type: 'selector', value: '.active' } },
});

function makeElement(inlineJson?: string): LSEIntentElement {
  const el = document.createElement('lse-intent') as LSEIntentElement;
  if (inlineJson !== undefined) {
    const script = document.createElement('script');
    script.type = 'application/lse+json';
    script.textContent = inlineJson;
    el.appendChild(script);
  }
  return el;
}

function waitForEvent(el: Element, type: string): Promise<CustomEvent> {
  return new Promise(resolve => {
    el.addEventListener(type, e => resolve(e as CustomEvent), { once: true });
  });
}

// ─── intentRegistry ──────────────────────────────────────────────────────────

describe('intentRegistry', () => {
  beforeEach(() => intentRegistry.clear());

  it('registers and retrieves a schema', () => {
    const schema = {
      action: 'toggle',
      roles: [],
      description: 'toggle',
      primaryRole: 'patient',
      category: 'dom',
    };
    intentRegistry.register(schema);
    expect(intentRegistry.get('toggle')).toBe(schema);
  });

  it('has() returns false for unregistered actions', () => {
    expect(intentRegistry.has('unknown')).toBe(false);
  });

  it('unregister removes a schema', () => {
    const schema = {
      action: 'add',
      roles: [],
      description: 'add',
      primaryRole: 'patient',
      category: 'dom',
    };
    intentRegistry.register(schema);
    intentRegistry.unregister('add');
    expect(intentRegistry.has('add')).toBe(false);
  });

  it('registerAll registers multiple schemas', () => {
    const s1 = {
      action: 'toggle',
      roles: [],
      description: 'toggle',
      primaryRole: 'patient',
      category: 'dom',
    };
    const s2 = {
      action: 'add',
      roles: [],
      description: 'add',
      primaryRole: 'patient',
      category: 'dom',
    };
    intentRegistry.registerAll([s1, s2]);
    expect(intentRegistry.size).toBe(2);
  });
});

// ─── sandboxed ───────────────────────────────────────────────────────────────

describe('sandboxed', () => {
  it('returns ok:true for a successful async function', async () => {
    const result = await sandboxed(async () => 42);
    expect(result.ok).toBe(true);
    expect(result.result).toBe(42);
  });

  it('returns ok:false with error for a thrown error', async () => {
    const result = await sandboxed(async () => {
      throw new Error('boom');
    });
    expect(result.ok).toBe(false);
    expect(result.error?.message).toBe('boom');
  });

  it('returns ok:false with timedOut:true after timeout', async () => {
    const result = await sandboxed(() => new Promise(resolve => setTimeout(resolve, 200)), 50);
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});

// ─── LSEIntentElement — validation ───────────────────────────────────────────

describe('LSEIntentElement — validation', () => {
  it('dispatches lse:validated for valid inline JSON', async () => {
    const el = makeElement(VALID_JSON);
    const validated = waitForEvent(el, 'lse:validated');
    document.body.appendChild(el);
    const event = await validated;
    expect(event.detail.node).toBeDefined();
    expect(event.detail.node.action).toBe('toggle');
    document.body.removeChild(el);
  });

  it('dispatches lse:error for invalid JSON syntax', async () => {
    const el = makeElement('{not valid json}');
    const errored = waitForEvent(el, 'lse:error');
    document.body.appendChild(el);
    const event = await errored;
    expect(event.detail.diagnostics.some((d: { code: string }) => d.code === 'INVALID_JSON')).toBe(
      true
    );
    document.body.removeChild(el);
  });

  it('dispatches lse:error for invalid protocol JSON (missing action)', async () => {
    const el = makeElement(JSON.stringify({ roles: {} }));
    const errored = waitForEvent(el, 'lse:error');
    document.body.appendChild(el);
    const event = await errored;
    expect(
      event.detail.diagnostics.some((d: { code: string }) => d.code === 'MISSING_ACTION')
    ).toBe(true);
    document.body.removeChild(el);
  });

  it('node getter returns null before connect', () => {
    const el = makeElement(VALID_JSON);
    expect(el.node).toBeNull();
  });

  it('diagnostics getter returns empty array before connect', () => {
    const el = makeElement(VALID_JSON);
    expect(el.diagnostics).toHaveLength(0);
  });

  it('does nothing when disabled attribute is set', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('disabled', '');
    const events: Event[] = [];
    el.addEventListener('lse:validated', e => events.push(e));
    el.addEventListener('lse:error', e => events.push(e));
    document.body.appendChild(el);
    // Give microtasks a chance to run
    await new Promise(r => setTimeout(r, 50));
    expect(events).toHaveLength(0);
    document.body.removeChild(el);
  });
});

// ─── LSEIntentElement — schema validation ─────────────────────────────────

describe('LSEIntentElement — schema validation', () => {
  beforeEach(() => intentRegistry.clear());

  it('adds schema diagnostics for missing required role', async () => {
    intentRegistry.register({
      action: 'toggle',
      roles: [
        { role: 'patient', required: true, expectedTypes: ['selector'], description: 'target' },
      ],
      description: 'toggle',
      primaryRole: 'patient',
      category: 'dom',
    });

    // JSON with no roles at all (passes wire validation, fails schema check)
    const el = makeElement(JSON.stringify({ action: 'toggle', roles: {} }));
    const validated = waitForEvent(el, 'lse:validated');
    document.body.appendChild(el);
    const event = await validated;
    const schemaDiag = event.detail.diagnostics.find(
      (d: { code: string }) => d.code === 'MISSING_REQUIRED_ROLE'
    );
    expect(schemaDiag).toBeDefined();
    document.body.removeChild(el);
  });
});

// ─── LSEIntentElement — execution ────────────────────────────────────────────

describe('LSEIntentElement — execution', () => {
  beforeEach(() => {
    // Stub window.hyperfixi with evalLSENode
    (globalThis as Record<string, unknown>)['hyperfixi'] = {
      evalLSENode: vi.fn().mockResolvedValue('executed'),
    };
  });

  it('calls evalLSENode and dispatches lse:executed', async () => {
    const el = makeElement(VALID_JSON);
    const executed = waitForEvent(el, 'lse:executed');
    document.body.appendChild(el);
    const event = await executed;
    expect(event.detail.result).toBe('executed');
    expect(event.detail.node.action).toBe('toggle');
    document.body.removeChild(el);
  });

  it('dispatches lse:error when evalLSENode throws', async () => {
    (globalThis as Record<string, unknown>)['hyperfixi'] = {
      evalLSENode: vi.fn().mockRejectedValue(new Error('runtime error')),
    };
    const el = makeElement(VALID_JSON);
    const errored = waitForEvent(el, 'lse:error');
    document.body.appendChild(el);
    const event = await errored;
    expect(
      event.detail.diagnostics.some((d: { code: string }) => d.code === 'EXECUTION_ERROR')
    ).toBe(true);
    document.body.removeChild(el);
  });

  it('dispatches lse:error when evalLSENode times out', async () => {
    (globalThis as Record<string, unknown>)['hyperfixi'] = {
      evalLSENode: vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500))),
    };
    const el = makeElement(VALID_JSON);
    el.setAttribute('timeout', '50');
    const errored = waitForEvent(el, 'lse:error');
    document.body.appendChild(el);
    const event = await errored;
    expect(
      event.detail.diagnostics.some((d: { code: string }) => d.code === 'EXECUTION_TIMEOUT')
    ).toBe(true);
    document.body.removeChild(el);
  });

  it('emits NO_RUNTIME warning when window.hyperfixi is absent', async () => {
    delete (globalThis as Record<string, unknown>)['hyperfixi'];
    const el = makeElement(VALID_JSON);
    const validated = waitForEvent(el, 'lse:validated');
    document.body.appendChild(el);
    await validated;
    await new Promise(r => setTimeout(r, 20));
    const hasWarning = el.diagnostics.some(d => d.code === 'NO_RUNTIME');
    expect(hasWarning).toBe(true);
    document.body.removeChild(el);
  });
});
