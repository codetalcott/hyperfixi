import { describe, it, expect, vi } from 'vitest';
import type { LokaScriptInstance } from '../schemas/types';
import { registerDraggable, draggableSource } from './draggable';
import { registerToggleable, toggleableSource } from './toggleable';
import { registerRemovable, removableSource } from './removable';
import { registerSortable, sortableSource } from './sortable';
import { registerResizable, resizableSource } from './resizable';

function createMockInstance(overrides: Partial<LokaScriptInstance> = {}): LokaScriptInstance {
  return {
    compileSync: vi.fn().mockReturnValue({ ok: true, ast: { type: 'behavior' } }),
    execute: vi.fn().mockResolvedValue(undefined),
    createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
    ...overrides,
  };
}

const behaviors = [
  { name: 'Draggable', register: registerDraggable, source: draggableSource },
  { name: 'Toggleable', register: registerToggleable, source: toggleableSource },
  { name: 'Removable', register: registerRemovable, source: removableSource },
  { name: 'Sortable', register: registerSortable, source: sortableSource },
  { name: 'Resizable', register: registerResizable, source: resizableSource },
] as const;

describe('behavior registration integration', () => {
  for (const { name, register, source } of behaviors) {
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

        await expect(register(mock)).rejects.toThrowError(new RegExp(`Failed to compile ${name}`));
      });

      it('should throw when lokascript is not available', async () => {
        await expect(register(undefined)).rejects.toThrowError(/LokaScript not found/);
      });

      it('should fall back to manual context when createContext is missing', async () => {
        const mock = createMockInstance();
        // Remove createContext
        delete (mock as Partial<LokaScriptInstance>).createContext;

        await register(mock);

        // Should still call execute with a fallback context
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
