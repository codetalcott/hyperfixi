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

/** Wait for a CustomEvent, failing after `ms` milliseconds if it never fires. */
function waitForEvent(el: Element, type: string, ms = 1000): Promise<CustomEvent> {
  return Promise.race([
    new Promise<CustomEvent>(resolve =>
      el.addEventListener(type, e => resolve(e as CustomEvent), { once: true })
    ),
    new Promise<CustomEvent>((_, reject) =>
      setTimeout(() => reject(new Error(`"${type}" event not fired within ${ms}ms`)), ms)
    ),
  ]);
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

  it('loadFrom() throws for non-array response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ action: 'toggle' }), // object, not array
    } as unknown as Response);
    await expect(intentRegistry.loadFrom('http://example.com/schemas.json')).rejects.toThrow(
      'Expected array'
    );
  });

  it('loadFrom() throws for schema missing action field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ roles: [] }], // missing action
    } as unknown as Response);
    await expect(intentRegistry.loadFrom('http://example.com/schemas.json')).rejects.toThrow(
      'missing required fields'
    );
  });

  it('loadFrom() throws for HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as unknown as Response);
    await expect(intentRegistry.loadFrom('http://example.com/schemas.json')).rejects.toThrow('404');
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

  it('diagnostics getter returns a copy (external mutation does not affect element)', async () => {
    delete (globalThis as Record<string, unknown>)['hyperfixi'];
    const el = makeElement(VALID_JSON);
    const validated = waitForEvent(el, 'lse:validated');
    document.body.appendChild(el);
    await validated;
    await new Promise(r => setTimeout(r, 20));
    const copy = el.diagnostics as IRDiagnostic[];
    const originalLength = copy.length;
    // Mutate the returned array — internal state must not change
    (copy as IRDiagnostic[]).push({ severity: 'error', code: 'FAKE', message: 'injected' });
    expect(el.diagnostics).toHaveLength(originalLength);
    document.body.removeChild(el);
  });

  it('does nothing when disabled attribute is set', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('disabled', '');
    const events: Event[] = [];
    el.addEventListener('lse:validated', e => events.push(e));
    el.addEventListener('lse:error', e => events.push(e));
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));
    expect(events).toHaveLength(0);
    document.body.removeChild(el);
  });

  it('uses 5000ms default when timeout attribute is empty string', async () => {
    // We can't directly test the timeout value, but we can confirm initialization
    // succeeds (doesn't immediately time out) with timeout=""
    (globalThis as Record<string, unknown>)['hyperfixi'] = {
      evalLSENode: vi.fn().mockResolvedValue('ok'),
    };
    const el = makeElement(VALID_JSON);
    el.setAttribute('timeout', '');
    const executed = waitForEvent(el, 'lse:executed');
    document.body.appendChild(el);
    // If timeout were 0ms this would fire lse:error instead
    const event = await executed;
    expect(event.detail.result).toBe('ok');
    document.body.removeChild(el);
    delete (globalThis as Record<string, unknown>)['hyperfixi'];
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

  it('adds warning diagnostic for role with unexpected type', async () => {
    intentRegistry.register({
      action: 'toggle',
      roles: [
        { role: 'patient', required: true, expectedTypes: ['selector'], description: 'target' },
      ],
      description: 'toggle',
      primaryRole: 'patient',
      category: 'dom',
    });

    // patient is present but as a literal, not a selector
    const el = makeElement(
      JSON.stringify({ action: 'toggle', roles: { patient: { type: 'literal', value: 'foo' } } })
    );
    const validated = waitForEvent(el, 'lse:validated');
    document.body.appendChild(el);
    const event = await validated;
    const typeDiag = event.detail.diagnostics.find(
      (d: { code: string }) => d.code === 'UNEXPECTED_ROLE_TYPE'
    );
    expect(typeDiag).toBeDefined();
    document.body.removeChild(el);
  });
});

// ─── LSEIntentElement — execution ────────────────────────────────────────────

describe('LSEIntentElement — execution', () => {
  beforeEach(() => {
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

  it('does not use _hyperscript fallback — only window.hyperfixi is supported', async () => {
    delete (globalThis as Record<string, unknown>)['hyperfixi'];
    (globalThis as Record<string, unknown>)['_hyperscript'] = {
      evalLSENode: vi.fn().mockResolvedValue('should-not-run'),
    };
    const el = makeElement(VALID_JSON);
    const validated = waitForEvent(el, 'lse:validated');
    document.body.appendChild(el);
    await validated;
    await new Promise(r => setTimeout(r, 20));
    // Should see NO_RUNTIME, not lse:executed
    expect(el.diagnostics.some(d => d.code === 'NO_RUNTIME')).toBe(true);
    delete (globalThis as Record<string, unknown>)['_hyperscript'];
    document.body.removeChild(el);
  });
});

// ─── Type helpers ─────────────────────────────────────────────────────────────

type IRDiagnostic = { severity: string; code: string; message: string };
