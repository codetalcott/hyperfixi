# Local Variables Guide - `:variable` Syntax

## Overview

HyperFixi supports local variables using the `:` prefix syntax. Local variables are scoped to the current execution context and don't pollute the global namespace, making your code more maintainable and reducing naming conflicts.

## Basic Syntax

### Creating Local Variables

Use the `set` command with the `:` prefix:

```hyperscript
set :myVar to 42
```

### Using Local Variables

Reference local variables with the `:` prefix:

```hyperscript
set :x to 10
put :x into #result  <!-- Displays: 10 -->
```

### String Values

```hyperscript
set :name to "Alice"
set :greeting to "Hello, " + :name
put :greeting into #message  <!-- Displays: Hello, Alice -->
```

## Scope Behavior

### Local vs Global

- **Local variables** (`:variable`): Only accessible within the current execution context
- **Global variables** (`variable`): Accessible globally across all execution contexts

```hyperscript
<!-- Local variable - only accessible in this handler -->
on click
  set :counter to 0
  increment :counter  <!-- :counter = 1 -->
end

<!-- Global variable - accessible everywhere -->
on click
  set counter to 0
  increment counter  <!-- counter = 1 globally -->
end
```

### Scope Isolation

Local variables with the `:` prefix **only** check the local scope, preventing accidental access to global variables:

```hyperscript
<!-- Set global variable -->
set x to 100

<!-- Local variable with same name -->
on click
  set :x to 5
  put :x into #result  <!-- Displays: 5, NOT 100 -->
end
```

## Arithmetic Operations

### INCREMENT Command

```hyperscript
set :counter to 10
increment :counter by 5
put :counter into #result  <!-- Displays: 15 -->
```

### DECREMENT Command

```hyperscript
set :value to 20
decrement :value by 7
put :value into #result  <!-- Displays: 13 -->
```

### Addition

```hyperscript
set :a to 15
set :b to 25
set :result to (:a + :b)
put :result into #display  <!-- Displays: 40 -->
```

### Subtraction

```hyperscript
set :a to 100
set :b to 35
set :result to (:a - :b)
put :result into #display  <!-- Displays: 65 -->
```

### Multiplication

```hyperscript
set :a to 6
set :b to 7
set :result to (:a * :b)
put :result into #display  <!-- Displays: 42 -->
```

### Division

```hyperscript
set :a to 100
set :b to 4
set :result to (:a / :b)
put :result into #display  <!-- Displays: 25 -->
```

### Complex Expressions

```hyperscript
set :x to 5
set :y to 3
set :z to 2
set :result to ((:x + :y) * :z - :x)
put :result into #display  <!-- Displays: 11 -->
```

## Loop Variables

### Using `it` in Repeat Loops

The `it` variable holds the current iteration number (1-indexed):

```hyperscript
set :sum to 0
repeat 3 times
  set :idx to it
  increment :sum by :idx
end
put :sum into #result  <!-- Displays: 6 (1+2+3) -->
```

### For Loops

```hyperscript
set :total to 0
for :item in items
  increment :total by :item.value
end
```

## Best Practices

### 1. Use Local Variables for Temporary Data

```hyperscript
<!-- Good: Local variables for temporary calculation -->
on click
  set :x to 10
  set :y to 20
  set :result to (:x + :y)
  put :result into #display
end

<!-- Avoid: Polluting global scope -->
on click
  set x to 10
  set y to 20
  set result to (x + y)
  put result into #display
end
```

### 2. Prevent Naming Conflicts

```hyperscript
<!-- Good: Each handler has its own :counter -->
on mouseover
  set :counter to 0
  increment :counter
end

on click
  set :counter to 100  <!-- Different :counter, no conflict -->
  decrement :counter
end
```

### 3. Use Descriptive Names

```hyperscript
<!-- Good: Clear, descriptive names -->
set :totalPrice to 0
set :itemCount to items.length
set :averagePrice to (:totalPrice / :itemCount)

<!-- Avoid: Ambiguous names -->
set :x to 0
set :y to items.length
set :z to (:x / :y)
```

### 4. Combine with Global Variables When Needed

```hyperscript
<!-- Global state -->
set globalCounter to 0

<!-- Local computation -->
on click
  set :delta to 5
  increment globalCounter by :delta
  put globalCounter into #display
end
```

## Common Patterns

### Counter Pattern

```hyperscript
on click
  set :count to 0
  repeat until :count >= 10
    log :count
    increment :count
  end
end
```

### Accumulator Pattern

```hyperscript
on click
  set :sum to 0
  for :item in <.price/>
    set :value to :item.textContent as Int
    increment :sum by :value
  end
  put :sum into #total
end
```

### Toggle Pattern

```hyperscript
on click
  set :isActive to me.classList.contains('active')
  if :isActive
    remove .active from me
  else
    add .active to me
  end
end
```

### Calculation Pattern

```hyperscript
on input
  set :width to #width.value as Int
  set :height to #height.value as Int
  set :area to (:width * :height)
  put :area into #result
end
```

## Type Conversions

Local variables work seamlessly with type conversions:

```hyperscript
<!-- String to number -->
set :input to "123"
set :number to :input as Int
increment :number by 10  <!-- :number = 133 -->

<!-- Form values -->
set :formData to <form/> as Values
set :email to :formData.email
```

## Debugging Tips

### 1. Log Local Variables

```hyperscript
set :x to 42
log :x  <!-- Outputs: 42 -->
```

### 2. Display in DOM

```hyperscript
set :debugInfo to "x = " + :x + ", y = " + :y
put :debugInfo into #debug
```

### 3. Check Scope

```hyperscript
<!-- This will be undefined if :var doesn't exist locally -->
put :var into #test
```

## Limitations

### 1. Local Scope Only

Local variables are **not accessible** outside their execution context:

```hyperscript
on click
  set :temp to 42
end

on hover
  put :temp into #display  <!-- :temp is undefined here -->
end
```

### 2. No Implicit Global Fallback

Unlike regular variables, `:variable` syntax does **not** fall back to global scope if the local variable doesn't exist:

```hyperscript
set x to 100

on click
  put :x into #display  <!-- undefined, NOT 100 -->
end
```

## Migration from Global Variables

### Before (Global Variables)

```hyperscript
on click
  set tempValue to 0
  repeat 5 times
    set tempValue to it
    increment counter by tempValue
  end
end
```

### After (Local Variables)

```hyperscript
on click
  set :tempValue to 0
  repeat 5 times
    set :tempValue to it
    increment counter by :tempValue
  end
end
```

## Advanced Examples

### Nested Loops

```hyperscript
set :outer to 0
repeat 3 times
  set :inner to 0
  repeat 3 times
    set :product to (it * :outer)
    log :product
    increment :inner
  end
  increment :outer
end
```

### Conditional Calculations

```hyperscript
on submit
  set :total to 0
  for :item in <.item/>
    set :price to :item.dataset.price as Float
    set :quantity to :item.dataset.quantity as Int
    set :itemTotal to (:price * :quantity)

    if :quantity > 10
      set :itemTotal to (:itemTotal * 0.9)  <!-- 10% discount -->
    end

    increment :total by :itemTotal
  end
  put :total into #total
end
```

### State Machine Pattern

```hyperscript
on click
  set :currentState to me.dataset.state

  if :currentState == "idle"
    set :newState to "loading"
  else if :currentState == "loading"
    set :newState to "success"
  else
    set :newState to "idle"
  end

  set me.dataset.state to :newState
end
```

## Summary

- **Syntax**: Use `:` prefix for local variables (`:variable`)
- **Scope**: Local to execution context, no global pollution
- **Isolation**: Only checks local scope, prevents global conflicts
- **Arithmetic**: Works with INCREMENT, DECREMENT, and all math operators
- **Expressions**: Fully supported in all expression contexts
- **Best Practice**: Use local variables for temporary data and calculations

## See Also

- [SET Command Documentation](./commands/SET.md)
- [INCREMENT/DECREMENT Commands](./commands/INCREMENT_DECREMENT.md)
- [Expression Evaluation Guide](./EXPRESSIONS.md)
- [Scope and Variables](./SCOPE.md)
