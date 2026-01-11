/**
 * Basic Usage Example
 * Demonstrates how to set up and use the plugin system
 */

import {
  initializeHyperfixi,
  optimizedRegistry,
  type CommandPlugin,
  type RuntimeContext,
} from '@hyperfixi/plugin-system';

// Define a simple toggle command
const ToggleCommand: CommandPlugin = {
  type: 'command',
  name: 'toggle',
  pattern: /^toggle$/i,

  execute: async (ctx: RuntimeContext) => {
    const { element, args } = ctx;
    const className = args[0]?.replace(/^\./, '') || 'active';
    element.classList.toggle(className);
  },
};

// Define an add class command
const AddCommand: CommandPlugin = {
  type: 'command',
  name: 'add',
  pattern: /^add$/i,

  execute: async (ctx: RuntimeContext) => {
    const { element, args } = ctx;
    const className = args[0]?.replace(/^\./, '');
    if (className) {
      element.classList.add(className);
    }
  },
};

// Define a remove class command
const RemoveCommand: CommandPlugin = {
  type: 'command',
  name: 'remove',
  pattern: /^remove$/i,

  execute: async (ctx: RuntimeContext) => {
    const { element, args } = ctx;
    const className = args[0]?.replace(/^\./, '');
    if (className) {
      element.classList.remove(className);
    }
  },
};

// Option 1: Quick initialization
export function quickStart() {
  initializeHyperfixi({
    plugins: [ToggleCommand, AddCommand, RemoveCommand],
    autoApply: true,
  });
}

// Option 2: Manual setup with more control
export function manualSetup() {
  // Load plugins
  optimizedRegistry.load(ToggleCommand, AddCommand, RemoveCommand);

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizedRegistry.apply();
    });
  } else {
    optimizedRegistry.apply();
  }
}

// Option 3: Apply to specific container
export function scopedSetup(container: Element) {
  optimizedRegistry.load(ToggleCommand, AddCommand, RemoveCommand);
  optimizedRegistry.apply(container);
}

// Example HTML usage:
// <button _="on click toggle .active">Toggle Active</button>
// <button _="on click add .highlight">Add Highlight</button>
// <button _="on click remove .highlight">Remove Highlight</button>
