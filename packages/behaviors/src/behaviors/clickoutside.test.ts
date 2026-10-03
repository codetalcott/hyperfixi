import { describe, it, expect, vi } from 'vitest';

describe('ClickOutside behavior', () => {
  describe('registerClickOutside', () => {
    it('defines the behavior on the host from its hyperscript source', async () => {
      const { registerClickOutside, clickOutsideSource } = await import('./clickoutside');
      const host = { evaluate: vi.fn() };

      await registerClickOutside(host);

      expect(host.evaluate).toHaveBeenCalledWith(clickOutsideSource);
    });

    it('should throw when the host rejects the source', async () => {
      const { registerClickOutside } = await import('./clickoutside');
      const host = {
        evaluate: vi.fn(() => {
          throw new Error('boom');
        }),
      };
      await expect(registerClickOutside(host)).rejects.toThrowError(
        /Failed to define ClickOutside/
      );
    });

    it('should throw when no host is available', async () => {
      const { registerClickOutside } = await import('./clickoutside');
      await expect(registerClickOutside(undefined)).rejects.toThrowError(/No hyperscript host/);
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
