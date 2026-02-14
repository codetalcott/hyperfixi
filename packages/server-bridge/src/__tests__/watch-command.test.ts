import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  patternToRegex,
  shouldScan,
  shouldSkip,
  createDebouncedRunner,
} from '../cli/watch-command.js';

describe('watch mode helpers', () => {
  describe('patternToRegex', () => {
    it('matches **/*.html', () => {
      const re = patternToRegex('**/*.html');
      expect(re.test('pages/index.html')).toBe(true);
      expect(re.test('deep/nested/page.html')).toBe(true);
      expect(re.test('page.html')).toBe(true);
      expect(re.test('page.htm')).toBe(false);
    });

    it('matches **/*.htm', () => {
      const re = patternToRegex('**/*.htm');
      expect(re.test('page.htm')).toBe(true);
      expect(re.test('page.html')).toBe(false);
    });

    it('matches node_modules/**', () => {
      const re = patternToRegex('node_modules/**');
      expect(re.test('node_modules/package/index.js')).toBe(true);
      expect(re.test('src/index.html')).toBe(false);
    });
  });

  describe('shouldScan', () => {
    it('returns true for matching patterns', () => {
      expect(shouldScan('index.html', ['**/*.html', '**/*.htm'])).toBe(true);
      expect(shouldScan('page.htm', ['**/*.html', '**/*.htm'])).toBe(true);
    });

    it('returns false for non-matching files', () => {
      expect(shouldScan('script.js', ['**/*.html', '**/*.htm'])).toBe(false);
    });
  });

  describe('shouldSkip', () => {
    it('skips node_modules', () => {
      expect(shouldSkip('node_modules/pkg/index.html', ['node_modules/**'])).toBe(true);
    });

    it('does not skip normal files', () => {
      expect(shouldSkip('src/index.html', ['node_modules/**', 'dist/**'])).toBe(false);
    });
  });
});

describe('createDebouncedRunner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes after debounce delay', async () => {
    const fn = vi.fn(async () => {});
    const { trigger } = createDebouncedRunner(fn, 100);

    trigger();
    expect(fn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on rapid triggers', async () => {
    const fn = vi.fn(async () => {});
    const { trigger } = createDebouncedRunner(fn, 100);

    trigger();
    await vi.advanceTimersByTimeAsync(50);
    trigger(); // reset
    await vi.advanceTimersByTimeAsync(50);
    expect(fn).not.toHaveBeenCalled(); // only 50ms since last trigger

    await vi.advanceTimersByTimeAsync(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('prevents overlapping concurrent executions', async () => {
    let running = 0;
    let maxConcurrent = 0;
    const fn = vi.fn(async () => {
      running++;
      maxConcurrent = Math.max(maxConcurrent, running);
      await new Promise(r => setTimeout(r, 200));
      running--;
    });
    const { trigger } = createDebouncedRunner(fn, 50);

    trigger();
    await vi.advanceTimersByTimeAsync(50); // starts first run

    // Trigger again while first is running
    trigger();
    await vi.advanceTimersByTimeAsync(50); // debounce fires, but run() sees running=true → queued

    expect(fn).toHaveBeenCalledTimes(1); // first call started, second queued
    expect(maxConcurrent).toBe(1);

    // Let first run complete
    await vi.advanceTimersByTimeAsync(200);
    // queued=true → trigger() called → wait for debounce
    await vi.advanceTimersByTimeAsync(50);
    // second run starts
    await vi.advanceTimersByTimeAsync(200);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(maxConcurrent).toBe(1);
  });

  it('queues follow-up when triggered during execution', async () => {
    const calls: number[] = [];
    let callCount = 0;
    const fn = vi.fn(async () => {
      const n = ++callCount;
      calls.push(n);
      await new Promise(r => setTimeout(r, 100));
    });
    const { trigger } = createDebouncedRunner(fn, 50);

    trigger();
    await vi.advanceTimersByTimeAsync(50); // fn starts (call 1)
    expect(calls).toEqual([1]);

    trigger(); // during execution → queued
    await vi.advanceTimersByTimeAsync(100); // call 1 finishes, queued → trigger
    await vi.advanceTimersByTimeAsync(50); // debounce fires → call 2 starts
    expect(calls).toEqual([1, 2]);

    await vi.advanceTimersByTimeAsync(100); // call 2 finishes
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
