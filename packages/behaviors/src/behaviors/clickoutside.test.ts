import { describe, it, expect, vi } from 'vitest';

describe('ClickOutside behavior', () => {
  describe('registerClickOutside', () => {
    it('should compile its hyperscript source and execute', async () => {
      const { registerClickOutside, clickOutsideSource } = await import('./clickoutside');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: true, ast: { type: 'behavior' } }),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      await registerClickOutside(mock);

      expect(mock.compileSync).toHaveBeenCalledWith(clickOutsideSource, { traditional: true });
      expect(mock.execute).toHaveBeenCalledWith(
        { type: 'behavior' },
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
      );
    });

    it('should throw on compile failure', async () => {
      const { registerClickOutside } = await import('./clickoutside');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: false, errors: [{ message: 'boom' }] }),
        execute: vi.fn(),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };
      await expect(registerClickOutside(mock)).rejects.toThrowError(
        /Failed to compile ClickOutside/
      );
    });

    it('should throw when no runtime available', async () => {
      const { registerClickOutside } = await import('./clickoutside');
      await expect(registerClickOutside(undefined)).rejects.toThrowError(/LokaScript not found/);
    });
  });

  describe('schema', () => {
    it('should export valid metadata', async () => {
      const { clickOutsideMetadata } = await import('./clickoutside');
      expect(clickOutsideMetadata.name).toBe('ClickOutside');
      expect(clickOutsideMetadata.category).toBe('ui');
      expect(clickOutsideMetadata.tier).toBe('core');
    });

    it('should have source containing behavior declaration', async () => {
      const { clickOutsideSource } = await import('./clickoutside');
      expect(clickOutsideSource).toContain('behavior ClickOutside');
      expect(clickOutsideSource).toContain('pointerdown');
    });

    it('should document clickoutside event', async () => {
      const { clickOutsideMetadata } = await import('./clickoutside');
      const eventNames = clickOutsideMetadata.events.map(e => e.name);
      expect(eventNames).toContain('clickoutside');
    });
  });
});
