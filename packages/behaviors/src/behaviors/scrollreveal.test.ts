import { describe, it, expect, vi } from 'vitest';

describe('ScrollReveal behavior', () => {
  describe('registerScrollReveal', () => {
    it('should compile its hyperscript source and execute', async () => {
      const { registerScrollReveal, scrollRevealSource } = await import('./scrollreveal');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: true, ast: { type: 'behavior' } }),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      await registerScrollReveal(mock);

      expect(mock.compileSync).toHaveBeenCalledWith(scrollRevealSource, { traditional: true });
      expect(mock.execute).toHaveBeenCalledWith(
        { type: 'behavior' },
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
      );
    });

    it('should throw on compile failure', async () => {
      const { registerScrollReveal } = await import('./scrollreveal');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: false, errors: [{ message: 'boom' }] }),
        execute: vi.fn(),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };
      await expect(registerScrollReveal(mock)).rejects.toThrowError(
        /Failed to compile ScrollReveal/
      );
    });

    it('should throw when no runtime available', async () => {
      const { registerScrollReveal } = await import('./scrollreveal');
      await expect(registerScrollReveal(undefined)).rejects.toThrowError(/LokaScript not found/);
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
