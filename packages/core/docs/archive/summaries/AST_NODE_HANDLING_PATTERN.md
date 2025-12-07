# AST Node Handling Pattern for V2 Commands

## Overview

When implementing V2 commands with `parseInput()` methods, there's a critical distinction between AST nodes that should be **evaluated** versus those whose values should be **extracted directly**.

## The Problem

The parser creates different AST node types depending on the syntax:

```hyperscript
set x to 42           → identifier node: { type: 'identifier', name: 'x' }
add .active           → selector node: { type: 'selector', value: '.active' }
set my innerHTML to x → memberExpression node: { type: 'memberExpression', object: {...}, property: {...} }
```

When `evaluator.evaluate()` is called on these nodes:
- **identifier** `x` → looks up variable value (returns `undefined` if not set)
- **selector** `.active` → runs DOM query (returns empty `NodeList` if no matches)
- **memberExpression** `my innerHTML` → reads current property value

This is incorrect for commands that need the **target** (where to set/add) rather than the **current value**.

## The Solution

Check the AST node type **before** evaluating to determine if direct extraction is needed:

### Pattern 1: Identifier as Target Variable

For commands like `set x to 42` where `x` is the target variable name:

```typescript
const firstArg = raw.args[0];
const argName = (firstArg as any)['name'];

if (firstArg.type === 'identifier' && typeof argName === 'string') {
  // Use the identifier name directly as the target
  variableName = argName;
} else {
  // Evaluate for other types (literals, expressions)
  variableName = await evaluator.evaluate(firstArg, context);
}
```

### Pattern 2: Selector as Class Name

For commands like `add .active` or `toggle .active` where `.active` is the class to add:

```typescript
const firstArg = raw.args[0];
const argValue = (firstArg as any)?.value;

if (
  ((firstArg as any)?.type === 'selector' ||
   (firstArg as any)?.type === 'cssSelector' ||
   (firstArg as any)?.type === 'classSelector') &&
  typeof argValue === 'string'
) {
  // Extract class name directly from selector node
  className = argValue;  // '.active'
} else {
  // Evaluate for other types
  className = await evaluator.evaluate(firstArg, context);
}
```

### Pattern 3: MemberExpression as Property Target

For commands like `set my innerHTML to "text"` where `my innerHTML` is the property target:

```typescript
const firstArg = raw.args[0];

if ((firstArg as any).type === 'memberExpression') {
  const objectNode = (firstArg as any)['object'];
  const propertyNode = (firstArg as any)['property'];

  if (objectNode?.name && propertyNode?.name) {
    const objectName = objectNode.name.toLowerCase();
    // Handle possessive references: me/my, it/its, you/your
    if (['me', 'my', 'it', 'its', 'you', 'your'].includes(objectName)) {
      const element = resolveElement(objectName, context);
      const propertyName = propertyNode.name;
      // Set property on element instead of reading it
      return { type: 'property', element, property: propertyName };
    }
  }
}
```

## Commands Using These Patterns

| Command | Node Type | Pattern Used |
|---------|-----------|--------------|
| `set` | identifier | Pattern 1 - variable name extraction |
| `set` | memberExpression | Pattern 3 - property target extraction |
| `add` | selector | Pattern 2 - class name extraction |
| `remove` | selector | Pattern 2 - class name extraction |
| `toggle` | selector | Pattern 2 - class name extraction |
| `put` | memberExpression | Pattern 3 - property target extraction |

## When to Evaluate vs Extract

| Situation | Action |
|-----------|--------|
| **Target** variable/property/class | Extract directly from AST node |
| **Value** to assign/add | Evaluate the expression |
| **Source** element reference | Evaluate (resolves `me`, `#id`, etc.) |

## Key AST Node Properties

```typescript
// Identifier nodes
{ type: 'identifier', name: 'variableName' }

// Selector nodes
{ type: 'selector', value: '.className' }
{ type: 'cssSelector', value: '#elementId' }
{ type: 'classSelector', value: '.active' }

// MemberExpression nodes
{
  type: 'memberExpression',
  object: { type: 'identifier', name: 'me' },
  property: { type: 'identifier', name: 'innerHTML' }
}

// Literal nodes (always safe to evaluate)
{ type: 'literal', value: 42 }
{ type: 'literal', value: 'string' }
```

## Testing Checklist

When implementing or modifying a V2 command:

1. Test with simple variable targets: `set x to 42`
2. Test with selector targets: `add .active`
3. Test with possessive targets: `set my innerHTML to "text"`
4. Test with evaluated values: `set x to (5 + 3)`
5. Test with element references: `add .active to #target`

## Related Files

- [set.ts](src/commands/data/set.ts) - All three patterns
- [add.ts](src/commands/dom/add.ts) - Pattern 2
- [remove.ts](src/commands/dom/remove.ts) - Pattern 2
- [toggle.ts](src/commands/dom/toggle.ts) - Pattern 2
- [put.ts](src/commands/dom/put.ts) - Pattern 3
