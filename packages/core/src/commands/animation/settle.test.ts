/**
 * Settle Command Tests
 * Test settling (waiting for CSS transitions to complete)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../test-setup.js';
import { SettleCommand } from './settle';
import type { ExecutionContext } from '../../types/core';

describe('Settle Command', () => {
  let settleCommand: SettleCommand;
  let context: ExecutionContext;
  let mockElement: HTMLElement;

  beforeEach(() => {
    settleCommand = new SettleCommand();
    mockElement = document.createElement('div');
    context = {
      me: mockElement,
      locals: new Map(),
    };
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(settleCommand.name).toBe('settle');
      expect(settleCommand.isBlocking).toBe(true);
      expect(typeof settleCommand.syntax).toBe('string');
      expect(typeof settleCommand.description).toBe('string');
    });
  });

  describe('Basic Settling', () => {
    it('should settle current element (me)', async () => {
      vi.useFakeTimers();

      const promise = settleCommand.execute(context);

      // Advance timers to allow for settling
      vi.advanceTimersByTime(100);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.useRealTimers();
    });

    it('should settle with timeout', async () => {
      vi.useFakeTimers();

      const promise = settleCommand.execute(context, 'for', 200);

      // Advance timers past the timeout
      vi.advanceTimersByTime(250);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.useRealTimers();
    });

    it('should settle specific element', async () => {
      const targetElement = document.createElement('button');
      vi.useFakeTimers();

      const promise = settleCommand.execute(context, targetElement);

      vi.advanceTimersByTime(100);

      const result = await promise;
      expect(result).toBe(targetElement);

      vi.useRealTimers();
    });
  });

  describe('CSS Transition Detection', () => {
    it('should detect when element has no transitions', async () => {
      // Mock getComputedStyle to return no transitions
      const mockGetComputedStyle = vi.fn().mockReturnValue({
        transitionDuration: '0s',
        transitionDelay: '0s',
        animationDuration: '0s',
        animationDelay: '0s',
      });
      vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

      const result = await settleCommand.execute(context);

      expect(result).toBe(mockElement);
      expect(mockGetComputedStyle).toHaveBeenCalledWith(mockElement);

      vi.unstubAllGlobals();
    });

    it('should wait for CSS transitions to complete', async () => {
      // Mock getComputedStyle to return transitions
      const mockGetComputedStyle = vi.fn().mockReturnValue({
        transitionDuration: '0.3s',
        transitionDelay: '0.1s',
        animationDuration: '0s',
        animationDelay: '0s',
      });
      vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

      vi.useFakeTimers();

      const promise = settleCommand.execute(context);

      // Should wait for transition duration + delay (300ms + 100ms = 400ms)
      vi.advanceTimersByTime(450);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('should wait for CSS animations to complete', async () => {
      const mockGetComputedStyle = vi.fn().mockReturnValue({
        transitionDuration: '0s',
        transitionDelay: '0s',
        animationDuration: '0.5s',
        animationDelay: '0.2s',
      });
      vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

      vi.useFakeTimers();

      const promise = settleCommand.execute(context);

      // Should wait for animation duration + delay (500ms + 200ms = 700ms)
      vi.advanceTimersByTime(750);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('should handle multiple transition durations', async () => {
      const mockGetComputedStyle = vi.fn().mockReturnValue({
        transitionDuration: '0.2s, 0.5s, 0.1s',
        transitionDelay: '0s, 0.1s, 0s',
        animationDuration: '0s',
        animationDelay: '0s',
      });
      vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

      vi.useFakeTimers();

      const promise = settleCommand.execute(context);

      // Should wait for longest transition (0.5s + 0.1s = 600ms)
      vi.advanceTimersByTime(650);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  describe('Event-based Settling', () => {
    it('should listen for transitionend events', async () => {
      const mockGetComputedStyle = vi.fn().mockReturnValue({
        transitionDuration: '0.3s',
        transitionDelay: '0s',
        animationDuration: '0s',
        animationDelay: '0s',
      });
      vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

      const promise = settleCommand.execute(context);

      // Simulate transitionend event
      setTimeout(() => {
        mockElement.dispatchEvent(new Event('transitionend'));
      }, 50);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.unstubAllGlobals();
    });

    it('should listen for animationend events', async () => {
      const mockGetComputedStyle = vi.fn().mockReturnValue({
        transitionDuration: '0s',
        transitionDelay: '0s',
        animationDuration: '0.5s',
        animationDelay: '0s',
      });
      vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

      const promise = settleCommand.execute(context);

      // Simulate animationend event
      setTimeout(() => {
        mockElement.dispatchEvent(new Event('animationend'));
      }, 50);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.unstubAllGlobals();
    });
  });

  describe('Timeout Handling', () => {
    it('should use default timeout when no explicit timeout provided', async () => {
      const mockGetComputedStyle = vi.fn().mockReturnValue({
        transitionDuration: '10s', // Very long duration
        transitionDelay: '0s',
        animationDuration: '0s',
        animationDelay: '0s',
      });
      vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

      vi.useFakeTimers();

      const promise = settleCommand.execute(context);

      // Should timeout after default timeout (e.g., 5000ms)
      vi.advanceTimersByTime(5100);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('should respect explicit timeout', async () => {
      const mockGetComputedStyle = vi.fn().mockReturnValue({
        transitionDuration: '10s', // Very long duration
        transitionDelay: '0s',
        animationDuration: '0s',
        animationDelay: '0s',
      });
      vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

      vi.useFakeTimers();

      const promise = settleCommand.execute(context, 'for', 500);

      // Should timeout after specified timeout (500ms)
      vi.advanceTimersByTime(550);

      const result = await promise;
      expect(result).toBe(mockElement);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  describe('Element Resolution', () => {
    it('should resolve CSS selector strings', async () => {
      const targetElement = document.createElement('div');
      targetElement.id = 'test-element';
      document.body.appendChild(targetElement);

      vi.useFakeTimers();

      const promise = settleCommand.execute(context, '#test-element');

      vi.advanceTimersByTime(100);

      const result = await promise;
      expect(result).toBe(targetElement);

      document.body.removeChild(targetElement);
      vi.useRealTimers();
    });

    it('should handle element not found gracefully', async () => {
      await expect(settleCommand.execute(context, '#non-existent')).rejects.toThrow(
        'Settle target not found: #non-existent'
      );
    });
  });

  describe('Validation', () => {
    it('should validate correct syntax', () => {
      expect(settleCommand.validate([])).toBeNull();
      expect(settleCommand.validate(['for', 500])).toBeNull();
      expect(settleCommand.validate([mockElement])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(settleCommand.validate(['invalid'])).toContain('Invalid settle syntax');
      expect(settleCommand.validate(['for'])).toContain('Timeout value required');
      expect(settleCommand.validate(['for', 'invalid'])).toContain('Timeout must be a number');
    });
  });
});
