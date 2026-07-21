/**
 * Tests for the current `on` feature API (TypedOnFeatureImplementation).
 *
 * The legacy on.test.ts is skipped because it targeted removed methods; this suite
 * drives the real surface: validate(), initialize() and the rich output API it
 * returns (events / execution / filtering / performance / errors), plus the DOM
 * listener path, dispose() and getPerformanceMetrics().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestElement } from '../test-setup';
import {
  TypedOnFeatureImplementation,
  createOnFeature,
  createOn,
  enhancedOnImplementation,
} from './on';

const cmd = (name: string, args?: unknown[]) => ({ name, args });

// The runtime validator does NOT apply schema .default()s, so every non-optional
// field must be supplied. These helpers build a schema-complete input; callers pass
// only the overrides they care about.
const fullEvent = (o: Record<string, unknown> = {}) => ({
  type: 'click',
  delegated: false,
  once: false,
  passive: false,
  capture: false,
  preventDefault: false,
  stopPropagation: false,
  every: false,
  ...o,
});
const baseInput = (
  event: Record<string, unknown> = {},
  commands: unknown[] = [cmd('log', ['hi'])],
  extra: Record<string, unknown> = {}
) => ({
  event: fullEvent(event),
  commands,
  context: { variables: {} },
  options: {
    enableErrorHandling: true,
    enableEventCapture: true,
    enableAsyncExecution: true,
    maxCommandCount: 100,
  },
  environment: 'frontend',
  debug: false,
  ...extra,
});

describe('on feature — TypedOnFeatureImplementation', () => {
  let feature: TypedOnFeatureImplementation;

  beforeEach(() => {
    feature = createOnFeature();
  });
  afterEach(() => {
    feature.dispose();
    vi.restoreAllMocks();
  });

  describe('validate()', () => {
    it('rejects non-object input', () => {
      expect(feature.validate(null).isValid).toBe(false);
      expect(feature.validate('nope').isValid).toBe(false);
    });

    it('accepts a valid click configuration', () => {
      const result = feature.validate(baseInput({ type: 'click' }));
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('flags an unknown DOM event type', () => {
      const result = feature.validate(baseInput({ type: 'notarealevent' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'event.type')).toBe(true);
    });

    it('accepts custom: and test-prefixed event types', () => {
      expect(feature.validate(baseInput({ type: 'custom:ping' })).isValid).toBe(true);
      expect(feature.validate(baseInput({ type: 'testSomething' })).isValid).toBe(true);
    });

    it("accepts target 'me'", () => {
      expect(feature.validate(baseInput({ type: 'click', target: 'me' })).isValid).toBe(true);
    });

    it('flags a malformed target selector', () => {
      const result = feature.validate(baseInput({ type: 'click', target: '<bad>' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'event.target')).toBe(true);
    });

    it('rejects using throttle and debounce together', () => {
      const result = feature.validate(baseInput({ type: 'click', throttle: 100, debounce: 100 }));
      expect(result.isValid).toBe(false);
    });

    it('rejects negative throttle/debounce delays', () => {
      expect(feature.validate(baseInput({ type: 'click', throttle: -1 })).isValid).toBe(false);
      expect(feature.validate(baseInput({ type: 'click', debounce: -1 })).isValid).toBe(false);
    });

    it('rejects an empty commands array', () => {
      const result = feature.validate(baseInput({}, []));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'commands')).toBe(true);
    });

    it('rejects too many commands past maxCommandCount', () => {
      const commands = Array.from({ length: 5 }, () => cmd('log'));
      const result = feature.validate(
        baseInput({}, commands, {
          options: {
            enableErrorHandling: true,
            enableEventCapture: true,
            enableAsyncExecution: true,
            maxCommandCount: 2,
          },
        })
      );
      expect(result.isValid).toBe(false);
    });

    it('flags a syntactically invalid filter expression', () => {
      const result = feature.validate(baseInput({ type: 'click', filter: 'return return' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'event.filter')).toBe(true);
    });

    it('returns a schema-validation error when required fields are missing', () => {
      const result = feature.validate({ commands: [cmd('log')] }); // no event
      expect(result.isValid).toBe(false);
    });
  });

  describe('initialize()', () => {
    it('returns a rich, ready output for a valid config', async () => {
      const result = await feature.initialize(baseInput({ type: 'click' }));
      expect(result.success).toBe(true);
      const out = result.value;
      expect(out.category).toBe('Frontend');
      expect(out.state).toBe('ready');
      expect(out.capabilities).toContain('event-listening');
      expect(out.events).toBeTruthy();
      expect(out.execution).toBeTruthy();
      expect(out.filtering).toBeTruthy();
      expect(out.performance).toBeTruthy();
      expect(out.errors).toBeTruthy();
    });

    it('fails with a ValidationError for an invalid config', async () => {
      const result = await feature.initialize(baseInput({ type: 'notarealevent' }));
      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('ValidationError');
    });

    it('registers the initial listener when event + commands are provided', async () => {
      const result = await feature.initialize(baseInput({ type: 'click', target: 'me' }));
      expect(result.success).toBe(true);
      expect(result.value.events.getListeners()).toHaveLength(1);
    });
  });

  describe('output.events API', () => {
    it('registers, filters, pauses/resumes and unlistens', async () => {
      const { value: out } = await feature.initialize(baseInput({ type: 'click' }));
      const listener = await out.events.listen({ type: 'keydown', commands: [cmd('log')] });

      expect(out.events.getListeners('keydown')).toHaveLength(1);
      expect(out.events.getListeners()).toHaveLength(2); // click (initial) + keydown

      expect(out.events.pauseListener(listener.id)).toBe(true);
      expect(out.events.resumeListener(listener.id)).toBe(true);
      expect(out.events.pauseListener('missing')).toBe(false);

      expect(out.events.unlisten(listener.id)).toBe(true);
      expect(out.events.getListeners('keydown')).toHaveLength(0);
    });

    it('trigger() dispatches a CustomEvent without throwing', async () => {
      const { value: out } = await feature.initialize(baseInput({ type: 'click' }));
      const spy = vi.fn();
      document.addEventListener('my-custom', spy);
      out.events.trigger('my-custom', { a: 1 });
      expect(spy).toHaveBeenCalledOnce();
      document.removeEventListener('my-custom', spy);
    });
  });

  describe('output.filtering API', () => {
    it('adds, lists, tests and removes filters', async () => {
      const { value: out } = await feature.initialize(baseInput({ type: 'click' }));
      expect(out.filtering.addFilter('positive', 'event.detail > 0')).toBe(true);
      expect(out.filtering.getFilters()).toHaveLength(1);
      expect(out.filtering.testFilter('positive', { detail: 5 } as unknown as Event)).toBe(true);
      expect(out.filtering.testFilter('positive', { detail: -5 } as unknown as Event)).toBe(false);
      expect(out.filtering.testFilter('missing', {} as Event)).toBe(false);
      expect(out.filtering.removeFilter('positive')).toBe(true);
      expect(out.filtering.getFilters()).toHaveLength(0);
    });

    it('returns false when adding an un-compilable filter expression', async () => {
      const { value: out } = await feature.initialize(baseInput({ type: 'click' }));
      expect(out.filtering.addFilter('bad', 'return return')).toBe(false);
    });
  });

  describe('output.performance API', () => {
    it('exposes throttle/debounce controllers and delay setters', async () => {
      const { value: out } = await feature.initialize(baseInput({ type: 'click', target: 'me' }));
      expect(out.performance.throttle('x', 10)).toBe(true);
      expect(out.performance.debounce('x', 10)).toBe(true);
      // no such listener id -> false
      expect(out.performance.setThrottleDelay('missing', 10)).toBe(false);
      expect(out.performance.setDebounceDelay('missing', 10)).toBe(false);
      // a real listener id -> true
      const id = out.events.getListeners()[0].id;
      expect(out.performance.setThrottleDelay(id, 25)).toBe(true);
      expect(out.performance.setDebounceDelay(id, 25)).toBe(true);
    });
  });

  describe('output.errors API', () => {
    it('records, lists and clears error history', async () => {
      const { value: out } = await feature.initialize(baseInput({ type: 'click' }));
      expect(await out.errors.handle(new Error('boom'), { where: 'test' })).toBe(true);
      expect(out.errors.getErrorHistory()).toHaveLength(1);
      expect(out.errors.getErrorHistory(1)).toHaveLength(1);
      expect(out.errors.setErrorHandler(() => {})).toBe(true);
      expect(out.errors.clearErrors()).toBe(true);
      expect(out.errors.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('output.execution API (executeBasicCommand branches)', () => {
    let out: any;
    beforeEach(async () => {
      out = (await feature.initialize(baseInput({ type: 'click' }))).value;
    });

    it('runs log/alert/default commands and reports the count', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // happy-dom has no window.alert; provide one so the alert branch is exercised.
      const alertSpy = vi.fn();
      vi.stubGlobal('alert', alertSpy);
      try {
        const result = await out.execution.execute(
          [cmd('log', ['a']), cmd('alert', ['b']), cmd('unknown')],
          {}
        );
        expect(result.success).toBe(true);
        expect(result.executed).toBe(3);
        expect(logSpy).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('hide/show mutate the element style', async () => {
      const el = createTestElement('<div></div>');
      await out.execution.execute([cmd('hide')], { me: el });
      expect(el.style.display).toBe('none');
      await out.execution.execute([cmd('show')], { me: el });
      expect(el.style.display).toBe('');
    });

    it('records and clears execution history', async () => {
      await out.execution.executeAsync([cmd('log')], {});
      // execute() itself does not push history; the DOM handler does. History
      // starts empty and clearHistory always succeeds.
      expect(Array.isArray(out.execution.getExecutionHistory())).toBe(true);
      expect(out.execution.clearHistory()).toBe(true);
    });
  });

  describe('DOM listener path', () => {
    it('runs the handler and records an execution when the event fires', async () => {
      const el = createTestElement('<div></div>');
      const result = await feature.initialize(
        baseInput({ target: 'me' }, [cmd('hide')], { context: { variables: {}, me: el } })
      );
      expect(result.success).toBe(true);
      expect(el.style.display).not.toBe('none');

      el.dispatchEvent(new Event('click'));

      await vi.waitFor(() => {
        expect(feature.getPerformanceMetrics().totalExecutions).toBeGreaterThan(0);
      });
      expect(el.style.display).toBe('none');
    });

    it('does not run a paused listener', async () => {
      const el = createTestElement('<div></div>');
      const { value: out } = await feature.initialize(
        baseInput({ target: 'me' }, [cmd('hide')], { context: { variables: {}, me: el } })
      );
      const id = out.events.getListeners()[0].id;
      out.events.pauseListener(id);
      el.dispatchEvent(new Event('click'));
      await new Promise(r => setTimeout(r, 5));
      expect(el.style.display).not.toBe('none');
    });
  });

  describe('lifecycle & metrics', () => {
    it('getPerformanceMetrics() reflects initializations', async () => {
      await feature.initialize(baseInput({ type: 'click' }));
      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(1);
      expect(metrics.successRate).toBeGreaterThan(0);
    });

    it('dispose() clears listeners and filters', async () => {
      const { value: out } = await feature.initialize(baseInput({ type: 'click', target: 'me' }));
      out.filtering.addFilter('f', 'true');
      expect(out.events.getListeners().length).toBeGreaterThan(0);
      feature.dispose();
      expect(out.events.getListeners()).toHaveLength(0);
      expect(out.filtering.getFilters()).toHaveLength(0);
    });
  });

  describe('exported helpers', () => {
    it('createOnFeature() returns a fresh instance', () => {
      expect(createOnFeature()).toBeInstanceOf(TypedOnFeatureImplementation);
      expect(createOnFeature()).not.toBe(createOnFeature());
    });

    it('createOn() builds a full input and initializes', async () => {
      const result = await createOn({ type: 'click' }, [cmd('log')]);
      expect(result.success).toBe(true);
      expect(result.value.state).toBe('ready');
    });

    it('exposes a shared enhancedOnImplementation instance', () => {
      expect(enhancedOnImplementation).toBeInstanceOf(TypedOnFeatureImplementation);
    });
  });
});
