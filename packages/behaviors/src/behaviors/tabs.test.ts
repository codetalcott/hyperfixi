import { describe, it, expect, vi } from 'vitest';

describe('Tabs behavior', () => {
  describe('registerTabs', () => {
    it('defines the behavior on the host from its hyperscript source', async () => {
      const { registerTabs, tabsSource } = await import('./tabs');
      const host = { evaluate: vi.fn() };

      await registerTabs(host);

      expect(host.evaluate).toHaveBeenCalledWith(tabsSource);
    });

    it('should throw when the host rejects the source', async () => {
      const { registerTabs } = await import('./tabs');
      const host = {
        evaluate: vi.fn(() => {
          throw new Error('boom');
        }),
      };
      await expect(registerTabs(host)).rejects.toThrowError(/Failed to define Tabs/);
    });

    it('should throw when no host is available', async () => {
      const { registerTabs } = await import('./tabs');
      await expect(registerTabs(undefined)).rejects.toThrowError(/No hyperscript host/);
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
