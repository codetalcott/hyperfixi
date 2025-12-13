# Semantic Nodes in HyperFixi

This document explains the semantic node system that powers HyperFixi's multilingual hyperscript capabilities.

## Overview

A **semantic node** is a language-independent representation of a hyperscript command. It captures the *meaning* of a command using universal semantic roles from linguistics, rather than the surface syntax of any particular language.

This enables:
- **True multilingual support**: Parse from any language, render to any language
- **Meaning preservation**: Translations maintain semantic equivalence
- **Runtime optimization**: Commands can be analyzed and optimized at the semantic level

---

## Semantic Node Structure

```typescript
interface SemanticNode {
  kind: 'command' | 'event-handler' | 'conditional';
  action: string;           // The verb: 'toggle', 'add', 'set', etc.
  roles: Map<SemanticRole, SemanticValue>;
  metadata?: {
    sourceText?: string;
    confidence?: number;
  };
}
```

### SemanticValue Types

Each role's value can be one of several types:

```typescript
type SemanticValue =
  | { type: 'selector'; value: string; selectorKind: 'id' | 'class' | 'tag' | 'complex' }
  | { type: 'literal'; value: string | number | boolean }
  | { type: 'reference'; value: 'me' | 'you' | 'it' | 'result' }
  | { type: 'property-path'; object: SemanticValue; property: string }
  | { type: 'expression'; raw: string };
```

---

## Semantic Roles

The system uses **semantic roles** (also called thematic roles) from linguistics. These describe the *function* of each argument in a command, regardless of language:

| Role | Meaning | Description |
|------|---------|-------------|
| `patient` | Thing being affected | The direct object of the action |
| `agent` | Thing doing the action | The subject performing the action |
| `destination` | Target location | Where something goes or happens |
| `source` | Origin location | Where something comes from |
| `instrument` | Tool or means | How the action is performed |
| `theme` | Thing being moved/described | Content or subject matter |
| `trigger` | Event that starts action | The initiating event |
| `condition` | Logical condition | When/if the action occurs |
| `duration` | Time span | How long something lasts |
| `value` | New value being set | The value assigned in set operations |
| `attribute` | Property being modified | CSS property, attribute name |

### Example Mappings

| Command | Roles |
|---------|-------|
| `toggle .active` | patient: `.active` |
| `toggle .active on #btn` | patient: `.active`, destination: `#btn` |
| `add .highlight to #item` | patient: `.highlight`, destination: `#item` |
| `set x to 5` | patient: `x`, value: `5` |
| `remove .old from #list` | patient: `.old`, source: `#list` |
| `on click toggle .show` | trigger: `click`, patient: `.show` |

---

## Translation Flow

The semantic node acts as a universal "interlingua" that enables translation between any supported languages:

```
┌─────────────────────────────────────────────────────────────┐
│  Source Language (e.g., English)                            │
│  "toggle .active on #button"                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ parse()
┌─────────────────────────────────────────────────────────────┐
│  Semantic Node (Language-Independent)                       │
│  {                                                          │
│    kind: 'command',                                         │
│    action: 'toggle',                                        │
│    roles: {                                                 │
│      patient: { type: 'selector', value: '.active' },       │
│      destination: { type: 'selector', value: '#button' }    │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ render(node, targetLang)
┌─────────────────────────────────────────────────────────────┐
│  Target Language (e.g., Japanese - SOV word order)          │
│  "#button の .active を 切り替え"                            │
│  (lit: "#button's .active [obj] toggle")                    │
└─────────────────────────────────────────────────────────────┘
```

### Word Order Transformation

Different languages have different word orders:

| Type | Order | Languages | Example |
|------|-------|-----------|---------|
| **SVO** | Subject-Verb-Object | English, Spanish, Chinese | `toggle .active on #button` |
| **SOV** | Subject-Object-Verb | Japanese, Korean, Turkish | `#button の .active を 切り替え` |
| **VSO** | Verb-Subject-Object | Arabic | `بدّل .active على #button` |

The semantic node contains the *meaning*, and the renderer reorders based on the target language's grammar profile.

### Grammatical Markers

Languages use different particles and prepositions to mark roles:

| Language | Patient Marker | Destination Marker |
|----------|---------------|-------------------|
| English | (none) | "on", "to" |
| Japanese | を (wo) | に (ni), の (no) |
| Korean | 을/를 (eul/reul) | 에 (e), 의 (ui) |
| Arabic | (none) | على (ala) |
| Turkish | -(y)i/-ı | -e/-a, -(n)in |

---

## Runtime Flow

Semantic nodes integrate with the HyperFixi runtime in two ways:

### 1. Multilingual Parsing Path

When the runtime encounters hyperscript in a non-English language:

```
┌─────────────────────────────────────────────────────────────┐
│  HTML Attribute                                             │
│  <button _="クリック で .active を 切り替え">                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Detect language (from html lang or config)
┌─────────────────────────────────────────────────────────────┐
│  Semantic Parser                                            │
│  - Tokenize with language-specific tokenizer                │
│  - Match against language patterns                          │
│  - Extract semantic roles                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Convert to executable form
┌─────────────────────────────────────────────────────────────┐
│  Runtime AST / Command                                      │
│  - Standard hyperscript AST structure                       │
│  - Ready for execution by runtime                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Execute
┌─────────────────────────────────────────────────────────────┐
│  DOM Manipulation                                           │
│  - Toggle class on element                                  │
│  - Same behavior regardless of source language              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Semantic Analysis Path

For advanced features like validation and optimization:

```
┌─────────────────────────────────────────────────────────────┐
│  Input: "set #element's value to 'hello'"                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Semantic Analysis
┌─────────────────────────────────────────────────────────────┐
│  SemanticAnalyzer.analyze()                                 │
│  - Returns confidence score (0.0 - 1.0)                     │
│  - Identifies command type and roles                        │
│  - Validates role combinations                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Use Cases
┌─────────────────────────────────────────────────────────────┐
│  • IDE autocompletion based on expected roles               │
│  • Static analysis for unused variables                     │
│  • Optimization (e.g., batch DOM updates)                   │
│  • Translation to other languages                           │
│  • Documentation generation                                 │
└─────────────────────────────────────────────────────────────┘
```

### Integration with Core Runtime

The `SemanticGrammarBridge` connects semantic parsing to the core runtime:

```typescript
// In core runtime initialization
import { createSemanticAnalyzer } from '@hyperfixi/semantic';

const analyzer = createSemanticAnalyzer();

// When parsing multilingual input
function parseMultilingual(input: string, lang: string): AST {
  const result = analyzer.analyze(input, lang);

  if (result.confidence >= 0.7 && result.command) {
    // High confidence: use semantic result
    return convertSemanticToAST(result.command);
  } else {
    // Fall back to traditional parser
    return traditionalParse(input);
  }
}
```

---

## API Usage

### Basic Translation

```typescript
import { getMultilingual } from '@hyperfixi/core/multilingual';

const ml = await getMultilingual();

// Parse to semantic node
const node = await ml.parse('toggle .active on #button', 'en');

// Translate to any language
const japanese = await ml.translate('toggle .active', 'en', 'ja');
// → '.active を 切り替え'

const arabic = await ml.translate('toggle .active', 'en', 'ar');
// → 'بدّل .active'

// Render node to specific language
const korean = await ml.render(node, 'ko');
// → '#button 의 .active 를 전환'
```

### Accessing Semantic Information

```typescript
import { parse } from '@hyperfixi/semantic';

const node = parse('add .highlight to #item', 'en');

console.log(node.action);  // 'add'
console.log(node.roles.get('patient'));
// { type: 'selector', value: '.highlight', selectorKind: 'class' }

console.log(node.roles.get('destination'));
// { type: 'selector', value: '#item', selectorKind: 'id' }
```

### Round-Trip Validation

```typescript
import { roundTrip } from '@hyperfixi/semantic';

// Verify translation preserves meaning
const result = roundTrip('toggle .active on #button', 'en', 'ja');
// Parses EN → Semantic → Renders JA → Parses JA → Semantic
// Compares semantic nodes for equivalence

console.log(result.equivalent);  // true if meaning preserved
```

---

## Supported Languages

| Code | Language | Word Order | Direction |
|------|----------|------------|-----------|
| `en` | English | SVO | LTR |
| `ja` | Japanese (日本語) | SOV | LTR |
| `ar` | Arabic (العربية) | VSO | RTL |
| `es` | Spanish (Español) | SVO | LTR |
| `ko` | Korean (한국어) | SOV | LTR |
| `zh` | Chinese (中文) | SVO | LTR |
| `tr` | Turkish (Türkçe) | SOV | LTR |
| `pt` | Portuguese (Português) | SVO | LTR |
| `fr` | French (Français) | SVO | LTR |
| `de` | German (Deutsch) | SVO | LTR |
| `id` | Indonesian (Bahasa Indonesia) | SVO | LTR |
| `qu` | Quechua (Runasimi) | SOV | LTR |
| `sw` | Swahili (Kiswahili) | SVO | LTR |

---

## Benefits of the Semantic Approach

1. **Language Independence**: Core logic doesn't change based on source language
2. **Extensibility**: Add new languages by defining patterns and profiles
3. **Accuracy**: Linguistic roles map naturally to hyperscript operations
4. **Debugging**: Semantic nodes provide clear, inspectable meaning
5. **Optimization**: Semantic-level analysis enables smart optimizations
6. **Tooling**: IDEs can provide language-aware autocompletion

---

## Related Documentation

- [Language Profiles](../src/generators/language-profiles.ts) - Language configuration
- [Pattern Definitions](../src/patterns/) - Parsing patterns per language
- [Tokenizers](../src/tokenizers/) - Language-specific tokenization
- [Core Bridge](../src/core-bridge.ts) - Runtime integration
