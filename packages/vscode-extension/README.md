# LokaScript for VS Code

Official VS Code extension for LokaScript/hyperscript with support for 24 human languages.

## Features

### Syntax Highlighting

Full syntax highlighting for hyperscript in HTML files and standalone `.hs` files:

- Commands (toggle, add, remove, show, hide, etc.)
- Event handlers (on click, on keydown, etc.)
- Selectors (#id, .class, @attr, \*property)
- Variables (:local, $global)
- Control flow (if, else, repeat, for)

### IntelliSense

- **Completions**: Context-aware suggestions for commands, events, and selectors
- **Hover Documentation**: Detailed documentation for hyperscript commands
- **Multilingual Support**: Keywords in 24 languages

### Diagnostics

- Real-time error detection
- Missing argument warnings
- Unbalanced quotes/brackets detection
- Semantic validation

### Document Outline

Navigate your hyperscript code with the document outline showing:

- Event handlers (`on click`, `on keydown`, etc.)
- Behavior definitions
- Function definitions
- Init blocks

### Code Actions

Quick fixes for common issues:

- Add missing class target to toggle
- Add missing destination to put command

## Supported Languages

Write hyperscript in your native language! Supports:

| Language  | Example                           |
| --------- | --------------------------------- |
| English   | `on click toggle .active`         |
| Japanese  | `クリック で .active を 切り替え` |
| Korean    | `클릭 시 .active 토글`            |
| Spanish   | `al hacer clic alternar .active`  |
| Arabic    | `عند النقر بدّل .active`          |
| + 16 more | ...                               |

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "LokaScript"
4. Click Install

### From VSIX

```bash
code --install-extension lokascript-vscode-1.0.0.vsix
```

## Configuration

Configure the extension in your VS Code settings:

```json
{
  "lokascript.language": "en",
  "lokascript.maxDiagnostics": 100,
  "lokascript.trace.server": "off"
}
```

| Setting                     | Default | Description                                  |
| --------------------------- | ------- | -------------------------------------------- |
| `lokascript.language`       | `"en"`  | Primary language for keyword suggestions     |
| `lokascript.maxDiagnostics` | `100`   | Maximum diagnostics to show per file         |
| `lokascript.trace.server`   | `"off"` | LSP message tracing (off, messages, verbose) |

## Commands

| Command                      | Description                 |
| ---------------------------- | --------------------------- |
| `LokaScript: Restart Server` | Restart the language server |

## Requirements

None. The language server is bundled into the extension together with
`@lokascript/semantic`, `@lokascript/framework` and `@hyperfixi/core`, so every
feature — AST diagnostics, hover role inference, 24-language support — works
without installing anything in your project.

## Development

### Building

```bash
cd packages/vscode-extension
npm install
npm run compile
```

### Packaging

```bash
npm run package
# Creates lokascript-vscode-1.0.0.vsix
```

### Testing

1. Open the monorepo in VS Code
2. Press F5 to launch Extension Development Host
3. Open an HTML file with hyperscript

## Related

- [@lokascript/language-server](../language-server) - The LSP server
- [@hyperfixi/core](../core) - Core hyperscript runtime
- [@lokascript/semantic](../semantic) - Semantic analysis

## License

MIT
