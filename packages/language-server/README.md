# @lokascript/language-server

Language Server Protocol (LSP) implementation supporting both **original \_hyperscript** and **LokaScript** (a 100% compatible superset with extensions).

## Multi-Mode Support

The language server supports four operating modes:

| Mode                 | Commands           | Multilingual | Use Case                                   |
| -------------------- | ------------------ | ------------ | ------------------------------------------ |
| **hyperscript**      | \_hyperscript only | English only | Original \_hyperscript users               |
| **hyperscript-i18n** | \_hyperscript only | 24 languages | Users of `@lokascript/hyperscript-adapter` |
| **lokascript**       | All (extended)     | 24 languages | Full LokaScript development                |
| **auto**             | (detected)         | (detected)   | Most users - just works                    |

### Mode Selection

- **auto** (default): If `@lokascript/semantic` is available, uses `lokascript` mode; otherwise uses `hyperscript` mode
- **hyperscript**: Enforces \_hyperscript-compatible syntax, English keywords only
- **hyperscript-i18n**: Enforces \_hyperscript-compatible syntax with multilingual keyword support. Use this if you have original \_hyperscript with `@lokascript/hyperscript-adapter` for writing in non-English languages
- **lokascript**: Enables all features including LokaScript extensions and multilingual support

### LokaScript Extensions (flagged in hyperscript mode)

When in `hyperscript` mode, the following LokaScript-only features are flagged as errors:

| Feature                   | Example                            | Alternative for \_hyperscript |
| ------------------------- | ---------------------------------- | ----------------------------- |
| Dot notation              | `my.textContent`                   | `my textContent`              |
| Extended commands         | `morph`, `settle`, `persist`       | N/A                           |
| Extended `as` conversions | `as Int`, `as JSON`                | N/A                           |
| Temporal modifiers        | `.debounce(300)`, `.throttle(100)` | N/A                           |

This allows LokaScript users to maintain \_hyperscript compatibility by using `hyperscript` mode as a lint.

## Features

### Core LSP Features

| Feature                 | Description                                                   | Status |
| ----------------------- | ------------------------------------------------------------- | ------ |
| **Diagnostics**         | Real-time error detection and warnings                        | ✅     |
| **Completions**         | Context-aware keyword and selector suggestions                | ✅     |
| **Hover**               | Documentation on hover for commands and keywords              | ✅     |
| **Document Symbols**    | Outline view showing event handlers, behaviors, and functions | ✅     |
| **Code Actions**        | Quick fixes for common issues                                 | ✅     |
| **Go to Definition**    | Jump to behavior and function definitions                     | ✅     |
| **Find References**     | Find all usages of a symbol                                   | ✅     |
| **Document Formatting** | Format hyperscript code with consistent indentation           | ✅     |

### Multilingual Support

Works with hyperscript written in any of 21 supported languages:

en (English), es (Spanish), pt (Portuguese), fr (French), de (German), it (Italian), ru (Russian), pl (Polish), uk (Ukrainian), ja (Japanese), ko (Korean), zh (Chinese), ar (Arabic), he (Hebrew), tr (Turkish), id (Indonesian), ms (Malay), th (Thai), vi (Vietnamese), tl (Tagalog), sw (Swahili)

### HTML Support

The language server understands hyperscript embedded in HTML files:

- `_="..."` attributes (double and single quotes)
- `<script type="text/hyperscript">` tags
- Correct position mapping for diagnostics and navigation

## Installation

```bash
npm install @lokascript/language-server
```

## Usage

### As a standalone server

```bash
# Start with stdio transport (default)
npx lokascript-language-server --stdio

# Or run directly
node dist/server.js --stdio
```

### With VS Code

Use the companion extension `lokascript-vscode` which automatically starts this server.

### With other editors

Configure your editor's LSP client to start the language server with stdio transport.

#### Neovim (nvim-lspconfig)

```lua
require('lspconfig.configs').lokascript = {
  default_config = {
    cmd = { 'npx', 'lokascript-language-server', '--stdio' },
    filetypes = { 'html', 'hyperscript' },
    root_dir = function() return vim.loop.cwd() end,
  },
}
require('lspconfig').lokascript.setup{}
```

#### Emacs (lsp-mode)

```elisp
(lsp-register-client
 (make-lsp-client
  :new-connection (lsp-stdio-connection '("npx" "lokascript-language-server" "--stdio"))
  :activation-fn (lsp-activate-on "html" "hyperscript")
  :server-id 'lokascript))
```

## Configuration

The server accepts configuration via the LSP `workspace/configuration` mechanism:

```json
{
  "lokascript": {
    "mode": "auto",
    "language": "en",
    "maxDiagnostics": 100
  }
}
```

| Setting          | Default  | Description                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------------- |
| `mode`           | `"auto"` | Operating mode: `"auto"`, `"hyperscript"`, `"hyperscript-i18n"`, or `"lokascript"`     |
| `language`       | `"en"`   | Primary language for keyword suggestions (used in `lokascript` and `hyperscript-i18n`) |
| `maxDiagnostics` | `100`    | Maximum diagnostics per file                                                           |

The server also accepts configuration under the `hyperscript` namespace for users of original \_hyperscript:

```json
{
  "hyperscript": {
    "mode": "hyperscript",
    "maxDiagnostics": 100
  }
}
```

## VS Code Extension Settings Schema

When building a VS Code extension that uses this language server, add the following to your extension's `package.json`:

```json
{
  "contributes": {
    "configuration": {
      "title": "Hyperscript / LokaScript",
      "properties": {
        "lokascript.mode": {
          "type": "string",
          "enum": ["auto", "hyperscript", "hyperscript-i18n", "lokascript"],
          "enumDescriptions": [
            "Detect based on available packages",
            "Restrict to _hyperscript-compatible syntax, English only",
            "Restrict to _hyperscript-compatible syntax with multilingual support (for hyperscript-adapter users)",
            "Allow all LokaScript features including extensions"
          ],
          "default": "auto",
          "description": "Operating mode for syntax validation."
        },
        "lokascript.language": {
          "type": "string",
          "default": "en",
          "description": "Primary language for multilingual keyword support (lokascript mode only)."
        },
        "lokascript.maxDiagnostics": {
          "type": "number",
          "default": 100,
          "description": "Maximum number of diagnostics per file."
        }
      }
    }
  }
}
```

For users who prefer the `hyperscript` namespace:

```json
{
  "contributes": {
    "configuration": {
      "title": "Hyperscript",
      "properties": {
        "hyperscript.mode": {
          "type": "string",
          "enum": ["auto", "hyperscript", "hyperscript-i18n", "lokascript"],
          "enumDescriptions": [
            "Detect based on available packages",
            "Restrict to _hyperscript-compatible syntax, English only",
            "Restrict to _hyperscript-compatible syntax with multilingual support",
            "Allow all LokaScript features"
          ],
          "default": "hyperscript",
          "description": "Operating mode for syntax validation."
        },
        "hyperscript.language": {
          "type": "string",
          "default": "en",
          "description": "Primary language for multilingual keyword support (hyperscript-i18n mode)."
        },
        "hyperscript.maxDiagnostics": {
          "type": "number",
          "default": 100,
          "description": "Maximum number of diagnostics per file."
        }
      }
    }
  }
}
```

## Dependencies

The language server works best with these optional peer dependencies installed:

- `@lokascript/semantic` - Enables 21-language support and semantic analysis
- `@lokascript/ast-toolkit` - Enables AST-based analysis and complexity metrics
- `@lokascript/core` - Enables full hyperscript parsing and AST-based formatting

Without these dependencies, the server falls back to pattern-based analysis (English only).

## Development

```bash
# Build
npm run build

# Run in development
npm run dev

# Type check
npm run typecheck

# Test
npm test

# Test with coverage
npm test -- --coverage
```

## Architecture

The language server is implemented as a single `server.ts` file that:

1. **Extracts** hyperscript regions from HTML documents
2. **Analyzes** code using semantic parsing (multilingual) or pattern-based fallback
3. **Provides** LSP features through the standard protocol

### HTML Extraction

The server handles three types of hyperscript in HTML:

```html
<!-- Double-quoted attribute -->
<button _="on click toggle .active">Click me</button>

<!-- Single-quoted attribute -->
<button _="on click toggle .active">Click me</button>

<!-- Script tag -->
<script type="text/hyperscript">
  behavior Modal
    on open show me
    on close hide me
  end
</script>
```

### Position Mapping

All diagnostics, hover, and navigation features correctly map positions between:

- HTML document coordinates (line/character in the full file)
- Hyperscript region coordinates (line/character within the `_="..."` value)

This ensures that clicking on an error jumps to the correct position, even in multiline attributes.

## Testing

The server has comprehensive test coverage:

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- --run src/server.test.ts
```

Test categories:

- HTML document detection
- Hyperscript region extraction
- Position mapping (offset to line/character)
- Go to Definition
- Find References
- Code Formatting
- LSP integration tests

## License

MIT
