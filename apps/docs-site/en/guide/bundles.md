# Bundle Selection

Hyperscript runs on `@hyperfixi/engine`, the engine that follows upstream `_hyperscript`. A Vite
project lets the plugin choose what to include; a page without a build step loads one script.

## Bundle Comparison

| Bundle                                 | Size (gzip) | Use Case                                                                                 |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| via **`@hyperfixi/vite-plugin`**       | 18–34 KB    | Vite projects: registers only the engine modules your pages use                          |
| **`hyperfixi-hs.js`** (engine)         | ~34 KB      | Script tag: hyperscript only, every module, `live` / `when` / `bind` built in            |
| **`hyperfixi.js`** (`@hyperfixi/core`) | ~34 KB      | The same file as `hyperfixi-hs.js`, under core's name (core's own 352 KB bundle retired) |

The small prebuilts of the 3.x line (`lite`, `lite-plus`, `hybrid-complete`, `hyperfixi-hx.js`,
`minimal`, `standard`) are retired. Their place is taken by the plugin, which builds the small
bundle from what you actually use, and by `hyperfixi-hs.js`.

## Which Bundle Should I Use?

### In a Vite project: the plugin

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()],
};
```

It scans your files for `_="..."` attributes and registers only the engine modules they need.

```javascript
hyperfixi({
  extraCommands: ['fetch'], // Always register these commands' modules
  extraBlocks: ['if'], // Always register these blocks' modules
  positional: true, // Always register first, last, next, …
  htmx: true, // Hand htmx-swapped content to the engine (htmx itself is not bundled)
});
```

### With a script tag: `hyperfixi-hs.js`

```html
<script src="https://unpkg.com/@hyperfixi/engine/dist/hyperfixi-hs.js"></script>

<button
  _="on click
  if I match .loading exit end
  add .loading to me
  fetch /api/data as json
  for item in result
    put item.name at end of #results
  end
  remove .loading from me"
>
  Load Data
</button>
```

### htmx-style attributes

Pair the engine with [fixi](https://github.com/bigskysoftware/fixi) (~1.3 KB) or htmx 4 (~13 KB).
For `hx-*` attributes written in another language, add
[`@lokascript/htmx-adapter`](/en/guide/htmx-compatibility).

```html
<button hx-get="/api/users" hx-target="#users-list" hx-swap="innerHTML">Load Users</button>
```

## Next Steps

- [Commands](/en/guide/commands) - Learn what each command does
- [Expressions](/en/guide/expressions) - Understand expression syntax
- [Vite Plugin](/en/packages/vite-plugin) - Detailed plugin configuration
