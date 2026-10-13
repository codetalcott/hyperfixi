/**
 * Value types that the schemas and the hand-crafted patterns share.
 *
 * Here and not in command-schemas.ts: each `dist/languages/<lang>.js` inlines what
 * its hand-crafted patterns import (only `../core` is external), and patterns/put.ts,
 * show.ts, hide.ts, set.ts and get.ts used to read these from the schemas. That put the whole
 * schema module, with the validator it imports, into every language file that has
 * one of those patterns: ~130 KB unminified each, so a bundle of N languages carried
 * N+1 copies (the adapter's `western` grew from 125 to 175 KB gzipped in #1377).
 * test/language-module-reach.test.ts holds it.
 */
import type { ExpectedType } from '../types';

/**
 * The types of a role that names the ELEMENT a command acts on: a selector
 * (`hide #panel`), a reference (`hide me`), or a variable holding the element
 * (`repeat for el in .item hide el end`). A bare variable arrives as an
 * `expression`, so a role typed selector|reference matched no pattern for it.
 * English dropped the variable and the command acted on `me` (`remove el` lost
 * the command), so every translation did too; toggle's destination, which
 * English's handcrafted pattern leaves untyped, dropped it in 14 languages.
 * Both engines read a variable there, each form run on both.
 *
 * Not fetch's destination or the source of repeat's schema: the response-type
 * recovery and the fused-role junk check read an expression there as a
 * mis-capture. (The handcrafted `repeat until event … from` heads take it: they
 * read the source after their own event word, where no such capture happens.) Nor the
 * `on` target of set, transition or install, or clone's: neither engine reads
 * those forms (core takes `set … on el`'s `on el` for a new handler).
 */
export const ELEMENT_TARGET_TYPES: ExpectedType[] = ['selector', 'reference', 'expression'];

/**
 * What a `set` writes: any value, an element (`set el to #panel`, `to <li/>`) and an
 * array (`to [1, 2]`, which tokenizes as one selector) included. Without `selector`,
 * those matched no pattern and the whole `set` was lost, in English and so in every
 * translation.
 */
export const SET_VALUE_TYPES: ExpectedType[] = [
  'literal',
  'selector',
  'expression',
  'reference',
  'property-path',
];

/**
 * What a `set` writes to: a property path (`#d1's value`, `the *color of #t`), an
 * element or attribute, a reference, or a variable.
 */
export const SET_DESTINATION_TYPES: ExpectedType[] = [
  'selector',
  'reference',
  'expression',
  'property-path',
];

/** The element(s) `set @a to v on <scope>` sets the attribute on. */
export const SET_SCOPE_TYPES: ExpectedType[] = ['selector', 'reference'];

/** What a `get` reads: a literal, an element, a variable, a property. */
export const GET_SOURCE_TYPES: ExpectedType[] = [
  'literal',
  'selector',
  'reference',
  'expression',
  'property-path',
];

/** What a `put` writes: a literal, an element, a variable, a property. */
export const PUT_VALUE_TYPES: ExpectedType[] = [
  'literal',
  'selector',
  'reference',
  'expression',
  'property-path',
];

/**
 * Where a `put` writes: an element, or a variable (`into item`, a loop's element;
 * `into my.textContent` arrives as an expression). Without the variable, a generated
 * pattern matched nothing and the put dropped in ar/de/fr/id/zh.
 */
export const PUT_DESTINATION_TYPES: ExpectedType[] = [
  'selector',
  'reference',
  'expression',
  'property-path',
];

/**
 * An event's name: a word (`click`), or an expression for a custom or namespaced
 * name (`draggable:start` tokenizes as one), as `trigger`, `send` and `repeat until
 * event` take it.
 */
export const EVENT_NAME_TYPES: ExpectedType[] = ['literal', 'expression'];

/** How long a `wait` waits: a time literal (`2s`) or an expression. */
export const DURATION_TYPES: ExpectedType[] = ['literal', 'expression'];

/**
 * What `fetch` fetches: a URL literal, an expression (a template, a variable), or a
 * reference: a `$` or `:` variable reads as one, and without it every `fetch $u as JSON`
 * fell to the pattern with no `as`, whose value then took `as JSON` as a conversion.
 */
export const FETCH_SOURCE_TYPES: ExpectedType[] = ['literal', 'expression', 'reference'];

/** fetch's `as <type>`: json/text/html, which tokenize as identifiers (expression). */
export const FETCH_RESPONSE_TYPES: ExpectedType[] = ['literal', 'expression'];

/** fetch's request options, `with { … }`: an expression only (the object-literal fold). */
export const FETCH_OPTIONS_TYPES: ExpectedType[] = ['expression'];

/** show/hide's `with <strategy>`: a strategy word (`opacity`) or a class (`.hidden`). */
export const VISIBILITY_STYLE_TYPES: ExpectedType[] = ['expression', 'selector'];

/**
 * A loop's variable, `for item in …` (and `repeat for item in …`): a bare name,
 * which tokenizes as an expression, or a reference.
 */
export const FOR_VARIABLE_TYPES: ExpectedType[] = ['reference', 'expression'];

/** The collection a loop walks, `… in .items` / `… in $list`. */
export const FOR_SOURCE_TYPES: ExpectedType[] = ['selector', 'reference', 'expression'];

/** viewTransition's `using "slide"`: the engine reads a string only. */
export const VIEW_TRANSITION_STYLE_TYPES: ExpectedType[] = ['literal'];

/** An `if`/`unless` condition: an expression, a reference (`if it`), or a selector (`if .a`). */
export const CONDITION_TYPES: ExpectedType[] = ['expression', 'reference', 'selector'];

/**
 * What a counted loop counts (`repeat 3 times`). A variable with its sigil (`$n`,
 * `:n`), `it` and `event's detail` read as references, and the `of` form a
 * translation writes for `#a's textContent` (es `textContent de #a`) as a property
 * path. The head took neither: the loop was dropped with the command after it, or
 * read `forever` (PR 125).
 */
export const COUNT_TYPES: ExpectedType[] = ['literal', 'expression', 'reference', 'property-path'];

/**
 * Where `append`/`prepend` write: an element, or a variable (`append item to
 * myArray`, `append " World" to greeting`), which tokenizes as an expression.
 */
export const APPEND_DESTINATION_TYPES: ExpectedType[] = ['selector', 'reference', 'expression'];
