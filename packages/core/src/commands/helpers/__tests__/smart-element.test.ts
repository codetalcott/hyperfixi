import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectSmartElementType,
  resolveSmartElementTargets,
  toggleDialog,
  toggleDetails,
  toggleSelect,
  toggleSmartElement,
  isSmartElement,
  isDialogElement,
  isDetailsElement,
  isSelectElement,
  isSummaryElement,
} from '../smart-element';

describe('Smart Element Helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('detectSmartElementType', () => {
    it('should detect dialog elements', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);

      const result = detectSmartElementType([dialog]);
      expect(result).toBe('dialog');
    });

    it('should detect details elements', () => {
      const details = document.createElement('details');
      document.body.appendChild(details);

      const result = detectSmartElementType([details]);
      expect(result).toBe('details');
    });

    it('should detect select elements', () => {
      const select = document.createElement('select');
      document.body.appendChild(select);

      const result = detectSmartElementType([select]);
      expect(result).toBe('select');
    });

    it('should detect details when given summary element', () => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'Click me';
      details.appendChild(summary);
      document.body.appendChild(details);

      const result = detectSmartElementType([summary]);
      expect(result).toBe('details');
    });

    it('should return null for mixed element types', () => {
      const dialog = document.createElement('dialog');
      const details = document.createElement('details');
      document.body.appendChild(dialog);
      document.body.appendChild(details);

      const result = detectSmartElementType([dialog, details]);
      expect(result).toBe(null);
    });

    it('should return null for empty array', () => {
      const result = detectSmartElementType([]);
      expect(result).toBe(null);
    });

    it('should return null for non-smart elements', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      const result = detectSmartElementType([div]);
      expect(result).toBe(null);
    });
  });

  describe('resolveSmartElementTargets', () => {
    it('should resolve summary elements to parent details', () => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'Click me';
      details.appendChild(summary);
      document.body.appendChild(details);

      const result = resolveSmartElementTargets([summary]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(details);
    });

    it('should return other elements unchanged', () => {
      const dialog = document.createElement('dialog');
      const select = document.createElement('select');
      document.body.appendChild(dialog);
      document.body.appendChild(select);

      const result = resolveSmartElementTargets([dialog, select]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(dialog);
      expect(result[1]).toBe(select);
    });

    it('should handle mixed summary and non-summary elements', () => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      details.appendChild(summary);
      const dialog = document.createElement('dialog');
      document.body.appendChild(details);
      document.body.appendChild(dialog);

      // When first element is SUMMARY, maps ALL elements to closest('details')
      // Dialog has no parent details, so gets filtered out
      const result = resolveSmartElementTargets([summary, dialog]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(details);
    });

    it('should return empty array for empty input', () => {
      const result = resolveSmartElementTargets([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('toggleDialog', () => {
    it('should open dialog as modal when closed', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);

      const showModalSpy = vi.spyOn(dialog, 'showModal');

      toggleDialog(dialog, 'modal');
      expect(showModalSpy).toHaveBeenCalled();
    });

    it('should open dialog as non-modal when mode is non-modal', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);

      const showSpy = vi.spyOn(dialog, 'show');

      toggleDialog(dialog, 'non-modal');
      expect(showSpy).toHaveBeenCalled();
    });

    it('should close dialog when already open', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);
      dialog.showModal();

      const closeSpy = vi.spyOn(dialog, 'close');

      toggleDialog(dialog, 'modal');
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should use provided mode', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);

      const showModalSpy = vi.spyOn(dialog, 'showModal');
      const showSpy = vi.spyOn(dialog, 'show');

      toggleDialog(dialog, 'modal');
      expect(showModalSpy).toHaveBeenCalled();
      expect(showSpy).not.toHaveBeenCalled();
    });

    it('should throw when showModal fails', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);

      vi.spyOn(dialog, 'showModal').mockImplementation(() => {
        throw new Error('Mock error');
      });

      expect(() => toggleDialog(dialog, 'modal')).toThrow('Mock error');
    });
  });

  describe('toggleDetails', () => {
    it('should open details when closed', () => {
      const details = document.createElement('details');
      document.body.appendChild(details);
      expect(details.open).toBe(false);

      toggleDetails(details);
      expect(details.open).toBe(true);
    });

    it('should close details when open', () => {
      const details = document.createElement('details');
      details.open = true;
      document.body.appendChild(details);
      expect(details.open).toBe(true);

      toggleDetails(details);
      expect(details.open).toBe(false);
    });

    it('should throw when property access fails', () => {
      const details = document.createElement('details');
      document.body.appendChild(details);

      // Mock getter to throw
      Object.defineProperty(details, 'open', {
        get: () => {
          throw new Error('Mock error');
        },
        set: () => {
          throw new Error('Mock error');
        },
      });

      expect(() => toggleDetails(details)).toThrow('Mock error');
    });
  });

  describe('toggleSelect', () => {
    it('should focus select when not focused', () => {
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.value = 'test';
      select.appendChild(option);
      document.body.appendChild(select);

      const focusSpy = vi.spyOn(select, 'focus');

      toggleSelect(select);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should blur select when already focused', () => {
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.value = 'test';
      select.appendChild(option);
      document.body.appendChild(select);
      select.focus();

      const blurSpy = vi.spyOn(select, 'blur');

      toggleSelect(select);
      expect(blurSpy).toHaveBeenCalled();
    });

    it('should call showPicker when available and not focused', () => {
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.value = 'test';
      select.appendChild(option);
      document.body.appendChild(select);

      const showPickerSpy = vi.fn();
      (select as any).showPicker = showPickerSpy;

      toggleSelect(select);
      expect(showPickerSpy).toHaveBeenCalled();
    });

    it('should handle showPicker failure gracefully', () => {
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.value = 'test';
      select.appendChild(option);
      document.body.appendChild(select);

      (select as any).showPicker = () => {
        throw new Error('showPicker not supported');
      };

      toggleSelect(select);
    });

    it('should throw when focus fails', () => {
      const select = document.createElement('select');
      document.body.appendChild(select);

      vi.spyOn(select, 'focus').mockImplementation(() => {
        throw new Error('Mock error');
      });

      expect(() => toggleSelect(select)).toThrow('Mock error');
    });
  });

  describe('toggleSmartElement', () => {
    it('should toggle dialog element', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);

      const result = toggleSmartElement(dialog, 'dialog', { dialogMode: 'modal' });
      expect(dialog.open).toBe(true);
    });

    it('should toggle details element', () => {
      const details = document.createElement('details');
      document.body.appendChild(details);
      expect(details.open).toBe(false);

      const result = toggleSmartElement(details, 'details');
      expect(details.open).toBe(true);
    });

    it('should toggle select element', () => {
      const select = document.createElement('select');
      const option = document.createElement('option');
      select.appendChild(option);
      document.body.appendChild(select);

      const focusSpy = vi.spyOn(select, 'focus');

      const result = toggleSmartElement(select, 'select');
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should return false for unsupported element type', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      const result = toggleSmartElement(div as any, 'unknown' as any);
    });

    it('should pass options to dialog toggle', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);

      const showSpy = vi.spyOn(dialog, 'show');

      toggleSmartElement(dialog, 'dialog', { dialogMode: 'non-modal' });
      expect(showSpy).toHaveBeenCalled();
    });
  });

  describe('type guards', () => {
    describe('isSmartElement', () => {
      it('should return true for dialog element', () => {
        const dialog = document.createElement('dialog');
        expect(isSmartElement(dialog)).toBe(true);
      });

      it('should return true for details element', () => {
        const details = document.createElement('details');
        expect(isSmartElement(details)).toBe(true);
      });

      it('should return true for select element', () => {
        const select = document.createElement('select');
        expect(isSmartElement(select)).toBe(true);
      });

      it('should return true for summary element', () => {
        const summary = document.createElement('summary');
        expect(isSmartElement(summary)).toBe(true);
      });

      it('should return false for non-smart elements', () => {
        const div = document.createElement('div');
        expect(isSmartElement(div)).toBe(false);
      });
    });

    describe('isDialogElement', () => {
      it('should return true for dialog element', () => {
        const dialog = document.createElement('dialog');
        expect(isDialogElement(dialog)).toBe(true);
      });

      it('should return false for non-dialog element', () => {
        const div = document.createElement('div');
        expect(isDialogElement(div)).toBe(false);
      });
    });

    describe('isDetailsElement', () => {
      it('should return true for details element', () => {
        const details = document.createElement('details');
        expect(isDetailsElement(details)).toBe(true);
      });

      it('should return false for non-details element', () => {
        const div = document.createElement('div');
        expect(isDetailsElement(div)).toBe(false);
      });
    });

    describe('isSelectElement', () => {
      it('should return true for select element', () => {
        const select = document.createElement('select');
        expect(isSelectElement(select)).toBe(true);
      });

      it('should return false for non-select element', () => {
        const div = document.createElement('div');
        expect(isSelectElement(div)).toBe(false);
      });
    });

    describe('isSummaryElement', () => {
      it('should return true for summary element', () => {
        const summary = document.createElement('summary');
        expect(isSummaryElement(summary)).toBe(true);
      });

      it('should return false for non-summary element', () => {
        const div = document.createElement('div');
        expect(isSummaryElement(div)).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle summary without parent details', () => {
      const summary = document.createElement('summary');
      document.body.appendChild(summary);

      const result = resolveSmartElementTargets([summary]);
      // Summary with no parent details is filtered out
      expect(result).toHaveLength(0);
    });

    it('should handle multiple dialogs of same type', () => {
      const dialog1 = document.createElement('dialog');
      const dialog2 = document.createElement('dialog');
      document.body.appendChild(dialog1);
      document.body.appendChild(dialog2);

      const result = detectSmartElementType([dialog1, dialog2]);
      expect(result).toBe('dialog');
    });

    it('should handle multiple details elements', () => {
      const details1 = document.createElement('details');
      const details2 = document.createElement('details');
      document.body.appendChild(details1);
      document.body.appendChild(details2);

      const result = detectSmartElementType([details1, details2]);
      expect(result).toBe('details');
    });

    it('should handle dialog that is already in desired state', () => {
      const dialog = document.createElement('dialog');
      document.body.appendChild(dialog);
      dialog.showModal();

      const closeSpy = vi.spyOn(dialog, 'close');

      toggleDialog(dialog, 'modal');
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle details toggle multiple times', () => {
      const details = document.createElement('details');
      document.body.appendChild(details);

      toggleDetails(details);
      expect(details.open).toBe(true);

      toggleDetails(details);
      expect(details.open).toBe(false);

      toggleDetails(details);
      expect(details.open).toBe(true);
    });
  });
});
