/**
 * The union stays CLOSED — no index signature, directly or inherited
 *
 * Arc 2 step 6 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Until step 6,
 * `BaseNode extends ASTNode`, and `ASTNode` carries `[key: string]: unknown`.
 * An inherited index signature makes every member of the union permit every
 * field: a misspelled read type-checks and yields `unknown`, an object literal
 * with a junk key is assignable, and the exhaustive switches of step 3 are the
 * only place in the engine a typo cannot slip past. Step 6 cut the
 * inheritance; `BaseNode` declares `type`, the positions, `raw?` and
 * `diagnostics?` itself, and `ASTNode` keeps its signature for the legacy and
 * published consumers that still need it.
 *
 * ## Why this file is a TYPE test, not a runtime one
 *
 * There is nothing to observe at runtime — an index signature is erased. What
 * can be observed is the COMPILER's behaviour, and `@ts-expect-error` is the
 * assertion: each one below fails to compile the moment the error it expects
 * stops happening. So if anyone re-adds `extends ASTNode` to `BaseNode` (or
 * writes a member with its own `[key: string]` signature), every directive
 * here becomes an unused-directive error and `npm run typecheck` goes red.
 *
 * That makes `tsc` the gate the plan said it would be, rather than a property
 * that happens to hold today and silently stops holding tomorrow. The runtime
 * assertions at the bottom exist only so vitest has something to run — the
 * real check already happened in `tsc`.
 */

import { describe, it, expect } from 'vitest';
import type { LiteralNode, CommandNode, SyntaxNode } from '../nodes';
import type { ASTNode } from '../../types/base-types';

describe('the AST union carries no index signature', () => {
  it('rejects a read of an undeclared field on a member', () => {
    const literal: LiteralNode = { type: 'literal', value: 1 };

    // @ts-expect-error — `notAField` is not declared on LiteralNode. With an
    // inherited `[key: string]: unknown` this read compiles and yields
    // `unknown`, which is how a typo'd field read survives review.
    const stray: unknown = literal.notAField;

    expect(stray).toBeUndefined();
  });

  it('rejects an undeclared field in a member literal', () => {
    // Every REQUIRED field is present, so the only thing left to complain
    // about is the junk key. (Written without `args`/`isBlocking` at first,
    // the directive absorbed the missing-property error instead and the case
    // proved nothing — it still went red under the mutation, for the wrong
    // reason.)
    const node: CommandNode = {
      type: 'command',
      name: 'toggle',
      args: [],
      isBlocking: false,
      // @ts-expect-error — excess property. An index signature accepts any key,
      // so this misspelling would be silently welcomed.
      arguments: [],
    };

    expect(node.name).toBe('toggle');
  });

  it('keeps the legacy `ASTNode` wide, on purpose', () => {
    // The mirror of the two above: `types/base-types.ASTNode` KEEPS its index
    // signature, because it is exported from `index.ts` and downstream packages
    // type against it. No `@ts-expect-error` here — this read is legal, and it
    // is meant to be. Removing it there is the 4.0 item, not step 6.
    const legacy: ASTNode = { type: 'literal', value: 1 };
    expect(legacy.value).toBe(1);
  });

  it('does not let a union member stand in for a legacy `ASTNode`', () => {
    const member: SyntaxNode = { type: 'literal', value: 1 };

    // @ts-expect-error — the whole point of the separation: a member is no
    // longer assignable to the wide type, so every crossing has to be named
    // (see `ast/legacy.ts`) instead of happening implicitly.
    const asLegacy: ASTNode = member;

    expect(asLegacy.type).toBe('literal');
  });
});
