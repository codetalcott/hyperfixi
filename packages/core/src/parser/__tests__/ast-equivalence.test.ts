/**
 * The AST-equivalence corpus — Arc 0's refactor gate
 *
 * Arc 0 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Records a hash of the
 * parse of every corpus source, so a change that is supposed to be a REFACTOR
 * can prove it: if the hashes do not move, no source parses differently.
 *
 * Arcs 1 and 2 are refactors and this must stay byte-identical through both.
 * Arc 3 changes AST shapes on purpose, one command per PR, and its hash diff is
 * the review artifact — which is the whole reason the baseline is per-source
 * hashes rather than one aggregate number. An aggregate would tell you
 * something changed; this tells you `toggle | toggle .active on me` changed and
 * nothing else did.
 *
 * ## Why hashes rather than the serialized trees
 *
 * The corpus is ~230 sources whose serialized ASTs run to megabytes. A hash
 * baseline is a few hundred lines, its diff is one line per moved source, and
 * it is exact. When a hash moves and you need to see WHY, print the two trees
 * (`npx tsx -e "import {parse} from './src/parser/parser'; console.log(
 * JSON.stringify(parse('<source>', {}).node, null, 2))"`) on either side of the
 * change — there is no need to carry megabytes in the repo to get that.
 *
 * ## Why the parse is canonicalized before hashing
 *
 * `JSON.stringify` is key-order-dependent, and key order in a parser's output
 * is an implementation detail that a refactor may legitimately change (an
 * object literal built by spread vs. by assignment). Sorting keys means the
 * gate fires on parse CONTENT, not on construction order — otherwise it would
 * cry wolf on exactly the mechanical edits Arcs 2-4 consist of.
 *
 * `undefined`-valued keys are dropped for the same reason: `{ a: 1, b: undefined }`
 * and `{ a: 1 }` are the same parse, and TypeScript's optional-property idiom
 * produces both spellings interchangeably.
 */

import { describe, it, expect } from 'vitest';
import { canonicalize, corpusSources, fingerprint } from './engine-corpus';
import baseline from '../../../baselines/ast-equivalence.json';

// ===========================================================================
// Tests
// ===========================================================================

interface Baseline {
  readonly sourceCount: number;
  readonly uniqueSourceCount: number;
  readonly fingerprints: Record<string, string>;
}

const recorded = baseline as unknown as Baseline;

describe('AST equivalence (ENGINE_MIGRATION_PLAN Arc 0)', () => {
  const sources = corpusSources();

  it('the corpus has not silently shrunk', () => {
    // A gate whose denominator can quietly fall is a gate that can be satisfied
    // by deleting coverage. These two are the guard on the guard.
    //
    // The counts differ because the corpus contains the same SOURCE twice in a
    // few places — `unless user.isLoggedIn showLoginForm` is documented by both
    // `if` and `unless`, which share one implementation. Fingerprints are keyed
    // by source, so duplicates collapse.
    expect(sources.length).toBe(recorded.sourceCount);
    expect(new Set(sources).size).toBe(recorded.uniqueSourceCount);
  });

  it('every corpus source is recorded', () => {
    const missing = sources.filter(source => !(source in recorded.fingerprints));
    const orphaned = Object.keys(recorded.fingerprints).filter(source => !sources.includes(source));

    expect(missing, 'sources with no recorded fingerprint').toEqual([]);
    expect(orphaned, 'recorded fingerprints for sources no longer in the corpus').toEqual([]);
  });

  it('no source parses differently than it did at the baseline', () => {
    const moved: { source: string; before: string; after: string }[] = [];
    for (const source of sources) {
      const before = recorded.fingerprints[source];
      if (before === undefined) continue; // reported by the test above
      const after = fingerprint(source);
      if (after !== before) moved.push({ source, before, after });
    }

    // If this is red and you MEANT it (an Arc 3 command migration, say), the
    // list below is the review artifact: regenerate with
    // `npm run baseline:ast-equivalence --prefix packages/core` in the same PR
    // and let the diff carry the change. If you did not mean it, you have just
    // learned that a "pure refactor" was not one.
    expect(moved).toEqual([]);
  });

  it('canonicalization ignores key order and dropped undefineds', () => {
    // The property the whole gate rests on. Without it, Arcs 2-4's mechanical
    // edits would move hashes for no behavioural reason and the gate would be
    // muted within a week.
    const a = { type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.x' }] };
    const b = { args: [{ value: '.x', type: 'selector' }], name: 'toggle', type: 'command' };
    const c = { ...a, extra: undefined };

    expect(JSON.stringify(canonicalize(a))).toBe(JSON.stringify(canonicalize(b)));
    expect(JSON.stringify(canonicalize(a))).toBe(JSON.stringify(canonicalize(c)));
  });

  it('a real parse difference DOES move the fingerprint', () => {
    // Mutation check for the gate itself: two sources that differ only in a
    // nested value must not share a fingerprint. A canonicalizer that flattened
    // too aggressively would make this whole file vacuous.
    expect(fingerprint('on click toggle .active')).not.toBe(
      fingerprint('on click toggle .inactive')
    );
    expect(fingerprint('on click add .a to me')).not.toBe(fingerprint('on click add .a to you'));
  });
});
