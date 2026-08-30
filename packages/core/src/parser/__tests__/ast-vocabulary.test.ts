/**
 * The AST vocabulary — Arc 0's producer snapshot
 *
 * Arc 0 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Three producers emit into
 * one untyped `ASTNode` (`{ type: string; [key: string]: unknown }`), and
 * nothing has ever compared their vocabularies. This pins the SET of `type`
 * literals each in-core producer emits over a shared corpus, so Arc 2 (one
 * discriminated union) and Arc 3 (per-command nodes) have a before-picture that
 * fails loudly rather than a guess.
 *
 * ## The two producers pinned here, and the third that is not
 *
 * The full parser (`parser/parser.ts`) and the hybrid parser
 * (`parser/hybrid/parser-core.ts`) are both in-core and are pinned below. The
 * third producer, `@lokascript/semantic`'s `buildAST`, is deliberately NOT
 * exercised here: Arc 1's whole purpose is removing core's dependency on that
 * package, so adding a new core test that imports it would be work pointed the
 * wrong way. Its vocabulary is already pinned on its own side of the boundary
 * by `check:mapper-parity`'s 332-case oracle.
 *
 * For orientation, `buildAST` emits six kinds neither parser here produces —
 * `contextReference`, `propertyAccess`, `timeExpression`, `objectProperty`,
 * `error`, `if` — which is why `parser/runtime.ts` carries explicit
 * `case 'propertyAccess'` and `case 'contextReference'` arms whose comments say
 * "this only arrives from @lokascript/semantic".
 *
 * ## Do not re-bless a failure
 *
 * A changed list is either (a) a deliberate step of Arc 2/3, in which case the
 * diff is the review artifact and you edit the list in the same PR, or (b) a
 * producer growing a shape nothing evaluates — which surfaces at RUNTIME as
 * `Unknown AST node type: …`, not at build time, and is a bug. The lists are
 * explicit and sorted rather than `toMatchSnapshot()` for exactly that reason:
 * a snapshot gets re-blessed on first red, a hand-edited array does not.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { HybridParser } from '../hybrid/parser-core';
import type { ASTNode } from '../../types/base-types';
import {
  FEATURE_SOURCES,
  commandExamples,
  commandsWithoutExamples,
  corpusSources,
} from './engine-corpus';

// ===========================================================================
// Corpus — shared with ast-equivalence.test.ts, see ./engine-corpus.ts
// ===========================================================================

/**
 * Command examples the full parser REJECTS, `command | source`.
 *
 * Pinned in both directions, and not merely as trivia: the vocabulary snapshot
 * below is built from the sources that parse, so an example that starts or
 * stops parsing silently moves the vocabulary. This list is what makes that
 * movement visible.
 *
 * Two distinct populations, and the difference matters to whoever burns them
 * down:
 *
 *   - **Documentation defects** — `repeat … { … }` (four rows) uses C-style
 *     braces for a block. Hyperscript has never had that syntax; the examples
 *     are wrong, not the parser.
 *   - **Parser gaps** — `install Draggable on #box`, `settle for 3000`,
 *     `tell closest <form/> submit`, `take @x from <.a/> and put it on <#b/>`,
 *     the four `pseudo-command` forms, the three `render … with (…)` forms and
 *     `start view transition … end` are syntax the command's own metadata
 *     advertises and the parser does not accept. Those belong in
 *     `docs-internal/PARSER_NEXT_STEPS.md`.
 *
 * Fixing either kind shrinks this list, and the shrink is the point.
 */
const EXAMPLES_THE_FULL_PARSER_REJECTS = [
  'break | repeat for item in items { if item == target then break }',
  'continue | repeat for item in items { if item.skip then continue; process item }',
  'if | unless user.isLoggedIn showLoginForm',
  'install | install Draggable on #box',
  'install | install Sortable(axis: "y") on .list',
  'pseudo-command | foo() on me',
  'pseudo-command | getElementById("d1") from the document',
  'pseudo-command | reload() the location of the window',
  'pseudo-command | setAttribute("foo", "bar") on me',
  'render | render "<template>Hello ${name}!</template>" with (name: "World")',
  'render | render myTemplate with (name: "Alice")',
  'render | render template with (items: data)',
  'repeat | repeat 5 times { log "hello" }',
  'repeat | repeat for item in items { log item }',
  'settle | settle for 3000',
  'start | start view transition using "slide" then put result into #panel end',
  'take | take @data-value from <.source/> and put it on <#target/>',
  'tell | tell closest <form/> submit',
  'unless | unless user.isLoggedIn showLoginForm',
] as const;

// ===========================================================================
// Walking
// ===========================================================================

/** Every `type` string reachable from a node, however deeply nested. */
function collectTypes(node: unknown, into: Set<string> = new Set()): Set<string> {
  if (Array.isArray(node)) {
    for (const child of node) collectTypes(child, into);
    return into;
  }
  if (!node || typeof node !== 'object') return into;

  const record = node as Record<string, unknown>;
  if (typeof record.type === 'string') into.add(record.type);

  for (const [key, value] of Object.entries(record)) {
    // `diagnostics` carries error payloads and `metadata` parser provenance —
    // neither is AST, and both have their own `type`-ish fields.
    if (key === 'diagnostics' || key === 'metadata') continue;
    if (value && typeof value === 'object') collectTypes(value, into);
  }
  return into;
}

/** Sources the full parser accepts, and the kinds it emits for them. */
function fullParserRun(sources: string[]): { kinds: Set<string>; rejected: string[] } {
  const kinds = new Set<string>();
  const rejected: string[] = [];
  for (const source of sources) {
    let result: { success: boolean; node?: ASTNode } | undefined;
    try {
      result = parse(source, {});
    } catch {
      rejected.push(source);
      continue;
    }
    if (result?.success && result.node) collectTypes(result.node, kinds);
    else rejected.push(source);
  }
  return { kinds, rejected };
}

/** Kinds the hybrid parser emits. It covers ~85% of the syntax by design. */
function hybridParserKinds(sources: string[]): Set<string> {
  const kinds = new Set<string>();
  for (const source of sources) {
    try {
      collectTypes(new HybridParser(source).parse(), kinds);
    } catch {
      continue;
    }
  }
  return kinds;
}

// ===========================================================================
// The pinned vocabularies
// ===========================================================================

/**
 * Kinds the FULL parser emits. The strays are the point — Arc 2 step 1
 * classifies each as canonical, an alias, producer-local, or dead:
 *
 *   - `Program` and `CommandSequence` are the only PascalCase kinds in the
 *     engine, and both have a camelCase twin the evaluator also accepts.
 *   - `callExpression` and `functionCall` are two names for one thing; see
 *     the orphan test below for who reads the second.
 */
const FULL_PARSER_KINDS = [
  'CommandSequence',
  'Program',
  'arrayLiteral',
  'asExpression',
  'attributeAccess',
  'behavior',
  'betweenExpression',
  'binaryExpression',
  'block',
  'callExpression',
  'command',
  'def',
  'eventHandler',
  'functionCall',
  'identifier',
  'initBlock',
  'literal',
  'memberExpression',
  'objectLiteral',
  'possessiveExpression',
  'propertyOfExpression',
  'selector',
  'string',
  'templateLiteral',
  'unaryExpression',
] as const;

/**
 * Kinds the HYBRID parser emits over the same corpus.
 *
 * Where the two producers overlap they disagree by NAME, not by meaning —
 * `binary`/`binaryExpression`, `member`/`memberExpression`, `event`/`eventHandler`,
 * `possessive`/`possessiveExpression`, `call`/`callExpression`, `array`/`arrayLiteral`,
 * `object`/`objectLiteral`. That is what makes `runtime-base.ts`'s `case 'event'`
 * and `case 'sequence'` adapter arms necessary, and what Arc 2 removes by giving
 * both producers one union to target.
 */
const HYBRID_PARSER_KINDS = [
  'array',
  'binary',
  'call',
  'command',
  'event',
  'fetch',
  'fetchConfig',
  'for',
  'forCondition',
  'identifier',
  'if',
  'literal',
  'member',
  'object',
  'positional',
  'possessive',
  'repeat',
  'selector',
  'sequence',
  'unary',
  'variable',
  'while',
] as const;

/** The seven kinds both producers mean but spell differently. */
const RENAME_PAIRS = [
  ['arrayLiteral', 'array'],
  ['binaryExpression', 'binary'],
  ['callExpression', 'call'],
  ['eventHandler', 'event'],
  ['memberExpression', 'member'],
  ['objectLiteral', 'object'],
  ['possessiveExpression', 'possessive'],
] as const;

// ===========================================================================
// Tests
// ===========================================================================

describe('AST vocabulary (ENGINE_MIGRATION_PLAN Arc 0)', () => {
  const examples = commandExamples();
  const corpus = corpusSources();

  it('the corpus covers every registered command', () => {
    // Guards the corpus itself: a command whose examples go empty would drop
    // out of the sweep silently, and the vocabulary would shrink for the wrong
    // reason.
    expect(commandsWithoutExamples()).toEqual([]);
    expect(examples.length).toBeGreaterThan(150);
    expect(corpus.length).toBe(FEATURE_SOURCES.length + examples.length);
  });

  it('pins which documented command examples the full parser rejects', () => {
    const rejected = examples
      .filter(({ source }) => {
        try {
          return !parse(source, {}).success;
        } catch {
          return true;
        }
      })
      .map(({ command, source }) => `${command} | ${source}`)
      .sort();

    // Both directions. A newly-broken example fails here; so does one that was
    // fixed without pruning its row, which is what keeps the list ratcheting
    // down instead of quietly outliving the defect.
    expect(rejected).toEqual([...EXAMPLES_THE_FULL_PARSER_REJECTS]);
  });

  it('the full parser emits exactly the pinned set of node kinds', () => {
    expect([...fullParserRun(corpus).kinds].sort()).toEqual([...FULL_PARSER_KINDS]);
  });

  it('the hybrid parser emits exactly the pinned set of node kinds', () => {
    expect([...hybridParserKinds(corpus)].sort()).toEqual([...HYBRID_PARSER_KINDS]);
  });

  it('records where the two producers disagree — the Arc 2 worklist', () => {
    const full = new Set<string>(FULL_PARSER_KINDS);
    const hybrid = new Set<string>(HYBRID_PARSER_KINDS);

    // Only four kinds are spelled the same way by both. Everything else needs a
    // rename or an adapter, and today gets an adapter.
    expect([...full].filter(k => hybrid.has(k)).sort()).toEqual([
      'command',
      'identifier',
      'literal',
      'selector',
    ]);

    for (const [fullName, hybridName] of RENAME_PAIRS) {
      expect(full.has(fullName), `full parser should emit ${fullName}`).toBe(true);
      expect(hybrid.has(hybridName), `hybrid parser should emit ${hybridName}`).toBe(true);
      expect(full.has(hybridName), `full parser should NOT emit ${hybridName}`).toBe(false);
      expect(hybrid.has(fullName), `hybrid parser should NOT emit ${fullName}`).toBe(false);
    }
  });

  it('every kind the full parser emits is dispatched somewhere', () => {
    // The property that makes a stray kind a BUG rather than trivia: a node
    // type nothing dispatches fails at runtime with `Unknown AST node type: …`,
    // never at build time. Arc 2 turns this test into a `never`-default switch.
    //
    // The two lists are transcribed rather than imported on purpose: importing
    // them would let a case being DELETED silently keep this green.
    const RUNTIME_STATEMENT_KINDS = new Set([
      'command',
      'eventHandler',
      'event',
      'behavior',
      'def',
      'Program',
      'initBlock',
      'block',
      'sequence',
      'CommandSequence',
      'objectLiteral',
    ]);
    const EVALUATOR_EXPRESSION_KINDS = new Set([
      'literal',
      'identifier',
      'binaryExpression',
      'asExpression',
      'betweenExpression',
      'typeCheckExpression',
      'collectionExpression',
      'unaryExpression',
      'memberExpression',
      'propertyAccess',
      'callExpression',
      'selector',
      'contextReference',
      'possessiveExpression',
      'eventHandler',
      'conditionalExpression',
      'string',
      'arrayLiteral',
      'objectLiteral',
      'attributeAccess',
      'propertyOfExpression',
      'templateLiteral',
      'stringPostfix',
      'blockLiteral',
    ]);

    /**
     * Kinds no evaluator arm handles because no evaluator ever sees them: the
     * owning command reads them STRUCTURALLY in its own `parseInput` and never
     * evaluates the node.
     *
     * `functionCall` is emitted only by `parseTriggerCommand`
     * (`command-parsers/event-commands.ts`) and read only by `trigger.ts`,
     * which accepts it alongside `callExpression`. It is a command-local shape
     * — precisely the kind of thing Arc 3 turns into a typed per-command node
     * rather than a new member of the global vocabulary.
     */
    const COMMAND_LOCAL_KINDS = new Set(['functionCall']);

    const orphans = FULL_PARSER_KINDS.filter(
      kind =>
        !RUNTIME_STATEMENT_KINDS.has(kind) &&
        !EVALUATOR_EXPRESSION_KINDS.has(kind) &&
        !COMMAND_LOCAL_KINDS.has(kind)
    );

    expect(orphans).toEqual([]);
  });
});
