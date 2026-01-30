/**
 * Unit Tests for CopyCommand
 *
 * Tests the copy command which copies text or element content to the system clipboard.
 * Covers Clipboard API, execCommand fallback, custom events, and text extraction.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CopyCommand } from '../copy';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(meElement?: HTMLElement): ExecutionContext & TypedExecutionContext {
  const me = meElement ?? document.createElement('div');
  return {
    me,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: document.createElement('div'),
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(valuesToReturn?: unknown[]) {
  let callCount = 0;
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (valuesToReturn) {
        return valuesToReturn[callCount++];
      }
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

// ========== Tests ==========

describe('CopyCommand', () => {
  let command: CopyCommand;
  let mockWriteText: ReturnType<typeof vi.fn>;
  let originalClipboard: Clipboard;

  beforeEach(() => {
    command = new CopyCommand();

    // Save original clipboard reference
    originalClipboard = navigator.clipboard;

    // Mock Clipboard API
    mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. metadata
  // ==========================================================================

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('copy');
    });

    it('should have a description containing "clipboard"', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('clipboard');
    });

    it('should have syntax entries', () => {
      const syntax = command.metadata.syntax;
      const syntaxArray = Array.isArray(syntax) ? syntax : [syntax];
      expect(syntaxArray.length).toBeGreaterThan(0);
      expect(syntaxArray.some((s: string) => s.includes('copy'))).toBe(true);
    });

    it('should have examples', () => {
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should declare clipboard-write and custom-events side effects', () => {
      expect(command.metadata.sideEffects).toBeDefined();
      expect(command.metadata.sideEffects).toContain('clipboard-write');
      expect(command.metadata.sideEffects).toContain('custom-events');
    });
  });

  // ==========================================================================
  // 2. parseInput
  // ==========================================================================

  describe('parseInput', () => {
    it('should throw when no arguments are provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('copy command requires a source');
    });

    it('should parse source from the first argument', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['Hello World']);

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 'Hello World' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.source).toBe('Hello World');
      expect(input.format).toBe('text');
    });

    it('should parse format from modifier', async () => {
      const context = createMockContext();
      // First call returns source, second call returns format
      const evaluator = createMockEvaluator(['<p>HTML</p>', 'html']);

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '<p>HTML</p>' }],
          modifiers: { format: { type: 'literal', value: 'html' } as any },
        },
        evaluator,
        context
      );

      expect(input.source).toBe('<p>HTML</p>');
      expect(input.format).toBe('html');
    });
  });

  // ==========================================================================
  // 3. execute - text extraction
  // ==========================================================================

  describe('execute - text extraction', () => {
    it('should extract text from a string source', async () => {
      const context = createMockContext();

      const output = await command.execute({ source: 'plain text', format: 'text' }, context);

      expect(output.text).toBe('plain text');
      expect(mockWriteText).toHaveBeenCalledWith('plain text');
    });

    it('should extract textContent from an HTMLElement when format is text', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.innerHTML = '<span>Hello</span> World';

      const output = await command.execute(
        { source: element as unknown as string | HTMLElement, format: 'text' },
        context
      );

      expect(output.text).toBe('Hello World');
      expect(output.format).toBe('text');
    });

    it('should extract outerHTML from an HTMLElement when format is html', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.textContent = 'Content';

      const output = await command.execute(
        { source: element as unknown as string | HTMLElement, format: 'html' },
        context
      );

      expect(output.text).toBe(element.outerHTML);
      expect(output.format).toBe('html');
    });

    it('should use String() fallback for non-string, non-element source', async () => {
      const context = createMockContext();

      const output = await command.execute(
        { source: 42 as unknown as string, format: 'text' },
        context
      );

      expect(output.text).toBe('42');
    });
  });

  // ==========================================================================
  // 4. execute - Clipboard API
  // ==========================================================================

  describe('execute - Clipboard API', () => {
    it('should call navigator.clipboard.writeText with extracted text', async () => {
      const context = createMockContext();

      await command.execute({ source: 'clipboard test', format: 'text' }, context);

      expect(mockWriteText).toHaveBeenCalledTimes(1);
      expect(mockWriteText).toHaveBeenCalledWith('clipboard test');
    });

    it('should dispatch copy:success event with method clipboard-api', async () => {
      const me = document.createElement('div');
      const context = createMockContext(me);
      const eventSpy = vi.fn();
      me.addEventListener('copy:success', eventSpy);

      await command.execute({ source: 'test', format: 'text' }, context);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.method).toBe('clipboard-api');
      expect(event.detail.text).toBe('test');
    });

    it('should return success:true with method clipboard-api', async () => {
      const context = createMockContext();

      const output = await command.execute({ source: 'success test', format: 'text' }, context);

      expect(output.success).toBe(true);
      expect(output.method).toBe('clipboard-api');
      expect(output.text).toBe('success test');
      expect(output.format).toBe('text');
    });
  });

  // ==========================================================================
  // 5. execute - execCommand fallback
  // ==========================================================================

  describe('execute - execCommand fallback', () => {
    let execCommandMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Make Clipboard API fail so execCommand fallback is used
      mockWriteText.mockRejectedValue(new Error('Clipboard API not allowed'));

      // happy-dom does not implement document.execCommand, so define it
      // before spying on it
      execCommandMock = vi.fn().mockReturnValue(true);
      (document as any).execCommand = execCommandMock;
    });

    afterEach(() => {
      delete (document as any).execCommand;
    });

    it('should fall back when Clipboard API fails', async () => {
      const context = createMockContext();

      const output = await command.execute({ source: 'fallback text', format: 'text' }, context);

      expect(output.success).toBe(true);
      expect(output.method).toBe('execCommand');
    });

    it('should call document.execCommand with copy', async () => {
      const context = createMockContext();

      await command.execute({ source: 'exec text', format: 'text' }, context);

      expect(execCommandMock).toHaveBeenCalledWith('copy');
    });

    it('should return method execCommand on success', async () => {
      const me = document.createElement('div');
      const context = createMockContext(me);
      const eventSpy = vi.fn();
      me.addEventListener('copy:success', eventSpy);

      const output = await command.execute({ source: 'exec success', format: 'text' }, context);

      expect(output.success).toBe(true);
      expect(output.method).toBe('execCommand');
      expect(output.text).toBe('exec success');

      // Also verify the event was dispatched with execCommand method
      expect(eventSpy).toHaveBeenCalledTimes(1);
      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.method).toBe('execCommand');
    });
  });

  // ==========================================================================
  // 6. execute - all methods fail
  // ==========================================================================

  describe('execute - all methods fail', () => {
    beforeEach(() => {
      // Clipboard API rejects
      mockWriteText.mockRejectedValue(new Error('Clipboard API not allowed'));
      // happy-dom does not implement document.execCommand; define it returning false
      (document as any).execCommand = vi.fn().mockReturnValue(false);
    });

    afterEach(() => {
      delete (document as any).execCommand;
    });

    it('should return success:false with method fallback', async () => {
      const context = createMockContext();

      const output = await command.execute({ source: 'fail text', format: 'text' }, context);

      expect(output.success).toBe(false);
      expect(output.method).toBe('fallback');
      expect(output.text).toBe('fail text');
    });

    it('should dispatch copy:error event', async () => {
      const me = document.createElement('div');
      const context = createMockContext(me);
      const errorSpy = vi.fn();
      me.addEventListener('copy:error', errorSpy);

      await command.execute({ source: 'error text', format: 'text' }, context);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const event = errorSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.text).toBe('error text');
      expect(event.detail.error).toBeDefined();
    });
  });

  // ==========================================================================
  // 7. integration
  // ==========================================================================

  describe('integration', () => {
    it('should copy a string end-to-end', async () => {
      const me = document.createElement('div');
      const context = createMockContext(me);
      const evaluator = createMockEvaluator(['Hello Clipboard']);
      const eventSpy = vi.fn();
      me.addEventListener('copy:success', eventSpy);

      // Parse
      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 'Hello Clipboard' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.source).toBe('Hello Clipboard');
      expect(input.format).toBe('text');

      // Execute
      const output = await command.execute(input, context);

      expect(output.success).toBe(true);
      expect(output.text).toBe('Hello Clipboard');
      expect(output.method).toBe('clipboard-api');
      expect(mockWriteText).toHaveBeenCalledWith('Hello Clipboard');
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should copy element content end-to-end', async () => {
      const me = document.createElement('div');
      const context = createMockContext(me);
      const sourceElement = document.createElement('p');
      sourceElement.textContent = 'Element text content';
      const evaluator = createMockEvaluator([sourceElement]);
      const eventSpy = vi.fn();
      me.addEventListener('copy:success', eventSpy);

      // Parse
      const input = await command.parseInput(
        { args: [{ type: 'expression', name: 'sourceEl' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.format).toBe('text');

      // Execute
      const output = await command.execute(input, context);

      expect(output.success).toBe(true);
      expect(output.text).toBe('Element text content');
      expect(output.format).toBe('text');
      expect(mockWriteText).toHaveBeenCalledWith('Element text content');
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });
  });
});
