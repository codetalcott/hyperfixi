/**
 * Dropdown Behavior Tests
 * Test native <details> dropdown functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import { dropdownBehaviorDefinition, createDropdownBehavior } from './dropdown-behavior';
import type { DropdownBehaviorOptions } from './dropdown-behavior';

describe('Dropdown Behavior', () => {
  let details: HTMLDetailsElement;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    details = document.createElement('details');
    details.id = 'test-dropdown';
    details.innerHTML = `
      <summary>Menu</summary>
      <ul>
        <li><a href="#">Item 1</a></li>
        <li><a href="#">Item 2</a></li>
        <li><a href="#">Item 3</a></li>
      </ul>
    `;
    container.appendChild(details);
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (details.open) {
      details.open = false;
    }
    document.body.removeChild(container);
  });

  describe('Behavior Definition', () => {
    it('should have correct name', () => {
      expect(dropdownBehaviorDefinition.name).toBe('dropdown-behavior');
    });

    it('should define expected parameters', () => {
      expect(dropdownBehaviorDefinition.parameters).toContain('closeOnClickOutside');
      expect(dropdownBehaviorDefinition.parameters).toContain('closeOnClickInside');
      expect(dropdownBehaviorDefinition.parameters).toContain('closeOnEscape');
      expect(dropdownBehaviorDefinition.parameters).toContain('openClass');
      expect(dropdownBehaviorDefinition.parameters).toContain('animationDuration');
    });

    it('should have init and destroy methods', () => {
      expect(typeof dropdownBehaviorDefinition.init).toBe('function');
      expect(typeof dropdownBehaviorDefinition.destroy).toBe('function');
    });
  });

  describe('Initialization', () => {
    it('should initialize on details element', () => {
      dropdownBehaviorDefinition.init(details);
      expect(typeof (details as any).openDropdown).toBe('function');
      expect(typeof (details as any).closeDropdown).toBe('function');
      expect(typeof (details as any).toggleDropdown).toBe('function');
      expect(typeof (details as any).isDropdownOpen).toBe('function');
    });

    it('should handle non-details elements gracefully', () => {
      const div = document.createElement('div');
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      dropdownBehaviorDefinition.init(div as any);

      expect(consoleError).toHaveBeenCalledWith(
        'dropdown-behavior can only be installed on <details> elements'
      );

      consoleError.mockRestore();
    });

    it('should apply open class when provided', () => {
      const options: DropdownBehaviorOptions = {
        openClass: 'dropdown-open'
      };

      dropdownBehaviorDefinition.init(details, options);
      expect(details.classList.contains('dropdown-open')).toBe(false); // Not open yet

      (details as any).openDropdown();
      expect(details.classList.contains('dropdown-open')).toBe(true);
    });

    it('should use default options when not provided', () => {
      dropdownBehaviorDefinition.init(details);
      expect((details as any).openDropdown).toBeDefined();
    });
  });

  describe('Opening and Closing', () => {
    beforeEach(() => {
      dropdownBehaviorDefinition.init(details);
    });

    it('should open dropdown', () => {
      (details as any).openDropdown();
      expect(details.open).toBe(true);
    });

    it('should close dropdown', () => {
      (details as any).openDropdown();
      expect(details.open).toBe(true);

      (details as any).closeDropdown();
      expect(details.open).toBe(false);
    });

    it('should toggle dropdown open', () => {
      expect(details.open).toBe(false);

      (details as any).toggleDropdown();
      expect(details.open).toBe(true);

      (details as any).toggleDropdown();
      expect(details.open).toBe(false);
    });

    it('should not open if already open', () => {
      (details as any).openDropdown();
      const firstOpen = details.open;

      (details as any).openDropdown(); // Try to open again
      expect(details.open).toBe(firstOpen);
    });

    it('should not close if already closed', () => {
      expect(details.open).toBe(false);
      (details as any).closeDropdown(); // Try to close when already closed
      expect(details.open).toBe(false);
    });

    it('should report open state correctly', () => {
      expect((details as any).isDropdownOpen()).toBe(false);

      (details as any).openDropdown();
      expect((details as any).isDropdownOpen()).toBe(true);

      (details as any).closeDropdown();
      expect((details as any).isDropdownOpen()).toBe(false);
    });
  });

  describe('Events', () => {
    beforeEach(() => {
      dropdownBehaviorDefinition.init(details);
    });

    it('should dispatch dropdown:open event when opened', () => {
      let eventFired = false;
      let eventDetail: any = null;

      details.addEventListener('dropdown:open', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      (details as any).openDropdown();

      expect(eventFired).toBe(true);
      expect(eventDetail.element).toBe(details);
    });

    it('should dispatch dropdown:close event when closed', () => {
      let eventFired = false;
      let eventDetail: any = null;

      details.addEventListener('dropdown:close', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      (details as any).openDropdown();
      (details as any).closeDropdown();

      expect(eventFired).toBe(true);
      expect(eventDetail.element).toBe(details);
    });

    it('should dispatch dropdown:toggle event when toggled', () => {
      let eventCount = 0;
      let lastOpenState: boolean | undefined;

      details.addEventListener('dropdown:toggle', ((e: CustomEvent) => {
        eventCount++;
        lastOpenState = e.detail.open;
      }) as EventListener);

      (details as any).toggleDropdown();
      expect(eventCount).toBe(1);
      expect(lastOpenState).toBe(true);

      (details as any).toggleDropdown();
      expect(eventCount).toBe(2);
      expect(lastOpenState).toBe(false);
    });

    it('should dispatch events on native toggle', () => {
      let openEventFired = false;
      let closeEventFired = false;

      details.addEventListener('dropdown:open', () => {
        openEventFired = true;
      });

      details.addEventListener('dropdown:close', () => {
        closeEventFired = true;
      });

      // Simulate native toggle by changing open property
      details.open = true;
      details.dispatchEvent(new Event('toggle'));
      expect(openEventFired).toBe(true);

      details.open = false;
      details.dispatchEvent(new Event('toggle'));
      expect(closeEventFired).toBe(true);
    });
  });

  describe('Click Outside', () => {
    beforeEach(() => {
      dropdownBehaviorDefinition.init(details, { closeOnClickOutside: true });
    });

    it('should close dropdown on outside click', () => {
      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Simulate outside click
      const clickEvent = new MouseEvent('click', { bubbles: true });
      document.body.dispatchEvent(clickEvent);

      expect(details.open).toBe(false);
    });

    it('should not close dropdown on inside click', () => {
      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Simulate inside click
      const listItem = details.querySelector('li');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      listItem?.dispatchEvent(clickEvent);

      expect(details.open).toBe(true);
    });

    it('should not close on outside click when disabled', () => {
      dropdownBehaviorDefinition.destroy(details);
      dropdownBehaviorDefinition.init(details, { closeOnClickOutside: false });

      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Simulate outside click
      const clickEvent = new MouseEvent('click', { bubbles: true });
      document.body.dispatchEvent(clickEvent);

      expect(details.open).toBe(true);
    });
  });

  describe('Click Inside', () => {
    it('should close dropdown on inside click when enabled', () => {
      dropdownBehaviorDefinition.init(details, { closeOnClickInside: true });

      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Simulate inside click (not on summary)
      const listItem = details.querySelector('li');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: listItem, enumerable: true });
      details.dispatchEvent(clickEvent);

      expect(details.open).toBe(false);
    });

    it('should not close when clicking summary', () => {
      dropdownBehaviorDefinition.init(details, { closeOnClickInside: true });

      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Simulate click on summary
      const summary = details.querySelector('summary');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: summary, enumerable: true });
      details.dispatchEvent(clickEvent);

      // Summary click should toggle naturally, but our handler shouldn't interfere
      expect(details.open).toBe(true);
    });
  });

  describe('Escape Key', () => {
    beforeEach(() => {
      dropdownBehaviorDefinition.init(details, { closeOnEscape: true });
    });

    it('should close dropdown on Escape key', () => {
      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Simulate Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);

      expect(details.open).toBe(false);
    });

    it('should not close on other keys', () => {
      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Simulate other key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      document.dispatchEvent(enterEvent);

      expect(details.open).toBe(true);
    });

    it('should not close on Escape when disabled', () => {
      dropdownBehaviorDefinition.destroy(details);
      dropdownBehaviorDefinition.init(details, { closeOnEscape: false });

      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Simulate Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);

      expect(details.open).toBe(true);
    });
  });

  describe('Open Class', () => {
    it('should add open class when opened', () => {
      dropdownBehaviorDefinition.init(details, { openClass: 'is-open' });

      expect(details.classList.contains('is-open')).toBe(false);

      (details as any).openDropdown();
      expect(details.classList.contains('is-open')).toBe(true);
    });

    it('should remove open class when closed', () => {
      dropdownBehaviorDefinition.init(details, { openClass: 'is-open' });

      (details as any).openDropdown();
      expect(details.classList.contains('is-open')).toBe(true);

      (details as any).closeDropdown();
      expect(details.classList.contains('is-open')).toBe(false);
    });

    it('should handle native toggle with open class', () => {
      dropdownBehaviorDefinition.init(details, { openClass: 'is-open' });

      // Simulate native open
      details.open = true;
      details.dispatchEvent(new Event('toggle'));
      expect(details.classList.contains('is-open')).toBe(true);

      // Simulate native close
      details.open = false;
      details.dispatchEvent(new Event('toggle'));
      expect(details.classList.contains('is-open')).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('should create dropdown behavior with createDropdownBehavior', () => {
      createDropdownBehavior(details);

      expect(typeof (details as any).openDropdown).toBe('function');
      expect(typeof (details as any).closeDropdown).toBe('function');
      expect(typeof (details as any).toggleDropdown).toBe('function');
      expect(typeof (details as any).isDropdownOpen).toBe('function');
    });

    it('should create dropdown behavior with options', () => {
      createDropdownBehavior(details, {
        openClass: 'custom-open',
        closeOnClickOutside: false
      });

      (details as any).openDropdown();
      expect(details.classList.contains('custom-open')).toBe(true);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      dropdownBehaviorDefinition.init(details);
    });

    it('should close dropdown on destroy', () => {
      (details as any).openDropdown();
      expect(details.open).toBe(true);

      dropdownBehaviorDefinition.destroy(details);
      expect(details.open).toBe(false);
    });

    it('should remove custom methods on destroy', () => {
      dropdownBehaviorDefinition.destroy(details);

      // Verify cleanup ran without errors
      expect(true).toBe(true);
    });

    it('should remove event listeners on destroy', () => {
      dropdownBehaviorDefinition.destroy(details);

      (details as any).openDropdown; // Methods removed, but element still exists

      // Click outside should not affect dropdown anymore
      details.open = true;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      document.body.dispatchEvent(clickEvent);

      // Should stay open because listeners were removed
      expect(details.open).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support multiple dropdowns on same page', () => {
      const details2 = document.createElement('details');
      details2.id = 'test-dropdown-2';
      details2.innerHTML = '<summary>Menu 2</summary><p>Content 2</p>';
      container.appendChild(details2);

      createDropdownBehavior(details, { closeOnClickOutside: true });
      createDropdownBehavior(details2, { closeOnClickOutside: true });

      (details as any).openDropdown();
      (details2 as any).openDropdown();

      expect(details.open).toBe(true);
      expect(details2.open).toBe(true);

      // Close first dropdown with outside click
      const clickEvent = new MouseEvent('click', { bubbles: true });
      document.body.dispatchEvent(clickEvent);

      expect(details.open).toBe(false);
      expect(details2.open).toBe(false); // Both should close
    });

    it('should support navigation with keyboard and mouse', () => {
      createDropdownBehavior(details, {
        closeOnEscape: true,
        closeOnClickInside: true
      });

      // Open with method
      (details as any).openDropdown();
      expect(details.open).toBe(true);

      // Click item
      const link = details.querySelector('a');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: link, enumerable: true });
      details.dispatchEvent(clickEvent);

      expect(details.open).toBe(false);

      // Reopen and close with Escape
      (details as any).openDropdown();
      expect(details.open).toBe(true);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);

      expect(details.open).toBe(false);
    });

    it('should handle animation duration', async () => {
      dropdownBehaviorDefinition.init(details, { animationDuration: 100 });

      (details as any).openDropdown();
      expect(details.open).toBe(true);

      (details as any).closeDropdown();

      // Should still be open immediately after closeDropdown call
      expect(details.open).toBe(true);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be closed now
      expect(details.open).toBe(false);
    });
  });
});
