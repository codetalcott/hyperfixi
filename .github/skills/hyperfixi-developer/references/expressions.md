<!-- AUTO-GENERATED from packages/mcp-server/src/resources/content.ts -->
<!-- Do not edit directly. Run: npm run generate:skills -->

# Hyperscript Expressions Guide

## Element References

- `me` / `myself` - Current element
- `you` - Event target
- `it` / `result` - Last expression result

## Variables

- `:name` - Local variable
- `$name` - Global variable

## Selectors

- `#id` - ID selector
- `.class` - Class selector
- `<tag/>` - Tag selector
- `[attr]` - Attribute selector

## Positional

- `first` / `last` - First/last in collection
- `next` / `previous` - Relative navigation
- `closest` - Nearest ancestor
- `parent` - Direct parent

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
- `as json` - Parse JSON
- `as FormData` - Form to FormData
