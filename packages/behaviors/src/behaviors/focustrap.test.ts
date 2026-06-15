import { describe, it, expect, vi } from 'vitest';

describe('FocusTrap behavior', () => {
  describe('registerFocusTrap', () => {
    it('should compile its hyperscript source and execute', async () => {
      const { registerFocusTrap, focusTrapSource } = await import('./focustrap');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: true, ast: { type: 'behavior' } }),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      await registerFocusTrap(mock);

      expect(mock.compileSync).toHaveBeenCalledWith(focusTrapSource, { traditional: true });
      expect(mock.execute).toHaveBeenCalledWith(
        { type: 'behavior' },
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
      );
    });

    it('should throw on compile failure', async () => {
      const { registerFocusTrap } = await import('./focustrap');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: false, errors: [{ message: 'boom' }] }),
        execute: vi.fn(),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };
      await expect(registerFocusTrap(mock)).rejects.toThrowError(/Failed to compile FocusTrap/);
    });

    it('should throw when no runtime available', async () => {
      const { registerFocusTrap } = await import('./focustrap');
      await expect(registerFocusTrap(undefined)).rejects.toThrowError(/LokaScript not found/);
    });
  });

  describe('schema', () => {
    it('should export valid metadata', async () => {
      const { focusTrapMetadata } = await import('./focustrap');
      expect(focusTrapMetadata.name).toBe('FocusTrap');
      expect(focusTrapMetadata.category).toBe('ui');
      expect(focusTrapMetadata.tier).toBe('core');
    });

    it('should have source containing behavior declaration', async () => {
      const { focusTrapSource } = await import('./focustrap');
      expect(focusTrapSource).toContain('behavior FocusTrap');
    });

    it('should document activation events', async () => {
      const { focusTrapMetadata } = await import('./focustrap');
      const eventNames = focusTrapMetadata.events.map(e => e.name);
      expect(eventNames).toContain('focustrap:activated');
      expect(eventNames).toContain('focustrap:deactivated');
    });

    it('should document aria-modal requirement', async () => {
      const { focusTrapMetadata } = await import('./focustrap');
      expect(focusTrapMetadata.requirements).toBeDefined();
      const reqs = focusTrapMetadata.requirements!.join(' ');
      expect(reqs).toContain('aria-modal');
    });
  });
});
