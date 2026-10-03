import { describe, it, expect, vi } from 'vitest';

describe('AutoDismiss behavior', () => {
  describe('registerAutoDismiss', () => {
    it('defines the behavior on the host from its hyperscript source', async () => {
      const { registerAutoDismiss, autoDismissSource } = await import('./autodismiss');
      const host = { evaluate: vi.fn() };

      await registerAutoDismiss(host);

      expect(host.evaluate).toHaveBeenCalledWith(autoDismissSource);
    });

    it('should throw when the host rejects the source', async () => {
      const { registerAutoDismiss } = await import('./autodismiss');
      const host = {
        evaluate: vi.fn(() => {
          throw new Error('boom');
        }),
      };
      await expect(registerAutoDismiss(host)).rejects.toThrowError(/Failed to define AutoDismiss/);
    });

    it('should throw when no host is available', async () => {
      const { registerAutoDismiss } = await import('./autodismiss');
      await expect(registerAutoDismiss(undefined)).rejects.toThrowError(/No hyperscript host/);
    });
  });

  describe('schema', () => {
    it('should export valid metadata', async () => {
      const { autoDismissMetadata } = await import('./autodismiss');
      expect(autoDismissMetadata.name).toBe('AutoDismiss');
      expect(autoDismissMetadata.category).toBe('ui');
      expect(autoDismissMetadata.tier).toBe('core');
    });

    it('should have source containing behavior declaration', async () => {
      const { autoDismissSource } = await import('./autodismiss');
      expect(autoDismissSource).toContain('behavior AutoDismiss');
      expect(autoDismissSource).toContain('autodismiss:dismissed');
    });

    it('should document all lifecycle events', async () => {
      const { autoDismissMetadata } = await import('./autodismiss');
      const eventNames = autoDismissMetadata.events.map(e => e.name);
      expect(eventNames).toContain('autodismiss:start');
      expect(eventNames).toContain('autodismiss:dismissed');
      expect(eventNames).toContain('autodismiss:paused');
      expect(eventNames).toContain('autodismiss:resumed');
    });

    it('should have fade enum for effect parameter', async () => {
      const { autoDismissMetadata } = await import('./autodismiss');
      const effectParam = autoDismissMetadata.parameters.find(p => p.name === 'effect');
      expect(effectParam?.enum).toEqual(['fade', 'none']);
    });
  });
});
