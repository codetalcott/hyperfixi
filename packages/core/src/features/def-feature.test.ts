/**
 * Tests for the enhanced `def` feature API (TypedDefFeatureImplementation).
 *
 * def.test.ts covers the separate simple DefFeature class; this suite drives the
 * enhanced implementation's real surface: validate(), initialize() and the returned
 * API (functions / parameters / execution / types / errors), plus dispose()/metrics.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TypedDefFeatureImplementation,
  createDefFeature,
  createDef,
  enhancedDefImplementation,
} from './def';

// The runtime validator does not apply schema .default()s, so build fully-specified
// inputs (mirrors the exported createDef helper). Callers override the definition.
const makeDef = (definition: Record<string, any> = {}, extra: Record<string, any> = {}) => ({
  definition: {
    name: 'myFn',
    parameters: [],
    body: ['return undefined'],
    isAsync: false,
    ...definition,
  },
  context: { variables: {} },
  options: {
    enableClosures: true,
    enableTypeChecking: true,
    maxParameterCount: 20,
    allowDynamicParameters: false,
    ...(extra.options ?? {}),
  },
  environment: 'universal',
  debug: false,
});

describe('def feature — TypedDefFeatureImplementation', () => {
  let feature: TypedDefFeatureImplementation;

  beforeEach(() => {
    feature = createDefFeature();
  });
  afterEach(() => {
    feature.dispose();
    vi.restoreAllMocks();
  });

  describe('validate()', () => {
    it('rejects non-object input', () => {
      expect(feature.validate(null).isValid).toBe(false);
      expect(feature.validate('x').isValid).toBe(false);
    });

    it('accepts a valid function definition', () => {
      expect(feature.validate(makeDef()).isValid).toBe(true);
    });

    it('rejects an invalid function name', () => {
      const result = feature.validate(makeDef({ name: '1bad' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'definition.name')).toBe(true);
    });

    it('rejects an invalid parameter identifier', () => {
      const result = feature.validate(makeDef({ parameters: ['ok', '1bad'] }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'definition.parameters[1]')).toBe(true);
    });

    it('rejects duplicate parameter names', () => {
      const result = feature.validate(makeDef({ parameters: ['a', 'a'] }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'definition.parameters')).toBe(true);
    });

    it('rejects too many parameters past maxParameterCount', () => {
      const result = feature.validate(
        makeDef({ parameters: ['a', 'b', 'c'] }, { options: { maxParameterCount: 2 } })
      );
      expect(result.isValid).toBe(false);
    });

    it('rejects an empty function body', () => {
      const result = feature.validate(makeDef({ body: [] }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'definition.body')).toBe(true);
    });

    it('rejects an invalid catch-block parameter', () => {
      const result = feature.validate(
        makeDef({ catchBlock: { parameter: '1bad', body: ['return 0'] } })
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'definition.catchBlock.parameter')).toBe(true);
    });

    it('validates namespaces (dotted path ok, malformed rejected)', () => {
      expect(feature.validate(makeDef({ namespace: 'my.nested.ns' })).isValid).toBe(true);
      expect(feature.validate(makeDef({ namespace: '1bad' })).isValid).toBe(false);
    });
  });

  describe('initialize()', () => {
    it('returns a ready output with all API groups and registers the definition', async () => {
      const result = await feature.initialize(makeDef({ name: 'greet' }));
      expect(result.success).toBe(true);
      const out = result.value;
      expect(out.category).toBe('Universal');
      expect(out.state).toBe('ready');
      expect(out.functions.exists('greet')).toBe(true);
      expect(out.parameters).toBeTruthy();
      expect(out.execution).toBeTruthy();
      expect(out.types).toBeTruthy();
      expect(out.errors).toBeTruthy();
    });

    it('fails with a ValidationError for an invalid definition', async () => {
      const result = await feature.initialize(makeDef({ name: '1bad' }));
      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('ValidationError');
    });
  });

  describe('output.functions API', () => {
    let out: any;
    beforeEach(async () => {
      out = (await feature.initialize(makeDef({ name: 'myFn' }))).value;
    });

    it('defines, checks, lists, gets metadata and removes functions', async () => {
      await out.functions.define({
        name: 'extra',
        parameters: [],
        body: ['return 1'],
        isAsync: false,
      });
      expect(out.functions.exists('extra')).toBe(true);
      expect(out.functions.list()).toEqual(expect.arrayContaining(['myFn', 'extra']));
      expect(out.functions.getMetadata('extra')).toBeTruthy();
      expect(out.functions.getMetadata('missing')).toBeNull();
      expect(out.functions.remove('extra')).toBe(true);
      expect(out.functions.exists('extra')).toBe(false);
    });

    it('lists namespaced functions by namespace', async () => {
      await out.functions.define({
        name: 'fn',
        namespace: 'math',
        parameters: [],
        body: ['return 1'],
        isAsync: false,
      });
      expect(out.functions.list('math')).toContain('math.fn');
    });

    it('call() runs a registered function and throws on unknown / arity mismatch', async () => {
      await out.functions.define({
        name: 'answer',
        parameters: [],
        body: ['return 42'],
        isAsync: false,
      });
      await expect(out.functions.call('answer', [])).resolves.toBe(42);
      await expect(out.functions.call('missing')).rejects.toThrow(/not found/);
      await expect(out.functions.call('answer', [1])).rejects.toThrow(/expects/);
    });
  });

  describe('output.parameters API', () => {
    let out: any;
    beforeEach(async () => {
      out = (
        await feature.initialize(
          makeDef({ name: 'add', parameters: ['a', 'b'], body: ['return 1'] })
        )
      ).value;
    });

    it('validates parameter arity', () => {
      expect(out.parameters.validate('add', [1, 2])).toEqual({ isValid: true });
      expect(out.parameters.validate('add', [1]).isValid).toBe(false);
      expect(out.parameters.validate('missing', []).isValid).toBe(false);
    });

    it('binds parameters to argument values', () => {
      expect(out.parameters.bind('add', [1, 2])).toEqual({ a: 1, b: 2 });
      expect(out.parameters.bind('missing', [])).toEqual({});
    });

    it('returns a signature or null', () => {
      expect(out.parameters.getSignature('add')).toMatchObject({
        name: 'add',
        parameters: ['a', 'b'],
        isAsync: false,
      });
      expect(out.parameters.getSignature('missing')).toBeNull();
    });
  });

  describe('output.execution API', () => {
    let out: any;
    beforeEach(async () => {
      out = (await feature.initialize(makeDef({ name: 'myFn', body: ['return 7'] }))).value;
    });

    it('invoke() calls a function with spread args', async () => {
      await expect(out.execution.invoke('myFn')).resolves.toBe(7);
    });

    it('invokeAsync() requires an async function', async () => {
      await expect(out.execution.invokeAsync('myFn')).rejects.toThrow(/not async/);
      await out.functions.define({
        name: 'later',
        parameters: [],
        body: ['return 5'],
        isAsync: true,
      });
      await expect(out.execution.invokeAsync('later')).resolves.toBe(5);
    });

    it('createClosure() returns a callable closure or throws for unknown functions', () => {
      const closure = out.execution.createClosure('myFn', { captured: 1 });
      expect(typeof closure.call).toBe('function');
      expect(() => out.execution.createClosure('missing', {})).toThrow(/not found/);
    });

    it('getCallStack() returns an array', () => {
      expect(Array.isArray(out.execution.getCallStack())).toBe(true);
    });
  });

  describe('output.types API', () => {
    let out: any;
    beforeEach(async () => {
      out = (await feature.initialize(makeDef({ name: 'myFn' }))).value;
    });

    it('check() validates primitive/collection types', () => {
      expect(out.types.check(5, 'number')).toBe(true);
      expect(out.types.check('s', 'number')).toBe(false);
      expect(out.types.check({}, 'object')).toBe(true);
      expect(out.types.check([], 'array')).toBe(true);
      expect(out.types.check(1, 'mystery')).toBe(true); // unknown types pass
    });

    it('infer() reports the runtime type', () => {
      expect(out.types.infer(null)).toBe('null');
      expect(out.types.infer(undefined)).toBe('undefined');
      expect(out.types.infer([])).toBe('array');
      expect(out.types.infer(3)).toBe('number');
    });

    it('validate() and annotate() behave', () => {
      expect(out.types.validate([], {})).toEqual({ isValid: true, errors: [] });
      expect(out.types.annotate('myFn', [], 'string')).toBe(true);
      expect(out.parameters.getSignature('myFn').returnType).toBe('string');
    });
  });

  describe('output.errors API', () => {
    it('getCatchBlock/getFinallyBlock return null when absent', async () => {
      const { value: out } = await feature.initialize(makeDef({ name: 'plain' }));
      expect(out.errors.getCatchBlock('plain')).toBeNull();
      expect(out.errors.getFinallyBlock('plain')).toBeNull();
    });

    it('handle() rethrows without a catch block and returns handled with one', async () => {
      const { value: out } = await feature.initialize(
        makeDef({ name: 'guarded', catchBlock: { parameter: 'err', body: ['return 0'] } })
      );
      expect(out.errors.getCatchBlock('guarded')).toMatchObject({ parameter: 'err' });
      await expect(out.errors.handle(new Error('x'), 'guarded')).resolves.toBe('handled');
      await expect(out.errors.handle(new Error('x'), 'unknown')).rejects.toThrow();
    });
  });

  describe('lifecycle & exported helpers', () => {
    it('getPerformanceMetrics() reflects definitions', async () => {
      await feature.initialize(makeDef({ name: 'myFn' }));
      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(1);
      expect(metrics.totalFunctions).toBeGreaterThanOrEqual(1);
    });

    it('dispose() clears defined functions', async () => {
      const { value: out } = await feature.initialize(makeDef({ name: 'myFn' }));
      expect(out.functions.exists('myFn')).toBe(true);
      feature.dispose();
      expect(out.functions.exists('myFn')).toBe(false);
    });

    it('createDefFeature() returns a fresh instance', () => {
      expect(createDefFeature()).toBeInstanceOf(TypedDefFeatureImplementation);
      expect(createDefFeature()).not.toBe(createDefFeature());
    });

    it('createDef() builds a full input and initializes', async () => {
      const result = await createDef({ name: 'built', body: ['return 1'] });
      expect(result.success).toBe(true);
      expect(result.value.functions.exists('built')).toBe(true);
    });

    it('exposes a shared enhancedDefImplementation instance', () => {
      expect(enhancedDefImplementation).toBeInstanceOf(TypedDefFeatureImplementation);
    });
  });
});
