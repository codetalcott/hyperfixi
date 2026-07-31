/**
 * AST-shape consistency gate (Arc F).
 *
 * A schema `ast` descriptor names the modifier keys the runtime command reads.
 * For most roles that key IS the English surface marker for the role — `add`'s
 * destination is marked `to` and lands in `modifiers.to`. Where the two differ
 * it is for one of exactly three reasons, and this gate forces each one to be
 * named rather than absorbed:
 *
 *   'contract'  the key is a runtime AST contract key that was never a
 *               preposition (`fetch` body, `send` detail)
 *   'undeclared' the descriptor reads a role the schema does not declare,
 *               because the parser relabels into it after matching
 *   'drift'     a measured disagreement between the mapper and the schema,
 *               preserved verbatim by a faithful migration and filed as its
 *               own behavior fix
 *
 * Both directions fail (tolerance 0): a NEW unexplained mismatch is a
 * regression, and a STALE exemption — one whose pair now agrees — must be
 * pruned in the change that fixed it. Same shape as the R4 canonical-validity
 * allowlist, for the same reason: an allowlist nobody prunes stops being a
 * record of what is wrong and becomes a place where wrong things live.
 */

import { describe, it, expect } from 'vitest';
import {
  commandSchemas,
  type CommandSchema,
  type AstShape,
} from '../src/generators/command-schemas';
import { englishProfile } from '../src/generators/profiles/english';
import type { ActionType, SemanticRole } from '../src/types';

type ExemptionKind = 'contract' | 'undeclared' | 'drift';

/**
 * Keyed `<action>.<modifierKey>`. Every entry states WHY the descriptor's key
 * is not the role's English marker.
 */
const EXEMPTIONS: Record<string, { kind: ExemptionKind; reason: string }> = {
  // NOTE: `set` needs no entry. Its descriptor inverts the usual arg/modifier
  // roles, but both keys still equal their role's en marker exactly
  // (patient → 'to', scope → 'on', both via markerOverride). Two exemptions
  // were written here on the assumption they diverged; the gate rejected both.
  'show.with': {
    kind: 'undeclared',
    reason: '`duration` is not declared on showSchema; the parser relabels into it',
  },
  'hide.with': {
    kind: 'undeclared',
    reason: '`duration` is not declared on hideSchema (which has patient + style); same as show',
  },
  'morph.on': {
    kind: 'contract',
    reason:
      'MorphCommand takes the new content positionally and the element being morphed in `on`, ' +
      "so `on` is a contract key; morphSchema marks patient '' (`morph #target …`, no preposition)",
  },
  // NOTE: `toggle.for` was an `undeclared` entry here until `duration` became a
  // real toggleSchema role. The descriptor key now equals the role's en marker
  // ('for'), so the gate REJECTS the exemption — the mechanism working as
  // designed, and what forced this pruning.

  'send.detail': {
    kind: 'contract',
    reason:
      '`detail` is a runtime contract key, not a preposition; `patient` is also not a ' +
      'sendSchema role — `send evt(x:1) to #t` binds the whole call to `event`, so this ' +
      'modifier is inert today',
  },
  // NOTE: `default.to` was a `drift` entry here until the descriptor was
  // inverted to `args: ['destination'], modifiers: { to: 'patient' }`. The key
  // now matches patient's `markerOverride.en` ('to'), so the gate rejects the
  // exemption — which is the mechanism working as designed.
  'fetch.body': {
    kind: 'contract',
    reason: 'FetchCommand reads the request body from `body`; patient has no en marker',
  },
  // NOTE: `swap.on` and `swap.with` were the last two `drift` entries. The
  // descriptor now emits NO modifiers at all — SwapCommand's contract is
  // keyword-positional args and it never reads `raw.modifiers` — so both keys
  // stopped existing and the orphan check below deleted them. The drift list is
  // empty; see `descriptor-runtime-contract.test.ts` for what replaced them.
};

/** All roles of a first-present-of chain (a bare role is a one-role chain). */
function chainRoles(spec: SemanticRole | ReadonlyArray<SemanticRole>): readonly SemanticRole[] {
  return Array.isArray(spec) ? (spec as readonly SemanticRole[]) : [spec as SemanticRole];
}

/**
 * The English marker for a role in a command: the schema's own override if it
 * has one, else the en profile's default for that role. `undefined` means the
 * schema does not declare the role at all.
 */
function enMarkerFor(schema: CommandSchema, role: SemanticRole): string | undefined {
  const spec = schema.roles.find(r => r.role === role);
  if (!spec) return undefined;
  const override = spec.markerOverride?.['en'];
  if (override !== undefined) return override;
  const markers = englishProfile.roleMarkers as Record<string, { primary?: string } | undefined>;
  return markers[role]?.primary;
}

function schemasWithShape(): Array<[ActionType, CommandSchema & { ast: AstShape }]> {
  return Object.entries(commandSchemas)
    .filter((entry): entry is [string, CommandSchema & { ast: AstShape }] => Boolean(entry[1].ast))
    .map(([action, schema]) => [action as ActionType, schema]);
}

describe('schema ast descriptors agree with the English marker data', () => {
  it('has at least one migrated command to check', () => {
    expect(schemasWithShape().length).toBeGreaterThan(0);
  });

  for (const [action, schema] of schemasWithShape()) {
    for (const [key, spec] of Object.entries(schema.ast.modifiers ?? {})) {
      const roles = chainRoles(spec);
      const exemptionKey = `${action}.${key}`;

      it(`${exemptionKey} ← ${roles.join(' ?? ')}`, () => {
        // ANY role in a first-present-of chain may justify the key: `measure`'s
        // `of` chain is [destination, source] and it is `source` that the schema
        // marks 'of'. Checking only the head role would demand an exemption for
        // a descriptor that agrees with the marker data perfectly.
        const markers = roles.map(r => enMarkerFor(schema, r));
        const exemption = EXEMPTIONS[exemptionKey];

        if (markers.includes(key)) {
          expect(
            exemption,
            `STALE exemption '${exemptionKey}': key '${key}' now matches the en marker of ` +
              `role '${roles[markers.indexOf(key)]}'. Delete the entry in the change that fixed it.`
          ).toBeUndefined();
          return;
        }

        const detail = roles
          .map(
            (r, i) => `${r}=${markers[i] === undefined ? '<not a schema role>' : `'${markers[i]}'`}`
          )
          .join(', ');
        expect(
          exemption,
          `Descriptor modifier key '${key}' for ${action} matches no en marker in its role ` +
            `chain (${detail}). Either use the marker as the key, or add an EXEMPTIONS entry ` +
            'stating why it differs.'
        ).toBeDefined();
        expect(exemption!.reason.length).toBeGreaterThan(20);
      });
    }
  }

  it('has no exemptions for commands that no longer declare a descriptor', () => {
    const live = new Set(
      schemasWithShape().flatMap(([action, schema]) =>
        Object.keys(schema.ast.modifiers ?? {}).map(key => `${action}.${key}`)
      )
    );
    const orphans = Object.keys(EXEMPTIONS).filter(k => !live.has(k));
    expect(orphans, 'exemptions referencing a descriptor key that no longer exists').toEqual([]);
  });

  it('records every known mapper-vs-schema drift as drift, not as contract', () => {
    // Drift entries are debt with a name. If this count falls, a real behavior
    // fix landed — prune the entry. If it rises, a migration preserved a new
    // disagreement and the PR must say so.
    const drift = Object.entries(EXEMPTIONS)
      .filter(([, v]) => v.kind === 'drift')
      .map(([k]) => k)
      .sort();
    expect(drift).toEqual([]);
  });
});
