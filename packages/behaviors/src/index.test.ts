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
  registerAll,
} from './index';

describe('@lokascript/behaviors', () => {
  describe('exports', () => {
    it('should export all behavior sources', () => {
      expect(draggableSource).toBeDefined();
      expect(removableSource).toBeDefined();
      expect(toggleableSource).toBeDefined();
      expect(sortableSource).toBeDefined();
      expect(resizableSource).toBeDefined();
    });

    it('should export all behavior metadata', () => {
      expect(draggableMetadata.name).toBe('Draggable');
      expect(removableMetadata.name).toBe('Removable');
      expect(toggleableMetadata.name).toBe('Toggleable');
      expect(sortableMetadata.name).toBe('Sortable');
      expect(resizableMetadata.name).toBe('Resizable');
    });

    it('should export register functions', () => {
      expect(registerDraggable).toBeDefined();
      expect(registerRemovable).toBeDefined();
      expect(registerToggleable).toBeDefined();
      expect(registerSortable).toBeDefined();
      expect(registerResizable).toBeDefined();
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
      expect(names.length).toBe(5);
    });

    it('getBehaviorsByCategory should group by category', () => {
      expect(getBehaviorsByCategory('ui')).toEqual(['Draggable', 'Sortable', 'Resizable']);
      expect(getBehaviorsByCategory('data')).toEqual(['Removable']);
      expect(getBehaviorsByCategory('form')).toEqual(['Toggleable']);
    });

    it('getBehaviorsByTier should group by tier', () => {
      expect(getBehaviorsByTier('core')).toEqual(['Draggable', 'Toggleable']);
      expect(getBehaviorsByTier('common')).toEqual(['Sortable', 'Removable']);
      expect(getBehaviorsByTier('optional')).toEqual(['Resizable']);
    });

    it('getAllSchemas should return all schemas', () => {
      const schemas = getAllSchemas();
      expect(schemas.length).toBe(5);
      expect(schemas.map(s => s.name).sort()).toEqual([
        'Draggable',
        'Removable',
        'Resizable',
        'Sortable',
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
});
