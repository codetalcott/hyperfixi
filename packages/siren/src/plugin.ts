/**
 * LokaScript Siren plugin — wires client, context, commands, and behaviors.
 *
 * Usage (bundler):
 *   import { registry } from '@lokascript/core';
 *   import { sirenPlugin } from '@lokascript/siren';
 *   registry.use(sirenPlugin);
 *
 * Usage (script tag — auto-registers):
 *   <script src="lokascript-core.js"></script>
 *   <script src="lokascript-siren.js"></script>
 */

import { registerFetchResponseType } from '@lokascript/core/commands';
import { sirenContextProvider } from './siren-context';
import { setCurrentEntity } from './siren-client';
import { followCommand } from './commands/follow';
import { executeActionCommand } from './commands/execute-action';
import type { SirenEntity } from './types';

/**
 * Plugin shape — local interface avoids importing LokaScriptPlugin which
 * has strict TypedExecutionContext constraints on commands.  At runtime
 * the registry accepts any object with `name`, `commands`, etc.
 */
interface PluginShape {
  name: string;
  version?: string;
  contextProviders?: Array<{
    name: string;
    provide: () => unknown;
    options?: { cache?: boolean };
  }>;
  commands?: Array<{ name: string; [k: string]: unknown }>;
  setup?(): void;
  teardown?(): void;
}

export const sirenPlugin: PluginShape = {
  name: '@lokascript/siren',
  version: '1.3.0',

  contextProviders: [sirenContextProvider],

  commands: [followCommand, executeActionCommand],

  setup() {
    registerFetchResponseType('siren', {
      accept: 'application/vnd.siren+json',
      async handler(response: Response) {
        const entity = (await response.json()) as SirenEntity;
        setCurrentEntity(entity, response.url);
        return entity;
      },
    });
  },

  teardown() {
    // No persistent resources to clean up
  },
};
