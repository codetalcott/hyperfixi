# Local and Global Variables Guide

## Table of Contents

- [Overview](#overview)
- [Local Variables (`:variable`)](#local-variables-variable)
  - [Basic Usage](#basic-usage)
  - [Scope Isolation](#scope-isolation)
  - [Arithmetic Operations](#arithmetic-operations)
  - [Loops and Iteration](#loops-and-iteration)
- [Global Variables (`::variable`)](#global-variables-variable-1)
  - [Basic Usage](#basic-usage-1)
  - [Cross-Handler Access](#cross-handler-access)
  - [Explicit Intent](#explicit-intent)
- [Implicit Global Variables](#implicit-global-variables)
- [Scope Comparison](#scope-comparison)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

LokaScript provides three ways to work with variables, each with different scoping behavior:

| Syntax       | Scope        | Description                                |
| ------------ | ------------ | ------------------------------------------ |
| `:variable`  | **Local**    | Isolated to the current event handler      |
| `::variable` | **Global**   | Explicitly global, accessible everywhere   |
| `variable`   | **Implicit** | Falls back through local → global → window |

**Why use explicit scoping?**

- **Clarity**: Intent is clear at a glance
- **Maintainability**: Easy to track variable scope in large codebases
- **Fewer Bugs**: Prevents accidental global access or shadowing

---

## Local Variables (`:variable`)

### Basic Usage

Local variables are prefixed with a single colon (`:`) and are isolated to the current event handler:

```hyperscript
<!-- Simple counter isolated to this button -->
<button _="on click
  set :count to 0
  increment :count
  put :count into #display">
  Click me
</button>
<span id="display">not clicked</span>
```

**Result**: Each click shows "1" because `:count` is recreated each time.

### Scope Isolation

Local variables don't leak between handlers:

```hyperscript
<!-- Handler A -->
<button id="btnA" _="on click
  set :message to 'Hello from A'
  put :message into #result">
  Button A
</button>

<!-- Handler B -->
<button id="btnB" _="on click
  set :message to 'Hello from B'
  put :message into #result">
  Button B
</button>

<div id="result">not clicked</div>
```

**Result**: Each button has its own `:message` variable - they don't interfere.

### Arithmetic Operations

Local variables work with all arithmetic operations:

```hyperscript
<button _="on click
  set :x to 5
  set :y to 10
  set :sum to (:x + :y)
  set :product to (:x * :y)
  put ':x=' + :x + ', :y=' + :y + ', sum=' + :sum + ', product=' + :product into #result">
  Calculate
</button>
<div id="result">not calculated</div>
```

**Supported Operations**:

- Addition: `:a + :b`
- Subtraction: `:a - :b`
- Multiplication: `:a * :b`
- Division: `:a / :b`
- Modulo: `:a mod :b`
- Increment: `increment :counter` or `increment :counter by :amount`
- Decrement: `decrement :counter` or `decrement :counter by :amount`

### Loops and Iteration

Local variables are perfect for loop counters:

```hyperscript
<button _="on click
  set :sum to 0
  repeat 5 times
    set :idx to it
    increment :sum by :idx
  end
  put 'Sum of 1-5: ' + :sum into #result">
  Calculate Sum
</button>
<div id="result">not calculated</div>
```

**Result**: Displays "Sum of 1-5: 15" (1+2+3+4+5)

**Note**: The `it` keyword in REPEAT loops contains the current iteration number (1-indexed).

---

## Global Variables (`::variable`)

### Basic Usage

Global variables are prefixed with double colons (`::`) and are explicitly accessible everywhere:

```hyperscript
<!-- Set global variable -->
<button _="on click
  set ::counter to 42
  put ::counter into #display">
  Set Global Counter
</button>

<!-- Read global variable -->
<button _="on click
  put ::counter into #display">
  Read Global Counter
</button>

<div id="display">not set</div>
```

**Result**: Both buttons access the same `::counter` variable.

### Cross-Handler Access

Global variables enable communication between different handlers:

```hyperscript
<!-- Producer: Creates data -->
<button id="producer" _="on click
  set ::data to 'Important message'
  put 'Data stored' into #status">
  Store Data
</button>

<!-- Consumer: Uses data -->
<button id="consumer" _="on click
  if ::data exists
    put ::data into #output
  else
    put 'No data available' into #output
  end">
  Retrieve Data
</button>

<div id="status">waiting</div>
<div id="output">no data</div>
```

### Explicit Intent

Using `::variable` makes global access explicit and clear:

```hyperscript
<!-- Before: Implicit global (unclear) -->
<button _="on click
  set userCount to 5
  increment userCount">
  Increment
</button>

<!-- After: Explicit global (clear intent) -->
<button _="on click
  set ::userCount to 5
  increment ::userCount">
  Increment
</button>
```

**Benefits**:

1. **Code Reviews**: Easy to identify global state
2. **Debugging**: Quickly find global variable usage
3. **Refactoring**: Know exactly what's global vs local

---

## Implicit Global Variables

Variables without prefixes use fallback behavior:

```hyperscript
<button _="on click
  set myVar to 'hello'
  put myVar into #result">
  Click
</button>
```

**Lookup Order**:

1. Check local scope (`context.locals`)
2. Check global scope (`context.globals`)
3. Check runtime variables (`context.variables`)
4. Check window object (`window.myVar`)
5. Return `undefined` if not found

**When to Use**:

- Legacy code compatibility
- Quick prototyping
- When scope doesn't matter

**When NOT to Use**:

- Production code (prefer explicit `:` or `::`)
- Large codebases (hard to track)
- Team projects (unclear intent)

---

## Scope Comparison

### Example: Three Variables with Same Name

```hyperscript
<button id="test" _="on click
  -- Local variable (isolated to this handler)
  set :value to 'local'

  -- Explicit global variable
  set ::value to 'global'

  -- Implicit variable (creates global)
  set value to 'implicit'

  -- Reading them back
  put ':value = ' + :value into #local-result
  put '::value = ' + ::value into #global-result
  put 'value = ' + value into #implicit-result">
  Test Scopes
</button>

<div id="local-result">not run</div>
<div id="global-result">not run</div>
<div id="implicit-result">not run</div>
```

**Output**:

- `:value = local`
- `::value = global`
- `value = implicit`

All three variables coexist without conflict!

### Cross-Handler Behavior

```hyperscript
<!-- Handler 1: Set all three -->
<button id="set" _="on click
  set :local to 'A'
  set ::global to 'B'
  set implicit to 'C'">
  Set Variables
</button>

<!-- Handler 2: Try to read them -->
<button id="get" _="on click
  put :local into #r1          -- undefined (local doesn't persist)
  put ::global into #r2        -- 'B' (global accessible)
  put implicit into #r3">      -- 'C' (global accessible)
  Get Variables
</button>

<div id="r1">?</div>
<div id="r2">?</div>
<div id="r3">?</div>
```

**Result**:

- `:local` → `undefined` (can't access other handler's locals)
- `::global` → `'B'` (explicit global works)
- `implicit` → `'C'` (implicit global works)

---

## Best Practices

### 1. Prefer Explicit Scoping

```hyperscript
<!-- ❌ Bad: Unclear scope -->
<button _="on click
  set counter to 0
  increment counter">
</button>

<!-- ✅ Good: Clear intent -->
<button _="on click
  set :counter to 0
  increment :counter">
</button>

<!-- ✅ Good: Clear global intent -->
<button _="on click
  set ::totalClicks to 0
  increment ::totalClicks">
</button>
```

### 2. Use Local Variables by Default

Unless you need cross-handler access, prefer local variables:

```hyperscript
<!-- Single button counter - use :local -->
<button _="on click
  set :count to 0
  increment :count
  put :count into me">
</button>

<!-- Multi-button counter - use ::global -->
<button _="on click
  increment ::globalCount
  put ::globalCount into #display">
</button>
<button _="on click
  increment ::globalCount
  put ::globalCount into #display">
</button>
<div id="display">0</div>
```

### 3. Avoid Reserved Names

Don't use names that might conflict with context properties:

```hyperscript
<!-- ❌ Bad: 'result' conflicts with context.result -->
<button _="on click
  set ::result to 5
  put ::result into #output">
</button>

<!-- ✅ Good: Use descriptive names -->
<button _="on click
  set ::calculationResult to 5
  put ::calculationResult into #output">
</button>
```

**Common Reserved Names**:

- `result`, `target`, `event`, `me`, `you`, `it`
- `window`, `document`, `console`

### 4. Document Global Variables

When using global variables, document their purpose:

```hyperscript
<div _="
  -- Initialize global state
  on load
    -- ::userSession holds current user data
    set ::userSession to null

    -- ::appConfig holds application settings
    set ::appConfig to { theme: 'light', lang: 'en' }
  end">
</div>
```

### 5. Use Meaningful Names

```hyperscript
<!-- ❌ Bad: Unclear names -->
<button _="on click
  set :x to 5
  set :y to 10
  set :z to (:x + :y)">
</button>

<!-- ✅ Good: Descriptive names -->
<button _="on click
  set :price to 5
  set :quantity to 10
  set :totalCost to (:price * :quantity)">
</button>
```

---

## Common Patterns

### Pattern 1: Accumulator with Local Variable

```hyperscript
<button _="on click
  set :total to 0
  repeat 10 times
    increment :total by it
  end
  put 'Total: ' + :total into #result">
  Sum 1-10
</button>
<div id="result">not calculated</div>
```

### Pattern 2: Global State Management

```hyperscript
<!-- Initialize global state -->
<div _="on load
  set ::cart to []
  set ::cartTotal to 0">
</div>

<!-- Add to cart -->
<button class="add-item" data-price="10" _="on click
  set :price to my @data-price as Int
  increment ::cartTotal by :price
  put 'Cart: $' + ::cartTotal into #cart-display">
  Add $10 Item
</button>

<div id="cart-display">Cart: $0</div>
```

### Pattern 3: Temporary Calculations

```hyperscript
<button _="on click
  set :width to 100
  set :height to 50
  set :area to (:width * :height)
  set :perimeter to (2 * (:width + :height))
  put 'Area: ' + :area + ', Perimeter: ' + :perimeter into #result">
  Calculate
</button>
<div id="result">not calculated</div>
```

### Pattern 4: Mixed Scopes (Advanced)

```hyperscript
<button _="on click
  -- Local variable for this calculation
  set :localMultiplier to 2

  -- Update global counter
  increment ::globalCounter

  -- Calculate using both
  set :localResult to (::globalCounter * :localMultiplier)

  put 'Click #' + ::globalCounter + ', Result: ' + :localResult into #display">
  Click Me
</button>
<div id="display">not clicked</div>
```

---

## Troubleshooting

### Problem: Variable Not Persisting Between Handlers

**Symptom**: Variable set in one handler is `undefined` in another

```hyperscript
<!-- This won't work -->
<button id="a" _="on click set :msg to 'hello'">Set</button>
<button id="b" _="on click put :msg into #out">Get</button>
```

**Solution**: Use `::` for cross-handler access

```hyperscript
<!-- This works -->
<button id="a" _="on click set ::msg to 'hello'">Set</button>
<button id="b" _="on click put ::msg into #out">Get</button>
```

### Problem: Variable Showing Wrong Value

**Symptom**: Variable has unexpected value from another handler

**Solution**: Use `:` for handler isolation

```hyperscript
<!-- Each handler gets its own :count -->
<button _="on click set :count to 1 then put :count into #out">Button 1</button>
<button _="on click set :count to 2 then put :count into #out">Button 2</button>
```

### Problem: Complex Concatenation Not Working

**Symptom**: Mixed scope variables in string concatenation fail

```hyperscript
<!-- May not work -->
put 'Global: ' + ::g + ', Local: ' + :l into #out
```

**Solution**: Build string in steps

```hyperscript
set :msg1 to 'Global: ' + ::g
set :msg2 to ', Local: ' + :l
put :msg1 + :msg2 into #out
```

### Problem: Reserved Variable Name Conflict

**Symptom**: Variable assignment doesn't work or returns wrong value

```hyperscript
<!-- May conflict with context.result -->
set ::result to (::x + ::y)
```

**Solution**: Use descriptive, non-reserved names

```hyperscript
set ::calculatedSum to (::x + ::y)
```

---

## Summary

**Choose the Right Scope**:

| Use Case                    | Recommended Syntax | Example                 |
| --------------------------- | ------------------ | ----------------------- |
| Loop counter                | `:variable`        | `set :idx to it`        |
| Temporary calculation       | `:variable`        | `set :sum to (:a + :b)` |
| Handler-specific state      | `:variable`        | `set :isActive to true` |
| Cross-handler communication | `::variable`       | `set ::userId to 123`   |
| Application-wide state      | `::variable`       | `set ::theme to 'dark'` |
| Legacy compatibility        | `variable`         | `set myVar to 'value'`  |

**Key Takeaways**:

1. ✅ **Use `:variable` by default** - keeps scope clean
2. ✅ **Use `::variable` for globals** - makes intent explicit
3. ✅ **Avoid implicit globals** - unless necessary for compatibility
4. ✅ **Use meaningful names** - improves readability
5. ✅ **Avoid reserved names** - prevents conflicts

---

## Further Reading

- [API Documentation](API.md) - Complete LokaScript API reference
- [Examples](EXAMPLES.md) - More usage examples
- [CHANGELOG](../../CHANGELOG.md) - Feature history and migration guides
