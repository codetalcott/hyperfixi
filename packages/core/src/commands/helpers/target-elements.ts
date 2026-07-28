/**
 * Target-element resolution — the selector SHAPE rule, and value→elements coercion
 *
 * ## The shape rule (`resolveTargetElements`)
 *
 * A bare `#id` selector resolves to a SINGLE element (or null); a class selector,
 * and any query-form ref (`<#id/>`, parsed with `fromQuery: true`), resolves to
 * the COLLECTION.
 *
 * **This asymmetry is deliberate upstream parity, not a defect.** It mirrors
 * _hyperscript's `IdRef` → `getElementById` versus `QueryRef` → `ElementCollection`.
 * Do not "fix" it by making both shapes agree.
 *
 * The real defect class is command-side code that mishandles ONE of the two
 * shapes. Two instances, from opposite ends:
 *
 * - append's pre-#792 silent no-op on `.cls` — the consuming end, fixed.
 * - `unwrapCommandResult`'s `val[0]` collapse in `runtime-base.ts` — the
 *   propagation end, which makes `toggle .a on .items` leave `it` holding only
 *   the FIRST element. Still open; it belongs to Arc C step 3.
 *
 * `parser/runtime.ts` implemented the rule twice — once in async `evaluateSelector`
 * and once in its sync mirror `evaluateSelectorSync`. Two copies of a rule this
 * subtle is how the halves drift apart, so this is now the single definition, and
 * `__tests__/target-elements.test.ts` pins BOTH shapes for BOTH callers.
 *
 * ## Element-list coercion (`toElementListFiltered` / `toElementListStrict`)
 *
 * `put` and `append`/`prepend` each coerce an evaluated target value to a list of
 * elements, and they do it DIFFERENTLY. The two live here side by side so the
 * difference is visible and tested rather than buried in two command files. See
 * each function for what diverges; reconciling them would be a behavior change,
 * so it is deliberately not part of this refactor.
 */

import { isHTMLElement } from '../../utils/element-check';

/**
 * Apply the selector shape rule to a set of matches.
 *
 * @param matches - What the query produced (normally an array of elements; the
 *   async caller may hand through a non-array, which passes back unchanged)
 * @param selector - The selector text the matches came from
 * @param fromQuery - True for query-form refs (`<#id/>`), which always keep the
 *   collection
 * @returns A single element (or null) for a bare `#id`; the collection otherwise
 *
 * @example
 * ```typescript
 * resolveTargetElements([el], '#id', false);      // el      — IdRef
 * resolveTargetElements([], '#id', false);        // null    — IdRef, unmatched
 * resolveTargetElements([a, b], '.cls', false);   // [a, b]  — class ref
 * resolveTargetElements([el], '#id', true);       // [el]    — QueryRef `<#id/>`
 * ```
 */
export function resolveTargetElements(
  matches: unknown,
  selector: unknown,
  fromQuery?: boolean
): unknown {
  // Query-form refs and every non-`#` selector keep the collection.
  if (fromQuery || typeof selector !== 'string' || !selector.startsWith('#')) {
    return matches;
  }
  // Bare `#id` unwraps to a single element, or null when nothing matched.
  return Array.isArray(matches) ? (matches[0] ?? null) : matches;
}

/**
 * Query a selector to its matching elements.
 *
 * The contract `put` and `append`/`prepend` share: an unmatched selector is a
 * programming error, not a silent no-op, so it throws rather than returning an
 * empty list.
 *
 * @param selector - CSS selector text
 * @returns The matching HTMLElements (never empty)
 * @throws If the DOM is unavailable, or the selector matches nothing
 */
export function queryTargetElements(selector: string): HTMLElement[] {
  if (typeof document === 'undefined') throw new Error('DOM not available');
  const elements = Array.from(document.querySelectorAll(selector)).filter((e): e is HTMLElement =>
    isHTMLElement(e)
  );
  if (!elements.length) throw new Error(`No elements: "${selector}"`);
  return elements;
}

/**
 * Coerce an evaluated value to elements, keeping the element SUBSET of a mixed
 * array — `put`'s rule.
 *
 * Diverges from {@link toElementListStrict} in two ways, both observable:
 * a mixed array yields its elements here but is rejected there, and array-likes
 * are recognized by `instanceof NodeList` here rather than by duck-typing (so an
 * HTMLCollection is not accepted).
 *
 * @returns The elements, or null when the value is not element-like
 */
export function toElementListFiltered(value: unknown): HTMLElement[] | null {
  if (isHTMLElement(value)) return [value as HTMLElement];
  if (Array.isArray(value)) {
    const elements = value.filter(isHTMLElement) as HTMLElement[];
    return elements.length > 0 ? elements : null;
  }
  if (typeof NodeList !== 'undefined' && value instanceof NodeList) {
    const elements = Array.from(value).filter(isHTMLElement) as HTMLElement[];
    return elements.length > 0 ? elements : null;
  }
  return null;
}

/**
 * Coerce an evaluated value to elements, rejecting a mixed array — `append`/
 * `prepend`'s rule.
 *
 * Rejecting matters there: a mixed array must stay a plain Array target so the
 * content is PUSHED into it, which is upstream's dispatch order. Array-likes are
 * duck-typed (`length` + `item`), so an HTMLCollection is accepted too.
 *
 * @returns The elements, or null when the value is not element-like
 */
export function toElementListStrict(value: unknown): HTMLElement[] | null {
  if (isHTMLElement(value)) return [value as HTMLElement];
  if (Array.isArray(value) && value.length > 0 && value.every(v => isHTMLElement(v))) {
    return value as HTMLElement[];
  }
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { length?: unknown }).length === 'number' &&
    typeof (value as { item?: unknown }).item === 'function'
  ) {
    const list = Array.from(value as ArrayLike<unknown>).filter((v): v is HTMLElement =>
      isHTMLElement(v)
    );
    return list.length ? list : null;
  }
  return null;
}
