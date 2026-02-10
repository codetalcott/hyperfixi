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
 *
 * Optional SirenBin support:
 *   npm install siren-agent   # adds binary content negotiation
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

/** Resolved once at setup — null if siren-agent not installed */
type ParseFn = (
  response: Response,
  opts?: { maxResponseSize?: number }
) => Promise<SirenEntity | null>;
let _parseSirenResponse: ParseFn | null = null;
let _probed = false;

/**
 * Try to load parseSirenResponse from siren-agent (optional peer dep).
 * Returns the function if available, null otherwise. Result is cached.
 */
async function probeSirenAgent(): Promise<ParseFn | null> {
  if (_probed) return _parseSirenResponse;
  _probed = true;
  try {
    const mod = await import('siren-agent/siren-tools');
    if (typeof mod.parseSirenResponse === 'function') {
      _parseSirenResponse = mod.parseSirenResponse as ParseFn;
    }
  } catch {
    // siren-agent not installed — JSON-only mode
  }
  return _parseSirenResponse;
}

/** Visible for testing — reset the cached probe result */
export function _resetProbe(): void {
  _parseSirenResponse = null;
  _probed = false;
}

export const sirenPlugin: PluginShape = {
  name: '@lokascript/siren',
  version: '1.3.0',

  contextProviders: [sirenContextProvider],

  commands: [followCommand, executeActionCommand],

  setup() {
    // Probe for siren-agent, then register the fetch response type.
    // The probe is async but registerFetchResponseType is sync — we register
    // immediately with JSON-only handling, then upgrade the handler once the
    // probe resolves. This avoids blocking plugin setup on a dynamic import.
    const jsonOnlyAccept = 'application/vnd.siren+json';
    const fullAccept = 'application/vnd.siren+bin, application/vnd.siren+json, application/json';

    // Start probe (fire-and-forget at setup time)
    probeSirenAgent();

    // In browser IIFE mode, the bundled registerFetchResponseType writes to a
    // different customResponseTypes Map than the running runtime's FetchCommand.
    // Use the global's version when available so the type is registered on the
    // runtime's map, falling back to the import for ESM/CJS usage.
    const win = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>) : {};
    const runtimeRegister =
      (win.lokascript as Record<string, unknown> | undefined)?.registerFetchResponseType as
        typeof registerFetchResponseType | undefined;
    const register = runtimeRegister ?? registerFetchResponseType;

    register('siren', {
      accept: _parseSirenResponse ? fullAccept : jsonOnlyAccept,
      async handler(response: Response) {
        // Check if parseSirenResponse became available (probe may have resolved)
        const parse = _parseSirenResponse ?? (await probeSirenAgent());

        if (parse) {
          const entity = await parse(response);
          if (entity) {
            setCurrentEntity(entity as SirenEntity, response.url);
            return entity;
          }
        }

        // Fallback: JSON-only parsing
        const entity = (await response.json()) as SirenEntity;
        setCurrentEntity(entity, response.url);
        return entity;
      },
    });
  },

  teardown() {
    _resetProbe();
  },
};
