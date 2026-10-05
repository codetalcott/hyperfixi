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
 * Not fetch's destination or repeat's source: the response-type recovery and
 * the fused-role junk check read an expression there as a mis-capture. Nor the
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
