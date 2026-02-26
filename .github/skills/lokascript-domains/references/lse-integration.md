# LLM + LSE Integration

Tools for teaching LLMs to produce and consume LokaScript Explicit Syntax (`[command role:value]`).

## MCP Tools

### Pipeline (LLM Round-Trip)

| Tool                   | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `lse_from_hyperscript` | Parse hyperscript (any of 24 languages) to LSE bracket syntax + protocol JSON |
| `lse_to_hyperscript`   | Validate/compile LSE from LLM response to normalized LSE + JavaScript         |

**Typical round-trip workflow:**

1. `lse_from_hyperscript({ code: "on click toggle .active" })` → get LSE + protocol JSON
2. LLM modifies the LSE (e.g., adds a class, changes the target)
3. `lse_to_hyperscript({ lse: "[toggle patient:.highlight]" })` → validates and compiles to JS

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

The `execute_llm` tool bridges LLM commands to MCP sampling:

```json
execute_llm({ command: "summarize this paragraph as bullets", language: "en" })
```

Also available as direct sampling shortcuts:

- `ask_claude` -- General questions
- `summarize_content` -- Summarization
- `analyze_content` -- Analysis
- `translate_content` -- Translation
