import { describe, it, expect, vi } from 'vitest';

describe('ClickOutside behavior', () => {
  describe('registerClickOutside', () => {
    it('should register with synthetic node via execute', async () => {
      const { registerClickOutside } = await import('./clickoutside');
      const mock = {
        compileSync: vi.fn(),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      await registerClickOutside(mock);

      expect(mock.compileSync).not.toHaveBeenCalled();
      expect(mock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'behavior',
          name: 'ClickOutside',
          imperativeInstaller: expect.any(Function),
        }),
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
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
