# LLM + LSE Integration

Tools for teaching LLMs to produce and consume LokaScript Explicit Syntax (`[command role:value]`).

## MCP Tools

These are in the MCP server's `lse` toolset, listed when the server is started with
`LOKASCRIPT_MCP_TOOLSETS=lse` (comma-separated, or `all`); a tool also answers a call by name
without it.

### Pipeline (LLM Round-Trip)

| Tool                   | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `lse_from_hyperscript` | Parse hyperscript (any of 24 languages) to LSE bracket syntax + protocol JSON |
| `lse_to_hyperscript`   | Validate LSE from an LLM response: diagnostics, normalized LSE, protocol JSON |

**Typical round-trip workflow:**

1. `lse_from_hyperscript({ code: "on click toggle .active" })` → get LSE + protocol JSON
2. LLM modifies the LSE (e.g., adds a class, changes the target)
3. `lse_to_hyperscript({ lse: "[toggle patient:.highlight]" })` → validated LSE and its protocol JSON
   (compiling LSE to JavaScript retired with the AOT compiler in 4.0)

### Training & Feedback

| Tool                        | Description                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| `generate_training_data`    | Synthesize (natural_language, LSE) pairs from domain schemas as JSONL          |
| `lse_validate_and_feedback` | Validate LSE input, return structured feedback with hints + corrected examples |
| `lse_pattern_stats`         | Hit-rate statistics: success rates by command/language, top failures           |

## Registry Convenience Methods

These methods are available on `DomainRegistry` instances:

| Method                                              | Description                                         |
| --------------------------------------------------- | --------------------------------------------------- |
| `generatePrompt(domain)`                            | Auto-generate LLM system prompt from domain schemas |
| `generateTrainingData(domain)`                      | Synthesize training pairs for fine-tuning           |
| `buildFeedback(domain, input, format, diagnostics)` | Structured error feedback with corrected examples   |

## MCP Sampling (LLM Domain)

The `execute_llm` tool bridges LLM commands to MCP sampling. It and the four shortcuts below are
opt-in: hidden and refused unless the server is started with `LOKASCRIPT_MCP_LLM_TOOLS=1`.

```json
execute_llm({ command: "summarize this paragraph as bullets", language: "en" })
```

Direct sampling shortcuts:

- `ask_claude` -- General questions
- `summarize_content` -- Summarization
- `analyze_content` -- Analysis
- `translate_content` -- Translation
