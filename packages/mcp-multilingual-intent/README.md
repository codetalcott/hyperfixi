# @lokascript/mcp-multilingual-intent

**Multilingual-intent MCP server.** Parse natural-language intent in any of 24 languages → canonical LSE protocol JSON → exposed to LLM coding agents (Claude Desktop, Cursor, Continue, Cline) as MCP tools.

Built on the stable `siren-mcp` hypermedia-to-MCP bridge from `siren-grail`: this package ships a thin Hono HTTP API that wraps the existing production `@lokascript/framework` + `@hyperfixi/patterns-reference` packages, exposes 5 tools via Siren actions, and lets `siren-mcp` do the MCP protocol work.

## What it does

Given a natural-language prompt in any of 24 languages, the server can:

| Tool                        | What it does                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `parse_multilingual_intent` | Parse text → semantic AST (action + roles + confidence). Auto-detects domain or accepts a domain hint.                         |
| `detect_domain`             | Classify input to one of 8 domains (sql, bdd, jsx, todo, llm, flow, voice, behaviorspec). Pure classification, no compilation. |
| `compile_auto`              | Auto-detect + compile in one call. Returns compiled output (SQL string, Playwright test code, etc.).                           |
| `get_pattern_examples`      | RAG lookup over the patterns-reference database. Few-shot examples for LLM context injection.                                  |
| `list_supported_languages`  | Enumerate supported language codes.                                                                                            |

The canonical use case: an LLM agent prompted in Japanese (`"users から name 選択"`) calls `parse_multilingual_intent` and gets back the same semantic AST an English prompt would produce (`action: "select"`, `source: "users"`, `columns: "name"`). The behavior layer is language-neutral by construction.

## Architecture

```
┌─────────────────┐   MCP JSON-RPC     ┌──────────────────┐   HTTP Siren     ┌──────────────────────┐
│  LLM Agent      │ ─────────────────▶ │  siren-mcp       │ ───────────────▶ │  Hono Siren API      │
│ (Claude Desktop │                    │  bridge          │                  │  (this package)      │
│  Cursor, etc.)  │ ◀───────────────── │  stdio or HTTP   │ ◀─────────────── │  :3030/api           │
└─────────────────┘                    └──────────────────┘                  └──────────────────────┘
                                                                                       │
                                                                                       ├─▶ @lokascript/framework
                                                                                       │   (DomainRegistry + dispatcher)
                                                                                       │
                                                                                       ├─▶ @hyperfixi/patterns-reference
                                                                                       │   (SQLite RAG database)
                                                                                       │
                                                                                       └─▶ @lokascript/domain-* (8 domains)
```

The server is **stateless**: each tool call is independent. Every response returns the full entry-point entity with a stable list of actions, so the bridge's MCP tool set doesn't tear down and rebuild between calls.

## Run it

```bash
# Install workspace deps at the monorepo root (one time)
cd /path/to/hyperfixi && npm install

# Start the Hono server (listens on :3030)
cd packages/mcp-multilingual-intent
npm run dev
```

Verify the Siren format is correct:

```bash
npm run mcp:test
```

Expected output: `Passed: 23  Failed: 0  Total: 23`.

### Point an MCP client at it

**stdio transport** (for Claude Desktop, Cursor local config):

```bash
npm run mcp
# equivalent to: node ../../../siren-grail/packages/siren-agent/bin/siren-mcp.mjs http://localhost:3030/api
```

**HTTP transport** (for dev and testing):

```bash
npm run mcp:http
# siren-mcp bridge listens on :8080
# Claude Desktop can connect via http://localhost:8080
```

### Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "lokascript-multilingual-intent": {
      "command": "node",
      "args": [
        "/Users/YOU/projects/siren-grail/packages/siren-agent/bin/siren-mcp.mjs",
        "http://localhost:3030/api"
      ]
    }
  }
}
```

Start the server separately with `npm run dev`. Restart Claude Desktop to pick up the config.

## Example: end-to-end JSON-RPC call

```bash
# 1. Start the Siren API
npm run dev &

# 2. Start the bridge in HTTP mode
npm run mcp:http &

# 3. Initialize an MCP session
curl -X POST http://localhost:8080 \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}' \
  -D /tmp/mcp-headers.txt

SID=$(grep -i mcp-session-id /tmp/mcp-headers.txt | awk '{print $2}' | tr -d '\r\n')

# 4. Send initialized notification
curl -X POST http://localhost:8080 \
  -H "mcp-session-id: $SID" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'

# 5. Call parse_multilingual_intent with Japanese input
curl -X POST http://localhost:8080 \
  -H "mcp-session-id: $SID" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"action__parse_multilingual_intent","arguments":{"text":"users から name 選択","language":"ja"}}}'
```

The `result.content[0].text` will be a JSON-stringified Siren entity whose `properties.result` contains the parsed semantic AST.

## Tool reference

### `parse_multilingual_intent`

Parse natural-language input and return the semantic AST.

**Input:**

- `text` _(required)_ — the natural-language input
- `language` _(optional, default `"en"`)_ — ISO 639-1 language code
- `domain` _(optional, default `""`)_ — domain hint (`sql`, `bdd`, `jsx`, etc.). Empty string → auto-detect.

**Output:**

```json
{
  "domain": "sql",
  "language": "ja",
  "confidence": 0.71,
  "action": "select",
  "roles": {
    "source": { "type": "expression", "raw": "users" },
    "columns": { "type": "expression", "raw": "name" }
  },
  "explicit": "[select source:users columns:name]"
}
```

### `detect_domain`

Classify input without compiling. Returns the best-match domain and confidence.

**Input:** `text` _(required)_, `language` _(optional)_.

**Output:** `{ domain, language, confidence, action, matched }`.

### `compile_auto`

Auto-detect domain, then compile to target output (SQL string, Playwright test, JSX markup, etc.).

**Input:** `text` _(required)_, `language` _(optional)_.

**Output:** `{ domain, language, ok, code?, errors? }`.

### `get_pattern_examples`

RAG lookup over the patterns-reference SQLite database. Returns up to N few-shot examples to inject into an LLM's context.

**Input:** `prompt` _(required)_, `language` _(optional)_, `limit` _(optional, default 5)_.

**Output:** `{ prompt, language, count, examples: [{ id, patternId, language, prompt, completion, qualityScore }] }`.

> **Note on coverage:** the patterns database currently ships with 118 patterns (English translations only) and 19 LLM few-shot examples. Multilingual translations and additional examples are a tracked content gap.

### `list_supported_languages`

Returns the union of all language codes supported across registered domains.

## Supported languages and domains

**Languages** (24 total in the semantic parser; 8 currently exposed via registered domains):
`en`, `es`, `ja`, `ar`, `ko`, `zh`, `tr`, `fr`. Additional languages are available in the parser but not yet wired into all domains.

**Domains** (all 8 registered):

| Domain         | Languages                      | Compiles to                   |
| -------------- | ------------------------------ | ----------------------------- |
| `sql`          | en, es, ja, ar, ko, zh, tr, fr | SQL query string              |
| `bdd`          | en, es, ja, ar                 | Playwright test code          |
| `behaviorspec` | 8 languages                    | Playwright interaction test   |
| `jsx`          | 8 languages                    | JSX/React markup              |
| `todo`         | 8 languages                    | Todo operation object         |
| `llm`          | 8 languages                    | LLMPromptSpec JSON            |
| `flow`         | 8 languages                    | Reactive data-flow JavaScript |
| `voice`        | 8 languages                    | DOM interaction command       |

## Related packages

- `@lokascript/framework` — `DomainRegistry`, `CrossDomainDispatcher`, tokenization, schema, code generation
- `@lokascript/semantic` — 24-language tokenizers and semantic parser
- `@hyperfixi/patterns-reference` — SQLite patterns database for RAG
- `@hyperfixi/intent-element` — `<lse-intent>` custom element for browser execution of LSE JSON
- `siren-grail` — The hypermedia framework and `siren-mcp` bridge this package depends on

## License

MIT
