/**
 * Keyboard Shortcuts Utility Tests
 * Test keyboard shortcut parsing and event filtering
 */

import { describe, it, expect } from 'vitest';
import {
  parseKeyboardShortcut,
  createKeyboardFilter,
  createFilterExpression,
  transformKeyboardEvent,
  isKeyboardShortcut,
  getShortcutDescription
} from './keyboard-shortcuts';

describe('Keyboard Shortcuts Utility', () => {
  describe('parseKeyboardShortcut', () => {
    it('should parse simple key shortcuts', () => {
      const result = parseKeyboardShortcut('key.enter');
      expect(result).toEqual({
        key: 'Enter',
        ctrl: false,
        shift: false,
        alt: false,
        meta: false,
        originalSyntax: 'key.enter'
      });
    });

    it('should parse escape key', () => {
      const result = parseKeyboardShortcut('key.esc');
      expect(result?.key).toBe('Escape');
    });

    it('should parse space key', () => {
      const result = parseKeyboardShortcut('key.space');
      expect(result?.key).toBe(' ');
    });

    it('should parse arrow keys', () => {
      expect(parseKeyboardShortcut('key.up')?.key).toBe('ArrowUp');
      expect(parseKeyboardShortcut('key.down')?.key).toBe('ArrowDown');
      expect(parseKeyboardShortcut('key.left')?.key).toBe('ArrowLeft');
      expect(parseKeyboardShortcut('key.right')?.key).toBe('ArrowRight');
    });

    it('should parse function keys', () => {
      expect(parseKeyboardShortcut('key.f1')?.key).toBe('F1');
      expect(parseKeyboardShortcut('key.f12')?.key).toBe('F12');
    });

    it('should parse shortcuts with ctrl modifier', () => {
      const result = parseKeyboardShortcut('key.ctrl+s');
      expect(result).toEqual({
        key: 's',
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
        originalSyntax: 'key.ctrl+s'
      });
    });

    it('should parse shortcuts with multiple modifiers', () => {
      const result = parseKeyboardShortcut('key.ctrl+shift+k');
      expect(result?.ctrl).toBe(true);
      expect(result?.shift).toBe(true);
      expect(result?.alt).toBe(false);
      expect(result?.meta).toBe(false);
      expect(result?.key).toBe('k');
    });

    it('should parse shortcuts with all modifiers', () => {
      const result = parseKeyboardShortcut('key.ctrl+shift+alt+meta+z');
      expect(result?.ctrl).toBe(true);
      expect(result?.shift).toBe(true);
      expect(result?.alt).toBe(true);
      expect(result?.meta).toBe(true);
      expect(result?.key).toBe('z');
    });

    it('should handle case-insensitive input', () => {
      const result = parseKeyboardShortcut('key.CTRL+S');
      expect(result?.ctrl).toBe(true);
      expect(result?.key).toBe('s');
    });

    it('should return null for non-keyboard syntax', () => {
      expect(parseKeyboardShortcut('click')).toBeNull();
      expect(parseKeyboardShortcut('submit')).toBeNull();
      expect(parseKeyboardShortcut('keydown')).toBeNull();
    });

    it('should return null for invalid syntax', () => {
      expect(parseKeyboardShortcut('key.')).toBeNull();
      expect(parseKeyboardShortcut('key.+')).toBeNull();
    });

    it('should handle whitespace in syntax', () => {
      const result = parseKeyboardShortcut('key.ctrl + s');
      expect(result?.ctrl).toBe(true);
      expect(result?.key).toBe('s');
    });
  });

  describe('createKeyboardFilter', () => {
    it('should create filter for simple key', () => {
      const shortcut = parseKeyboardShortcut('key.enter')!;
      const filter = createKeyboardFilter(shortcut);

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });

      expect(filter(enterEvent)).toBe(true);
      expect(filter(spaceEvent)).toBe(false);
    });

    it('should create filter for key with ctrl modifier', () => {
      const shortcut = parseKeyboardShortcut('key.ctrl+s')!;
      const filter = createKeyboardFilter(shortcut);

      const ctrlS = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      const justS = new KeyboardEvent('keydown', { key: 's' });
      const ctrlT = new KeyboardEvent('keydown', { key: 't', ctrlKey: true });

      expect(filter(ctrlS)).toBe(true);
      expect(filter(justS)).toBe(false);
      expect(filter(ctrlT)).toBe(false);
    });

    it('should create filter for multiple modifiers', () => {
      const shortcut = parseKeyboardShortcut('key.ctrl+shift+k')!;
      const filter = createKeyboardFilter(shortcut);

      const ctrlShiftK = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        shiftKey: true
      });
      const ctrlK = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      const shiftK = new KeyboardEvent('keydown', { key: 'k', shiftKey: true });

      expect(filter(ctrlShiftK)).toBe(true);
      expect(filter(ctrlK)).toBe(false);
      expect(filter(shiftK)).toBe(false);
    });

    it('should reject events with extra modifiers', () => {
      const shortcut = parseKeyboardShortcut('key.ctrl+s')!;
      const filter = createKeyboardFilter(shortcut);

      const ctrlShiftS = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        shiftKey: true
      });

      expect(filter(ctrlShiftS)).toBe(false);
    });
  });

  describe('createFilterExpression', () => {
    it('should create expression for simple key', () => {
      const shortcut = parseKeyboardShortcut('key.enter')!;
      const expression = createFilterExpression(shortcut);

      expect(expression).toContain('event.key === "Enter"');
      expect(expression).toContain('!event.ctrlKey');
      expect(expression).toContain('!event.shiftKey');
      expect(expression).toContain('!event.altKey');
      expect(expression).toContain('!event.metaKey');
    });

    it('should create expression for key with ctrl', () => {
      const shortcut = parseKeyboardShortcut('key.ctrl+s')!;
      const expression = createFilterExpression(shortcut);

      expect(expression).toContain('event.key === "s"');
      expect(expression).toContain('event.ctrlKey');
      expect(expression).toContain('!event.shiftKey');
    });

    it('should create expression for multiple modifiers', () => {
      const shortcut = parseKeyboardShortcut('key.ctrl+shift+alt+z')!;
      const expression = createFilterExpression(shortcut);

      expect(expression).toContain('event.ctrlKey');
      expect(expression).toContain('event.shiftKey');
      expect(expression).toContain('event.altKey');
      expect(expression).toContain('!event.metaKey');
    });

    it('should create valid JavaScript expression', () => {
      const shortcut = parseKeyboardShortcut('key.ctrl+s')!;
      const expression = createFilterExpression(shortcut);

      // Should be valid JS that can be evaluated
      const func = new Function('event', `return ${expression}`);
      expect(typeof func).toBe('function');
    });
  });

  describe('transformKeyboardEvent', () => {
    it('should transform keyboard shortcut to keydown event', () => {
      const result = transformKeyboardEvent('key.enter');

      expect(result.type).toBe('keydown');
      expect(result.filter).toBeDefined();
      expect(result.filter).toContain('event.key === "Enter"');
    });

    it('should transform shortcut with modifiers', () => {
      const result = transformKeyboardEvent('key.ctrl+s');

      expect(result.type).toBe('keydown');
      expect(result.filter).toContain('event.ctrlKey');
      expect(result.filter).toContain('event.key === "s"');
    });

    it('should not transform non-keyboard events', () => {
      const result = transformKeyboardEvent('click');

      expect(result.type).toBe('click');
      expect(result.filter).toBeUndefined();
    });

    it('should not transform regular keyboard events', () => {
      const result = transformKeyboardEvent('keydown');

      expect(result.type).toBe('keydown');
      expect(result.filter).toBeUndefined();
    });
  });

  describe('isKeyboardShortcut', () => {
    it('should identify keyboard shortcuts', () => {
      expect(isKeyboardShortcut('key.enter')).toBe(true);
      expect(isKeyboardShortcut('key.ctrl+s')).toBe(true);
      expect(isKeyboardShortcut('key.esc')).toBe(true);
    });

    it('should reject non-keyboard syntax', () => {
      expect(isKeyboardShortcut('click')).toBe(false);
      expect(isKeyboardShortcut('keydown')).toBe(false);
      expect(isKeyboardShortcut('submit')).toBe(false);
    });

    it('should reject invalid keyboard syntax', () => {
      expect(isKeyboardShortcut('key.')).toBe(false);
      expect(isKeyboardShortcut('key')).toBe(false);
    });
  });

  describe('getShortcutDescription', () => {
    it('should describe simple keys', () => {
      const shortcut = parseKeyboardShortcut('key.enter')!;
      expect(getShortcutDescription(shortcut)).toBe('Enter');
    });

    it('should describe keys with modifiers', () => {
      const shortcut = parseKeyboardShortcut('key.ctrl+s')!;
      expect(getShortcutDescription(shortcut)).toBe('Ctrl+s');
    });

    it('should describe keys with multiple modifiers', () => {
      const shortcut = parseKeyboardShortcut('key.ctrl+shift+alt+z')!;
      const description = getShortcutDescription(shortcut);

      expect(description).toContain('Ctrl');
      expect(description).toContain('Shift');
      expect(description).toContain('Alt');
      expect(description).toContain('z');
    });

    it('should order modifiers consistently', () => {
      const shortcut = parseKeyboardShortcut('key.shift+ctrl+k')!;
      const description = getShortcutDescription(shortcut);

      // Should always be Ctrl, Shift, Alt, Meta order
      expect(description.indexOf('Ctrl')).toBeLessThan(description.indexOf('Shift'));
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle common shortcuts', () => {
      const shortcuts = [
        'key.ctrl+c',    // Copy
        'key.ctrl+v',    // Paste
        'key.ctrl+s',    // Save
        'key.ctrl+z',    // Undo
        'key.ctrl+y',    // Redo
        'key.esc',       // Cancel
        'key.enter',     // Submit
        'key.ctrl+enter' // Alternative submit
      ];

      shortcuts.forEach(syntax => {
        const result = transformKeyboardEvent(syntax);
        expect(result.type).toBe('keydown');
        expect(result.filter).toBeDefined();
      });
    });

    it('should handle accessibility shortcuts', () => {
      const shortcuts = [
        'key.tab',        // Navigate
        'key.shift+tab',  // Navigate backward
        'key.space',      // Activate
        'key.esc'         // Close
      ];

      shortcuts.forEach(syntax => {
        const shortcut = parseKeyboardShortcut(syntax);
        expect(shortcut).not.toBeNull();
      });
    });

    it('should handle special keys', () => {
      const specialKeys = [
        'key.backspace',
        'key.delete',
        'key.home',
        'key.end',
        'key.pageup',
        'key.pagedown'
      ];

      specialKeys.forEach(syntax => {
        const shortcut = parseKeyboardShortcut(syntax);
        expect(shortcut).not.toBeNull();
        expect(shortcut?.key).not.toBe(syntax);
      });
    });
  });
});
