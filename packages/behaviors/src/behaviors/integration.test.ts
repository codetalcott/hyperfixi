import { describe, it, expect, vi } from 'vitest';
import type { LokaScriptInstance } from '../schemas/types';
import { registerDraggable, draggableSource } from './draggable';
import { registerToggleable, toggleableSource } from './toggleable';
import { registerRemovable, removableSource } from './removable';
import { registerSortable, sortableSource } from './sortable';
import { registerResizable, resizableSource } from './resizable';
import { registerClipboard, clipboardSource } from './clipboard';
import { registerAutoDismiss, autoDismissSource } from './autodismiss';
import { registerClickOutside, clickOutsideSource } from './clickoutside';
import { registerFocusTrap, focusTrapSource } from './focustrap';
import { registerScrollReveal, scrollRevealSource } from './scrollreveal';
import { registerTabs, tabsSource } from './tabs';

function createMockInstance(overrides: Partial<LokaScriptInstance> = {}): LokaScriptInstance {
  return {
    compileSync: vi.fn().mockReturnValue({ ok: true, ast: { type: 'behavior' } }),
    execute: vi.fn().mockResolvedValue(undefined),
    createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
    ...overrides,
  };
}

// Source-compiled behaviors (use compileSync + execute)
const compiledBehaviors = [
  { name: 'Removable', register: registerRemovable, source: removableSource },
] as const;

// Imperative behaviors (use synthetic node with imperativeInstaller)
const imperativeBehaviors = [
  { name: 'Draggable', register: registerDraggable, source: draggableSource },
  { name: 'Toggleable', register: registerToggleable, source: toggleableSource },
  { name: 'Sortable', register: registerSortable, source: sortableSource },
  { name: 'Resizable', register: registerResizable, source: resizableSource },
  { name: 'Clipboard', register: registerClipboard, source: clipboardSource },
  { name: 'AutoDismiss', register: registerAutoDismiss, source: autoDismissSource },
  { name: 'ClickOutside', register: registerClickOutside, source: clickOutsideSource },
  { name: 'FocusTrap', register: registerFocusTrap, source: focusTrapSource },
  { name: 'ScrollReveal', register: registerScrollReveal, source: scrollRevealSource },
  { name: 'Tabs', register: registerTabs, source: tabsSource },
] as const;

describe('behavior registration integration', () => {
  describe('source-compiled behaviors', () => {
    for (const { name, register, source } of compiledBehaviors) {
      describe(name, () => {
        it('should compile with traditional parser', async () => {
          const mock = createMockInstance();
          await register(mock);

          expect(mock.compileSync).toHaveBeenCalledWith(source, { traditional: true });
        });

        it('should create context and execute', async () => {
          const mock = createMockInstance();
          await register(mock);

          expect(mock.createContext).toHaveBeenCalled();
          expect(mock.execute).toHaveBeenCalledWith(
            { type: 'behavior' },
            { locals: expect.any(Map), globals: expect.any(Map) }
          );
        });

        it('should throw on compile failure', async () => {
          const mock = createMockInstance({
            compileSync: vi.fn().mockReturnValue({
              ok: false,
              errors: [{ message: 'syntax error', line: 1 }],
            }),
          });

          await expect(register(mock)).rejects.toThrowError(
            new RegExp(`Failed to compile ${name}`)
          );
        });

        it('should throw when lokascript is not available', async () => {
          await expect(register(undefined)).rejects.toThrowError(/LokaScript not found/);
        });

        it('should fall back to manual context when createContext is missing', async () => {
          const mock = createMockInstance();
          delete (mock as Partial<LokaScriptInstance>).createContext;

          await register(mock);

          expect(mock.execute).toHaveBeenCalledWith(
            { type: 'behavior' },
            expect.objectContaining({
              locals: expect.any(Map),
              globals: expect.any(Map),
            })
          );
        });
      });
    }
  });

  describe('imperative behaviors', () => {
    for (const { name, register } of imperativeBehaviors) {
      describe(name, () => {
        it('should register via synthetic node with imperativeInstaller', async () => {
          const mock = createMockInstance();
          await register(mock);

          // Imperative behaviors do NOT call compileSync
          expect(mock.compileSync).not.toHaveBeenCalled();

          // They call execute with a synthetic node containing imperativeInstaller
          expect(mock.execute).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'behavior',
              name,
              imperativeInstaller: expect.any(Function),
            }),
            expect.objectContaining({
              locals: expect.any(Map),
              globals: expect.any(Map),
            })
          );
        });

        it('should create context', async () => {
          const mock = createMockInstance();
          await register(mock);
          expect(mock.createContext).toHaveBeenCalled();
        });

        it('should throw when lokascript is not available', async () => {
          await expect(register(undefined)).rejects.toThrowError(/LokaScript not found/);
        });

        it('should fall back to manual context when createContext is missing', async () => {
          const mock = createMockInstance();
          delete (mock as Partial<LokaScriptInstance>).createContext;

          await register(mock);

          expect(mock.execute).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'behavior',
              name,
              imperativeInstaller: expect.any(Function),
            }),
            expect.objectContaining({
              locals: expect.any(Map),
              globals: expect.any(Map),
            })
          );
        });
      });
    }
  });
});
