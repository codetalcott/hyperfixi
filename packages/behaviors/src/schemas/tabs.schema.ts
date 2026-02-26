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
  source: [
    'behavior Tabs(orientation, activeTab, wrap, activeClass)',
    '  init',
    '    if orientation is undefined set orientation to "horizontal"',
    '    if activeTab is undefined set activeTab to 0',
    '    if wrap is undefined set wrap to true',
    '    if activeClass is undefined set activeClass to "active"',
    '  end',
    '  -- Imperative installer handles ARIA wiring and keyboard navigation',
    'end',
  ].join('\n'),
};
