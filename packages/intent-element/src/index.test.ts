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

// ─── LSEIntentElement — trigger modes ────────────────────────────────────────

describe('LSEIntentElement — trigger modes', () => {
  let evalMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    evalMock = vi.fn().mockResolvedValue('executed');
    (globalThis as Record<string, unknown>)['hyperfixi'] = { evalLSENode: evalMock };
  });

  it('trigger="load" (default) fires immediately on connect', async () => {
    const el = makeElement(VALID_JSON);
    const executed = waitForEvent(el, 'lse:executed');
    document.body.appendChild(el);
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it('trigger="manual" does NOT execute on connect', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'manual');
    const validated = waitForEvent(el, 'lse:validated');
    document.body.appendChild(el);
    await validated; // prepare phase completes
    await new Promise(r => setTimeout(r, 20));
    expect(evalMock).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('trigger="manual" executes via refresh()', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'manual');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    await el.refresh();
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it('trigger="click" wires a click listener and fires on click', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    el.click();
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it('trigger="click" with a nested trigger slot child bubbles up', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'click');
    const button = document.createElement('button');
    button.setAttribute('slot', 'trigger');
    button.textContent = 'Toggle';
    el.appendChild(button);

    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    button.click(); // click bubbles to the custom element
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it('trigger="click" fires every time the element is clicked', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');

    el.click();
    el.click();
    el.click();
    await new Promise(r => setTimeout(r, 30));
    expect(evalMock).toHaveBeenCalledTimes(3);
    document.body.removeChild(el);
  });

  it('trigger="submit" wires a submit listener on the ancestor form', async () => {
    const form = document.createElement('form');
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'submit');
    form.appendChild(el);
    document.body.appendChild(form);
    await waitForEvent(el, 'lse:validated');
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(form);
  });

  it('trigger="submit" calls preventDefault synchronously', async () => {
    const form = document.createElement('form');
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'submit');
    form.appendChild(el);
    document.body.appendChild(form);
    await waitForEvent(el, 'lse:validated');

    const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(submitEvent);
    expect(submitEvent.defaultPrevented).toBe(true);
    document.body.removeChild(form);
  });

  it('trigger="submit" emits a diagnostic warning when no ancestor form exists', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'submit');
    const validated = waitForEvent(el, 'lse:validated');
    document.body.appendChild(el);
    await validated;
    await new Promise(r => setTimeout(r, 20));
    expect(el.diagnostics.some(d => d.code === 'NO_ANCESTOR_FORM')).toBe(true);
    expect(evalMock).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('trigger="intersect" wires an IntersectionObserver', async () => {
    const observers: Array<{
      observe: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    let capturedCallback: IntersectionObserverCallback | null = null;
    class MockObserver {
      observe: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      constructor(cb: IntersectionObserverCallback) {
        capturedCallback = cb;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observers.push(this);
      }
    }
    const OriginalIO = globalThis.IntersectionObserver;
    (globalThis as unknown as { IntersectionObserver: typeof MockObserver }).IntersectionObserver =
      MockObserver;

    try {
      const el = makeElement(VALID_JSON);
      el.setAttribute('trigger', 'intersect');
      document.body.appendChild(el);
      await waitForEvent(el, 'lse:validated');
      expect(observers).toHaveLength(1);
      expect(observers[0].observe).toHaveBeenCalledWith(el);
      expect(evalMock).not.toHaveBeenCalled();

      // Simulate an intersection
      const executed = waitForEvent(el, 'lse:executed');
      capturedCallback!(
        [{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
        observers[0] as unknown as IntersectionObserver
      );
      await executed;
      expect(evalMock).toHaveBeenCalledTimes(1);
      // One-shot: observer should disconnect after firing
      expect(observers[0].disconnect).toHaveBeenCalled();
      document.body.removeChild(el);
    } finally {
      (globalThis as unknown as { IntersectionObserver: typeof OriginalIO }).IntersectionObserver =
        OriginalIO;
    }
  });

  it('trigger="intersect" emits a diagnostic warning when IntersectionObserver is unavailable', async () => {
    const OriginalIO = globalThis.IntersectionObserver;
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = undefined;
    try {
      const el = makeElement(VALID_JSON);
      el.setAttribute('trigger', 'intersect');
      const validated = waitForEvent(el, 'lse:validated');
      document.body.appendChild(el);
      await validated;
      await new Promise(r => setTimeout(r, 20));
      expect(el.diagnostics.some(d => d.code === 'NO_INTERSECTION_OBSERVER')).toBe(true);
      expect(evalMock).not.toHaveBeenCalled();
      document.body.removeChild(el);
    } finally {
      (globalThis as unknown as { IntersectionObserver: typeof OriginalIO }).IntersectionObserver =
        OriginalIO;
    }
  });

  it('arbitrary event name in trigger attribute wires addEventListener', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'mouseenter');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    el.dispatchEvent(new Event('mouseenter'));
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it('trigger attribute is case-insensitive', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'CLICK');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    el.click();
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it('auto-wires from JSON trigger.event sugar when attribute is absent', async () => {
    const json = JSON.stringify({
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
      trigger: { event: 'click' },
    });
    const el = makeElement(json);
    // No `trigger` attribute set — element must pick up the JSON sugar
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');
    // Wire-format trigger.event means: wrap in event-handler. The element
    // should NOT execute immediately; it should wire a click listener.
    await new Promise(r => setTimeout(r, 20));
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    el.click();
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it('trigger attribute takes precedence over JSON trigger.event sugar', async () => {
    const json = JSON.stringify({
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
      trigger: { event: 'click' },
    });
    const el = makeElement(json);
    el.setAttribute('trigger', 'load'); // attribute overrides JSON
    const executed = waitForEvent(el, 'lse:executed');
    document.body.appendChild(el);
    await executed;
    expect(evalMock).toHaveBeenCalledTimes(1); // fired on load, not on click
    document.body.removeChild(el);
  });

  it('disconnect removes the click listener', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');

    document.body.removeChild(el);
    // After disconnect, clicking should NOT trigger execution
    el.click();
    await new Promise(r => setTimeout(r, 20));
    expect(evalMock).not.toHaveBeenCalled();
  });

  it('disconnect disconnects the intersection observer', async () => {
    const observers: Array<{
      observe: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    class MockObserver {
      observe: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      constructor(_cb: IntersectionObserverCallback) {
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observers.push(this);
      }
    }
    const OriginalIO = globalThis.IntersectionObserver;
    (globalThis as unknown as { IntersectionObserver: typeof MockObserver }).IntersectionObserver =
      MockObserver;

    try {
      const el = makeElement(VALID_JSON);
      el.setAttribute('trigger', 'intersect');
      document.body.appendChild(el);
      await waitForEvent(el, 'lse:validated');
      expect(observers[0].disconnect).not.toHaveBeenCalled();

      document.body.removeChild(el);
      expect(observers[0].disconnect).toHaveBeenCalled();
    } finally {
      (globalThis as unknown as { IntersectionObserver: typeof OriginalIO }).IntersectionObserver =
        OriginalIO;
    }
  });

  it('changing the trigger attribute tears down the old wiring and wires the new one', async () => {
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');

    // Switch to manual: clicks should no longer fire
    el.setAttribute('trigger', 'manual');
    await waitForEvent(el, 'lse:validated');
    el.click();
    await new Promise(r => setTimeout(r, 20));
    expect(evalMock).not.toHaveBeenCalled();

    // refresh() still works in manual mode
    await el.refresh();
    expect(evalMock).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });
});

// ─── LSEIntentElement — event-handler unwrap ────────────────────────────────

describe('LSEIntentElement — event-handler unwrap', () => {
  let evalMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    evalMock = vi.fn().mockResolvedValue('executed');
    (globalThis as Record<string, unknown>)['hyperfixi'] = { evalLSENode: evalMock };
  });

  it('unwraps verbose event-handler form: body command is passed to evalLSENode, not the wrapper', async () => {
    // Verbose protocol form: kind:"event-handler" with body:[command{toggle}].
    // The element's own click listener provides the event wiring — the inner
    // event-handler metadata is redundant. _execute must unwrap the body and
    // pass the plain command node to evalLSENode, not the event-handler node.
    const verboseJson = JSON.stringify({
      kind: 'event-handler',
      action: 'on',
      roles: { event: { type: 'literal', value: 'click', dataType: 'string' } },
      body: [
        {
          kind: 'command',
          action: 'toggle',
          roles: { patient: { type: 'selector', value: '.active' } },
        },
      ],
    });

    const el = makeElement(verboseJson);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    el.click();
    await executed;

    expect(evalMock).toHaveBeenCalledTimes(1);
    const [passedNode] = evalMock.mock.calls[0];
    expect(passedNode.kind).toBe('command');
    expect(passedNode.action).toBe('toggle');
    document.body.removeChild(el);
  });

  it('unwraps compact trigger-sugar form: body command is passed to evalLSENode, not the wrapper', async () => {
    // Compact protocol form: {action, roles, trigger:{event}}. This is what
    // the compilation service now emits (Option A fix in @lokascript/intent).
    // fromProtocolJSON still deserializes it into an event-handler SemanticNode,
    // so _execute must unwrap it the same way as the verbose form above.
    const compactJson = JSON.stringify({
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
      trigger: { event: 'click' },
    });

    const el = makeElement(compactJson);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');
    expect(evalMock).not.toHaveBeenCalled();

    const executed = waitForEvent(el, 'lse:executed');
    el.click();
    await executed;

    expect(evalMock).toHaveBeenCalledTimes(1);
    const [passedNode] = evalMock.mock.calls[0];
    expect(passedNode.kind).toBe('command');
    expect(passedNode.action).toBe('toggle');
    document.body.removeChild(el);
  });

  it('passes bare command nodes to evalLSENode unchanged', async () => {
    // Regression guard: bare command JSON (no kind, no trigger) was the one
    // form that already worked pre-fix. Confirm the unwrap didn't break it.
    const el = makeElement(VALID_JSON);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');

    const executed = waitForEvent(el, 'lse:executed');
    el.click();
    await executed;

    expect(evalMock).toHaveBeenCalledTimes(1);
    const [passedNode] = evalMock.mock.calls[0];
    expect(passedNode.kind).toBe('command');
    expect(passedNode.action).toBe('toggle');
    document.body.removeChild(el);
  });

  it('unwraps multi-command bodies and executes each in sequence', async () => {
    // Verbose form with multiple body commands. Each should be executed
    // sequentially. The final lse:executed event carries the results array.
    const multiJson = JSON.stringify({
      kind: 'event-handler',
      action: 'on',
      roles: { event: { type: 'literal', value: 'click', dataType: 'string' } },
      body: [
        {
          kind: 'command',
          action: 'add',
          roles: { patient: { type: 'selector', value: '.loading' } },
        },
        {
          kind: 'command',
          action: 'remove',
          roles: { patient: { type: 'selector', value: '.done' } },
        },
      ],
    });

    let callIndex = 0;
    evalMock.mockImplementation(async () => `result-${callIndex++}`);

    const el = makeElement(multiJson);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');

    const executed = waitForEvent(el, 'lse:executed');
    el.click();
    const event = await executed;

    expect(evalMock).toHaveBeenCalledTimes(2);
    expect(evalMock.mock.calls[0][0].action).toBe('add');
    expect(evalMock.mock.calls[1][0].action).toBe('remove');
    expect(event.detail.results).toEqual(['result-0', 'result-1']);
    document.body.removeChild(el);
  });

  it('stops execution on first body command failure and emits lse:error', async () => {
    const multiJson = JSON.stringify({
      kind: 'event-handler',
      action: 'on',
      roles: { event: { type: 'literal', value: 'click', dataType: 'string' } },
      body: [
        { kind: 'command', action: 'add', roles: { patient: { type: 'selector', value: '.a' } } },
        { kind: 'command', action: 'fail', roles: {} },
        {
          kind: 'command',
          action: 'remove',
          roles: { patient: { type: 'selector', value: '.a' } },
        },
      ],
    });

    evalMock.mockImplementation(async (n: { action: string }) => {
      if (n.action === 'fail') throw new Error('boom');
      return 'ok';
    });

    const el = makeElement(multiJson);
    el.setAttribute('trigger', 'click');
    document.body.appendChild(el);
    await waitForEvent(el, 'lse:validated');

    const errored = waitForEvent(el, 'lse:error');
    el.click();
    await errored;

    // Should have executed the first two (add, fail) but not the third (remove)
    expect(evalMock).toHaveBeenCalledTimes(2);
    expect(evalMock.mock.calls[0][0].action).toBe('add');
    expect(evalMock.mock.calls[1][0].action).toBe('fail');
    expect(el.diagnostics.some(d => d.code === 'EXECUTION_ERROR')).toBe(true);
    document.body.removeChild(el);
  });
});

// ─── Type helpers ─────────────────────────────────────────────────────────────

type IRDiagnostic = { severity: string; code: string; message: string };
