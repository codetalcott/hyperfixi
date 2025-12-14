import { describe, it, expect } from 'vitest';
import {
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
  behaviors,
  getAvailableBehaviors,
  getAllBehaviorMetadata,
} from './index';

describe('@hyperfixi/behaviors', () => {
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

    it('should export behaviors registry', () => {
      expect(behaviors.Draggable).toBeDefined();
      expect(behaviors.Removable).toBeDefined();
      expect(behaviors.Toggleable).toBeDefined();
      expect(behaviors.Sortable).toBeDefined();
      expect(behaviors.Resizable).toBeDefined();
    });
  });

  describe('getAvailableBehaviors', () => {
    it('should return all behavior names', () => {
      const names = getAvailableBehaviors();
      expect(names).toContain('Draggable');
      expect(names).toContain('Removable');
      expect(names).toContain('Toggleable');
      expect(names).toContain('Sortable');
      expect(names).toContain('Resizable');
      expect(names.length).toBe(5);
    });
  });

  describe('getAllBehaviorMetadata', () => {
    it('should return metadata for all behaviors', () => {
      const metadata = getAllBehaviorMetadata();
      expect(metadata.length).toBe(5);
      expect(metadata.map(m => m.name)).toEqual([
        'Draggable',
        'Removable',
        'Toggleable',
        'Sortable',
        'Resizable',
      ]);
    });
  });

  describe('Draggable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(draggableSource).toContain('behavior Draggable');
      expect(draggableSource).toContain('on pointerdown');
      expect(draggableSource).toContain('trigger draggable:start');
    });

    it('should document parameters', () => {
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

    it('should support confirmation parameter', () => {
      expect(removableSource).toContain('if confirm');
    });
  });

  describe('Toggleable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(toggleableSource).toContain('behavior Toggleable');
      expect(toggleableSource).toContain('on click');
    });

    it('should default to "active" class', () => {
      expect(toggleableSource).toContain('set the class to "active"');
    });
  });

  describe('Sortable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(sortableSource).toContain('behavior Sortable');
      expect(sortableSource).toContain('on pointerdown');
      expect(sortableSource).toContain('trigger sortable:');
    });
  });

  describe('Resizable behavior', () => {
    it('should have valid hyperscript source', () => {
      expect(resizableSource).toContain('behavior Resizable');
      expect(resizableSource).toContain('on pointerdown');
    });

    it('should support min/max constraints', () => {
      expect(resizableSource).toContain('minWidth');
      expect(resizableSource).toContain('maxWidth');
    });
  });
});
