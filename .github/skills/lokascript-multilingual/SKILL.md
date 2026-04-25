---
name: lokascript-multilingual
description: 'Translates HyperFixi/LokaScript code between 24 languages with native SVO/SOV/VSO grammar transformation. Use when user writes or requests code in non-English languages, or needs translation between languages.'
---

# LokaScript Multilingual

Translate HyperFixi/LokaScript code between 24 languages with native grammar transformation.

## When to Use

- User writes code in non-English (Japanese, Korean, Arabic, etc.)
- User asks to translate code between languages
- User wants to see how code reads in their native language
- Normalizing non-English input to English for processing

## Supported Languages (24)

**SVO:** English, Spanish, Portuguese, French, German, Italian, Polish, Swahili, Indonesian, Malay, Tagalog, Vietnamese, Ukrainian, Russian, Bengali, Hindi, Thai, Quechua, Hebrew
**SOV:** Japanese, Korean, Turkish
**VSO:** Arabic
**Flexible:** Chinese (Mandarin)

## Workflow

### 1. Choose the Right Translation Tool

| Tool                    | Fidelity                                                  | Use When                                   |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `translate_code`        | **High** -- full semantic parsing, grammar transformation | Production translations, any language pair |
| `translate_hyperscript` | Medium -- keyword substitution, preserves selectors       | Quick previews, keyword-level translation  |
| `translate_to_english`  | **High** -- normalizes any language to English            | Processing non-English input               |

### 2. Translate

```
translate_code({ code: "on click toggle .active", from: "en", to: "ja" })
```

### 3. Verify the Result

For non-English to English, use `translate_to_english` which also returns explicit bracket syntax for validation:

```
translate_to_english({ code: "クリック で .active を トグル", sourceLanguage: "ja" })
```

Returns English code + explicit bracket syntax `[toggle patient:.active]`.

### 4. Batch Translation (Optional)

Get all 24 languages in a single call:

```
translate_to_english({ code: "toggle .active", sourceLanguage: "en", getAllLanguages: true })
```

## Grammar Examples

| Language       | Word Order  | Example                         |
| -------------- | ----------- | ------------------------------- |
| English (SVO)  | verb object | `on click toggle .active`       |
| Japanese (SOV) | object verb | `クリック で .active を トグル` |
| Korean (SOV)   | object verb | `클릭 시 .active 를 토글`       |
| Arabic (VSO)   | verb object | `بدّل .active عند نقر`          |
| Spanish (SVO)  | verb object | `en clic alternar .active`      |

## Common Mistakes

1. **Using `translate_hyperscript` for SOV/VSO languages** -- keyword substitution doesn't reorder words; use `translate_code` for correct grammar
2. **Omitting `sourceLanguage`** -- auto-detection works but is less reliable for short inputs; always specify when known
3. **Expecting perfect roundtrips** -- translating en->ja->en may produce slightly different (but semantically equivalent) output
4. **Ignoring confidence scores** -- `translate_to_english` returns confidence; scores below 0.7 suggest ambiguous input

## MCP Tools

| Tool                        | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `translate_code`            | High-fidelity translation with grammar transformation       |
| `translate_hyperscript`     | Quick keyword substitution (24 languages)                   |
| `translate_to_english`      | Normalize non-English to English + explicit syntax          |
| `get_keyword_translations`  | Get translations of a specific keyword across languages     |
| `list_supported_languages`  | List all 24 languages with metadata                         |
| `get_language_profile`      | Full language profile (keywords, markers, config)           |
| `compare_language_profiles` | Find translation gaps between languages                     |
| `get_role_markers`          | Get role markers (destination, source, etc.) for a language |
