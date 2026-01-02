# Custom Bundle Generator

Generate minimal inline HyperFixi bundles with only the commands you need.

## Quick Start

```bash
# Generate from a config file
npm run generate:bundle -- --config bundle-configs/textshelf.config.json

# Generate from command line
npm run generate:bundle -- --commands toggle,add,remove --output src/my-bundle.ts --name MyApp

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
  "output": "src/compatibility/browser-bundle-mybundle.ts",
  "htmxIntegration": true,
  "globalName": "hyperfixi"
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | required | Bundle name (used in comments and errors) |
| `commands` | string[] | required | List of commands to include |
| `output` | string | required | Output TypeScript file path |
| `htmxIntegration` | boolean | `false` | Add `htmx:afterSettle` listener |
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

## CLI Options

```bash
npx tsx scripts/generate-inline-bundle.ts [options]

Options:
  --config <file>     JSON config file
  --commands <list>   Comma-separated list of commands
  --output <file>     Output file path
  --name <name>       Bundle name (default: "Custom")
  --htmx              Enable HTMX integration
  --global <name>     Global variable name (default: "hyperfixi")
  --help              Show help
```

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
