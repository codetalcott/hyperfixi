import type { BehaviorSchema } from './types';

export const tabsSchema: BehaviorSchema = {
  name: 'Tabs',
  category: 'ui',
  tier: 'core',
  version: '1.0.0',
  description:
    'WAI-ARIA compliant tabs with roving tabindex keyboard navigation. ' +
    'Auto-wires role, aria-selected, aria-controls, and aria-labelledby attributes.',
  parameters: [
    {
      name: 'orientation',
      type: 'string',
      optional: true,
      default: 'horizontal',
      enum: ['horizontal', 'vertical'],
      description: 'Arrow key direction: horizontal (Left/Right) or vertical (Up/Down)',
    },
    {
      name: 'activeTab',
      type: 'number',
      optional: true,
      default: 0,
      description: 'Initial active tab index (zero-based)',
    },
    {
      name: 'wrap',
      type: 'boolean',
      optional: true,
      default: true,
      description: 'Wrap to first/last tab when navigating past the end',
    },
    {
      name: 'activeClass',
      type: 'string',
      optional: true,
      default: 'active',
      description: 'CSS class applied to the active tab and its panel',
    },
  ],
  events: [
    {
      name: 'tabs:change',
      description: 'Fired before tab selection changes (cancelable via preventDefault)',
    },
    { name: 'tabs:changed', description: 'Fired after tab selection has changed' },
  ],
  requirements: [
    'Sets role="tablist" on the tab container',
    'Sets role="tab" on tab buttons and role="tabpanel" on content panels',
    'Manages aria-selected, aria-controls, aria-labelledby, and tabindex',
    'Keyboard: Arrow keys navigate, Home/End jump to first/last, Tab exits tablist',
  ],
  source: `
behavior Tabs(orientation, activeTab, wrap, activeClass)
  init
    if orientation is undefined
      set orientation to "horizontal"
    end
    if activeTab is undefined
      set activeTab to 0
    end
    if wrap is undefined
      set wrap to true
    end
    if activeClass is undefined
      set activeClass to "active"
    end
    js(me, orientation, activeTab, wrap, activeClass)
      var tabs = Array.from(me.querySelectorAll('[role="tab"]'));
      var panels = Array.from(me.querySelectorAll('[role="tabpanel"]'));
      if (tabs.length === 0 || panels.length === 0) return;
      var tablist = me.querySelector('[role="tablist"]') || tabs[0].parentElement;
      if (tablist) tablist.setAttribute('aria-orientation', orientation);
      var count = Math.min(tabs.length, panels.length);
      var idN = 0;
      for (var i = 0; i < count; i++) {
        if (!tabs[i].id) tabs[i].id = 'tab-' + (++idN);
        if (!panels[i].id) panels[i].id = 'tabpanel-' + idN;
        tabs[i].setAttribute('aria-controls', panels[i].id);
        panels[i].setAttribute('aria-labelledby', tabs[i].id);
      }
      var cur = Math.max(0, Math.min(activeTab, count - 1));
      function activate(idx, prev) {
        if (idx === prev || idx < 0 || idx >= count) return false;
        var ev = new CustomEvent('tabs:change', { bubbles: true, cancelable: true, detail: { index: idx, previousIndex: prev } });
        me.dispatchEvent(ev);
        if (ev.defaultPrevented) return false;
        if (prev >= 0 && prev < count) {
          tabs[prev].setAttribute('aria-selected', 'false');
          tabs[prev].setAttribute('tabindex', '-1');
          tabs[prev].classList.remove(activeClass);
          panels[prev].setAttribute('aria-hidden', 'true');
          panels[prev].classList.remove(activeClass);
        }
        tabs[idx].setAttribute('aria-selected', 'true');
        tabs[idx].setAttribute('tabindex', '0');
        tabs[idx].classList.add(activeClass);
        panels[idx].setAttribute('aria-hidden', 'false');
        panels[idx].classList.add(activeClass);
        cur = idx;
        me.dispatchEvent(new CustomEvent('tabs:changed', { bubbles: true, detail: { index: idx } }));
        return true;
      }
      for (var j = 0; j < count; j++) {
        tabs[j].setAttribute('aria-selected', 'false');
        tabs[j].setAttribute('tabindex', '-1');
        panels[j].setAttribute('aria-hidden', 'true');
        panels[j].classList.remove(activeClass);
      }
      tabs[cur].setAttribute('aria-selected', 'true');
      tabs[cur].setAttribute('tabindex', '0');
      tabs[cur].classList.add(activeClass);
      panels[cur].setAttribute('aria-hidden', 'false');
      panels[cur].classList.add(activeClass);
      for (var k = 0; k < count; k++) {
        (function(idx) {
          tabs[idx].addEventListener('click', function() { if (activate(idx, cur)) tabs[idx].focus(); });
        })(k);
      }
      (tablist || me).addEventListener('keydown', function(e) {
        var nk = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
        var pk = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
        var next = null;
        if (e.key === nk) { next = cur + 1; if (next >= count) next = wrap ? 0 : null; }
        else if (e.key === pk) { next = cur - 1; if (next < 0) next = wrap ? count - 1 : null; }
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = count - 1;
        if (next !== null) { e.preventDefault(); if (activate(next, cur)) tabs[next].focus(); }
      });
    end
  end
end`.trim(),
};
