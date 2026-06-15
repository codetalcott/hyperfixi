import { describe, it, expect, vi } from 'vitest';

describe('Clipboard behavior', () => {
  describe('registerClipboard', () => {
    it('should compile its hyperscript source and execute', async () => {
      const { registerClipboard, clipboardSource } = await import('./clipboard');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: true, ast: { type: 'behavior' } }),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      await registerClipboard(mock);

      expect(mock.compileSync).toHaveBeenCalledWith(clipboardSource, { traditional: true });
      expect(mock.execute).toHaveBeenCalledWith(
        { type: 'behavior' },
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
      );
    });

    it('should throw on compile failure', async () => {
      const { registerClipboard } = await import('./clipboard');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: false, errors: [{ message: 'boom' }] }),
        execute: vi.fn(),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };
      await expect(registerClipboard(mock)).rejects.toThrowError(/Failed to compile Clipboard/);
    });

    it('should throw when no runtime available', async () => {
      const { registerClipboard } = await import('./clipboard');
      await expect(registerClipboard(undefined)).rejects.toThrowError(/LokaScript not found/);
    });

    it('should fall back to manual context when createContext is missing', async () => {
      const { registerClipboard } = await import('./clipboard');
      const mock = {
        compileSync: vi.fn().mockReturnValue({ ok: true, ast: { type: 'behavior' } }),
        execute: vi.fn().mockResolvedValue(undefined),
      };

      await registerClipboard(mock as any);
      expect(mock.execute).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
      );
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
