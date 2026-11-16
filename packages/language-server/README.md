# @lokascript/language-server

Language Server Protocol (LSP) implementation supporting both **original \_hyperscript** and **LokaScript** (the same grammar, run by `@hyperfixi/engine`, in 24 languages).

## Multi-Mode Support

The language server supports four operating modes:

| Mode                 | Engine additions | Multilingual | Use Case                                   |
| -------------------- | ---------------- | ------------ | ------------------------------------------ |
| **hyperscript**      | Flagged          | English only | Original \_hyperscript users               |
| **hyperscript-i18n** | Flagged          | 24 languages | Users of `@lokascript/hyperscript-adapter` |
| **lokascript**       | Accepted         | 24 languages | Full LokaScript development                |
| **auto**             | (detected)       | (detected)   | Most users                                 |

### Mode Selection

- **auto** (default): `lokascript` mode when the semantic package exposes its API; `hyperscript` mode in builds that replace it with a shim
- **hyperscript**: Enforces \_hyperscript-compatible syntax, English keywords only
- **hyperscript-i18n**: Enforces \_hyperscript-compatible syntax with multilingual keyword support. Use this if you have original \_hyperscript with `@lokascript/hyperscript-adapter` for writing in non-English languages
- **lokascript**: Accepts the engine's additions, with multilingual support

### LokaScript Extensions (flagged in hyperscript mode)

Since 4.0 the LokaScript runtime is `@hyperfixi/engine`, which follows upstream \_hyperscript's
grammar: the modes share their command keywords, event modifiers and `as` conversions
(`LOKASCRIPT_ONLY_COMMANDS` in `src/command-tiers.ts` is empty). What the engine has that
upstream does not is two forms of existing keywords. In the `hyperscript` and `hyperscript-i18n`
modes, when `@hyperfixi/engine` is installed, each is reported as an error (code
`lokascript-only`):

| Feature            | Example          | Alternative for \_hyperscript |
| ------------------ | ---------------- | ----------------------------- |
| `new` expression   | `new Date()`     | `make a Date`                 |
| `toggle <element>` | `toggle #dialog` | N/A                           |

Code neither engine parses (core's 3.x extensions such as `prepend` or `.debounce(300)`) gets
the engine's parse error in every mode.

## Features

### Core LSP Features

| Feature                 | Description                                                                           | Status  |
| ----------------------- | ------------------------------------------------------------------------------------- | ------- |
| **Diagnostics**         | Real-time error detection and warnings                                                | ✅      |
| **Completions**         | The words the engine's grammar takes at the cursor, and the document's names          | Partial |
| **Hover**               | Documentation on hover for commands and keywords                                      | ✅      |
| **Document Symbols**    | Outline view showing event handlers, behaviors, and functions                         | ✅      |
| **Code Actions**        | Quick fixes for common issues                                                         | ✅      |
| **Go to Definition**    | Variables, parameters, behaviors, functions, `#id`, events                            | ✅      |
| **Find References**     | The same names, each in its scope; behaviors, functions and `$x` across the workspace | ✅      |
| **Rename**              | The same sites as Find References                                                     | ✅      |
| **Workspace Symbols**   | Behavior and function definitions in the workspace                                    | ✅      |
| **Document Formatting** | Format hyperscript code with consistent indentation                                   | ✅      |

`src/ide-scorecard.test.ts` asks the built server what an author expects of identifiers and
completion, one probe each, and all of them pass (2026-11-16). What follows is how each feature
works and where it stops; "Partial" marks a feature whose limits an author will meet.

- **Identifiers** resolve, each in its own scope, when `@hyperfixi/engine` is
  installed and parses the script: a variable written without a sigil (`set count to 1`) and a loop
  variable belong to their handler or `def`; a parameter to its `def` or behavior (an
  `install Name(param: …)` site names it too); a `:x` to its element (one `_` attribute) or its
  behavior; a `$x`, a behavior and a function to the file. A `#name` goes to the element with that
  `id`, and a sent or triggered event to the handlers that listen for it. Find References and
  Rename cover the same sites. Three limits:
  - A script the engine does not parse (one being typed, or one not in English) is read by
    patterns instead: behaviors, functions and sigil variables only.
  - Across files, a behavior, a function and a `$x` resolve when something in the workspace
    defines them. The workspace is its folders' `.html`, `.htm`, `.hs` and `._hs` files (not
    `node_modules`, build output or hidden folders; at most 2,000 files of up to 1 MB, and the
    server logs when it stops there). A file changed outside the editor is seen within two
    seconds. An `id`, an event and every scoped name stay within their file, and so does a name
    nothing defines (`alert(…)`). Renaming a behavior edits every file that names it, open or
    not: read the preview.
  - `element x` and `:x` are listed as two variables.
- **Completion**, when `@hyperfixi/engine` is installed and the language is English, asks the
  engine's grammar what fits at the cursor: the word a command requires (`put x` → `into`), the
  command's own words, then closers and commands, then the operators any expression takes. Where
  the grammar reads a value it offers the handler's variables and parameters, `me` / `it` /
  `result` / `event`, and functions; after `install`, behaviors; after `on`, DOM events and the
  events the file sends; after `#` and `.`, the page's ids and classes; after `:` and `$`, the
  variables written that way. Behaviors and functions come from the whole workspace. Limits:
  - The grammar takes a lot (about 69 items per list on the measure below), so the list is
    ordered, not short. Commands are ordered by how often the reference and hover examples in
    `@hyperfixi/core` use them; without core, in the grammar's own order.
  - Nothing is offered after a property dot (`event.`), and no command's arguments are described
    (there is no signature help).
  - In another language, or without the engine, completion is the keyword lists it was before:
    event names after `on`, commands after an event.
  - Measured on the command-shape sources (2026-11-16, Apple M4, Node 24.15.0; 5,416 cursor
    positions before a grammar word): the list holds the word written next 0.996 of the time; once
    its first letter is typed it is first 0.66 of the time and in the first five 0.961. The same
    measure on 7.6.0's server: 0.280, 0.196, 0.280.
- `install Name` where no file in the workspace defines `Name` gets an information notice
  (`unknown-behavior`), not a warning: a behaviors bundle or a template format the server does not
  read may define it. It is recomputed when the document that installs it changes, so it can
  outlast the fix until the next edit. Unknown functions are not reported: any function on the
  page is callable.

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

There is no published LokaScript extension. Start the server from a generic LSP client
extension, or from your own extension with `vscode-languageclient` (the settings schema is
below).

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

1. `initializationOptions` on `initialize` (the VS Code extension passes `{ language }` here);
2. a `workspace/didChangeConfiguration` push carrying a `lokascript` or `hyperscript` section (vscode-languageclient only sends one when the client sets `synchronize.configurationSection`; the VS Code extension does);
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
- `@hyperfixi/engine` is an **optional** peer: the engine that runs hyperscript. With it the server surfaces its parse errors (at the position the engine stopped) and gives the AST nodes their source positions for hover, symbols and completions. The symbol table reads its tree too: without the engine, Go to Definition, Find References and Rename know behaviors, functions and sigil variables only.
- `@hyperfixi/core` is an **optional** peer, for two of its entries: `/ast-utils` (complexity diagnostics, hover, symbols and completions on the interchange) and `/lsp-metadata` (keyword and hover docs). The AST nodes come from `@lokascript/semantic`, which names each command's roles itself. Without either, diagnostics degrade to the pattern-based quote/bracket checks and hover uses built-in fallback docs. (Until 4.0 the parse errors and nodes came from `@hyperfixi/core`'s parser.)

A bundler that wants an English-only, dependency-free server replaces the semantic, framework, engine and core imports with throwing or empty shims at bundle time; the server's capability probes are written for that case.

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

`npx tsx src/tools/completion-measure.ts` scores the built server's completion on the next word
of real scripts (recall and precision against the engine's own parser, and the word's place in
the list; the file's header says how). `--server <command>` scores another LSP server on the same requests.

## Architecture

The language server entry point is `server.ts` (LSP wiring and the request handlers), with the testable logic in sibling modules — `extraction.ts` (HTML region extraction and position mapping), `simple-diagnostics.ts`, `command-tiers.ts` (the _hyperscript-compatibility allowlists), `symbol-table.ts` (definition/references/rename) with `tree-symbols.ts` (the names read from the engine's tree), `next-words.ts` (what the engine's grammar takes at a cursor), `workspace-index.ts` (the symbol tables of files that are not open), `document-symbols.ts`, `completion-context.ts`, `formatting.ts` and `localized-descriptions.ts`. Together they:

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
- `ide-scorecard.test.ts` asks the built server what an author expects of identifiers and completion (definition, references and rename by scope, completion from the document), one probe each, with the probes it does not pass yet in a list that only shrinks
- `lsp-integration.test.ts` spawns the built `dist/server.js` over stdio and speaks JSON-RPC: diagnostics publishing (including the non-English cases), completions, hover, symbols, definition, references, rename, formatting, code actions, configuration changes in both push and pull form, and the `lokascript/translateWithVerification` request

`npm test` rebuilds this package first (`pretest`), and refreshes any stale sibling `dist/` the integration suite resolves through the workspace.

## License

MIT
