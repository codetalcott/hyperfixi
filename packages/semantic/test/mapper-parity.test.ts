/**
 * Command-mapper parity gate (Arc F).
 *
 * `test/fixtures/mapper-parity.json` records what every mapper-backed action
 * emitted BEFORE any command was migrated from a hand-written mapper to a
 * declarative schema `ast` descriptor. This test replays it.
 *
 * It is the oracle that makes the migration provable rather than plausible: a
 * migrated command must emit a byte-identical AST for every recorded role
 * subset, including the subsets that exercise the losing member of a
 * coalescing chain (`destination ?? patient`). Dropping a fallback in a
 * descriptor changes an `only-<role>` case and fails here.
 *
 * A failure means one of two things:
 *   - a migration is not faithful → fix the descriptor, not the fixture
 *   - an intentional AST change → regenerate and justify the diff in the PR
 */

import { describe, it, expect } from 'vitest';
import fixture from './fixtures/mapper-parity.json';
import { resolveCommandMapper, getRegisteredMappers } from '../src/ast-builder/command-mappers';
import { ASTBuilder } from '../src/ast-builder/index';
import { getSchema } from '../src/generators/command-schemas';
import type { ActionType, CommandSemanticNode, SemanticRole, SemanticValue } from '../src/types';

type FixtureCase = { name: string; roles: Record<string, SemanticValue>; ast: unknown };
type FixtureAction = { roles: string[]; cases: FixtureCase[] };

const actions = fixture.actions as unknown as Record<string, FixtureAction>;

/**
 * Commands that branch on a role's VALUE rather than its presence, so no
 * declarative shape expresses them. These are never migrated:
 *
 * - `wait` flips the whole node shape between event and duration forms
 * - `put`  derives its preposition from a role's literal value
 * - `go`   injects literal `'back'` / `'url'` args (positional-only contract)
 * - `pick` dispatches on variant and splits a range surface into three modifiers
 */
const ALWAYS_HAND_WRITTEN = ['go', 'pick', 'put', 'wait'];

/**
 * How many of the fixture's actions are expected to be schema-driven.
 *
 * A ratchet: bump it in the PR that migrates the commands, never to make a
 * red test go green. It exists so an accidental un-migration (a descriptor
 * deleted, a mapper re-registered) fails loudly even though parity still holds.
 */
const EXPECTED_MIGRATED = 43;

function emit(action: ActionType, roles: Record<string, SemanticValue>): unknown {
  const mapper = resolveCommandMapper(action);
  if (!mapper) return null;
  const node = {
    kind: 'command',
    action,
    roles: new Map(Object.entries(roles) as Array<[SemanticRole, SemanticValue]>),
  } as CommandSemanticNode;
  const result = mapper.toAST(node, new ASTBuilder());
  return result && typeof result === 'object' && 'ast' in result ? result.ast : result;
}

describe('command mapper parity (schema descriptors vs the original mappers)', () => {
  const fixtureActions = Object.keys(actions) as ActionType[];

  it('resolves a mapper for every action that had a hand-written one', () => {
    // As commands migrate, the registry shrinks but coverage must not: every
    // recorded action still has to resolve through registry-or-descriptor.
    for (const action of fixtureActions) {
      expect(resolveCommandMapper(action), `no mapper resolves for '${action}'`).toBeDefined();
    }
  });

  it('never both registers a mapper and declares a descriptor for the same action', () => {
    // A registered mapper silently wins over a descriptor. Holding both makes
    // the descriptor dead code that reads as live — the exact shape of the
    // drift this arc exists to remove.
    const both = fixtureActions.filter(a => getRegisteredMappers().has(a) && getSchema(a)?.ast);
    expect(both).toEqual([]);
  });

  it('keeps the value-branching commands hand-written', () => {
    for (const action of ALWAYS_HAND_WRITTEN) {
      expect(getRegisteredMappers().has(action as ActionType), `${action} must stay a mapper`).toBe(
        true
      );
      expect(
        getSchema(action as ActionType)?.ast,
        `${action} must not declare a descriptor`
      ).toBeUndefined();
    }
  });

  it(`has migrated exactly ${EXPECTED_MIGRATED} commands to schema descriptors`, () => {
    const migrated = fixtureActions.filter(a => getSchema(a)?.ast).sort();
    expect(migrated).toHaveLength(EXPECTED_MIGRATED);
  });

  for (const [action, spec] of Object.entries(actions)) {
    describe(action, () => {
      const probe = spec.cases.find(c => c.name === 'all-probe-roles')!.roles;

      it('reads the same roles it was measured to read', () => {
        // Re-derives sensitivity exactly as the generator did. Catches a
        // descriptor that stops consuming a role even in the cases where the
        // recorded ASTs would still match.
        const allRoles = Object.keys(probe);
        const pick = (rs: string[]) =>
          Object.fromEntries(rs.map(r => [r, probe[r]])) as Record<string, SemanticValue>;
        const allPresent = JSON.stringify(emit(action as ActionType, probe));
        const empty = JSON.stringify(emit(action as ActionType, {}));

        const relevant = allRoles.filter(role => {
          const dropped = JSON.stringify(
            emit(action as ActionType, pick(allRoles.filter(r => r !== role)))
          );
          const alone = JSON.stringify(emit(action as ActionType, pick([role])));
          return dropped !== allPresent || alone !== empty;
        });

        expect(relevant).toEqual(spec.roles);
      });

      for (const testCase of spec.cases) {
        it(`emits the recorded AST for ${testCase.name}`, () => {
          expect(emit(action as ActionType, testCase.roles)).toEqual(testCase.ast);
        });
      }
    });
  }
});
