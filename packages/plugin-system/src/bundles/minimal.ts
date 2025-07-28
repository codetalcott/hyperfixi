/**
 * Minimal Bundle
 * Only core commands, no extra features
 */

import { pluginRegistry } from '../registry';
import {
  OnCommandPlugin,
  ToggleCommandPlugin,
  SendCommandPlugin
} from '../plugins/commands';

// Load only essential plugins
pluginRegistry.load(
  OnCommandPlugin,
  ToggleCommandPlugin,
  SendCommandPlugin
);

// Manual initialization required
export { pluginRegistry };
