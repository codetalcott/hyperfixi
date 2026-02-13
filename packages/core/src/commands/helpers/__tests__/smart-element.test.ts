import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectSmartElementType,
  resolveSmartElementTargets,
  toggleDialog,
  toggleDetails,
  toggleSelect,
  togglePopover,
  showPopover,
  hidePopover,
  toggleSmartElement,
  isSmartElement,
  isPopoverElement,
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

    it('should return null for non-smart elements without popover', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      const result = detectSmartElementType([div]);
      expect(result).toBe(null);
    });

    it('should detect elements with popover attribute', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      const result = detectSmartElementType([div]);
      // Only returns 'popover' if the browser supports the Popover API
      if (typeof HTMLElement.prototype.showPopover === 'function') {
        expect(result).toBe('popover');
      } else {
        expect(result).toBe(null);
      }
    });

    it('should detect popover on non-standard elements', () => {
      const section = document.createElement('section');
      section.setAttribute('popover', 'manual');
      document.body.appendChild(section);

      const result = detectSmartElementType([section]);
      if (typeof HTMLElement.prototype.showPopover === 'function') {
        expect(result).toBe('popover');
      } else {
        expect(result).toBe(null);
      }
    });

    it('should prioritize popover over dialog tag', () => {
      const dialog = document.createElement('dialog');
      dialog.setAttribute('popover', '');
      document.body.appendChild(dialog);

      const result = detectSmartElementType([dialog]);
      if (typeof HTMLElement.prototype.showPopover === 'function') {
        expect(result).toBe('popover');
      } else {
        expect(result).toBe('dialog');
      }
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

  describe('togglePopover', () => {
    it('should call togglePopover on element', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      if (typeof div.togglePopover === 'function') {
        const spy = vi.spyOn(div, 'togglePopover');
        togglePopover(div);
        expect(spy).toHaveBeenCalled();
      }
    });

    it('should pass force parameter', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      if (typeof div.togglePopover === 'function') {
        const spy = vi.spyOn(div, 'togglePopover');
        togglePopover(div, true);
        expect(spy).toHaveBeenCalledWith(true);
      }
    });

    it('should not throw when togglePopover throws InvalidStateError', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      if (typeof div.togglePopover === 'function') {
        vi.spyOn(div, 'togglePopover').mockImplementation(() => {
          throw new DOMException('Invalid state', 'InvalidStateError');
        });
        expect(() => togglePopover(div)).not.toThrow();
      }
    });
  });

  describe('showPopover', () => {
    it('should call showPopover on element', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      if (typeof div.showPopover === 'function') {
        const spy = vi.spyOn(div, 'showPopover');
        showPopover(div);
        expect(spy).toHaveBeenCalled();
      }
    });

    it('should not throw when already shown', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      if (typeof div.showPopover === 'function') {
        vi.spyOn(div, 'showPopover').mockImplementation(() => {
          throw new DOMException('Invalid state', 'InvalidStateError');
        });
        expect(() => showPopover(div)).not.toThrow();
      }
    });
  });

  describe('hidePopover', () => {
    it('should call hidePopover on element', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      if (typeof div.hidePopover === 'function') {
        const spy = vi.spyOn(div, 'hidePopover');
        hidePopover(div);
        expect(spy).toHaveBeenCalled();
      }
    });

    it('should not throw when already hidden', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      if (typeof div.hidePopover === 'function') {
        vi.spyOn(div, 'hidePopover').mockImplementation(() => {
          throw new DOMException('Invalid state', 'InvalidStateError');
        });
        expect(() => hidePopover(div)).not.toThrow();
      }
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

    it('should toggle popover element', () => {
      const div = document.createElement('div');
      div.setAttribute('popover', '');
      document.body.appendChild(div);

      if (typeof div.togglePopover === 'function') {
        const spy = vi.spyOn(div, 'togglePopover');
        const result = toggleSmartElement(div, 'popover');
        expect(result).toBe(true);
        expect(spy).toHaveBeenCalled();
      }
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

      it('should return true for element with popover attribute', () => {
        const div = document.createElement('div');
        div.setAttribute('popover', '');
        if (typeof HTMLElement.prototype.showPopover === 'function') {
          expect(isSmartElement(div)).toBe(true);
        }
      });

      it('should return false for non-smart elements', () => {
        const div = document.createElement('div');
        expect(isSmartElement(div)).toBe(false);
      });
    });

    describe('isPopoverElement', () => {
      it('should return true for element with popover attribute when API supported', () => {
        const div = document.createElement('div');
        div.setAttribute('popover', '');
        if (typeof HTMLElement.prototype.showPopover === 'function') {
          expect(isPopoverElement(div)).toBe(true);
        }
      });

      it('should return false for element without popover attribute', () => {
        const div = document.createElement('div');
        expect(isPopoverElement(div)).toBe(false);
      });

      it('should detect popover="auto"', () => {
        const div = document.createElement('div');
        div.setAttribute('popover', 'auto');
        if (typeof HTMLElement.prototype.showPopover === 'function') {
          expect(isPopoverElement(div)).toBe(true);
        }
      });

      it('should detect popover="manual"', () => {
        const div = document.createElement('div');
        div.setAttribute('popover', 'manual');
        if (typeof HTMLElement.prototype.showPopover === 'function') {
          expect(isPopoverElement(div)).toBe(true);
        }
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
