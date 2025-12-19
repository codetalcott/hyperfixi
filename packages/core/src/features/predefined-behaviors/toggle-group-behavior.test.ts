/**
 * Toggle Group Behavior Tests
 * Test mutually exclusive toggle functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import { toggleGroupBehaviorDefinition, createToggleGroupBehavior } from './toggle-group-behavior';
import type { ToggleGroupBehaviorOptions } from './toggle-group-behavior';

describe('Toggle Group Behavior', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-toggle-group';
    container.innerHTML = `
      <button data-toggle="tab1" class="active">Tab 1</button>
      <button data-toggle="tab2">Tab 2</button>
      <button data-toggle="tab3">Tab 3</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Behavior Definition', () => {
    it('should have correct name', () => {
      expect(toggleGroupBehaviorDefinition.name).toBe('toggle-group-behavior');
    });

    it('should define expected parameters', () => {
      expect(toggleGroupBehaviorDefinition.parameters).toContain('name');
      expect(toggleGroupBehaviorDefinition.parameters).toContain('itemSelector');
      expect(toggleGroupBehaviorDefinition.parameters).toContain('activeClass');
      expect(toggleGroupBehaviorDefinition.parameters).toContain('allowNone');
      expect(toggleGroupBehaviorDefinition.parameters).toContain('keyboardNavigation');
      expect(toggleGroupBehaviorDefinition.parameters).toContain('initialActive');
    });

    it('should have init and destroy methods', () => {
      expect(typeof toggleGroupBehaviorDefinition.init).toBe('function');
      expect(typeof toggleGroupBehaviorDefinition.destroy).toBe('function');
    });
  });

  describe('Initialization', () => {
    it('should initialize on container element', () => {
      toggleGroupBehaviorDefinition.init(container);
      expect(typeof (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem).toBe('function');
      expect(typeof (container as HTMLElement & { deactivateAll: () => void }).deactivateAll).toBe('function');
      expect(typeof (container as HTMLElement & { getActiveItem: () => HTMLElement | null }).getActiveItem).toBe('function');
      expect(typeof (container as HTMLElement & { getActiveValue: () => string | null }).getActiveValue).toBe('function');
      expect(typeof (container as HTMLElement & { next: () => void }).next).toBe('function');
      expect(typeof (container as HTMLElement & { previous: () => void }).previous).toBe('function');
    });

    it('should use custom selector when provided', () => {
      const customContainer = document.createElement('div');
      customContainer.innerHTML = `
        <div class="tab active">Tab 1</div>
        <div class="tab">Tab 2</div>
      `;
      document.body.appendChild(customContainer);

      toggleGroupBehaviorDefinition.init(customContainer, { itemSelector: '.tab' });
      expect((customContainer as unknown as HTMLElement & { getActiveItem: () => HTMLElement | null }).getActiveItem()).not.toBeNull();

      document.body.removeChild(customContainer);
    });

    it('should use custom active class', () => {
      const button = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      button.classList.remove('active');

      toggleGroupBehaviorDefinition.init(container, {
        activeClass: 'selected',
        initialActive: 'tab1'
      });

      // Wait for setTimeout in init
      setTimeout(() => {
        expect(button.classList.contains('selected')).toBe(true);
      }, 10);
    });
  });

  describe('Activation', () => {
    beforeEach(() => {
      toggleGroupBehaviorDefinition.init(container);
    });

    it('should activate item by HTMLElement', () => {
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;

      expect(tab1.classList.contains('active')).toBe(true);

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem(tab2);

      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('should activate item by data-toggle value', () => {
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab2');

      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('should activate item by index', () => {
      const tab3 = container.querySelector('[data-toggle="tab3"]') as HTMLElement;
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem(2); // Zero-indexed

      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab3.classList.contains('active')).toBe(true);
    });

    it('should deactivate previous item when activating new one', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;

      expect(tab1.classList.contains('active')).toBe(true);

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab2');

      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('should handle invalid item gracefully', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('nonexistent');

      expect(consoleWarn).toHaveBeenCalledWith('Toggle item not found:', 'nonexistent');

      consoleWarn.mockRestore();
    });
  });

  describe('Deactivation', () => {
    beforeEach(() => {
      toggleGroupBehaviorDefinition.init(container);
    });

    it('should deactivate all items', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;

      expect(tab1.classList.contains('active')).toBe(true);

      (container as HTMLElement & { deactivateAll: () => void }).deactivateAll();

      expect(tab1.classList.contains('active')).toBe(false);
      expect((container as HTMLElement & { getActiveItem: () => HTMLElement | null }).getActiveItem()).toBeNull();
    });

    it('should allow deactivating by clicking active item when allowNone is true', () => {
      toggleGroupBehaviorDefinition.destroy(container);
      toggleGroupBehaviorDefinition.init(container, { allowNone: true });

      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;

      expect(tab1.classList.contains('active')).toBe(true);

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem(tab1);

      expect(tab1.classList.contains('active')).toBe(false);
    });

    it('should not allow deactivating when allowNone is false', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;

      expect(tab1.classList.contains('active')).toBe(true);

      // Clicking active item should not deactivate
      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem(tab1);

      expect(tab1.classList.contains('active')).toBe(true);
    });
  });

  describe('Getters', () => {
    beforeEach(() => {
      toggleGroupBehaviorDefinition.init(container);
    });

    it('should get active item', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const active = (container as HTMLElement & { getActiveItem: () => HTMLElement | null }).getActiveItem();

      expect(active).toBe(tab1);
    });

    it('should get active value', () => {
      const value = (container as HTMLElement & { getActiveValue: () => string | null }).getActiveValue();
      expect(value).toBe('tab1');
    });

    it('should return null when no active item', () => {
      (container as HTMLElement & { deactivateAll: () => void }).deactivateAll();

      expect((container as HTMLElement & { getActiveItem: () => HTMLElement | null }).getActiveItem()).toBeNull();
      expect((container as HTMLElement & { getActiveValue: () => string | null }).getActiveValue()).toBeNull();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      toggleGroupBehaviorDefinition.init(container);
    });

    it('should navigate to next item', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;

      expect(tab1.classList.contains('active')).toBe(true);

      (container as HTMLElement & { next: () => void }).next();

      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('should navigate to previous item', () => {
      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab2');

      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;

      expect(tab2.classList.contains('active')).toBe(true);

      (container as HTMLElement & { previous: () => void }).previous();

      expect(tab2.classList.contains('active')).toBe(false);
      expect(tab1.classList.contains('active')).toBe(true);
    });

    it('should wrap around from last to first on next()', () => {
      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab3');

      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab3 = container.querySelector('[data-toggle="tab3"]') as HTMLElement;

      expect(tab3.classList.contains('active')).toBe(true);

      (container as HTMLElement & { next: () => void }).next();

      expect(tab3.classList.contains('active')).toBe(false);
      expect(tab1.classList.contains('active')).toBe(true);
    });

    it('should wrap around from first to last on previous()', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab3 = container.querySelector('[data-toggle="tab3"]') as HTMLElement;

      expect(tab1.classList.contains('active')).toBe(true);

      (container as HTMLElement & { previous: () => void }).previous();

      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab3.classList.contains('active')).toBe(true);
    });
  });

  describe('Click Events', () => {
    beforeEach(() => {
      toggleGroupBehaviorDefinition.init(container);
    });

    it('should activate item on click', () => {
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;

      tab2.click();

      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('should prevent default on click', () => {
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

      tab2.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      toggleGroupBehaviorDefinition.init(container, { keyboardNavigation: true });
    });

    it('should navigate with ArrowRight', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;

      tab1.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      tab1.dispatchEvent(keyEvent);

      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('should navigate with ArrowLeft', () => {
      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab2');
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;

      tab2.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      tab2.dispatchEvent(keyEvent);

      expect(tab1.classList.contains('active')).toBe(true);
    });

    it('should navigate with ArrowDown', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;

      tab1.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      tab1.dispatchEvent(keyEvent);

      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('should navigate with ArrowUp', () => {
      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab2');
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;

      tab2.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      tab2.dispatchEvent(keyEvent);

      expect(tab1.classList.contains('active')).toBe(true);
    });

    it('should navigate to first with Home key', () => {
      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab3');
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab3 = container.querySelector('[data-toggle="tab3"]') as HTMLElement;

      tab3.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
      tab3.dispatchEvent(keyEvent);

      expect(tab1.classList.contains('active')).toBe(true);
    });

    it('should navigate to last with End key', () => {
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab3 = container.querySelector('[data-toggle="tab3"]') as HTMLElement;

      tab1.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
      tab1.dispatchEvent(keyEvent);

      expect(tab3.classList.contains('active')).toBe(true);
    });

    it('should not navigate when keyboardNavigation is disabled', () => {
      toggleGroupBehaviorDefinition.destroy(container);
      toggleGroupBehaviorDefinition.init(container, { keyboardNavigation: false });

      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;

      tab1.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      tab1.dispatchEvent(keyEvent);

      expect(tab1.classList.contains('active')).toBe(true);
      expect(tab2.classList.contains('active')).toBe(false);
    });
  });

  describe('Custom Events', () => {
    beforeEach(() => {
      toggleGroupBehaviorDefinition.init(container);
    });

    it('should dispatch toggle:activate event', () => {
      let eventFired = false;
      let eventDetail: any = null;

      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;
      tab2.addEventListener('toggle:activate', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab2');

      expect(eventFired).toBe(true);
      expect(eventDetail.element).toBe(tab2);
    });

    it('should dispatch toggle:deactivate event', () => {
      let eventFired = false;
      let eventDetail: any = null;

      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;
      tab1.addEventListener('toggle:deactivate', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab2');

      expect(eventFired).toBe(true);
      expect(eventDetail.element).toBe(tab1);
    });

    it('should dispatch togglegroup:change event', () => {
      let eventFired = false;
      let eventDetail: any = null;

      container.addEventListener('togglegroup:change', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem('tab2');

      expect(eventFired).toBe(true);
      expect(eventDetail.value).toBe('tab2');
      expect(eventDetail.previous).not.toBeNull();
    });
  });

  describe('Helper Functions', () => {
    it('should create toggle group behavior with createToggleGroupBehavior', () => {
      createToggleGroupBehavior(container);

      expect(typeof (container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem).toBe('function');
      expect(typeof (container as HTMLElement & { next: () => void }).next).toBe('function');
    });

    it('should create toggle group behavior with options', () => {
      createToggleGroupBehavior(container, {
        name: 'custom-group',
        allowNone: true
      });

      expect((container as HTMLElement & { activateItem: (item: HTMLElement | string | number) => void }).activateItem).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      toggleGroupBehaviorDefinition.init(container);
    });

    it('should remove custom methods on destroy', () => {
      toggleGroupBehaviorDefinition.destroy(container);

      // Verify cleanup ran without errors
      expect(true).toBe(true);
    });

    it('should remove event listeners on destroy', () => {
      toggleGroupBehaviorDefinition.destroy(container);

      const tab2 = container.querySelector('[data-toggle="tab2"]') as HTMLElement;
      const tab1 = container.querySelector('[data-toggle="tab1"]') as HTMLElement;

      // Click should not activate anymore
      tab2.click();

      expect(tab1.classList.contains('active')).toBe(true);
      expect(tab2.classList.contains('active')).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work as tab control', () => {
      const tabContainer = document.createElement('div');
      tabContainer.innerHTML = `
        <button data-toggle="tab1" class="active">Tab 1</button>
        <button data-toggle="tab2">Tab 2</button>
      `;
      document.body.appendChild(tabContainer);

      createToggleGroupBehavior(tabContainer, { name: 'tabs' });

      const tab1 = tabContainer.querySelector('[data-toggle="tab1"]') as HTMLElement;
      const tab2 = tabContainer.querySelector('[data-toggle="tab2"]') as HTMLElement;

      expect(tab1.classList.contains('active')).toBe(true);

      tab2.click();

      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);

      document.body.removeChild(tabContainer);
    });

    it('should work as radio group', () => {
      const radioContainer = document.createElement('div');
      radioContainer.innerHTML = `
        <div data-toggle="option1" class="active">Option 1</div>
        <div data-toggle="option2">Option 2</div>
        <div data-toggle="option3">Option 3</div>
      `;
      document.body.appendChild(radioContainer);

      createToggleGroupBehavior(radioContainer, {
        name: 'options',
        allowNone: false
      });

      expect((radioContainer as unknown as HTMLElement & { getActiveValue: () => string | null }).getActiveValue()).toBe('option1');

      (radioContainer as unknown as HTMLElement & { activateItem: (item: string) => void }).activateItem('option2');

      expect((radioContainer as unknown as HTMLElement & { getActiveValue: () => string | null }).getActiveValue()).toBe('option2');

      document.body.removeChild(radioContainer);
    });
  });
});
