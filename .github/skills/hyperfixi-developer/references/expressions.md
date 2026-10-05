<!-- AUTO-GENERATED from packages/mcp-server/src/resources/content.ts -->
<!-- Do not edit directly. Run: npm run generate:skills -->

# Hyperscript Expressions Guide

## Element References

- `me` / `myself` - Current element
- `target` - The element the event happened on (`event.target`)
- `you` - The element a `tell` block talks to (unset in an ordinary handler)
- `it` / `result` - Last expression result

## Variables

- `name` - Local variable (this handler)
- `:name` - Element-scoped variable (shared by the element's handlers)
- `$name` - Global variable

## Selectors

- `#id` - ID selector
- `.class` - Class selector
- `<tag/>` - Tag selector
- `<[attr='v']/>` - Attribute query (a bare `[attr]` is not a selector)

## Positional

- `first` / `last` - First/last in collection
- `next` / `previous` - Relative navigation
- `closest` - Nearest ancestor (`closest <form/>`)
- `my parentElement` - Direct parent (there is no `parent` keyword)

## Property Access

- `element's property` - Possessive syntax
- `my property` - Current element property
- `@attribute` - Attribute access

## Comparisons

- `is` / `is not` - Equality
- `>`, `<`, `>=`, `<=` - Numeric
- `matches` - CSS selector match
- `contains` - Membership
- `exists` / `is empty` - Existence

## Logical

- `and` / `or` / `not` - Boolean operators

## Type Conversion

- `as Int` - To integer
- `as String` - To string
- `as JSON` - Parse a JSON string
- `as Values` - A form's (or element's) input values, as an object
- (`fetch … as json` / `as text` / `as html` choose fetch's response format)
