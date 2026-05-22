# @lokascript/domain-llm

Multilingual LLM-prompt DSL built on `@lokascript/framework`. Write LLM commands —
`ask`, `summarize`, `analyze`, `translate` — in 8 natural languages and compile them
to a provider-neutral `LLMPromptSpec`, designed to drop straight into MCP
`sampling/createMessage`.

## Why a DSL instead of a prompt string?

A raw prompt string is opaque, English-only, and tied to one provider. Compiling a
short command into a structured `LLMPromptSpec` buys you:

- **A provider-neutral IR** — the same spec runs via MCP sampling, a direct
  Anthropic/OpenAI call, or as an MCP Prompt resource. No prompt rewriting per backend.
- **Multilingual authoring** — a Korean or Arabic developer writes the command in
  their own language; all 8 forms compile to byte-identical JSON (only keywords and
  word order differ, never the content).
- **Zero-API-key invocation** — paired with the MCP server, the _client_ supplies the
  model and approval; the server never holds credentials.
- **Reviewable, versionable prompts** — a compiled spec is a diffable artifact, not a
  string scattered through code.

## Supported Languages

| Language | Code | Word Order | Example                                 |
| -------- | ---- | ---------- | --------------------------------------- |
| English  | `en` | SVO        | `ask "What is this?" from #article`     |
| Spanish  | `es` | SVO        | `preguntar "What is this?" de #article` |
| Japanese | `ja` | SOV        | `#article から "What is this?" 聞く`    |
| Arabic   | `ar` | VSO        | `اسأل "What is this?" من #article`      |
| Korean   | `ko` | SOV        | `#article 에서 "What is this?" 질문`    |
| Chinese  | `zh` | SVO        | `提问 "What is this?" 从 #article`      |
| Turkish  | `tr` | SOV        | `#article dan "What is this?" sor`      |
| French   | `fr` | SVO        | `demander "What is this?" de #article`  |

## Commands

| Command     | Description                                  | Example                                        |
| ----------- | -------------------------------------------- | ---------------------------------------------- |
| `ask`       | Ask a question with optional context + style | `ask "What is this?" from #article as bullets` |
| `summarize` | Summarize content with optional length       | `summarize #document in 3 as markdown`         |
| `analyze`   | Analyze content for a quality                | `analyze #review as sentiment`                 |
| `translate` | Translate content between natural languages  | `translate #text from english to japanese`     |

## Usage

```typescript
import { createLLMDSL } from '@lokascript/domain-llm';

const llm = createLLMDSL();

// Parse → SemanticNode
const node = llm.parse('ask "What is this?" from #article', 'en');

// Validate → { valid: boolean, errors?: string[] }
llm.validate('summarize #document', 'en'); // → { valid: true }

// Compile → CompileResult { ok, code, ... }; `code` is an LLMPromptSpec JSON string
const result = llm.compile('ask "What is this trend?" from #article', 'en');
const spec = JSON.parse(result.code);
```

The compiled `LLMPromptSpec`:

```json
{
  "action": "ask",
  "messages": [
    { "role": "system", "content": "Respond clearly and concisely." },
    { "role": "user", "content": "Context:\n#article" },
    { "role": "user", "content": "What is this trend?" }
  ],
  "maxTokens": 1024,
  "metadata": {
    "sourceLanguage": "en",
    "roles": { "patient": "What is this trend?", "source": "#article", "manner": "" }
  }
}
```

## Multi-Language Examples

The same command in three word orders — SVO, SOV, VSO — compiles to the **same**
`LLMPromptSpec`:

```typescript
llm.compile('translate #text from english to japanese', 'en'); // SVO
llm.compile('#text english から japanese に 翻訳', 'ja'); // SOV
llm.compile('ترجم #text من english إلى japanese', 'ar'); // VSO
// → all three produce byte-identical JSON
```

## Introspection

`describeCommands()` returns a JSON-serializable description of every command — its
roles, per-language markers, and a verified runnable example in each language. Use it
to power docs, MCP tool schemas, or LLM-agent discovery from one source of truth.

```typescript
import { describeCommands, describeCommand, LLM_LANGUAGE_CODES } from '@lokascript/domain-llm';

describeCommand('ask');
// {
//   action: 'ask',
//   description: 'Ask an LLM a question with optional context and response style',
//   category: 'llm',
//   primaryRole: 'patient',
//   roles: [
//     { role: 'patient', required: true,  expectedTypes: ['expression'], markers: {} },
//     { role: 'source',  required: false, expectedTypes: ['expression'],
//       markers: { en: 'from', es: 'de', ja: 'から', ar: 'من', ko: '에서', zh: '从', tr: 'dan', fr: 'de' } },
//     { role: 'manner',  required: false, expectedTypes: ['expression'], markers: { en: 'as', ... } }
//   ],
//   examples: {
//     en: 'ask "What is this?" from #article',
//     ja: '#article から "What is this?" 聞く',
//     ...
//   }
// }

LLM_LANGUAGE_CODES; // ['en','es','ja','ar','ko','zh','tr','fr']
```

## MCP integration

`LLMPromptSpec` maps directly onto MCP `sampling/createMessage`: system messages
become `systemPrompt`, user messages become `messages`, and `metadata.modelPreferences`
passes through. The HyperFixi MCP server exposes this end-to-end via the `execute_llm`
tool — natural language in any of the 8 languages → `domain-llm` compile → Claude via
sampling. See `packages/mcp-server/src/tools/llm-sampling.ts`.

## API

### `createLLMDSL(): MultilingualDSL`

Create a DSL instance with all 8 languages. Provides `parse`, `validate`, `compile`,
and `translate`.

### `describeCommands(): CommandDescription[]`

Describe every command — roles, per-language markers, and a runnable example per
language. Plain JSON-serializable data.

### `describeCommand(action): CommandDescription | undefined`

Describe a single command by action name.

### `renderLLM(node, language): string`

Render a parsed semantic node back to natural-language DSL text.

### `allSchemas`

The four `CommandSchema` definitions (`ask`, `summarize`, `analyze`, `translate`).

### `LLM_LANGUAGE_CODES`

The 8 supported language codes, in priority order.

### Types

`LLMPromptSpec`, `LLMMessage`, `LLMModelPreferences`, `LLMAction`,
`CommandDescription`, `RoleDescription`, `LLMLanguageCode`.
