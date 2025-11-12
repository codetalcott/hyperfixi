/**
 * Copy Command Tests
 * Test clipboard copying functionality with fallbacks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import '../../test-setup.js';
import { CopyCommand } from './copy';
import type { TypedExecutionContext } from '../../types/command-types';

describe('Copy Command', () => {
  let copyCommand: CopyCommand;
  let context: TypedExecutionContext;
  let mockElement: HTMLElement;

  beforeEach(() => {
    copyCommand = new CopyCommand();
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    mockElement.textContent = 'Test content';
    document.body.appendChild(mockElement);

    context = {
      me: mockElement,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map()
    } as TypedExecutionContext;
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(copyCommand.name).toBe('copy');
      expect(copyCommand.metadata.name).toBe('copy');
      expect(copyCommand.metadata.category).toBe('utility');
      expect(copyCommand.metadata.version).toBe('1.0.0');
    });

    it('should have correct syntax and description', () => {
      expect(copyCommand.metadata.syntax).toContain('copy');
      expect(copyCommand.metadata.description).toContain('clipboard');
      expect(copyCommand.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('Copy from String', () => {
    it('should copy plain text string using Clipboard API', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const result = await copyCommand.execute('Hello World', context);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Hello World');
      expect(result.format).toBe('text');
      expect(result.method).toBe('clipboard-api');
      expect(mockWriteText).toHaveBeenCalledWith('Hello World');
    });

    it('should handle empty string', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const result = await copyCommand.execute('', context);

      expect(result.success).toBe(true);
      expect(result.text).toBe('');
      expect(mockWriteText).toHaveBeenCalledWith('');
    });

    it('should copy special characters and unicode', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const specialText = '你好世界 🌍 <script>alert("test")</script>';
      const result = await copyCommand.execute(specialText, context);

      expect(result.success).toBe(true);
      expect(result.text).toBe(specialText);
      expect(mockWriteText).toHaveBeenCalledWith(specialText);
    });
  });

  describe('Copy from Element', () => {
    it('should copy textContent from element', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const element = document.createElement('div');
      element.textContent = 'Element content';

      const result = await copyCommand.execute(element, context);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Element content');
      expect(result.format).toBe('text');
      expect(mockWriteText).toHaveBeenCalledWith('Element content');
    });

    it('should copy innerHTML when format is html', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const element = document.createElement('div');
      element.innerHTML = '<strong>Bold</strong> text';

      const result = await copyCommand.execute(
        { source: element, format: 'html' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.text).toBe('<strong>Bold</strong> text');
      expect(result.format).toBe('html');
      expect(mockWriteText).toHaveBeenCalledWith('<strong>Bold</strong> text');
    });

    it('should handle element with nested children', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const element = document.createElement('div');
      element.innerHTML = '<p>Paragraph <span>with span</span></p>';

      const result = await copyCommand.execute(element, context);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Paragraph with span');
      expect(mockWriteText).toHaveBeenCalledWith('Paragraph with span');
    });

    it('should handle element with no content', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const element = document.createElement('div');

      const result = await copyCommand.execute(element, context);

      expect(result.success).toBe(true);
      expect(result.text).toBe('');
      expect(mockWriteText).toHaveBeenCalledWith('');
    });
  });

  describe('Clipboard API Fallback', () => {
    it('should fall back to execCommand when clipboard API fails', async () => {
      // Mock clipboard API to fail
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Permission denied'));
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      // Mock document.execCommand
      const mockExecCommand = vi.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      const result = await copyCommand.execute('Fallback text', context);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Fallback text');
      expect(result.method).toBe('execCommand');
      expect(mockWriteText).toHaveBeenCalled();
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });

    it('should throw error when all methods fail', async () => {
      // Mock clipboard API to fail
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Not available')) }
      });

      // Mock execCommand to fail
      document.execCommand = vi.fn().mockReturnValue(false);

      await expect(copyCommand.execute('Test', context)).rejects.toThrow(
        'Failed to copy to clipboard'
      );
    });
  });

  describe('Events', () => {
    it('should dispatch copy:success event on successful copy', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      let eventFired = false;
      let eventDetail: any = null;

      mockElement.addEventListener('copy:success', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      await copyCommand.execute('Event test', context);

      expect(eventFired).toBe(true);
      expect(eventDetail.text).toBe('Event test');
      expect(eventDetail.method).toBe('clipboard-api');
    });

    it('should dispatch copy:error event on failure', async () => {
      // Mock all methods to fail
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Failed')) }
      });
      document.execCommand = vi.fn().mockReturnValue(false);

      let eventFired = false;
      let eventDetail: any = null;

      mockElement.addEventListener('copy:error', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      try {
        await copyCommand.execute('Error test', context);
      } catch {
        // Expected to throw
      }

      expect(eventFired).toBe(true);
      expect(eventDetail.text).toBe('Error test');
      expect(eventDetail.error).toContain('failed');
    });

    it('should have bubbling events', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      let eventBubbled = false;
      document.body.addEventListener('copy:success', () => {
        eventBubbled = true;
      });

      await copyCommand.execute('Bubble test', context);

      expect(eventBubbled).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should validate string input', () => {
      const result = copyCommand.validate({ source: 'test', format: 'text' });
      expect(result.isValid).toBe(true);
    });

    it('should validate element input', () => {
      const element = document.createElement('div');
      const result = copyCommand.validate({ source: element, format: 'text' });
      expect(result.isValid).toBe(true);
    });

    it('should validate format option', () => {
      const result = copyCommand.validate({ source: 'test', format: 'html' });
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid format', () => {
      const result = copyCommand.validate({ source: 'test', format: 'invalid' });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide helpful suggestions on validation error', () => {
      const result = copyCommand.validate({ invalid: 'data' });
      expect(result.isValid).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some((s: string) => s.includes('copy'))).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should copy from code snippet element', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const codeElement = document.createElement('code');
      codeElement.textContent = 'const x = 42;';

      const result = await copyCommand.execute(codeElement, context);

      expect(result.success).toBe(true);
      expect(result.text).toBe('const x = 42;');
    });

    it('should copy formatted HTML from article element', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const article = document.createElement('article');
      article.innerHTML = '<h1>Title</h1><p>Content</p>';

      const result = await copyCommand.execute(
        { source: article, format: 'html' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.text).toBe('<h1>Title</h1><p>Content</p>');
      expect(result.format).toBe('html');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const longText = 'a'.repeat(10000);
      const result = await copyCommand.execute(longText, context);

      expect(result.success).toBe(true);
      expect(result.text.length).toBe(10000);
      expect(mockWriteText).toHaveBeenCalledWith(longText);
    });

    it('should handle newlines and tabs', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const formattedText = 'Line 1\n\tIndented line\nLine 3';
      const result = await copyCommand.execute(formattedText, context);

      expect(result.success).toBe(true);
      expect(result.text).toBe(formattedText);
      expect(mockWriteText).toHaveBeenCalledWith(formattedText);
    });

    it('should handle null/undefined textContent gracefully', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: mockWriteText }
      });

      const element = document.createElement('div');
      // Explicitly set textContent to null
      element.textContent = null;

      const result = await copyCommand.execute(element, context);

      expect(result.success).toBe(true);
      expect(result.text).toBe('');
    });
  });
});
