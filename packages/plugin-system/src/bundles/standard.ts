/**
 * Standard Bundle
 * Demonstrates how to compose plugins like Datastar
 */

import { pluginRegistry } from '../registry';
import {
  OnCommandPlugin,
  ToggleCommandPlugin,
  SendCommandPlugin
} from '../plugins/commands';
import {
  ReactiveStateFeature,
  AutoFetchFeature,
  IntersectionFeature
} from '../plugins/features';

// Load standard plugins
pluginRegistry.load(
  // Commands
  OnCommandPlugin,
  ToggleCommandPlugin,
  SendCommandPlugin,
  
  // Features
  ReactiveStateFeature,
  AutoFetchFeature,
  IntersectionFeature
);

// Auto-apply on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      pluginRegistry.apply();
    });
  } else {
    pluginRegistry.apply();
  }
}

export { pluginRegistry };
