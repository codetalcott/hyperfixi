#!/usr/bin/env tsx
/**
 * Generate the command-mapper parity fixture.
 *
 * The fixture is the migration oracle for Arc F (schema-driven semantic
 * mappers): it records what EVERY mapper-backed action emits for a matrix of
 * role subsets, so a command migrated from a hand-written mapper to a schema
 * `ast` descriptor can be proved byte-identical rather than assumed so.
 *
 * Generate it ONCE, from the pre-migration tree, and never regenerate it to
 * make a failing test pass — a diff here is either an intentional behavior
 * change (state it in the PR) or the regression the fixture exists to catch.
 *
 *   npx tsx scripts/gen-mapper-parity.ts            # write the fixture
 *   npx tsx scripts/gen-mapper-parity.ts --check    # fail if it would change
 *
 * Role sensitivity is DISCOVERED, not declared: for each action the generator
 * drops one probe role at a time and keeps the roles that actually change the
 * output. The recorded `roles` list is therefore a measured statement of what
 * each mapper reads — which is how the show/toggle/swap schema-vs-mapper drift
 * became visible in the first place.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveCommandMapper, getRegisteredMappers } from '../src/ast-builder/command-mappers';
import { commandSchemas } from '../src/generators/command-schemas';
import { ASTBuilder } from '../src/ast-builder/index';
import type { CommandSemanticNode, ActionType, SemanticRole, SemanticValue } from '../src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, '../test/fixtures/mapper-parity.json');

/**
 * Every role any hand-written mapper reads, plus the roles the schemas bind.
 * Values are deterministic and role-distinguishable so a mis-routed role is
 * visible in the fixture rather than merely unequal.
 */
const PROBE_ROLES: Record<string, SemanticValue> = {
  patient: { type: 'selector', value: '.patient-v', selectorKind: 'class' },
  destination: { type: 'selector', value: '#destination-v', selectorKind: 'id' },
  source: { type: 'selector', value: '#source-v', selectorKind: 'id' },
  scope: { type: 'selector', value: '#scope-v', selectorKind: 'id' },
  event: { type: 'literal', value: 'event-v' },
  condition: { type: 'literal', value: 'condition-v' },
  duration: { type: 'literal', value: 'duration-v' },
  quantity: { type: 'literal', value: 'quantity-v' },
  style: { type: 'literal', value: 'style-v' },
  method: { type: 'literal', value: 'method-v' },
  manner: { type: 'literal', value: 'manner-v' },
  responseType: { type: 'literal', value: 'responseType-v' },
  goal: { type: 'literal', value: 'goal-v' },
};

/**
 * Extra hand-authored cases for the mappers whose logic BRANCHES on a role's
 * value rather than its presence. These are the four Arc F keeps as custom
 * mappers; pinning them guards the migration against collateral damage.
 */
const SPECIAL_CASES: Record<
  string,
  Array<{ name: string; roles: Record<string, SemanticValue> }>
> = {
  go: [
    { name: 'back', roles: { destination: { type: 'literal', value: 'back' } } },
    {
      name: 'url',
      roles: {
        destination: { type: 'literal', value: '/page' },
        method: { type: 'literal', value: 'url' },
      },
    },
    {
      name: 'scroll',
      roles: { destination: { type: 'selector', value: '#top', selectorKind: 'id' } },
    },
  ],
  wait: [
    { name: 'duration-only', roles: { duration: { type: 'literal', value: '200ms' } } },
    { name: 'event', roles: { event: { type: 'literal', value: 'transitionend' } } },
    {
      name: 'event-from',
      roles: {
        event: { type: 'literal', value: 'transitionend' },
        source: { type: 'reference', value: 'document' },
      },
    },
  ],
  put: [
    {
      name: 'into-default',
      roles: {
        patient: { type: 'literal', value: 'hello' },
        destination: { type: 'selector', value: '#out', selectorKind: 'id' },
      },
    },
    {
      name: 'manner-before',
      roles: {
        patient: { type: 'literal', value: 'hello' },
        destination: { type: 'selector', value: '#out', selectorKind: 'id' },
        manner: { type: 'literal', value: 'before' },
      },
    },
    {
      name: 'method-fallback-after',
      roles: {
        patient: { type: 'literal', value: 'hello' },
        destination: { type: 'selector', value: '#out', selectorKind: 'id' },
        method: { type: 'literal', value: 'after' },
      },
    },
  ],
  pick: [
    {
      name: 'first-count',
      roles: {
        method: { type: 'literal', value: 'first' },
        patient: { type: 'literal', value: 3 },
        source: { type: 'selector', value: '#list', selectorKind: 'id' },
      },
    },
    {
      name: 'range-inclusive',
      roles: {
        method: { type: 'literal', value: 'characters' },
        patient: { type: 'expression', raw: '0 to 5 inclusive' } as SemanticValue,
        source: { type: 'selector', value: '#txt', selectorKind: 'id' },
      },
    },
    {
      name: 'match-regex',
      roles: {
        method: { type: 'literal', value: 'match' },
        patient: { type: 'literal', value: '/a+/' },
        source: { type: 'selector', value: '#txt', selectorKind: 'id' },
      },
    },
    { name: 'legacy-no-method', roles: { patient: { type: 'literal', value: 'colors' } } },
  ],
};

function makeNode(action: ActionType, roles: Record<string, SemanticValue>): CommandSemanticNode {
  return {
    kind: 'command',
    action,
    roles: new Map(Object.entries(roles) as Array<[SemanticRole, SemanticValue]>),
  } as CommandSemanticNode;
}

/** Run the mapper the AST builder would actually apply for this action. */
function emit(action: ActionType, roles: Record<string, SemanticValue>): unknown {
  const mapper = resolveCommandMapper(action);
  if (!mapper) return null;
  const builder = new ASTBuilder();
  const result = mapper.toAST(makeNode(action, roles), builder);
  return result && typeof result === 'object' && 'ast' in result ? result.ast : result;
}

function stable(value: unknown): string {
  return JSON.stringify(value);
}

function subset(roles: readonly string[]): Record<string, SemanticValue> {
  const out: Record<string, SemanticValue> = {};
  for (const r of roles) out[r] = PROBE_ROLES[r];
  return out;
}

interface ParityCase {
  readonly name: string;
  readonly roles: Record<string, SemanticValue>;
  readonly ast: unknown;
}

function buildFixture(): Record<string, { roles: string[]; cases: ParityCase[] }> {
  // Enumerate registered mappers UNION schema descriptors, not the registry
  // alone: the registry shrinks by design as commands migrate, so keying the
  // fixture off it would silently drop each migrated command from its own
  // oracle — the fixture would "stay green" by no longer testing anything.
  const declared = Object.entries(commandSchemas)
    .filter(([, schema]) => schema.ast)
    .map(([action]) => action as ActionType);
  const actions = [...new Set([...getRegisteredMappers().keys(), ...declared])].sort();
  const out: Record<string, { roles: string[]; cases: ParityCase[] }> = {};

  for (const action of actions) {
    const allRoles = Object.keys(PROBE_ROLES);
    const allPresent = stable(emit(action, subset(allRoles)));
    const empty = stable(emit(action, {}));

    // Discover which roles this mapper actually reads. BOTH criteria are
    // required: drop-one-from-all misses the losing member of a coalescing
    // chain (`destination ?? patient` — dropping `patient` changes nothing
    // while `destination` still wins), and alone-vs-empty misses a role that
    // only matters in combination. Using drop-one alone made `blur`,
    // `show`, `morph`, `measure` and `fetch` under-report, which would have
    // let a descriptor silently drop a fallback and still pass parity.
    const relevant = allRoles.filter(role => {
      const dropped = stable(emit(action, subset(allRoles.filter(r => r !== role))));
      const alone = stable(emit(action, subset([role])));
      return dropped !== allPresent || alone !== empty;
    });

    const cases: ParityCase[] = [];
    const push = (name: string, roles: Record<string, SemanticValue>) =>
      cases.push({ name, roles, ast: emit(action, roles) });

    push('no-roles', {});
    push('all-relevant', subset(relevant));
    for (const role of relevant) {
      push(`only-${role}`, subset([role]));
      if (relevant.length > 1) {
        push(`without-${role}`, subset(relevant.filter(r => r !== role)));
      }
    }
    // Roles the mapper ignores must stay ignored — one case proves it.
    push('all-probe-roles', subset(allRoles));

    for (const special of SPECIAL_CASES[action] ?? []) {
      push(`special-${special.name}`, special.roles);
    }

    out[action] = { roles: relevant, cases };
  }

  return out;
}

const fixture = {
  __doc__:
    'GENERATED by scripts/gen-mapper-parity.ts — the Arc F migration oracle. ' +
    'A diff here is an AST behavior change: justify it in the PR, never regenerate to go green. ' +
    'Each action records the roles its mapper was MEASURED to read, plus emitted ASTs per role subset.',
  actions: buildFixture(),
};

const serialized = `${JSON.stringify(fixture, null, 2)}\n`;
const isCheck = process.argv.includes('--check');

if (isCheck) {
  if (!existsSync(FIXTURE_PATH)) {
    console.error(`Missing fixture: ${FIXTURE_PATH}`);
    process.exit(1);
  }
  const current = readFileSync(FIXTURE_PATH, 'utf8');
  if (current !== serialized) {
    console.error(
      'Mapper parity fixture is STALE.\n' +
        'The emitted ASTs no longer match the committed oracle. If the change is\n' +
        'intentional, regenerate with `npx tsx scripts/gen-mapper-parity.ts` and\n' +
        'explain the AST diff in the PR.'
    );
    process.exit(1);
  }
  console.log('Mapper parity fixture is up to date.');
} else {
  writeFileSync(FIXTURE_PATH, serialized);
  const count = Object.keys(fixture.actions).length;
  const cases = Object.values(fixture.actions).reduce((n, a) => n + a.cases.length, 0);
  console.log(`Wrote ${FIXTURE_PATH}\n  ${count} actions, ${cases} cases`);
}
