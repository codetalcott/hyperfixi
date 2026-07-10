/**
 * CSS Selector Extractor
 *
 * Extracts CSS selectors: #id, .class, [attr], <tag/>, @attr, *style
 * This is hyperscript-specific syntax.
 */

import type { ValueExtractor, ExtractionResult } from '../value-extractor-types';

/**
 * Consume chained pseudo-class/pseudo-element segments immediately following a
 * base selector: `:hover`, `::before`, `:not(.done)`, `:nth-child(2n+1)`,
 * chained `.a:not(.b):hover`. Adjacency is the discriminator — extraction
 * consumes contiguous characters only, so `.foo :bar` (whitespace) leaves
 * `:bar` to the VariableRefExtractor as a local-variable reference. The pseudo
 * name is an open regex, not an allowlist: CSS's pseudo namespace grows
 * (`:popover-open`, `:state()`), and querySelector decides validity at runtime.
 * Returns the end index after all consumable segments (== pos when none).
 */
function consumePseudoSegments(input: string, pos: number): number {
  let end = pos;
  while (end < input.length && input[end] === ':') {
    const m = input.slice(end).match(/^::?[a-zA-Z][a-zA-Z0-9-]*/);
    if (!m) break; // `:2`, `:$x`, bare trailing `:` → not a pseudo segment
    let segEnd = end + m[0].length;
    if (input[segEnd] === '(') {
      // Functional argument — balanced-paren scan (`:not(.a)`, `:nth-child(2n+1)`)
      let depth = 0;
      let p = segEnd;
      while (p < input.length) {
        if (input[p] === '(') depth++;
        else if (input[p] === ')') {
          depth--;
          if (depth === 0) {
            p++;
            break;
          }
        }
        p++;
      }
      if (depth !== 0) break; // unbalanced → don't consume this segment
      segEnd = p;
    }
    end = segEnd;
  }
  return end;
}

/**
 * Extract a CSS selector from input at position.
 * Wraps the existing extractCssSelector logic from framework.
 */
export function extractCssSelector(input: string, position: number): string | null {
  const char = input[position];

  // ID selector: #identifier, with optional pseudo segments (#x:hover)
  if (char === '#') {
    const match = input.slice(position).match(/^#[a-zA-Z_][\w-]*/);
    if (!match) return null;
    const end = consumePseudoSegments(input, position + match[0].length);
    return input.slice(position, end);
  }

  // Class selector: .identifier — or dynamic class interpolation .{varName}, where
  // a variable resolves to the class name at runtime (used by parameterized
  // behaviors: `toggle .{cls} on me`). Kept as one selector token so it fills the
  // role; otherwise `.{cls}` splits into a bare `.` (mangled patient) + `{cls}`.
  // Static classes take optional pseudo segments (.a:not(.b):hover); the dynamic
  // form does not (no corpus/runtime use, and `{}` already ends the class name).
  if (char === '.') {
    const dynamic = input.slice(position).match(/^\.\{[a-zA-Z_$][\w$]*\}/);
    if (dynamic) return dynamic[0];
    const match = input.slice(position).match(/^\.[a-zA-Z_][\w-]*/);
    if (!match) return null;
    const end = consumePseudoSegments(input, position + match[0].length);
    return input.slice(position, end);
  }

  // Attribute reference: @attr (@disabled, @aria-selected, @data-count, @role)
  // hyperscript's possessive-free attribute syntax. Kept as a single token so
  // it fills a role; otherwise `@disabled` splits into `@` + `disabled`.
  if (char === '@') {
    const match = input.slice(position).match(/^@[a-zA-Z_][\w-]*/);
    return match ? match[0] : null;
  }

  // Style/CSS-property reference: *prop or *--custom-prop
  // (*opacity, *background-color, *--primary-color). Requires a letter, `_`, or
  // a `--` custom-property prefix immediately after `*`, so the multiplication
  // operator (`a * b`, `2 * 3`) is never mis-extracted.
  if (char === '*') {
    const match = input.slice(position).match(/^\*(?:--)?[a-zA-Z_][\w-]*/);
    return match ? match[0] : null;
  }

  // Attribute selector: [attr] or [attr=value], with optional pseudo segments
  // ([data-x]:checked)
  if (char === '[') {
    let depth = 0;
    let end = position;
    while (end < input.length) {
      if (input[end] === '[') depth++;
      if (input[end] === ']') {
        depth--;
        if (depth === 0) {
          const pseudoEnd = consumePseudoSegments(input, end + 1);
          return input.slice(position, pseudoEnd);
        }
      }
      end++;
    }
    return null; // Unclosed bracket
  }

  // HTML tag selector: <tag/>, <tag#id.class[attr]/>, <tag[attr=value]/>, and
  // tag-less query selectors <.class/>, <#id/>, <[attr]/> (hyperscript treats
  // `<.message/>` as "all .message elements"). Pseudo segments are allowed in
  // the clause chain (<.foo:hover/>). The tag name is optional, but the
  // lookahead requires the char after `<` to start a tag/`#`/`.`/`[` clause — so
  // a less-than comparison (`a < b`) is never mis-extracted (the space fails it).
  if (char === '<') {
    const match = input
      .slice(position)
      .match(
        /^<(?=[\w.#[])[\w-]*(?:[#.][\w-]+|\[[^\]]+\]|::?[a-zA-Z][a-zA-Z0-9-]*(?:\([^)]*\))?)*\s*\/>/
      );
    return match ? match[0] : null;
  }

  return null;
}

/**
 * CssSelectorExtractor - Extracts CSS selectors for hyperscript.
 */
export class CssSelectorExtractor implements ValueExtractor {
  readonly name = 'css-selector';

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    if (char === '#' || char === '.' || char === '[' || char === '<') return true;
    // @attr / *style only when a valid name (or *-- custom property) follows, so
    // a bare `*` (multiplication) or stray `@` does not get swallowed.
    if (char === '@' || char === '*') return extractCssSelector(input, position) !== null;
    return false;
  }

  extract(input: string, position: number): ExtractionResult | null {
    const selector = extractCssSelector(input, position);
    if (selector) {
      return {
        value: selector,
        length: selector.length,
        metadata: { type: 'css-selector' },
      };
    }
    return null;
  }
}
