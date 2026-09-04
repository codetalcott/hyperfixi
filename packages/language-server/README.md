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

- **auto** (default): `lokascript` mode when the semantic package exposes its API; `hyperscript` mode in builds that replace it with a shim (the standalone `hyperscript-vscode` extension does this)
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

Works with hyperscript written in any of the 24 supported languages:

ar (Arabic), bn (Bengali), de (German), en (English), es (Spanish), fr (French), he (Hebrew), hi (Hindi), id (Indonesian), it (Italian), ja (Japanese), ko (Korean), ms (Malay), pl (Polish), pt (Portuguese), qu (Quechua), ru (Russian), sw (Swahili), th (Thai), tl (Tagalog), tr (Turkish), uk (Ukrainian), vi (Vietnamese), zh (Chinese)

In `lokascript` and `hyperscript-i18n` modes the server parses each region with the semantic front-end in the configured `language`, falling back to auto-detection across the other languages when that fails. When the front-end accepts a region in a non-English language, the English core parser's errors for that region are suppressed (the core parser is English-only, and its "unexpected token" on valid Spanish is noise, not a diagnostic).

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

The server reads its settings three ways, and every field is optional (a partial object is merged over the defaults):

1. `initializationOptions` on `initialize` (both VS Code extensions pass `{ language }` here);
2. a `workspace/didChangeConfiguration` push carrying a `lokascript` or `hyperscript` section (vscode-languageclient only sends one when the client sets `synchronize.configurationSection`; both bundled extensions do);
3. a `workspace/configuration` pull for the `lokascript` and `hyperscript` sections, made at startup and whenever a push arrives with no payload, for clients that advertise the capability.

When both namespaces are present the `lokascript` one wins, unless the server was launched with `HYPERSCRIPT_LS_DEFAULT_MODE` set (the standalone hyperscript product), in which case `hyperscript` wins.

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

- `@lokascript/semantic` and `@lokascript/framework` are **required** (regular dependencies): the semantic package registers the 24 languages at startup, and the framework renders the LSE bracket notation shown in hover. They used to be declared as optional peers while being imported statically, so a server installed without them crashed at startup instead of falling back.
- `@hyperfixi/core` is an **optional** peer. With it the server surfaces real parse errors, complexity diagnostics and schema-inferred roles in hover; without it, diagnostics degrade to the pattern-based quote/bracket checks and hover uses built-in fallback docs.

A bundler that wants an English-only, dependency-free server (the standalone `hyperscript-vscode` extension) replaces the semantic, framework and core imports with throwing or empty shims at bundle time; the server's capability probes are written for that case.

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

The language server entry point is `server.ts` (LSP wiring and the request handlers), with the testable logic in sibling modules — `extraction.ts` (HTML region extraction and position mapping), `simple-diagnostics.ts`, `command-tiers.ts` (the _hyperscript-compatibility allowlists), `symbol-table.ts` (definition/references/rename), `document-symbols.ts`, `completion-context.ts`, `formatting.ts` and `localized-descriptions.ts`. Together they:

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

- Unit tests against the shipped modules: HTML document detection, region extraction, position mapping, the symbol table (definition, references, rename), document symbols, completion context, formatting, diagnostics, and the compatibility allowlists
- `lsp-integration.test.ts` spawns the built `dist/server.js` over stdio and speaks JSON-RPC: diagnostics publishing (including the non-English cases), completions, hover, symbols, definition, references, rename, formatting, code actions, configuration changes in both push and pull form, and the `lokascript/translateWithVerification` request

`npm test` rebuilds this package first (`pretest`), and refreshes any stale sibling `dist/` the integration suite resolves through the workspace.

## License

MIT
