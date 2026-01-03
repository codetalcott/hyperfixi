# Custom Bundle Generator

Generate minimal inline HyperFixi bundles with only the commands you need.

## Quick Start

```bash
# Generate from a config file
npm run generate:bundle -- --config bundle-configs/textshelf.config.json

# Generate from command line
npm run generate:bundle -- --commands toggle,add,remove --output src/my-bundle.ts --name MyApp

# Include block commands (if, repeat, for, while, fetch)
npm run generate:bundle -- --commands toggle,set --blocks if,repeat --output src/my-bundle.ts

# Include positional expressions (first, last, next, previous, closest, parent)
npm run generate:bundle -- --commands toggle,add --positional --output src/my-bundle.ts

# Output to any directory (import paths are auto-computed)
npm run generate:bundle -- --commands toggle,add --output dist/custom/my-bundle.ts

# Then build with Rollup
npx rollup -c rollup.browser-custom.config.mjs
```

## Bundle Size Comparison

| Bundle | Commands | Gzipped Size |
|--------|----------|--------------|
| Minimal | 3 | ~4 KB |
| Forms | 10 | ~5 KB |
| Animation | 8 | ~5 KB |
| TextShelf | 10 | ~6 KB |
| Hybrid Complete | 21 | ~7 KB |

## Config File Format

```json
{
  "name": "MyBundle",
  "commands": ["toggle", "add", "remove", "show", "hide"],
  "blocks": ["if", "repeat"],
  "output": "src/compatibility/browser-bundle-mybundle.ts",
  "htmxIntegration": true,
  "positionalExpressions": true,
  "globalName": "hyperfixi"
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | required | Bundle name (used in comments and errors) |
| `commands` | string[] | required | List of commands to include |
| `blocks` | string[] | `[]` | Block commands: `if`, `repeat`, `for`, `while`, `fetch` |
| `output` | string | required | Output TypeScript file path (any location) |
| `htmxIntegration` | boolean | `false` | Add `htmx:afterSettle` listener |
| `positionalExpressions` | boolean | `false` | Include `first`, `last`, `next`, `previous`, `closest`, `parent` |
| `globalName` | string | `"hyperfixi"` | Global variable name |

## Available Commands

### DOM Commands
- `toggle` - Toggle CSS classes
- `add` - Add CSS classes
- `remove` - Remove elements
- `removeClass` - Remove CSS classes
- `show` - Show elements (display: '')
- `hide` - Hide elements (display: none)
- `put` - Insert content (into, before, after)
- `append` - Append content

### Data Commands
- `set` - Set variables or properties
- `get` - Get values
- `increment` - Increment numeric values
- `decrement` - Decrement numeric values

### Animation Commands
- `transition` - CSS transitions
- `wait` - Delay execution
- `take` - Take class from siblings

### Event Commands
- `send` - Dispatch custom events
- `trigger` - Alias for send
- `log` - Console logging

### Navigation Commands
- `go` - Navigate (back, forward, URL, scroll)

### Execution Commands
- `call` - Call functions
- `return` - Return from handlers
- `focus` - Focus elements
- `blur` - Blur elements

### Control Flow Commands
- `break` - Exit from a loop
- `continue` - Skip to next loop iteration

## Commands NOT Available in Lite Bundles

The following commands require the full runtime and are not available in generated lite bundles:

- **Advanced execution**: `async`, `js`
- **DOM operations (complex)**: `make`, `swap`, `morph`, `process-partials`
- **Data binding**: `bind`, `persist`, `default`
- **Utility (complex)**: `beep`, `tell`, `copy`, `pick`
- **Navigation (complex)**: `push-url`, `replace-url`
- **Control flow (advanced)**: `halt`, `exit`, `throw`, `unless`
- **Animation (advanced)**: `settle`, `measure`
- **Behaviors**: `install`

If you need these commands, use the full `hyperfixi-browser.js` bundle instead.

## CLI Options

```bash
npx tsx scripts/generate-inline-bundle.ts [options]

Options:
  --config <file>       JSON config file
  --commands <list>     Comma-separated list of commands
  --blocks <list>       Comma-separated list of blocks (if, repeat, for, while, fetch)
  --output <file>       Output file path (any directory, paths auto-computed)
  --name <name>         Bundle name (default: "Custom")
  --htmx                Enable HTMX integration
  --positional          Enable positional expressions (first, last, next, etc.)
  --global <name>       Global variable name (default: "hyperfixi")
  --strict              Fail on unknown commands or blocks (validation mode)
  --max-iterations <n>  Maximum loop iterations for blocks (default: 1000)
  --help                Show help
```

### Strict Validation Mode

Use `--strict` to catch typos and invalid command names early:

```bash
# This will fail if 'toogle' (typo) is not a valid command
npm run generate:bundle -- --commands toggle,toogle --output dist/my-bundle.ts --strict
# Error: Bundle generation failed (strict mode): Unknown command 'toogle' will not be included
```

Without `--strict`, unknown commands are silently skipped with a warning.

## Block Commands

Block commands enable control flow:

| Block | Description | Example |
|-------|-------------|---------|
| `if` | Conditional execution | `if me has .active then hide me end` |
| `repeat` | Loop N times | `repeat 3 times add .pulse end` |
| `for` | Iterate over elements | `for each item in .items toggle .active on item end` |
| `while` | Loop while condition | `while :count < 10 increment :count end` |
| `fetch` | HTTP requests | `fetch /api/data as json then put result into #output end` |

## Positional Expressions

When enabled, supports these selectors:

| Expression | Description |
|------------|-------------|
| `first in .items` | First matching element |
| `last in .items` | Last matching element |
| `next <selector>` | Next sibling matching selector |
| `previous <selector>` | Previous sibling matching selector |
| `closest <selector>` | Closest ancestor matching selector |
| `parent` | Direct parent element |

## Example Configs

### Minimal (3 commands, ~4 KB)
```json
{
  "name": "Minimal",
  "commands": ["toggle", "add", "remove"],
  "output": "src/compatibility/browser-bundle-minimal.ts"
}
```

### Forms (10 commands, ~5 KB)
```json
{
  "name": "Forms",
  "commands": ["toggle", "add", "remove", "show", "hide", "set", "get", "focus", "blur", "send"],
  "output": "src/compatibility/browser-bundle-forms.ts",
  "htmxIntegration": true
}
```

### Animation (8 commands, ~5 KB)
```json
{
  "name": "Animation",
  "commands": ["toggle", "add", "remove", "show", "hide", "transition", "wait", "take"],
  "output": "src/compatibility/browser-bundle-animation.ts"
}
```

## Creating a Rollup Config

After generating, create a Rollup config:

```javascript
// rollup.browser-custom.config.mjs
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/compatibility/browser-bundle-mybundle.ts',
  output: {
    file: 'dist/hyperfixi-mybundle.js',
    format: 'iife',
    name: 'hyperfixi'
  },
  plugins: [
    nodeResolve({ browser: true }),
    typescript({ declaration: false }),
    terser({ compress: { passes: 3 } })
  ]
};
```

## How It Works

The generator creates inline TypeScript that:

1. **Imports the modular parser** - Only the HybridParser class (~600 lines)
2. **Includes minimal runtime** - Just evaluate() and executeCommand()
3. **Includes only specified commands** - Each command is ~10-30 lines
4. **Auto-initializes** - Processes `[_]` attributes on DOM ready

This approach achieves 4-6 KB gzipped bundles compared to 39 KB for the tree-shakable architecture, because everything is inlined with no class/decorator overhead.

## Architecture Note: Parser Dependency

Generated bundles always include the HybridParser (~500 lines). This is intentional:

- Bundles interpret hyperscript at runtime
- Parser is needed to convert `_="..."` attributes to AST
- Expression evaluation requires AST structure

For even smaller bundles, consider:

- Pre-built lite bundles (hybrid-complete at 6.7KB gzip)
- Vite plugin with automatic command detection (`@hyperfixi/vite-plugin`)
