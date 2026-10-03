import { describe, it, expect, vi } from 'vitest';

describe('FocusTrap behavior', () => {
  describe('registerFocusTrap', () => {
    it('defines the behavior on the host from its hyperscript source', async () => {
      const { registerFocusTrap, focusTrapSource } = await import('./focustrap');
      const host = { evaluate: vi.fn() };

      await registerFocusTrap(host);

      expect(host.evaluate).toHaveBeenCalledWith(focusTrapSource);
    });

    it('should throw when the host rejects the source', async () => {
      const { registerFocusTrap } = await import('./focustrap');
      const host = {
        evaluate: vi.fn(() => {
          throw new Error('boom');
        }),
      };
      await expect(registerFocusTrap(host)).rejects.toThrowError(/Failed to define FocusTrap/);
    });

    it('should throw when no host is available', async () => {
      const { registerFocusTrap } = await import('./focustrap');
      await expect(registerFocusTrap(undefined)).rejects.toThrowError(/No hyperscript host/);
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
