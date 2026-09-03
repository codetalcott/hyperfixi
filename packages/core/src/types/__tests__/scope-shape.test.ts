/**
 * Arc 4c step 5 — the shape of `Scope`, pinned.
 *
 * The target design (`docs-internal/ENGINE_MIGRATION_PLAN.md`, item 5) asks
 * for "a small typed Scope, not a bag". This is what it is now: the seven
 * core fields plus five the runtime uses. A field added here is a decision
 * to write down, not a convenience — that is why the key set is asserted
 * exactly, at the type level and on the object `createContext` builds.
 */
import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Scope, ExecutionContext } from '../base-types';
import { createContext } from '../../core/context';

type ScopeKeys =
  | 'me'
  | 'owner'
  | 'you'
  | 'it'
  | 'event'
  | 'locals'
  | 'globals'
  | 'result'
  | 'registry'
  | 'variables'
  | 'parent'
  | 'registerCleanup';

describe('Scope shape', () => {
  it('has exactly the declared keys, at the type level', () => {
    expectTypeOf<keyof Scope>().toEqualTypeOf<ScopeKeys>();
  });

  it('ExecutionContext is the public alias of Scope', () => {
    expectTypeOf<ExecutionContext>().toEqualTypeOf<Scope>();
  });

  it('createContext builds the seven core fields and nothing else', () => {
    const keys = Object.keys(createContext(null)).sort();
    expect(keys).toEqual(['globals', 'it', 'locals', 'me', 'owner', 'result', 'you']);
  });
});
