import { describe, it, expect, vi } from 'vitest';

describe('Clipboard behavior', () => {
  describe('registerClipboard', () => {
    it('defines the behavior on the host from its hyperscript source', async () => {
      const { registerClipboard, clipboardSource } = await import('./clipboard');
      const host = { evaluate: vi.fn() };

      await registerClipboard(host);

      expect(host.evaluate).toHaveBeenCalledWith(clipboardSource);
    });

    it('should throw when the host rejects the source', async () => {
      const { registerClipboard } = await import('./clipboard');
      const host = {
        evaluate: vi.fn(() => {
          throw new Error('boom');
        }),
      };
      await expect(registerClipboard(host)).rejects.toThrowError(/Failed to define Clipboard/);
    });

    it('should throw when no host is available', async () => {
      const { registerClipboard } = await import('./clipboard');
      await expect(registerClipboard(undefined)).rejects.toThrowError(/No hyperscript host/);
    });
  });

  describe('schema', () => {
    it('should export valid metadata', async () => {
      const { clipboardMetadata } = await import('./clipboard');
      expect(clipboardMetadata.name).toBe('Clipboard');
      expect(clipboardMetadata.category).toBe('ui');
      expect(clipboardMetadata.tier).toBe('core');
    });

    it('should have source containing behavior declaration', async () => {
      const { clipboardSource } = await import('./clipboard');
      expect(clipboardSource).toContain('behavior Clipboard');
      expect(clipboardSource).toContain('clipboard:copied');
    });

    it('should document clipboard:copied and clipboard:error events', async () => {
      const { clipboardMetadata } = await import('./clipboard');
      const eventNames = clipboardMetadata.events.map(e => e.name);
      expect(eventNames).toContain('clipboard:copied');
      expect(eventNames).toContain('clipboard:error');
    });
  });
});
