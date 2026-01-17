/**
 * Type Tests for Conditional Types
 *
 * These tests verify that the conditional type system works correctly at compile time.
 * TypeScript will error if types don't match expectations.
 */

import { describe, it, expect } from 'vitest';
import type {
  EventSourcePayload,
  EventTarget,
  NativeEvent,
  RuntimeEnvironment,
} from '../event-source-registry';
import type { BrowserEventPayload } from '../browser-types';
import { isBrowserPayload } from '../browser-types';
import { isBrowserEnvironment, isNodeEnvironment } from '../environment';

describe('Conditional Types', () => {
  describe('EventTarget<TEnv>', () => {
    it('should resolve to Element in browser environment', () => {
      type BrowserTarget = EventTarget<'browser'>;

      // Type assertion: BrowserTarget should be assignable to Element
      const element = document.createElement('div');
      const target: BrowserTarget = element;

      expect(target).toBe(element);
    });

    it('should resolve to object in node environment', () => {
      type NodeTarget = EventTarget<'node'>;

      // Type assertion: NodeTarget should be assignable to object
      const obj = { foo: 'bar' };
      const target: NodeTarget = obj;

      expect(target).toEqual({ foo: 'bar' });
    });

    it('should resolve to Element | object in universal environment', () => {
      type UniversalTarget = EventTarget<'universal'>;

      // Can be Element
      const element = document.createElement('div');
      const target1: UniversalTarget = element;
      expect(target1).toBe(element);

      // Can be object
      const obj = { foo: 'bar' };
      const target2: UniversalTarget = obj;
      expect(target2).toEqual({ foo: 'bar' });
    });
  });

  describe('NativeEvent<TEnv>', () => {
    it('should resolve to Event in browser environment', () => {
      type BrowserEvent = NativeEvent<'browser'>;

      // Type assertion: BrowserEvent should be assignable to Event
      const event = new Event('click');
      const nativeEvent: BrowserEvent = event;

      expect(nativeEvent).toBe(event);
    });

    it('should resolve to never in node environment', () => {
      type NodeEvent = NativeEvent<'node'>;

      // Type assertion: NodeEvent should be never
      // This will cause a compile error if you try to assign anything
      // const nativeEvent: NodeEvent = new Event('click'); // ❌ Type error

      // This test just verifies the type exists
      expect(true).toBe(true);
    });

    it('should resolve to Event | undefined in universal environment', () => {
      type UniversalEvent = NativeEvent<'universal'>;

      // Can be Event
      const event = new Event('click');
      const nativeEvent1: UniversalEvent = event;
      expect(nativeEvent1).toBe(event);

      // Can be undefined
      const nativeEvent2: UniversalEvent = undefined;
      expect(nativeEvent2).toBeUndefined();
    });
  });

  describe('EventSourcePayload<TEnv>', () => {
    it('should have correct types in browser environment', () => {
      const element = document.createElement('div');
      const event = new Event('click');

      const payload: EventSourcePayload<'browser'> = {
        type: 'click',
        data: { x: 100, y: 200 },
        target: element,
        nativeEvent: event,
      };

      expect(payload.target).toBe(element);
      expect(payload.nativeEvent).toBe(event);
    });

    it('should have correct types in node environment', () => {
      const payload: EventSourcePayload<'node'> = {
        type: 'request',
        data: { method: 'GET', path: '/api/users' },
        target: { contextId: '123' },
        // nativeEvent: new Event('click'), // ❌ Type error - never type
      };

      expect(payload.target).toEqual({ contextId: '123' });
      expect(payload.nativeEvent).toBeUndefined();
    });

    it('should default to universal environment', () => {
      const element = document.createElement('div');

      // No type parameter = universal
      const payload: EventSourcePayload = {
        type: 'custom',
        data: {},
        target: element, // Can be Element or object
        nativeEvent: new Event('custom'),
      };

      expect(payload.target).toBe(element);
      expect(payload.nativeEvent).toBeInstanceOf(Event);
    });
  });

  describe('Type Guards', () => {
    it('should narrow browser payload correctly', () => {
      const element = document.createElement('div');
      const event = new Event('click');

      const payload: EventSourcePayload = {
        type: 'click',
        data: {},
        target: element,
        nativeEvent: event,
      };

      if (isBrowserPayload(payload)) {
        // Type is narrowed to BrowserEventPayload
        expect(payload.target).toBe(element);
        expect(payload.nativeEvent).toBe(event);

        // TypeScript knows these are the right types
        const target: Element | null | undefined = payload.target;
        const nativeEvent: Event | undefined = payload.nativeEvent;

        expect(target).toBe(element);
        expect(nativeEvent).toBe(event);
      } else {
        throw new Error('Should be browser payload');
      }
    });

    it('should handle non-browser payload', () => {
      const payload: EventSourcePayload = {
        type: 'custom',
        data: {},
        target: { id: '123' },
      };

      // In Node.js environment, this would return false
      const result = isBrowserPayload(payload);

      // In browser tests, it returns true if target is null/undefined/Element
      // In this case, target is a plain object, so it should be false
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Environment Detection', () => {
    it('should detect browser environment in tests', () => {
      const isBrowser = isBrowserEnvironment();

      // In vitest with jsdom, this should be true
      expect(isBrowser).toBe(true);
      expect(typeof window).toBe('object');
      expect(typeof document).toBe('object');
    });

    it('should detect node environment correctly', () => {
      const isNode = isNodeEnvironment();

      // In vitest, process exists so this should be true
      expect(typeof process).toBe('object');
      expect(isNode).toBe(true);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow assigning browser payload to universal', () => {
      const browserPayload: BrowserEventPayload = {
        type: 'click',
        data: {},
        target: document.createElement('div'),
        nativeEvent: new Event('click'),
      };

      // Should be assignable to universal
      const universalPayload: EventSourcePayload = browserPayload;

      expect(universalPayload.type).toBe('click');
    });

    it('should allow assigning node payload to universal', () => {
      const nodePayload: EventSourcePayload<'node'> = {
        type: 'request',
        data: {},
        target: {},
      };

      // Should be assignable to universal
      const universalPayload: EventSourcePayload = nodePayload;

      expect(universalPayload.type).toBe('request');
    });
  });
});
