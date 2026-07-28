/**
 * target-elements — selector shape and element-list coercion
 *
 * The `#id` → element / `.cls` → collection asymmetry is deliberate upstream
 * parity (IdRef → getElementById vs QueryRef/ClassRef → ElementCollection), and
 * it was implemented twice in `parser/runtime.ts` — once async, once in the sync
 * mirror. These tests pin BOTH shapes so the single definition can't drift and a
 * future change to the rule has to be deliberate.
 *
 * They are also the ratchet Arc C step 3 builds on: `unwrapCommandResult`'s
 * `val[0]` collapse (`runtime-base.ts`) is this same asymmetry seen from the
 * propagation end, and deciding that policy needs the rule pinned first.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveTargetElements,
  queryTargetElements,
  toElementListFiltered,
  toElementListStrict,
} from '../target-elements';

describe('resolveTargetElements — the selector shape rule', () => {
  const a = { tag: 'a' };
  const b = { tag: 'b' };

  describe('bare `#id` unwraps to a single element', () => {
    it('returns the first match', () => {
      expect(resolveTargetElements([a], '#id', false)).toBe(a);
    });

    it('returns null when nothing matched — not an empty array', () => {
      expect(resolveTargetElements([], '#id', false)).toBeNull();
    });

    it('treats an absent fromQuery flag as a bare ref', () => {
      expect(resolveTargetElements([a], '#id')).toBe(a);
    });

    it('passes a non-array result through untouched (async caller)', () => {
      expect(resolveTargetElements(a, '#id', false)).toBe(a);
    });
  });

  describe('everything else keeps the collection', () => {
    it('keeps a class selector as an array', () => {
      expect(resolveTargetElements([a, b], '.cls', false)).toEqual([a, b]);
    });

    it('keeps an EMPTY class match as an array, not null', () => {
      // The counterpart to the `#id` → null case: `.cls` callers assert
      // iterability, so an unmatched class ref must stay an empty collection.
      expect(resolveTargetElements([], '.cls', false)).toEqual([]);
    });

    it('keeps a query-form `<#id/>` as a collection despite the `#`', () => {
      expect(resolveTargetElements([a], '#id', true)).toEqual([a]);
    });

    it('keeps an attribute selector as a collection', () => {
      expect(resolveTargetElements([a, b], '[data-x]', false)).toEqual([a, b]);
    });

    it('keeps a single-match class ref as a one-element array, not the element', () => {
      expect(resolveTargetElements([a], '.cls', false)).toEqual([a]);
    });

    it('passes through when the selector is not a string', () => {
      expect(resolveTargetElements([a, b], undefined, false)).toEqual([a, b]);
    });
  });
});

describe('queryTargetElements', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="x" id="one"></div><div class="x"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns every match for a multi-match selector', () => {
    expect(queryTargetElements('.x')).toHaveLength(2);
  });

  it('returns a single match as a one-element array', () => {
    expect(queryTargetElements('#one')).toEqual([document.getElementById('one')]);
  });

  it('throws on an unmatched selector rather than returning empty', () => {
    // The contract put and append/prepend share: an unmatched selector is a
    // programming error, not a silent no-op.
    expect(() => queryTargetElements('.nope')).toThrow('No elements');
  });
});

describe('element-list coercion — the two rules differ, deliberately', () => {
  let el: HTMLElement;
  let other: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<p class="p"></p><p class="p"></p>';
    [el, other] = Array.from(document.querySelectorAll('p')) as HTMLElement[];
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('agreement', () => {
    it('both wrap a lone element', () => {
      expect(toElementListFiltered(el)).toEqual([el]);
      expect(toElementListStrict(el)).toEqual([el]);
    });

    it('both accept an all-element array', () => {
      expect(toElementListFiltered([el, other])).toEqual([el, other]);
      expect(toElementListStrict([el, other])).toEqual([el, other]);
    });

    it('both reject a non-element value', () => {
      expect(toElementListFiltered('hello')).toBeNull();
      expect(toElementListStrict('hello')).toBeNull();
    });

    it('both reject an empty array', () => {
      expect(toElementListFiltered([])).toBeNull();
      expect(toElementListStrict([])).toBeNull();
    });
  });

  describe('divergence (preserved, not unified)', () => {
    it('filtered keeps the element subset of a mixed array; strict rejects it', () => {
      // put writes into `el`; append/prepend leave it an Array target and push
      // the content into the array instead. Reconciling these is a behavior
      // decision, out of scope for the Arc D refactor.
      expect(toElementListFiltered([el, 'junk'])).toEqual([el]);
      expect(toElementListStrict([el, 'junk'])).toBeNull();
    });

    it('strict duck-types array-likes, so an HTMLCollection is accepted', () => {
      const collection = document.getElementsByTagName('p');
      expect(toElementListStrict(collection)).toEqual([el, other]);
      // filtered gates on `instanceof NodeList`, which an HTMLCollection is not.
      expect(toElementListFiltered(collection)).toBeNull();
    });

    it('both accept a NodeList', () => {
      const nodes = document.querySelectorAll('p');
      expect(toElementListFiltered(nodes)).toEqual([el, other]);
      expect(toElementListStrict(nodes)).toEqual([el, other]);
    });
  });
});
