import { describe, it, expect, vi } from 'vitest';

describe('AutoDismiss behavior', () => {
  describe('registerAutoDismiss', () => {
    it('should register with synthetic node via execute', async () => {
      const { registerAutoDismiss } = await import('./autodismiss');
      const mock = {
        compileSync: vi.fn(),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      await registerAutoDismiss(mock);

      expect(mock.compileSync).not.toHaveBeenCalled();
      expect(mock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'behavior',
          name: 'AutoDismiss',
          imperativeInstaller: expect.any(Function),
        }),
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
      );
    });

    it('should throw when no runtime available', async () => {
      const { registerAutoDismiss } = await import('./autodismiss');
      await expect(registerAutoDismiss(undefined)).rejects.toThrowError(/LokaScript not found/);
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
