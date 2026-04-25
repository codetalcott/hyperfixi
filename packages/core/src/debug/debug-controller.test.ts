/**
 * Tests for DebugController — interactive step-through debugger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DebugController } from './debug-controller';
import type { HookContext } from '../types/hooks';
import type { ExecutionContext } from '../types/base-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockHookContext(commandName = 'toggle', element?: Element): HookContext {
  const el = element || document.createElement('button');
  return {
    commandName,
    element: el,
    args: [],
    modifiers: {},
    executionContext: {
      me: el,
      you: null,
      it: null,
      result: null,
      locals: new Map<string, unknown>(),
      globals: new Map<string, unknown>(),
      flags: {
        halted: false,
        breaking: false,
        continuing: false,
        returning: false,
        async: false,
      },
    } as unknown as ExecutionContext,
  };
}

/**
 * Simulate a command execution through the debug hooks.
 * Returns a promise that resolves when the afterExecute completes
 * (or stays pending if execution is paused).
 */
function simulateCommand(
  controller: DebugController,
  commandName = 'toggle',
  element?: Element
): { promise: Promise<void>; ctx: HookContext } {
  const ctx = createMockHookContext(commandName, element);
  const hooks = controller.hooks;

  const promise = (async () => {
    await hooks.beforeExecute!(ctx);
    await hooks.afterExecute!(ctx, undefined);
  })();

  return { promise, ctx };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DebugController', () => {
  let controller: DebugController;

  beforeEach(() => {
    controller = new DebugController();
  });

  // ─────────────────────────────────────────────────────────────
  // Enable / Disable
  // ─────────────────────────────────────────────────────────────

  describe('enable/disable', () => {
    it('should start disabled', () => {
      expect(controller.enabled).toBe(false);
    });

    it('should enable', () => {
      controller.enable();
      expect(controller.enabled).toBe(true);
    });

    it('should disable', () => {
      controller.enable();
      controller.disable();
      expect(controller.enabled).toBe(false);
    });

    it('should emit enabled/disabled events', () => {
      const enabled = vi.fn();
      const disabled = vi.fn();
      controller.on('enabled', enabled);
      controller.on('disabled', disabled);

      controller.enable();
      expect(enabled).toHaveBeenCalledTimes(1);

      controller.disable();
      expect(disabled).toHaveBeenCalledTimes(1);
    });

    it('should not pause when disabled', async () => {
      controller.pause();
      const { promise } = simulateCommand(controller);
      // Should complete immediately since debugger is disabled
      await promise;
      expect(controller.getState().paused).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Snapshot Capture
  // ─────────────────────────────────────────────────────────────

  describe('snapshot capture', () => {
    it('should capture snapshots when enabled', async () => {
      controller.enable();
      const { promise } = simulateCommand(controller, 'toggle');
      await promise;
      const history = controller.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].commandName).toBe('toggle');
    });

    it('should emit snapshot events', async () => {
      controller.enable();
      const snapshotFn = vi.fn();
      controller.on('snapshot', snapshotFn);

      const { promise } = simulateCommand(controller, 'add');
      await promise;

      expect(snapshotFn).toHaveBeenCalledTimes(1);
      expect(snapshotFn.mock.calls[0][0].commandName).toBe('add');
    });

    it('should capture element info', async () => {
      controller.enable();
      const btn = document.createElement('button');
      btn.id = 'myBtn';
      btn.classList.add('primary');
      const { promise } = simulateCommand(controller, 'toggle', btn);
      await promise;
      const snapshot = controller.getHistory()[0];
      expect(snapshot.variables['me']).toBe('<button#myBtn.primary>');
    });

    it('should capture local variables', async () => {
      controller.enable();
      const ctx = createMockHookContext('set');
      ctx.executionContext.locals.set('count', 42);
      ctx.executionContext.locals.set('name', 'test');

      await controller.hooks.beforeExecute!(ctx);
      await controller.hooks.afterExecute!(ctx, undefined);

      const snapshot = controller.getHistory()[0];
      expect(snapshot.variables[':count']).toBe(42);
      expect(snapshot.variables[':name']).toBe('test');
    });

    it('should not capture internal __prefixed locals', async () => {
      controller.enable();
      const ctx = createMockHookContext('set');
      ctx.executionContext.locals.set('__evaluator', () => {});
      ctx.executionContext.locals.set('count', 1);

      await controller.hooks.beforeExecute!(ctx);
      await controller.hooks.afterExecute!(ctx, undefined);

      const snapshot = controller.getHistory()[0];
      expect(snapshot.variables[':__evaluator']).toBeUndefined();
      expect(snapshot.variables[':count']).toBe(1);
    });

    it('should limit history size', async () => {
      controller.enable();
      // Run 250 commands (capacity is 200)
      for (let i = 0; i < 250; i++) {
        const { promise } = simulateCommand(controller, `cmd${i}`);
        await promise;
      }
      expect(controller.getHistory()).toHaveLength(200);
      // Oldest should be cmd50 (0-49 evicted)
      expect(controller.getHistory()[0].commandName).toBe('cmd50');
    });

    it('should clear history', async () => {
      controller.enable();
      const { promise } = simulateCommand(controller);
      await promise;
      expect(controller.getHistory()).toHaveLength(1);
      controller.clearHistory();
      expect(controller.getHistory()).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Pause & Resume
  // ─────────────────────────────────────────────────────────────

  describe('pause/resume', () => {
    it('should pause at next command when pause() is called', async () => {
      controller.enable();
      controller.pause();

      const pausedFn = vi.fn();
      controller.on('paused', pausedFn);

      const { promise } = simulateCommand(controller, 'toggle');

      // Give microtasks a chance to run
      await new Promise(r => setTimeout(r, 10));

      // Should be paused
      expect(controller.getState().paused).toBe(true);
      expect(pausedFn).toHaveBeenCalledTimes(1);

      // Resume
      controller.continue();
      await promise;
      expect(controller.getState().paused).toBe(false);
    });

    it('should emit resumed event on continue', async () => {
      controller.enable();
      controller.pause();

      const resumedFn = vi.fn();
      controller.on('resumed', resumedFn);

      const { promise } = simulateCommand(controller);
      await new Promise(r => setTimeout(r, 10));

      controller.continue();
      await promise;
      expect(resumedFn).toHaveBeenCalledTimes(1);
    });

    it('should resume execution on disable while paused', async () => {
      controller.enable();
      controller.pause();

      const { promise } = simulateCommand(controller);
      await new Promise(r => setTimeout(r, 10));
      expect(controller.getState().paused).toBe(true);

      // Disabling should force-resume
      controller.disable();
      await promise;
      expect(controller.getState().paused).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Step Modes
  // ─────────────────────────────────────────────────────────────

  describe('step modes', () => {
    it('stepInto should pause at every command', async () => {
      controller.enable();
      controller.pause(); // Pause initially

      const { promise: p1 } = simulateCommand(controller, 'toggle');
      await new Promise(r => setTimeout(r, 10));
      expect(controller.getState().paused).toBe(true);

      // Step into — should pause again at next command
      controller.stepInto();
      await new Promise(r => setTimeout(r, 10));
      // First command completes, but we need another command to test into behavior
      await p1;

      // Now simulate another command — should pause because mode is 'into'
      const { promise: p2 } = simulateCommand(controller, 'add');
      await new Promise(r => setTimeout(r, 10));
      expect(controller.getState().paused).toBe(true);

      controller.continue();
      await p2;
    });

    it('stepOver should pause at same depth', async () => {
      controller.enable();
      controller.pause();

      const { promise: p1 } = simulateCommand(controller, 'toggle');
      await new Promise(r => setTimeout(r, 10));
      expect(controller.getState().paused).toBe(true);

      // Step over — should pause at next command at same or shallower depth
      controller.stepOver();
      await p1;

      // Next command at same depth should pause
      const { promise: p2 } = simulateCommand(controller, 'add');
      await new Promise(r => setTimeout(r, 10));
      expect(controller.getState().paused).toBe(true);

      controller.continue();
      await p2;
    });

    it('continue should not pause without breakpoints', async () => {
      controller.enable();
      // In continue mode (default), no pausing
      const { promise } = simulateCommand(controller, 'toggle');
      await promise;
      expect(controller.getState().paused).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Breakpoints
  // ─────────────────────────────────────────────────────────────

  describe('breakpoints', () => {
    it('should pause at command-name breakpoint', async () => {
      controller.enable();
      controller.setBreakpoint({ type: 'command', value: 'toggle', enabled: true });

      const { promise } = simulateCommand(controller, 'toggle');
      await new Promise(r => setTimeout(r, 10));
      expect(controller.getState().paused).toBe(true);

      controller.continue();
      await promise;
    });

    it('should not pause for non-matching command breakpoint', async () => {
      controller.enable();
      controller.setBreakpoint({ type: 'command', value: 'toggle', enabled: true });

      const { promise } = simulateCommand(controller, 'add');
      await promise;
      expect(controller.getState().paused).toBe(false);
    });

    it('should pause at element-selector breakpoint', async () => {
      controller.enable();
      const btn = document.createElement('button');
      btn.classList.add('danger');
      document.body.appendChild(btn);

      controller.setBreakpoint({ type: 'element', value: '.danger', enabled: true });

      const { promise } = simulateCommand(controller, 'toggle', btn);
      await new Promise(r => setTimeout(r, 10));
      expect(controller.getState().paused).toBe(true);

      controller.continue();
      await promise;
      document.body.removeChild(btn);
    });

    it('should skip disabled breakpoints', async () => {
      controller.enable();
      controller.setBreakpoint({ type: 'command', value: 'toggle', enabled: false });

      const { promise } = simulateCommand(controller, 'toggle');
      await promise;
      expect(controller.getState().paused).toBe(false);
    });

    it('should track hit counts', async () => {
      controller.enable();
      const id = controller.setBreakpoint({ type: 'command', value: 'toggle', enabled: true });

      // Hit 1
      const { promise: p1 } = simulateCommand(controller, 'toggle');
      await new Promise(r => setTimeout(r, 10));
      controller.continue();
      await p1;

      // Hit 2
      const { promise: p2 } = simulateCommand(controller, 'toggle');
      await new Promise(r => setTimeout(r, 10));
      controller.continue();
      await p2;

      const bp = controller.getBreakpoints().find(b => b.id === id);
      expect(bp?.hitCount).toBe(2);
    });

    it('should remove breakpoints', async () => {
      controller.enable();
      const id = controller.setBreakpoint({ type: 'command', value: 'toggle', enabled: true });
      controller.removeBreakpoint(id);

      const { promise } = simulateCommand(controller, 'toggle');
      await promise;
      expect(controller.getState().paused).toBe(false);
    });

    it('should clear all breakpoints', () => {
      controller.setBreakpoint({ type: 'command', value: 'toggle', enabled: true });
      controller.setBreakpoint({ type: 'command', value: 'add', enabled: true });
      expect(controller.getBreakpoints()).toHaveLength(2);

      controller.clearBreakpoints();
      expect(controller.getBreakpoints()).toHaveLength(0);
    });

    it('should support expression breakpoints', async () => {
      controller.enable();
      controller.setBreakpoint({
        type: 'expression',
        value: 'commandName === "toggle"',
        enabled: true,
      });

      const { promise } = simulateCommand(controller, 'toggle');
      await new Promise(r => setTimeout(r, 10));
      expect(controller.getState().paused).toBe(true);

      controller.continue();
      await promise;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Event Listener Cleanup
  // ─────────────────────────────────────────────────────────────

  describe('event listeners', () => {
    it('should return unsubscribe function', async () => {
      controller.enable();
      const fn = vi.fn();
      const unsub = controller.on('snapshot', fn);

      const { promise: p1 } = simulateCommand(controller);
      await p1;
      expect(fn).toHaveBeenCalledTimes(1);

      unsub();

      const { promise: p2 } = simulateCommand(controller);
      await p2;
      // Should still be 1 — listener was removed
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not throw if listener throws', async () => {
      controller.enable();
      controller.on('snapshot', () => {
        throw new Error('bad listener');
      });

      const { promise } = simulateCommand(controller);
      // Should not throw
      await promise;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Depth tracking
  // ─────────────────────────────────────────────────────────────

  describe('call depth', () => {
    it('should track depth across commands', async () => {
      controller.enable();

      const { promise: p1 } = simulateCommand(controller, 'cmd1');
      await p1;
      // After afterExecute, depth returns to 0
      expect(controller.getState().callDepth).toBe(0);

      const { promise: p2 } = simulateCommand(controller, 'cmd2');
      await p2;
      expect(controller.getState().callDepth).toBe(0);
    });

    it('should capture depth in snapshots', async () => {
      controller.enable();
      const { promise } = simulateCommand(controller, 'toggle');
      await promise;

      const snapshot = controller.getHistory()[0];
      expect(snapshot.depth).toBe(1); // Depth is incremented before capture
    });

    it('should capture sequential indexes', async () => {
      controller.enable();
      const { promise: p1 } = simulateCommand(controller, 'cmd1');
      await p1;
      const { promise: p2 } = simulateCommand(controller, 'cmd2');
      await p2;
      const { promise: p3 } = simulateCommand(controller, 'cmd3');
      await p3;

      const history = controller.getHistory();
      expect(history[0].index).toBe(0);
      expect(history[1].index).toBe(1);
      expect(history[2].index).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getState()
  // ─────────────────────────────────────────────────────────────

  describe('getState', () => {
    it('should return a copy of state', () => {
      const state1 = controller.getState();
      const state2 = controller.getState();
      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values
    });

    it('should reflect current snapshot when paused', async () => {
      controller.enable();
      controller.pause();

      const { promise } = simulateCommand(controller, 'toggle');
      await new Promise(r => setTimeout(r, 10));

      const state = controller.getState();
      expect(state.paused).toBe(true);
      expect(state.currentSnapshot?.commandName).toBe('toggle');

      controller.continue();
      await promise;
    });
  });
});
