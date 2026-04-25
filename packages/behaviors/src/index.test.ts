import { describe, it, expect } from 'vitest';
import {
  // Individual behavior exports
  draggableSource,
  draggableMetadata,
  removableSource,
  removableMetadata,
  toggleableSource,
  toggleableMetadata,
  sortableSource,
  sortableMetadata,
  resizableSource,
  resizableMetadata,
  clipboardSource,
  clipboardMetadata,
  autoDismissSource,
  autoDismissMetadata,
  clickOutsideSource,
  clickOutsideMetadata,
  focusTrapSource,
  focusTrapMetadata,
  scrollRevealSource,
  scrollRevealMetadata,
  tabsSource,
  tabsMetadata,
  // Registry functions
  getAvailableBehaviors,
  getBehaviorsByCategory,
  getBehaviorsByTier,
  getAllSchemas,
  // Registration functions
  registerDraggable,
  registerRemovable,
  registerToggleable,
  registerSortable,
  registerResizable,
  registerClipboard,
  registerAutoDismiss,
  registerClickOutside,
  registerFocusTrap,
  registerScrollReveal,
  registerTabs,
  registerAll,
} from './index';

describe('@hyperfixi/behaviors', () => {
  describe('exports', () => {
    it('should export all behavior sources', () => {
      expect(draggableSource).toBeDefined();
      expect(removableSource).toBeDefined();
      expect(toggleableSource).toBeDefined();
      expect(sortableSource).toBeDefined();
      expect(resizableSource).toBeDefined();
      expect(clipboardSource).toBeDefined();
      expect(autoDismissSource).toBeDefined();
      expect(clickOutsideSource).toBeDefined();
      expect(focusTrapSource).toBeDefined();
      expect(scrollRevealSource).toBeDefined();
      expect(tabsSource).toBeDefined();
    });

    it('should export all behavior metadata', () => {
      expect(draggableMetadata.name).toBe('Draggable');
      expect(removableMetadata.name).toBe('Removable');
      expect(toggleableMetadata.name).toBe('Toggleable');
      expect(sortableMetadata.name).toBe('Sortable');
      expect(resizableMetadata.name).toBe('Resizable');
      expect(clipboardMetadata.name).toBe('Clipboard');
      expect(autoDismissMetadata.name).toBe('AutoDismiss');
      expect(clickOutsideMetadata.name).toBe('ClickOutside');
      expect(focusTrapMetadata.name).toBe('FocusTrap');
      expect(scrollRevealMetadata.name).toBe('ScrollReveal');
      expect(tabsMetadata.name).toBe('Tabs');
    });

    it('should export register functions', () => {
      expect(registerDraggable).toBeDefined();
      expect(registerRemovable).toBeDefined();
      expect(registerToggleable).toBeDefined();
      expect(registerSortable).toBeDefined();
      expect(registerResizable).toBeDefined();
      expect(registerClipboard).toBeDefined();
      expect(registerAutoDismiss).toBeDefined();
      expect(registerClickOutside).toBeDefined();
      expect(registerFocusTrap).toBeDefined();
      expect(registerScrollReveal).toBeDefined();
      expect(registerTabs).toBeDefined();
      expect(registerAll).toBeDefined();
    });
  });

  describe('registry', () => {
    it('getAvailableBehaviors should return all behavior names', () => {
      const names = getAvailableBehaviors();
      expect(names).toContain('Draggable');
      expect(names).toContain('Removable');
      expect(names).toContain('Toggleable');
      expect(names).toContain('Sortable');
      expect(names).toContain('Resizable');
      expect(names).toContain('Clipboard');
      expect(names).toContain('AutoDismiss');
      expect(names).toContain('ClickOutside');
      expect(names).toContain('FocusTrap');
      expect(names).toContain('ScrollReveal');
      expect(names).toContain('Tabs');
      expect(names.length).toBe(11);
    });

    it('getBehaviorsByCategory should group by category', () => {
      const ui = getBehaviorsByCategory('ui');
      expect(ui).toContain('Draggable');
      expect(ui).toContain('Sortable');
      expect(ui).toContain('Resizable');
      expect(ui).toContain('Clipboard');
      expect(ui).toContain('AutoDismiss');
      expect(ui).toContain('ClickOutside');
      expect(ui).toContain('FocusTrap');
      expect(ui).toContain('Tabs');
      expect(getBehaviorsByCategory('data')).toEqual(['Removable']);
      expect(getBehaviorsByCategory('form')).toEqual(['Toggleable']);
      expect(getBehaviorsByCategory('layout')).toEqual(['ScrollReveal']);
    });

    it('getBehaviorsByTier should group by tier', () => {
      const core = getBehaviorsByTier('core');
      expect(core).toContain('Draggable');
      expect(core).toContain('Toggleable');
      expect(core).toContain('Clipboard');
      expect(core).toContain('AutoDismiss');
      expect(core).toContain('ClickOutside');
      expect(core).toContain('FocusTrap');
      expect(core).toContain('Tabs');
      const common = getBehaviorsByTier('common');
      expect(common).toContain('Sortable');
      expect(common).toContain('Removable');
      expect(common).toContain('ScrollReveal');
      expect(getBehaviorsByTier('optional')).toEqual(['Resizable']);
    });

    it('getAllSchemas should return all schemas', () => {
      const schemas = getAllSchemas();
      expect(schemas.length).toBe(11);
      expect(schemas.map(s => s.name).sort()).toEqual([
        'AutoDismiss',
        'ClickOutside',
        'Clipboard',
        'Draggable',
        'FocusTrap',
        'Removable',
        'Resizable',
        'ScrollReveal',
        'Sortable',
        'Tabs',
        'Toggleable',
      ]);
    });
  });

  describe('Draggable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(draggableSource).toContain('behavior Draggable');
      expect(draggableSource).toContain('on pointerdown');
      expect(draggableSource).toContain('trigger draggable:start');
    });

    it('should have correct schema metadata', () => {
      expect(draggableMetadata.category).toBe('ui');
      expect(draggableMetadata.tier).toBe('core');
      expect(draggableMetadata.parameters).toBeDefined();
      expect(draggableMetadata.parameters?.length).toBeGreaterThan(0);
    });

    it('should document events', () => {
      expect(draggableMetadata.events).toBeDefined();
      expect(draggableMetadata.events?.map(e => e.name)).toContain('draggable:start');
      expect(draggableMetadata.events?.map(e => e.name)).toContain('draggable:end');
    });
  });

  describe('Removable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(removableSource).toContain('behavior Removable');
      expect(removableSource).toContain('on click');
      expect(removableSource).toContain('remove me');
    });

    it('should have correct schema metadata', () => {
      expect(removableMetadata.category).toBe('data');
      expect(removableMetadata.tier).toBe('common');
    });

    it('should support confirmation parameter', () => {
      expect(removableSource).toContain('if confirm');
    });

    it('should use triggerEl parameter (not trigger)', () => {
      expect(removableSource).toContain('behavior Removable(triggerEl');
      expect(removableSource).toContain('on click from triggerEl');
    });
  });

  describe('Toggleable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(toggleableSource).toContain('behavior Toggleable');
      expect(toggleableSource).toContain('on click');
    });

    it('should have correct schema metadata', () => {
      expect(toggleableMetadata.category).toBe('form');
      expect(toggleableMetadata.tier).toBe('core');
    });

    it('should default to "active" class', () => {
      expect(toggleableSource).toContain('set cls to "active"');
    });
  });

  describe('Sortable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(sortableSource).toContain('behavior Sortable');
      expect(sortableSource).toContain('on pointerdown');
      expect(sortableSource).toContain('trigger sortable:');
    });

    it('should have correct schema metadata', () => {
      expect(sortableMetadata.category).toBe('ui');
      expect(sortableMetadata.tier).toBe('common');
    });
  });

  describe('Resizable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(resizableSource).toContain('behavior Resizable');
      expect(resizableSource).toContain('on pointerdown');
    });

    it('should have correct schema metadata', () => {
      expect(resizableMetadata.category).toBe('ui');
      expect(resizableMetadata.tier).toBe('optional');
    });

    it('should support min/max constraints', () => {
      expect(resizableSource).toContain('minWidth');
      expect(resizableSource).toContain('maxWidth');
    });
  });

  describe('Clipboard behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(clipboardSource).toContain('behavior Clipboard');
      expect(clipboardSource).toContain('clipboard:copied');
    });

    it('should have correct schema metadata', () => {
      expect(clipboardMetadata.category).toBe('ui');
      expect(clipboardMetadata.tier).toBe('core');
    });
  });

  describe('AutoDismiss behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(autoDismissSource).toContain('behavior AutoDismiss');
      expect(autoDismissSource).toContain('autodismiss:dismissed');
    });

    it('should have correct schema metadata', () => {
      expect(autoDismissMetadata.category).toBe('ui');
      expect(autoDismissMetadata.tier).toBe('core');
    });
  });

  describe('ClickOutside behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(clickOutsideSource).toContain('behavior ClickOutside');
      expect(clickOutsideSource).toContain('pointerdown');
    });

    it('should have correct schema metadata', () => {
      expect(clickOutsideMetadata.category).toBe('ui');
      expect(clickOutsideMetadata.tier).toBe('core');
    });
  });

  describe('FocusTrap behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(focusTrapSource).toContain('behavior FocusTrap');
    });

    it('should have correct schema metadata', () => {
      expect(focusTrapMetadata.category).toBe('ui');
      expect(focusTrapMetadata.tier).toBe('core');
    });
  });

  describe('ScrollReveal behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(scrollRevealSource).toContain('behavior ScrollReveal');
      expect(scrollRevealSource).toContain('IntersectionObserver');
    });

    it('should have correct schema metadata', () => {
      expect(scrollRevealMetadata.category).toBe('layout');
      expect(scrollRevealMetadata.tier).toBe('common');
    });
  });

  describe('Tabs behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(tabsSource).toContain('behavior Tabs');
      expect(tabsSource).toContain('orientation');
    });

    it('should have correct schema metadata', () => {
      expect(tabsMetadata.category).toBe('ui');
      expect(tabsMetadata.tier).toBe('core');
    });
  });
});
