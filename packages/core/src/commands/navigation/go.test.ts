/**
 * Test suite for the 'go' command
 * Tests navigation functionality including URL navigation, element scrolling, and history management
 *
 * Based on LSP specification:
 * - go [to] url <stringLike> [in new window]
 * - go [to] [top|middle|bottom] [left|center|right] [of] <expression> [(+|-) <number> [px]] [smoothly|instantly]
 * - go back
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GoCommand } from './go';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

// Mock window methods for testing navigation
const originalLocation = window.location;
const originalHistory = window.history;
const originalOpen = window.open;
const originalScrollTo = window.scrollTo;

describe('Go Command', () => {
  let goCommand: GoCommand;
  let testElement: HTMLElement;
  let context: ExecutionContext;

  // Mock objects for testing
  let mockLocation: any;
  let mockHistory: any;
  let mockWindow: any;

  beforeEach(() => {
    goCommand = new GoCommand();
    testElement = createTestElement('<div id="test">Test Element</div>');
    document.body.appendChild(testElement);
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Setup location mock
    mockLocation = {
      href: 'https://example.com/current',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    };

    // Setup history mock
    mockHistory = {
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      pushState: vi.fn(),
      replaceState: vi.fn(),
    };

    // Setup window mock
    mockWindow = {
      open: vi.fn().mockReturnValue({ focus: vi.fn() }),
      scrollTo: vi.fn(),
    };

    // Replace globals
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });
    Object.defineProperty(window, 'history', {
      value: mockHistory,
      writable: true,
    });
    Object.defineProperty(window, 'open', {
      value: mockWindow.open,
      writable: true,
    });
    Object.defineProperty(window, 'scrollTo', {
      value: mockWindow.scrollTo,
      writable: true,
    });

    // Mock scrollIntoView for elements
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    // Restore original methods
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    Object.defineProperty(window, 'history', {
      value: originalHistory,
      writable: true,
    });
    Object.defineProperty(window, 'open', {
      value: originalOpen,
      writable: true,
    });
    Object.defineProperty(window, 'scrollTo', {
      value: originalScrollTo,
      writable: true,
    });

    vi.restoreAllMocks();
  });

  describe('Command Properties', () => {
    it('should have correct command properties', () => {
      expect(goCommand.name).toBe('go');
      expect(goCommand.syntax).toBe(
        'go [to] url <stringLike> [in new window] | go [to] [top|middle|bottom] [left|center|right] [of] <expression> [(+|-) <number> [px]] [smoothly|instantly] | go back'
      );
      expect(goCommand.isBlocking).toBe(false);
      expect(goCommand.hasBody).toBe(false);
      expect(goCommand.implicitTarget).toBeUndefined();
    });
  });

  describe('URL Navigation - LSP Examples', () => {
    it('should navigate to absolute URL from LSP example', async () => {
      // LSP Example: <button _="on click go to url https://duck.com">Go Search</button>
      await goCommand.execute(context, 'to', 'url', 'https://duck.com');

      expect(mockLocation.assign).toHaveBeenCalledWith('https://duck.com');
    });

    it('should handle "go to url" syntax', async () => {
      await goCommand.execute(context, 'to', 'url', 'https://example.com');

      expect(mockLocation.assign).toHaveBeenCalledWith('https://example.com');
    });

    it('should handle "go url" syntax (without to)', async () => {
      await goCommand.execute(context, 'url', 'https://example.com');

      expect(mockLocation.assign).toHaveBeenCalledWith('https://example.com');
    });

    it('should navigate to relative URL', async () => {
      await goCommand.execute(context, 'to', 'url', '/path/to/page');

      expect(mockLocation.assign).toHaveBeenCalledWith('/path/to/page');
    });

    it('should handle anchor navigation by updating hash', async () => {
      await goCommand.execute(context, 'to', 'url', '#section-id');

      expect(mockLocation.hash).toBe('#section-id');
      expect(mockLocation.assign).not.toHaveBeenCalled();
    });

    it('should handle anchor with existing path', async () => {
      await goCommand.execute(context, 'to', 'url', '#top');

      expect(mockLocation.hash).toBe('#top');
    });
  });

  describe('New Window Navigation', () => {
    it('should open URL in new window when specified', async () => {
      await goCommand.execute(context, 'to', 'url', 'https://example.com', 'in', 'new', 'window');

      expect(mockWindow.open).toHaveBeenCalledWith('https://example.com', '_blank');
    });

    it('should open URL in new window with alternative syntax', async () => {
      await goCommand.execute(context, 'url', 'https://example.com', 'in', 'new', 'window');

      expect(mockWindow.open).toHaveBeenCalledWith('https://example.com', '_blank');
    });

    it('should focus new window after opening', async () => {
      const mockNewWindow = { focus: vi.fn() };
      mockWindow.open.mockReturnValue(mockNewWindow);

      await goCommand.execute(context, 'to', 'url', 'https://example.com', 'in', 'new', 'window');

      expect(mockNewWindow.focus).toHaveBeenCalled();
    });

    it('should handle popup blocker gracefully', async () => {
      mockWindow.open.mockReturnValue(null);

      expect(async () => {
        await goCommand.execute(context, 'to', 'url', 'https://example.com', 'in', 'new', 'window');
      }).not.toThrow();
    });
  });

  describe('Element Scrolling - LSP Examples', () => {
    let targetElement: HTMLElement;

    beforeEach(() => {
      targetElement = createTestElement('<div id="target">Target Element</div>');
      document.body.appendChild(targetElement);
    });

    it('should scroll to top of element from LSP example', async () => {
      // LSP Example: <button _="on click go to the top of the body">Go To The Top...</button>
      await goCommand.execute(context, 'to', 'the', 'top', 'of', 'the', 'body');

      expect(document.body.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should scroll to top of specific element with offset from LSP example', async () => {
      // LSP Example: <button _="on click go to the top of #a-div -20px">Go To The Top Of A Div, with 20px of padding</button>
      const targetDiv = createTestElement('<div id="a-div">Target Div</div>');
      document.body.appendChild(targetDiv);

      await goCommand.execute(context, 'to', 'the', 'top', 'of', '#a-div', '-20px');

      // Should scroll to element and then adjust by offset
      expect(targetDiv.scrollIntoView).toHaveBeenCalled();
    });

    it('should handle "go to <element>" syntax', async () => {
      await goCommand.execute(context, 'to', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should handle CSS selector targeting', async () => {
      await goCommand.execute(context, 'to', '#target');

      expect(targetElement.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('Scroll Position Modifiers', () => {
    let targetElement: HTMLElement;

    beforeEach(() => {
      targetElement = createTestElement('<div id="target">Target Element</div>');
      document.body.appendChild(targetElement);
    });

    it('should scroll to top of element', async () => {
      await goCommand.execute(context, 'to', 'top', 'of', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should scroll to middle of element', async () => {
      await goCommand.execute(context, 'to', 'middle', 'of', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });

    it('should scroll to bottom of element', async () => {
      await goCommand.execute(context, 'to', 'bottom', 'of', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    });

    it('should scroll to left of element', async () => {
      await goCommand.execute(context, 'to', 'left', 'of', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
    });

    it('should scroll to center horizontally', async () => {
      await goCommand.execute(context, 'to', 'center', 'of', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });

    it('should scroll to right of element', async () => {
      await goCommand.execute(context, 'to', 'right', 'of', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'end',
      });
    });

    it('should handle combined vertical and horizontal positioning', async () => {
      await goCommand.execute(context, 'to', 'top', 'left', 'of', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'start',
      });
    });

    it('should handle bottom right positioning', async () => {
      await goCommand.execute(context, 'to', 'bottom', 'right', 'of', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'end',
        inline: 'end',
      });
    });
  });

  describe('Scroll Animation Options', () => {
    let targetElement: HTMLElement;

    beforeEach(() => {
      targetElement = createTestElement('<div id="target">Target Element</div>');
      document.body.appendChild(targetElement);
    });

    it('should use smooth scrolling by default', async () => {
      await goCommand.execute(context, 'to', targetElement);

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should use smooth scrolling when explicitly specified', async () => {
      await goCommand.execute(context, 'to', targetElement, 'smoothly');

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should use instant scrolling when specified', async () => {
      await goCommand.execute(context, 'to', targetElement, 'instantly');

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should handle animation with position modifiers', async () => {
      await goCommand.execute(context, 'to', 'top', 'of', targetElement, 'instantly');

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'start',
        inline: 'nearest',
      });
    });
  });

  describe('Pixel Offset Handling', () => {
    let targetElement: HTMLElement;

    beforeEach(() => {
      targetElement = createTestElement('<div id="target">Target Element</div>');
      document.body.appendChild(targetElement);

      // Mock getBoundingClientRect for offset calculations
      targetElement.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 100,
        left: 50,
        bottom: 200,
        right: 150,
        width: 100,
        height: 100,
      });
    });

    it('should handle positive pixel offset', async () => {
      await goCommand.execute(context, 'to', 'top', 'of', targetElement, '+20px');

      expect(targetElement.scrollIntoView).toHaveBeenCalled();
    });

    it('should handle negative pixel offset', async () => {
      await goCommand.execute(context, 'to', 'top', 'of', targetElement, '-20px');

      expect(targetElement.scrollIntoView).toHaveBeenCalled();
    });

    it('should handle pixel offset without px suffix', async () => {
      await goCommand.execute(context, 'to', 'top', 'of', targetElement, '+20');

      expect(targetElement.scrollIntoView).toHaveBeenCalled();
    });

    it('should handle offset with animation', async () => {
      await goCommand.execute(context, 'to', 'top', 'of', targetElement, '-15px', 'smoothly');

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should apply vertical offset after scrolling', async () => {
      await goCommand.execute(context, 'to', 'top', 'of', targetElement, '-20px');

      // Should first scroll to element, then apply offset
      expect(targetElement.scrollIntoView).toHaveBeenCalled();
      expect(mockWindow.scrollTo).toHaveBeenCalled();
    });
  });

  describe('History Navigation', () => {
    it('should handle "go back" command', async () => {
      await goCommand.execute(context, 'back');

      expect(mockHistory.back).toHaveBeenCalled();
    });

    it('should handle "go back" with case variations', async () => {
      await goCommand.execute(context, 'BACK');

      expect(mockHistory.back).toHaveBeenCalled();
    });
  });

  describe('Target Resolution', () => {
    it('should resolve CSS selector to elements', async () => {
      const elements = [
        createTestElement('<div class="scroll-target">Element 1</div>'),
        createTestElement('<div class="scroll-target">Element 2</div>'),
      ];

      elements.forEach(el => document.body.appendChild(el));

      await goCommand.execute(context, 'to', '.scroll-target');

      // Should scroll to first matching element
      expect(elements[0].scrollIntoView).toHaveBeenCalled();
    });

    it('should handle null/undefined targets gracefully', async () => {
      expect(async () => {
        await goCommand.execute(context, 'to', null);
      }).not.toThrow();
    });

    it('should handle non-existent CSS selectors', async () => {
      expect(async () => {
        await goCommand.execute(context, 'to', '.non-existent');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URL gracefully', async () => {
      mockLocation.assign.mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      expect(async () => {
        await goCommand.execute(context, 'to', 'url', 'invalid://url');
      }).not.toThrow();
    });

    it('should handle scroll errors gracefully', async () => {
      const targetElement = createTestElement('<div id="target">Target</div>');
      document.body.appendChild(targetElement);

      targetElement.scrollIntoView = vi.fn().mockImplementation(() => {
        throw new Error('Scroll error');
      });

      expect(async () => {
        await goCommand.execute(context, 'to', targetElement);
      }).not.toThrow();
    });

    it('should handle history navigation errors', async () => {
      mockHistory.back.mockImplementation(() => {
        throw new Error('History error');
      });

      expect(async () => {
        await goCommand.execute(context, 'back');
      }).not.toThrow();
    });
  });

  describe('Event Integration', () => {
    it('should dispatch navigation event for URL navigation', async () => {
      let eventFired = false;
      testElement.addEventListener('hyperscript:go', () => {
        eventFired = true;
      });

      await goCommand.execute(context, 'to', 'url', 'https://example.com');

      expect(eventFired).toBe(true);
    });

    it('should dispatch scroll event for element scrolling', async () => {
      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:go', (e: any) => {
        eventDetail = e.detail;
      });

      const targetElement = createTestElement('<div id="target">Target</div>');
      document.body.appendChild(targetElement);

      await goCommand.execute(context, 'to', targetElement);

      expect(eventDetail).toBeDefined();
      expect(eventDetail.action).toBe('scroll');
      expect(eventDetail.target).toBe(targetElement);
    });

    it('should include navigation type in event details', async () => {
      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:go', (e: any) => {
        eventDetail = e.detail;
      });

      await goCommand.execute(context, 'back');

      expect(eventDetail).toBeDefined();
      expect(eventDetail.action).toBe('history');
      expect(eventDetail.direction).toBe('back');
    });
  });

  describe('Validation', () => {
    it('should validate empty arguments', () => {
      const result = goCommand.validate([]);
      expect(result).toBe('Go command requires at least one argument');
    });

    it('should validate URL navigation arguments', () => {
      expect(goCommand.validate(['to', 'url', 'https://example.com'])).toBeNull();
      expect(goCommand.validate(['url', 'https://example.com'])).toBeNull();
    });

    it('should validate scroll navigation arguments', () => {
      expect(goCommand.validate(['to', 'top', 'of', '#element'])).toBeNull();
      expect(goCommand.validate(['to', '#element'])).toBeNull();
    });

    it('should validate history navigation arguments', () => {
      expect(goCommand.validate(['back'])).toBeNull();
    });

    it('should reject invalid argument combinations', () => {
      const result = goCommand.validate(['invalid', 'combination']);
      expect(result).toContain('Invalid go command syntax');
    });

    it('should validate new window syntax', () => {
      expect(
        goCommand.validate(['to', 'url', 'https://example.com', 'in', 'new', 'window'])
      ).toBeNull();
    });

    it('should validate animation syntax', () => {
      expect(goCommand.validate(['to', '#element', 'smoothly'])).toBeNull();
      expect(goCommand.validate(['to', '#element', 'instantly'])).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle multiple rapid navigation commands efficiently', async () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        await goCommand.execute(context, 'to', 'url', `https://example.com/${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(mockLocation.assign).toHaveBeenCalledTimes(100);
    });

    it('should handle scrolling to many elements efficiently', async () => {
      const elements = Array.from({ length: 50 }, (_, i) =>
        createTestElement(`<div id="target-${i}">Target ${i}</div>`)
      );

      elements.forEach(el => document.body.appendChild(el));

      const startTime = performance.now();

      for (const element of elements) {
        await goCommand.execute(context, 'to', element);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });
  });

  describe('Complex Navigation Scenarios', () => {
    it('should handle URL with fragment identifier', async () => {
      await goCommand.execute(context, 'to', 'url', 'https://example.com#section');

      expect(mockLocation.assign).toHaveBeenCalledWith('https://example.com#section');
    });

    it('should handle URL with query parameters', async () => {
      await goCommand.execute(context, 'to', 'url', 'https://example.com?param=value&other=123');

      expect(mockLocation.assign).toHaveBeenCalledWith('https://example.com?param=value&other=123');
    });

    it('should handle complex element positioning with all modifiers', async () => {
      const targetElement = createTestElement('<div id="complex-target">Complex Target</div>');
      document.body.appendChild(targetElement);

      await goCommand.execute(
        context,
        'to',
        'top',
        'center',
        'of',
        targetElement,
        '+10px',
        'smoothly'
      );

      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'center',
      });
    });

    it('should handle navigation within iframe context', async () => {
      const iframe = createTestElement('<iframe src="about:blank"></iframe>') as HTMLIFrameElement;
      document.body.appendChild(iframe);

      const iframeContext = createMockHyperscriptContext(iframe) as ExecutionContext;

      expect(async () => {
        await goCommand.execute(iframeContext, 'to', 'url', 'https://example.com');
      }).not.toThrow();
    });
  });
});
