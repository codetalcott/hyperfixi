/**
 * COMMAND_PRIMARY_ROLES ↔ semantic schema alignment
 *
 * `COMMAND_PRIMARY_ROLES` (constants.ts) is a local mirror of the `primaryRole`
 * field on each `CommandSchema` exported by `@lokascript/semantic`. It's kept
 * local — rather than importing the schemas into the transformer — so the i18n
 * browser bundle doesn't have to pull in the whole semantic graph just to read a
 * handful of role labels.
 *
 * This test guarantees the local copy can't silently drift from the source of
 * truth: every non-`patient` primary role in the schemas must be present (and
 * identical) here, and every entry here must match a schema. The test imports
 * the schemas, but tests don't ship in the bundle.
 *
 * @see packages/i18n/src/constants.ts
 * @see docs-internal/ZH_BLOCK_BODY_SCOPE.md (#1 — transformer role model)
 */

import { describe, it, expect } from 'vitest';
import { commandSchemas } from '@lokascript/semantic';
import { COMMAND_PRIMARY_ROLES } from './constants';

describe('COMMAND_PRIMARY_ROLES ↔ semantic schema alignment', () => {
  const schemaEntries = Object.entries(commandSchemas) as Array<[string, { primaryRole: string }]>;

  it('every non-patient schema primaryRole is mirrored locally with the same value', () => {
    const missingOrWrong: string[] = [];
    for (const [action, schema] of schemaEntries) {
      if (schema.primaryRole === 'patient') continue;
      if (COMMAND_PRIMARY_ROLES[action] !== schema.primaryRole) {
        missingOrWrong.push(
          `${action}: schema=${schema.primaryRole} local=${COMMAND_PRIMARY_ROLES[action] ?? '(missing)'}`
        );
      }
    }
    expect(
      missingOrWrong,
      `COMMAND_PRIMARY_ROLES (packages/i18n/src/constants.ts) drifted from @lokascript/semantic command schemas:\n  ${missingOrWrong.join('\n  ')}\nUpdate the local map to match.`
    ).toEqual([]);
  });

  it('every local entry matches a schema primaryRole (no stale/patient entries)', () => {
    const stale: string[] = [];
    for (const [action, role] of Object.entries(COMMAND_PRIMARY_ROLES)) {
      const schema = commandSchemas[action as keyof typeof commandSchemas];
      if (!schema) {
        stale.push(`${action}: no such command schema`);
      } else if (schema.primaryRole === 'patient') {
        stale.push(`${action}: schema primaryRole is 'patient' (the default) — drop it`);
      } else if (schema.primaryRole !== role) {
        stale.push(`${action}: local=${role} schema=${schema.primaryRole}`);
      }
    }
    expect(
      stale,
      `COMMAND_PRIMARY_ROLES contains stale entries vs @lokascript/semantic:\n  ${stale.join('\n  ')}`
    ).toEqual([]);
  });
});
