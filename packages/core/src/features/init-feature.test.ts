/**
 * Tests for the current `init` feature API (TypedInitFeatureImplementation).
 *
 * init-verification.test.ts is skipped (legacy). This suite drives the real
 * surface: validate(), initialize() and the returned API (elements / execution /
 * lifecycle / errors), plus command execution branches, dispose() and metrics.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestElement } from '../test-setup';
import {
  TypedInitFeatureImplementation,
  createInitFeature,
  createInit,
  enhancedInitImplementation,
} from './init';

const cmd = (name: string, args?: unknown[]) => ({ name, args });
const el = () => createTestElement('<div></div>');

// The runtime validator does not apply schema .default()s, so build fully-specified
// inputs (mirrors the exported createInit helper). Callers override per section.
const makeInput = (over: Record<string, any> = {}) => ({
  initialization: {
    target: 'target' in over ? over.target : el(),
    commands: over.commands ?? [cmd('log')],
    timing: { immediate: false, delay: 0, defer: false, ...over.timing },
    lifecycle: {
      runOnce: true,
      resetOnRemoval: false,
      propagateToChildren: false,
      ...over.lifecycle,
    },
  },
  execution: {
    parallel: false,
    stopOnError: true,
    timeout: 10000,
    retries: { enabled: false, maxAttempts: 3, delay: 1000 },
    ...over.execution,
  },
  errorHandling: {
    strategy: 'log',
    fallbackCommands: [],
    setAttribute: true,
    ...over.errorHandling,
  },
  context: { variables: {}, ...over.context },
  options: {
    enableDOMObserver: false,
    enablePerformanceTracking: true,
    enableEventEmission: true,
    maxConcurrentInits: 10,
    ...over.options,
  },
  environment: 'frontend',
  debug: false,
});

describe('init feature — TypedInitFeatureImplementation', () => {
  let feature: TypedInitFeatureImplementation;

  beforeEach(() => {
    feature = createInitFeature();
  });
  afterEach(() => {
    feature.dispose();
    vi.restoreAllMocks();
  });

  describe('validate()', () => {
    it('rejects non-object input', () => {
      expect(feature.validate(null).isValid).toBe(false);
      expect(feature.validate(42).isValid).toBe(false);
    });

    it('accepts a valid configuration with an element target', () => {
      const result = feature.validate(makeInput());
      expect(result.isValid).toBe(true);
    });

    it('rejects an empty commands array', () => {
      const result = feature.validate(makeInput({ commands: [] }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'initialization.commands')).toBe(true);
    });

    it('rejects a negative timing delay', () => {
      const result = feature.validate(makeInput({ timing: { delay: -5 } }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'initialization.timing.delay')).toBe(true);
    });

    it('rejects a malformed selector target', () => {
      const result = feature.validate(makeInput({ target: '<bad>' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'initialization.target')).toBe(true);
    });

    it('accepts a valid selector-string target', () => {
      expect(feature.validate(makeInput({ target: '.card' })).isValid).toBe(true);
    });

    it('rejects an execution timeout below 1000ms', () => {
      const result = feature.validate(
        makeInput({
          execution: {
            parallel: false,
            stopOnError: true,
            timeout: 500,
            retries: { enabled: false, maxAttempts: 3, delay: 1000 },
          },
        })
      );
      expect(result.isValid).toBe(false);
    });

    it('rejects invalid retry settings when retries are enabled', () => {
      const badAttempts = feature.validate(
        makeInput({
          execution: {
            parallel: false,
            stopOnError: true,
            timeout: 10000,
            retries: { enabled: true, maxAttempts: 0, delay: 1000 },
          },
        })
      );
      expect(badAttempts.isValid).toBe(false);

      const badDelay = feature.validate(
        makeInput({
          execution: {
            parallel: false,
            stopOnError: true,
            timeout: 10000,
            retries: { enabled: true, maxAttempts: 3, delay: -1 },
          },
        })
      );
      expect(badDelay.isValid).toBe(false);
    });

    it('rejects maxConcurrentInits below 1', () => {
      const result = feature.validate(makeInput({ options: { maxConcurrentInits: 0 } }));
      expect(result.isValid).toBe(false);
    });

    it('rejects a non-object command', () => {
      const result = feature.validate(makeInput({ commands: ['not-an-object'] }));
      expect(result.isValid).toBe(false);
    });
  });

  describe('initialize()', () => {
    it('returns a ready output with all API groups for a valid config', async () => {
      const result = await feature.initialize(makeInput());
      expect(result.success).toBe(true);
      const out = result.value;
      expect(out.category).toBe('Frontend');
      expect(out.state).toBe('ready');
      expect(out.capabilities).toContain('element-initialization');
      expect(out.elements).toBeTruthy();
      expect(out.execution).toBeTruthy();
      expect(out.lifecycle).toBeTruthy();
      expect(out.errors).toBeTruthy();
    });

    it('fails and returns the first validation error for an invalid config', async () => {
      const result = await feature.initialize(makeInput({ commands: [] }));
      expect(result.success).toBe(false);
      expect(result.error?.path).toBe('initialization.commands');
    });

    it('registers the initial element when target + commands are provided', async () => {
      const target = el();
      const { value: out } = await feature.initialize(makeInput({ target }));
      expect(out.elements.isRegistered(target)).toBe(true);
      expect(out.elements.listRegistered()).toContain(target);
    });

    it('sets up a DOM observer when enabled without throwing', async () => {
      const result = await feature.initialize(makeInput({ options: { enableDOMObserver: true } }));
      expect(result.success).toBe(true);
    });
  });

  describe('output.elements API', () => {
    it('registers, checks, gets and unregisters elements', async () => {
      const { value: out } = await feature.initialize(makeInput());
      const target = el();
      await out.elements.register(target, [cmd('log')]);

      expect(out.elements.isRegistered(target)).toBe(true);
      expect(out.elements.getRegistration(target).length).toBeGreaterThan(0);
      expect(out.elements.listRegistered()).toContain(target);

      expect(out.elements.unregister(target)).toBe(true);
      expect(out.elements.isRegistered(target)).toBe(false);
    });

    it('reports false for an unregistered element and processes a registered one', async () => {
      const { value: out } = await feature.initialize(makeInput());
      const fresh = el();
      expect(out.elements.isProcessed(fresh)).toBe(false);
      expect(await out.elements.process(fresh)).toBe(false); // not registered

      const target = el();
      await out.elements.register(target, [cmd('log')]);
      expect(await out.elements.process(target)).toBe(true);
    });

    it('processAll processes pending registrations', async () => {
      const { value: out } = await feature.initialize(makeInput());
      await out.elements.register(el(), [cmd('log')]);
      const results = await out.elements.processAll();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('output.execution API (executeCommand branches)', () => {
    let out: any;
    beforeEach(async () => {
      out = (await feature.initialize(makeInput())).value;
    });

    it('runs addClass / setAttribute / setStyle against context.me', async () => {
      const target = el();
      await out.execution.execute(
        [
          cmd('addClass', ['.on']),
          cmd('setAttribute', ['data-x', '1']),
          cmd('setStyle', ['color', 'red']),
        ],
        { me: target }
      );
      expect(target.classList.contains('on')).toBe(true);
      expect(target.getAttribute('data-x')).toBe('1');
      expect(target.style.color).toBe('red');
    });

    it('executes commands in parallel', async () => {
      const target = el();
      await out.execution.executeParallel([cmd('addClass', ['p'])], { me: target });
      expect(target.classList.contains('p')).toBe(true);
    });

    it('executeWithRetry reports success on the first attempt', async () => {
      const result = await out.execution.executeWithRetry([cmd('log')], { me: el() }, 2, 0);
      expect(result).toEqual({ success: true, attempts: 1 });
    });

    it('tracks and clears execution history', async () => {
      expect(Array.isArray(out.execution.getExecutionHistory())).toBe(true);
      expect(out.execution.clearHistory()).toBe(true);
    });
  });

  describe('output.lifecycle & errors API', () => {
    it('lifecycle handlers return ids/true and reset works', async () => {
      const { value: out } = await feature.initialize(makeInput());
      expect(out.lifecycle.onElementAdded(() => {})).toBe('handler-id');
      expect(out.lifecycle.onElementRemoved(() => {})).toBe('handler-id');
      const readySpy = vi.fn();
      expect(out.lifecycle.onDOMReady(readySpy)).toBe(true);
      expect(out.lifecycle.reset()).toBe(true);
    });

    it('records, lists and clears error history', async () => {
      const { value: out } = await feature.initialize(makeInput());
      expect(await out.errors.handle(new Error('x'), {})).toBe(true);
      expect(out.errors.getErrorHistory()).toHaveLength(1);
      expect(out.errors.getErrorHistory(1)).toHaveLength(1);
      expect(out.errors.setErrorHandler(() => {})).toBe(true);
      expect(out.errors.clearErrors()).toBe(true);
      expect(out.errors.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('lifecycle & exported helpers', () => {
    it('getPerformanceMetrics() reflects a successful initialization', async () => {
      await feature.initialize(makeInput());
      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(1);
    });

    it('dispose() clears registrations', async () => {
      const target = el();
      const { value: out } = await feature.initialize(makeInput({ target }));
      expect(out.elements.isRegistered(target)).toBe(true);
      feature.dispose();
      expect(out.elements.listRegistered()).toHaveLength(0);
    });

    it('createInitFeature() returns a fresh instance', () => {
      expect(createInitFeature()).toBeInstanceOf(TypedInitFeatureImplementation);
      expect(createInitFeature()).not.toBe(createInitFeature());
    });

    it('createInit() builds a full input and initializes', async () => {
      const result = await createInit(el(), [cmd('log')]);
      expect(result.success).toBe(true);
      expect(result.value.state).toBe('ready');
    });

    it('exposes a shared enhancedInitImplementation instance', () => {
      expect(enhancedInitImplementation).toBeInstanceOf(TypedInitFeatureImplementation);
    });
  });
});
