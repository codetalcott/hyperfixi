import type { BehaviorSchema } from './types';

/**
 * FocusTrap Behavior Schema
 *
 * Confines Tab navigation inside an element and restores focus on release.
 * Manages aria-modal for accessibility compliance.
 */
export const focusTrapSchema: BehaviorSchema = {
  name: 'FocusTrap',
  category: 'ui',
  tier: 'core',
  version: '1.0.0',
  description: 'Confines Tab navigation inside an element with ARIA support',
  parameters: [
    {
      name: 'active',
      type: 'boolean',
      optional: true,
      default: true,
      description: 'Whether the trap is active on install',
    },
    {
      name: 'initialFocus',
      type: 'selector',
      optional: true,
      description: 'Element to focus when the trap activates',
    },
    {
      name: 'returnFocus',
      type: 'boolean',
      optional: true,
      default: true,
      description: 'Restore focus to the previously focused element on deactivation',
    },
  ],
  events: [
    { name: 'focustrap:activated', description: 'Fired when the trap is activated' },
    { name: 'focustrap:deactivated', description: 'Fired when the trap is deactivated' },
  ],
  requirements: [
    'Sets aria-modal="true" on the element when active',
    'Listens for focustrap:activate and focustrap:deactivate custom events for programmatic control',
  ],
  source: `
behavior FocusTrap(active, initialFocus, returnFocus)
  init
    if active is undefined
      set active to true
    end
    if returnFocus is undefined
      set returnFocus to true
    end
    js(me, active, initialFocus, returnFocus)
      var FOCUSABLE = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
      var isActive = false;
      var previouslyFocused = null;
      function getFocusable() { return Array.from(me.querySelectorAll(FOCUSABLE)); }
      function activate() {
        if (isActive) return;
        isActive = true;
        previouslyFocused = document.activeElement;
        me.setAttribute('aria-modal', 'true');
        var initEl = initialFocus ? (typeof initialFocus === 'string' ? me.querySelector(initialFocus) : initialFocus) : null;
        if (initEl) { initEl.focus(); } else { var f = getFocusable(); if (f.length) f[0].focus(); }
        me.dispatchEvent(new CustomEvent('focustrap:activated', { bubbles: true }));
      }
      function deactivate() {
        if (!isActive) return;
        isActive = false;
        me.removeAttribute('aria-modal');
        if (returnFocus && previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
        previouslyFocused = null;
        me.dispatchEvent(new CustomEvent('focustrap:deactivated', { bubbles: true }));
      }
      me.addEventListener('keydown', function(e) {
        if (!isActive || e.key !== 'Tab') return;
        var focusable = getFocusable();
        if (focusable.length === 0) { e.preventDefault(); return; }
        e.preventDefault();
        var idx = focusable.indexOf(document.activeElement);
        if (e.shiftKey) {
          focusable[idx <= 0 ? focusable.length - 1 : idx - 1].focus();
        } else {
          focusable[idx >= focusable.length - 1 ? 0 : idx + 1].focus();
        }
      });
      me.addEventListener('focustrap:activate', function() { activate(); });
      me.addEventListener('focustrap:deactivate', function() { deactivate(); });
      if (active) activate();
    end
  end
end`.trim(),
};
