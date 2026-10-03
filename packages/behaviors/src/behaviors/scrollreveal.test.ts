import { describe, it, expect, vi } from 'vitest';

describe('ScrollReveal behavior', () => {
  describe('registerScrollReveal', () => {
    it('defines the behavior on the host from its hyperscript source', async () => {
      const { registerScrollReveal, scrollRevealSource } = await import('./scrollreveal');
      const host = { evaluate: vi.fn() };

      await registerScrollReveal(host);

      expect(host.evaluate).toHaveBeenCalledWith(scrollRevealSource);
    });

    it('should throw when the host rejects the source', async () => {
      const { registerScrollReveal } = await import('./scrollreveal');
      const host = {
        evaluate: vi.fn(() => {
          throw new Error('boom');
        }),
      };
      await expect(registerScrollReveal(host)).rejects.toThrowError(
        /Failed to define ScrollReveal/
      );
    });

    it('should throw when no host is available', async () => {
      const { registerScrollReveal } = await import('./scrollreveal');
      await expect(registerScrollReveal(undefined)).rejects.toThrowError(/No hyperscript host/);
    });
  });

  describe('schema', () => {
    it('should export valid metadata', async () => {
      const { scrollRevealMetadata } = await import('./scrollreveal');
      expect(scrollRevealMetadata.name).toBe('ScrollReveal');
      expect(scrollRevealMetadata.category).toBe('layout');
      expect(scrollRevealMetadata.tier).toBe('common');
    });

    it('should have source containing behavior declaration', async () => {
      const { scrollRevealSource } = await import('./scrollreveal');
      expect(scrollRevealSource).toContain('behavior ScrollReveal');
      expect(scrollRevealSource).toContain('IntersectionObserver');
    });

    it('should document enter/exit events', async () => {
      const { scrollRevealMetadata } = await import('./scrollreveal');
      const eventNames = scrollRevealMetadata.events.map(e => e.name);
      expect(eventNames).toContain('scrollreveal:enter');
      expect(eventNames).toContain('scrollreveal:exit');
    });

    it('should document IntersectionObserver requirement', async () => {
      const { scrollRevealMetadata } = await import('./scrollreveal');
      const reqs = scrollRevealMetadata.requirements!.join(' ');
      expect(reqs).toContain('IntersectionObserver');
    });
  });
});
