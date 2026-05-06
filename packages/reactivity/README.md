# @hyperfixi/reactivity

Signal-based reactive features for [hyperfixi](https://github.com/codetalcott/hyperfixi). Adds four constructs from upstream `_hyperscript 0.9.90`:

| Construct                                            | Purpose                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `live [commandList] end`                             | Reactive block. Body re-runs whenever any tracked read changes.                                          |
| `when <expr> [or <expr>]* changes [commandList] end` | Observer. Body fires when any watched expression's value changes (`Object.is` semantics).                |
| `bind <var> [to\|and\|with] <element>`               | Two-way DOM ⇄ var binding with auto-detected property by element type.                                   |
| `^name [on <target>]`                                | DOM-scoped inherited variable. Reads walk up the parent chain; writes hit the nearest defining ancestor. |

## Install

```ts
import { createRuntime, installPlugin } from '@hyperfixi/core';
import { reactivityPlugin } from '@hyperfixi/reactivity';

const runtime = createRuntime();
installPlugin(runtime, reactivityPlugin);
```

Re-installing is a no-op (the plugin guards on `parserExtensions.hasFeature('live')`), so it is safe to call from HMR boundaries.

## `live`

```hyperscript
live
  set $total to $price * $quantity
end
```

The body is one effect; its dependency set is the union of every read performed during execution. Writes to any tracked dependency schedule a re-run on the next microtask flush.

## `when ... changes`

```hyperscript
when $message changes
  put it into me
end
```

Each watched expression becomes its own effect. The body runs with `it` and `result` bound to the new value. Multiple expressions can be observed in one feature using `or`:

```hyperscript
when $a or $b changes
  log 'a or b changed'
end
```

**Init behavior**: the body fires once on initial evaluation if the watched expression has a non-null/non-undefined value, then on every subsequent change (`Object.is` semantics). If you need pure change-only semantics, gate the body on a sentinel:

```hyperscript
when $x changes
  if not :primed
    set :primed to true
    exit
  end
  log 'x actually changed'
end
```

## `bind`

```hyperscript
bind $greeting to me
```

Two effects are created (registration order is load-bearing):

1. **DOM → var** — reads the auto-detected property, writes the var. DOM "wins" on init.
2. **var → DOM** — reads the var, writes the DOM property. Fires on programmatic var writes after init.

Auto-detected property by element type:

| Element                             | Property        |
| ----------------------------------- | --------------- |
| `<input type="checkbox\|radio">`    | `checked`       |
| `<input type="number\|range">`      | `valueAsNumber` |
| `<input>`, `<textarea>`, `<select>` | `value`         |
| `[contenteditable="true"]`          | `textContent`   |
| Custom elements with own `value`    | `value`         |

To override, bind directly to a property expression (not yet supported in v1).

Both `$globals` and `:locals` are accepted on the var side. Local writes propagate through the localWriteHook keyed off `context.me`, so a `set :foo to ...` from any handler running on the same `me` element will update the bound DOM property.

## `^name` — DOM-scoped variables

```hyperscript
-- on a parent element
set ^count to 0

-- on a descendant button
on click increment ^count
```

Reads walk up from `me` (or the element passed via `on <target>`), tracking each element visited so writes at any ancestor notify dependent effects. The walk stops at any `[dom-scope="isolated"]` boundary that doesn't itself define the var, allowing nested components to hold independent state.

## Debug logging

Set `localStorage.setItem('hyperfixi:debug', '*')` in the browser console to surface effect errors that would otherwise be swallowed. The reactive scheduler is intentionally tolerant of expression/handler exceptions to avoid breaking the microtask flush; debug mode logs them via `console.warn`.

## API exports

- `reactivityPlugin` (default export): the `HyperfixiPlugin` to pass to `installPlugin`.
- `reactive`: the singleton `Reactive` instance. Useful for explicit teardown via `reactive.stopElementEffects(el)`, or for direct caret-var read/write outside hyperscript code.
- Types: `CaretVarNode`, `LiveFeatureNode`, `WhenFeatureNode`, `BindFeatureNode`.

## License

MIT
