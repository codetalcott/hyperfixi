# @hyperscript-tools/language-server

Language Server Protocol (LSP) implementation for **original [\_hyperscript](https://hyperscript.org)**.

Provides completions, diagnostics, hover documentation, document symbols, code actions, go-to-definition, find references, and formatting — all scoped to \_hyperscript-compatible syntax.

## Features

- Real-time syntax error detection
- Context-aware keyword completions
- Hover documentation for all commands and expressions
- Document outline (event handlers, behaviors, functions)
- Quick fix suggestions
- Go to definition / Find references
- Code formatting

## Usage

### With any LSP client

```bash
npx @hyperscript-tools/language-server --stdio
```

### Neovim (via nvim-lspconfig)

```lua
local lspconfig = require('lspconfig')
lspconfig.hyperscript.setup {
  cmd = { 'npx', '@hyperscript-tools/language-server', '--stdio' },
  filetypes = { 'html', 'hyperscript' },
}
```

### VS Code

Use the `@hyperscript-tools/vscode` extension instead — it bundles this server automatically.

## How It Works

This is a thin wrapper around `@lokascript/language-server` that defaults to `hyperscript` mode. In this mode:

- Only \_hyperscript-compatible commands are suggested (51 of the engine's 59, plus the `for`/`while` loop keywords and the 7 feature definitions)
- LokaScript extensions (`prepend`, `process`, `copy`, `push`/`replace`, `async`, `unless`, bare `beep`) are flagged as errors — the full list is `LOKASCRIPT_ONLY_COMMANDS` in `@lokascript/language-server`, where each entry records the probe against the published `hyperscript.org` engine that classified it
- LokaScript syntax patterns (dot notation, optional chaining) produce warnings
- No multilingual features are exposed

If you want multilingual support or LokaScript extensions, use `@lokascript/language-server` directly.

## Modes

The underlying server supports four modes. This wrapper forces `hyperscript`:

| Mode               | Commands                | Multilingual | Use case                |
| ------------------ | ----------------------- | ------------ | ----------------------- |
| **`hyperscript`**  | 31 (\_hyperscript only) | No           | **This package**        |
| `hyperscript-i18n` | 31 (\_hyperscript only) | Yes          | \_hyperscript + adapter |
| `lokascript`       | 39 (all)                | Yes          | Full LokaScript         |
| `auto`             | Detected                | Detected     | Default in LS           |
