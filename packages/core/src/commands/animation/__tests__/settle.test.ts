/**
 * Unit Tests for SettleCommand (Standalone V2)
 *
 * Tests CSS transition/animation waiting functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettleCommand } from '../settle';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// Mock the event-waiting helper before any imports that use it
vi.mock('../../helpers/event-waiting', () => ({
  waitForAnimationComplete: vi.fn().mockResolvedValue({ completed: true, type: 'timeout' }),
}));

// Import the mocked module for assertions
import { waitForAnimationComplete } from '../../helpers/event-waiting';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: meElement,
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as Record<string, unknown>).value;
      }
      if (typeof node === 'object' && node !== null && 'name' in node) {
        return (node as Record<string, unknown>).name;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

function mockGetComputedStyle(overrides: Partial<CSSStyleDeclaration> = {}): void {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    transitionDuration: '0.3s',
    transitionDelay: '0s',
    animationDuration: '0s',
    animationDelay: '0s',
    ...overrides,
  } as unknown as CSSStyleDeclaration);
}

// ========== Tests ==========

describe('SettleCommand (Standalone V2)', () => {
  let command: SettleCommand;

  beforeEach(() => {
    command = new SettleCommand();
    mockGetComputedStyle();
    vi.mocked(waitForAnimationComplete).mockClear();
    vi.mocked(waitForAnimationComplete).mockResolvedValue({ completed: true, type: 'timeout' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ====================================================================
  // Metadata
  // ====================================================================

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('settle');
    });

    it('should have description mentioning transitions and animations', () => {
      expect(command.metadata).toBeDefined();
      const desc = command.metadata.description.toLowerCase();
      expect(desc).toContain('transition');
      expect(desc).toContain('animation');
    });

    it('should have syntax defined', () => {
      const syntax = command.metadata.syntax;
      // Syntax can be a string or array
      const syntaxStr = Array.isArray(syntax) ? syntax.join(' ') : syntax;
      expect(syntaxStr).toContain('settle');
    });

    it('should have timing side effect', () => {
      expect(command.metadata.sideEffects).toContain('timing');
    });
  });

  // ====================================================================
  // parseInput
  // ====================================================================

  describe('parseInput', () => {
    it('should return empty input when no arguments provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input).toEqual({});
    });

    it('should parse HTMLElement target from args', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('div');

      const evaluator = {
        evaluate: async () => targetElement,
      } as unknown as ExpressionEvaluator;

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'target' } as unknown as ASTNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe(targetElement);
    });

    it('should parse string target with # prefix', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '#animated' } as unknown as ASTNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe('#animated');
    });

    it('should parse string target with . prefix', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '.panel' } as unknown as ASTNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe('.panel');
    });

    it('should parse "me" as a valid target', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'me' } as unknown as ASTNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe('me');
    });

    it('should parse "it" as a valid target', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'it' } as unknown as ASTNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe('it');
    });

    it('should parse "you" as a valid target', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'you' } as unknown as ASTNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe('you');
    });

    it('should parse timeout from "for" modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [],
          modifiers: { for: { type: 'literal', value: 3000 } as unknown as any },
        },
        evaluator,
        context
      );

      expect(input.timeout).toBe(3000);
    });

    it('should parse both target and timeout', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '#box' } as unknown as ASTNode],
          modifiers: { for: { type: 'literal', value: 2000 } as unknown as any },
        },
        evaluator,
        context
      );

      expect(input.target).toBe('#box');
      expect(input.timeout).toBe(2000);
    });

    it('should ignore non-target string arguments', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // A string that is not an element ref, #id, .class, me, it, you
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'some-random-string' } as unknown as ASTNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      // Should not set target for unrecognized strings
      expect(input.target).toBeUndefined();
    });
  });

  // ====================================================================
  // execute
  // ====================================================================

  describe('execute', () => {
    it('should call getComputedStyle on the target element', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute({}, context);

      expect(window.getComputedStyle).toHaveBeenCalledWith(element);
    });

    it('should call waitForAnimationComplete with computed animation time', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      // transitionDuration: 0.3s = 300ms, all delays are 0s
      // So totalAnimationTime = max(300, 0) = 300ms
      await command.execute({}, context);

      expect(waitForAnimationComplete).toHaveBeenCalledWith(
        element,
        300, // 0.3s in ms
        5000 // default timeout
      );
    });

    it('should return settled: true when animation completes', async () => {
      const context = createMockContext();

      const result = await command.execute({}, context);

      expect(result.settled).toBe(true);
    });

    it('should return settled: false when animation times out', async () => {
      const context = createMockContext();
      vi.mocked(waitForAnimationComplete).mockResolvedValue({
        completed: false,
        type: 'timeout',
      });

      const result = await command.execute({}, context);

      expect(result.settled).toBe(false);
    });

    it('should return the target element in output', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      const result = await command.execute({}, context);

      expect(result.element).toBe(element);
    });

    it('leaves context.it untouched — upstream parity', async () => {
      // DELIBERATE CHANGE (Arc C close-out). Upstream's settle sets no result;
      // the self-assign this replaced was a silent divergence, and the element
      // is re-nameable one clause later (`settle #x then add .done to #x`).
      // The settled element still surfaces on the command output.
      const context = createMockContext();

      expect(context.it).toBeUndefined();
      const result = await command.execute({}, context);

      expect(result.element).toBe(context.me);
      expect(context.it).toBeUndefined();
    });

    it('should use default timeout of 5000ms when not specified', async () => {
      const context = createMockContext();

      const result = await command.execute({}, context);

      expect(result.timeout).toBe(5000);
    });

    it('should use provided timeout when specified', async () => {
      const context = createMockContext();

      const result = await command.execute({ timeout: 3000 }, context);

      expect(result.timeout).toBe(3000);
      expect(waitForAnimationComplete).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        3000
      );
    });

    it('should resolve a string selector target to a DOM element', async () => {
      const context = createMockContext();
      const targetEl = document.createElement('div');
      targetEl.id = 'settle-target';
      document.body.appendChild(targetEl);

      try {
        const result = await command.execute({ target: '#settle-target' }, context);

        expect(result.element).toBe(targetEl);
        expect(context.it).toBeUndefined(); // no self-assign — upstream parity
      } finally {
        document.body.removeChild(targetEl);
      }
    });

    it('should resolve HTMLElement target directly', async () => {
      const context = createMockContext();
      const targetEl = document.createElement('span');

      const result = await command.execute({ target: targetEl }, context);

      expect(result.element).toBe(targetEl);
    });

    it('should default to context.me when no target specified', async () => {
      const context = createMockContext();
      const meEl = context.me as HTMLElement;

      const result = await command.execute({}, context);

      expect(result.element).toBe(meEl);
    });

    it('should compute animation time from transition and animation properties', async () => {
      const context = createMockContext();

      // Override: transition 0.5s with 0.1s delay, animation 1s with 0.2s delay
      // maxTransition = 500 + 100 = 600ms
      // maxAnimation = 1000 + 200 = 1200ms
      // totalAnimationTime = max(600, 1200) = 1200ms
      vi.mocked(window.getComputedStyle).mockReturnValue({
        transitionDuration: '0.5s',
        transitionDelay: '0.1s',
        animationDuration: '1s',
        animationDelay: '0.2s',
      } as unknown as CSSStyleDeclaration);

      await command.execute({}, context);

      expect(waitForAnimationComplete).toHaveBeenCalledWith(expect.any(Object), 1200, 5000);
    });

    it('should return duration representing elapsed time', async () => {
      const context = createMockContext();

      const result = await command.execute({}, context);

      // duration should be a non-negative number (elapsed time)
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ====================================================================
  // integration (parseInput -> execute)
  // ====================================================================

  describe('integration', () => {
    it('should settle on context.me when invoked with no arguments', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const meEl = context.me as HTMLElement;

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      const result = await command.execute(input, context);

      expect(result.element).toBe(meEl);
      expect(result.settled).toBe(true);
      expect(result.timeout).toBe(5000);
      expect(context.it).toBeUndefined(); // no self-assign — upstream parity
    });

    it('should settle on specified target with custom timeout', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const targetEl = document.createElement('div');
      targetEl.id = 'animated-el';
      document.body.appendChild(targetEl);

      try {
        const input = await command.parseInput(
          {
            args: [{ type: 'literal', value: '#animated-el' } as unknown as ASTNode],
            modifiers: { for: { type: 'literal', value: 2500 } as unknown as any },
          },
          evaluator,
          context
        );

        expect(input.target).toBe('#animated-el');
        expect(input.timeout).toBe(2500);

        const result = await command.execute(input, context);

        expect(result.element).toBe(targetEl);
        expect(result.settled).toBe(true);
        expect(result.timeout).toBe(2500);
        expect(context.it).toBeUndefined(); // no self-assign — upstream parity
        expect(waitForAnimationComplete).toHaveBeenCalledWith(
          targetEl,
          300, // from default mocked getComputedStyle (0.3s)
          2500
        );
      } finally {
        document.body.removeChild(targetEl);
      }
    });
  });
});
