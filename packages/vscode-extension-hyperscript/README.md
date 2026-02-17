# \_hyperscript Language Support for VS Code

Language support for **original [\_hyperscript](https://hyperscript.org)** in Visual Studio Code.

## Features

- **Syntax highlighting** for `.hs` files and `_="..."` attributes in HTML
- **Completions** — context-aware keyword suggestions
- **Hover docs** — documentation for all commands and expressions
- **Diagnostics** — real-time error and warning detection
- **Document outline** — event handlers, behaviors, functions
- **Code actions** — quick fixes for common errors
- **Formatting** — auto-format hyperscript code
- **Go to definition** / **Find references**

## Installation

Search for `hyperscript-vscode` in the VS Code Extensions panel, or:

```bash
code --install-extension hyperscript-tools.hyperscript-vscode
```

## Settings

| Setting                      | Default | Description                   |
| ---------------------------- | ------- | ----------------------------- |
| `hyperscript.maxDiagnostics` | 100     | Max diagnostics per file      |
| `hyperscript.trace.server`   | off     | LSP communication trace level |

## Commands

- `_hyperscript: Restart Language Server` — restart the language server

## How It Works

This extension bundles the `@lokascript/language-server` in `hyperscript` mode, which means:

- Only \_hyperscript-compatible commands are suggested
- LokaScript extensions are flagged as incompatible
- English keywords only (no multilingual features)

For multilingual support or LokaScript extensions, use the `lokascript-vscode` extension instead.

## Supported File Types

- `.hs` files (standalone hyperscript)
- HTML files with `_="..."` attributes
- Vue/Svelte templates with hyperscript attributes
