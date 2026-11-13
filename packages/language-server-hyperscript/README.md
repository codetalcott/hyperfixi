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

Upstream `_hyperscript` ships its own VS Code extension and language server (`tools/vscode` and `tools/lsp` in the `bigskysoftware/_hyperscript` repository). Any LSP client can run this server with `--stdio`, as in the Neovim example above.

## How It Works

This is a thin wrapper around `@lokascript/language-server` that defaults to `hyperscript` mode. In this mode:

- Completions use the canonical English keywords only
- The two forms `@hyperfixi/engine` adds to upstream's grammar (`new X()`, `toggle <element>`) are flagged as errors when the engine is installed. There are no LokaScript-only commands any more (`LOKASCRIPT_ONLY_COMMANDS` in `@lokascript/language-server` is empty): the engine follows upstream's grammar, and code neither engine parses gets the engine's parse error
- No multilingual features are exposed

If you want multilingual support, use `@lokascript/language-server` directly.

## Modes

The underlying server supports four modes. This wrapper forces `hyperscript`:

| Mode               | Engine additions | Multilingual | Use case                |
| ------------------ | ---------------- | ------------ | ----------------------- |
| **`hyperscript`**  | Flagged          | No           | **This package**        |
| `hyperscript-i18n` | Flagged          | Yes          | \_hyperscript + adapter |
| `lokascript`       | Accepted         | Yes          | Full LokaScript         |
| `auto`             | Detected         | Detected     | Default in LS           |
