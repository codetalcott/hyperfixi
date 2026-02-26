import { describe, it, expect, vi } from 'vitest';

describe('Tabs behavior', () => {
  describe('registerTabs', () => {
    it('should register with synthetic node via execute', async () => {
      const { registerTabs } = await import('./tabs');
      const mock = {
        compileSync: vi.fn(),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      await registerTabs(mock);

      expect(mock.compileSync).not.toHaveBeenCalled();
      expect(mock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'behavior',
          name: 'Tabs',
          imperativeInstaller: expect.any(Function),
        }),
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
      );
    });

    it('should throw when no runtime available', async () => {
      const { registerTabs } = await import('./tabs');
      await expect(registerTabs(undefined)).rejects.toThrowError(/LokaScript not found/);
    });

    it('should fall back to manual context when createContext is missing', async () => {
      const { registerTabs } = await import('./tabs');
      const mock = {
        compileSync: vi.fn(),
        execute: vi.fn().mockResolvedValue(undefined),
      };

      await registerTabs(mock as any);
      expect(mock.execute).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ locals: expect.any(Map), globals: expect.any(Map) })
      );
    });
  });

  describe('schema', () => {
    it('should export valid metadata', async () => {
      const { tabsMetadata } = await import('./tabs');
      expect(tabsMetadata.name).toBe('Tabs');
      expect(tabsMetadata.category).toBe('ui');
      expect(tabsMetadata.tier).toBe('core');
    });

    it('should have source containing behavior declaration', async () => {
      const { tabsSource } = await import('./tabs');
      expect(tabsSource).toContain('behavior Tabs');
      expect(tabsSource).toContain('orientation');
    });

    it('should document tabs:change and tabs:changed events', async () => {
      const { tabsMetadata } = await import('./tabs');
      const eventNames = tabsMetadata.events.map(e => e.name);
      expect(eventNames).toContain('tabs:change');
      expect(eventNames).toContain('tabs:changed');
    });

    it('should document ARIA requirements', async () => {
      const { tabsMetadata } = await import('./tabs');
      expect(tabsMetadata.requirements).toBeDefined();
      const reqs = tabsMetadata.requirements!.join(' ');
      expect(reqs).toContain('aria-selected');
      expect(reqs).toContain('tabindex');
    });

    it('should have orientation enum parameter', async () => {
      const { tabsMetadata } = await import('./tabs');
      const orientationParam = tabsMetadata.parameters.find(p => p.name === 'orientation');
      expect(orientationParam?.enum).toEqual(['horizontal', 'vertical']);
    });
  });
});
