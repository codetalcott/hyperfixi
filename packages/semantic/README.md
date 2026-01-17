# @hyperfixi/semantic

Semantic-first multilingual parser for HyperFixi. Parses hyperscript-like syntax from 23 languages into a language-agnostic semantic representation.

## Features

- **23 Languages**: Arabic, Bengali, Chinese, English, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Swahili, Thai, Tagalog, Turkish, Ukrainian, Vietnamese
- **Semantic Roles**: Language-agnostic intermediate representation (patient, destination, source, etc.)
- **Confidence Scoring**: Graceful degradation with scored parse results
- **Morphological Normalization**: Handles verb conjugations in agglutinative languages

## Installation

```bash
npm install @hyperfixi/semantic
```

## Bundle Selection Guide

Choose the right bundle for your use case. All bundles are minified IIFE for direct browser usage.

### Bundle Matrix

#### Tier 1: Single Language (~14-20 KB gzip)

| Bundle                    | Global                | Size   | Languages |
| ------------------------- | --------------------- | ------ | --------- |
| `browser-en.en.global.js` | `HyperFixiSemanticEn` | ~20 KB | en        |
| `browser-es.es.global.js` | `HyperFixiSemanticEs` | ~16 KB | es        |
| `browser-ja.ja.global.js` | `HyperFixiSemanticJa` | ~17 KB | ja        |
| `browser-ar.ar.global.js` | `HyperFixiSemanticAr` | ~17 KB | ar        |
| `browser-ko.ko.global.js` | `HyperFixiSemanticKo` | ~18 KB | ko        |
| `browser-zh.zh.global.js` | `HyperFixiSemanticZh` | ~15 KB | zh        |
| `browser-tr.tr.global.js` | `HyperFixiSemanticTr` | ~18 KB | tr        |
| `browser-pt.pt.global.js` | `HyperFixiSemanticPt` | ~14 KB | pt        |
| `browser-fr.fr.global.js` | `HyperFixiSemanticFr` | ~14 KB | fr        |
| `browser-de.de.global.js` | `HyperFixiSemanticDe` | ~14 KB | de        |
| `browser-id.id.global.js` | `HyperFixiSemanticId` | ~14 KB | id        |
| `browser-qu.qu.global.js` | `HyperFixiSemanticQu` | ~14 KB | qu        |
| `browser-sw.sw.global.js` | `HyperFixiSemanticSw` | ~14 KB | sw        |

#### Tier 2-5: Multi-Language Bundles

| Bundle                                    | Global                       | Size   | Languages          |
| ----------------------------------------- | ---------------------------- | ------ | ------------------ |
| `browser-es-en.es-en.global.js`           | `HyperFixiSemanticEsEn`      | ~25 KB | en, es             |
| `browser-western.western.global.js`       | `HyperFixiSemanticWestern`   | ~30 KB | en, es, pt, fr, de |
| `browser-east-asian.east-asian.global.js` | `HyperFixiSemanticEastAsian` | ~24 KB | ja, zh, ko         |
| `browser-priority.priority.global.js`     | `HyperFixiSemanticPriority`  | ~48 KB | 11 languages       |
| `browser.global.js`                       | `HyperFixiSemantic`          | ~61 KB | All 13             |
| `browser-lazy.lazy.global.js`             | `HyperFixiSemanticLazy`      | ~15 KB | On-demand          |

### Lazy Loading (Smallest Initial Bundle)

For applications that need minimal initial bundle size:

```html
<script src="node_modules/@hyperfixi/semantic/dist/browser-lazy.lazy.global.js"></script>
<script>
  const { loadLanguage, parse } = HyperFixiSemanticLazy;

  // Load languages on demand
  await loadLanguage('en');
  await loadLanguage('ja');

  // Now parsing works for loaded languages
  parse('toggle .active', 'en');
  parse('トグル .active', 'ja');
</script>
```

### Custom Bundle Generation

Generate bundles with only the languages you need:

```bash
# Preview size estimate
node scripts/generate-bundle.mjs --estimate ja ko zh

# Generate with auto-config
node scripts/generate-bundle.mjs --auto es pt fr

# Use predefined groups
node scripts/generate-bundle.mjs --group western
```

### Browser Usage

```html
<!-- Spanish only (smallest for Spanish devs) -->
<script src="node_modules/@hyperfixi/semantic/dist/browser-es.es.global.js"></script>
<script>
  const { parse, tokenize } = HyperFixiSemanticEs;
  parse('alternar .activo', 'es');
</script>

<!-- English only (smallest for English devs) -->
<script src="node_modules/@hyperfixi/semantic/dist/browser-en.en.global.js"></script>
<script>
  const { parse, canParse } = HyperFixiSemanticEn;
</script>

<!-- Western languages (European users) -->
<script src="node_modules/@hyperfixi/semantic/dist/browser-western.western.global.js"></script>
<script>
  const { parse, canParse } = HyperFixiSemanticWestern;
</script>

<!-- East Asian languages (CJK users) -->
<script src="node_modules/@hyperfixi/semantic/dist/browser-east-asian.east-asian.global.js"></script>
<script>
  const { parse, canParse } = HyperFixiSemanticEastAsian;
</script>

<!-- Priority languages (11 most common) -->
<script src="node_modules/@hyperfixi/semantic/dist/browser-priority.priority.global.js"></script>
<script>
  const { parse, canParse } = HyperFixiSemanticPriority;
</script>

<!-- Full bundle (all 23 languages) -->
<script src="node_modules/@hyperfixi/semantic/dist/browser.global.js"></script>
<script>
  const { parse, canParse } = HyperFixiSemantic;
</script>
```

### Node.js / Bundler Usage

For tree-shakeable imports in bundlers:

```typescript
// Import specific languages for optimal tree-shaking
import '@hyperfixi/semantic/languages/en';
import '@hyperfixi/semantic/languages/ja';

import { parse } from '@hyperfixi/semantic';
```

## Usage

```typescript
import { parse, translate, canParse } from '@hyperfixi/semantic';

// Parse from any language
const node = parse('toggle .active on #button', 'en');
const nodeJa = parse('.active を 切り替え', 'ja');

// Translate between languages
const arabic = translate('toggle .active', 'en', 'ar');
// → 'بدّل .active'

// Check if input can be parsed
const result = canParse('クリックしたら 増加', 'ja');
if (result.canParse) {
  console.log('Confidence:', result.confidence);
}
```

## English Native Idioms

HyperFixi accepts multiple beginner-friendly English forms to make hyperscript easier to learn and more readable.

### Event Handler Alternatives

| Form               | Example                                    | Notes                            |
| ------------------ | ------------------------------------------ | -------------------------------- |
| Standard           | `on click toggle .active`                  | Original hyperscript             |
| When (temporal)    | `when clicked toggle .active`              | **Recommended** - most intuitive |
| When (with source) | `when clicked from #button toggle .active` | With element filter              |
| Upon (formal)      | `upon clicking toggle .active`             | Formal/technical style           |
| If (conditional)   | `if clicked toggle .active`                | Conditional framing              |

```typescript
// All parse to equivalent event handler nodes:
parse('on click toggle .active', 'en');
parse('when clicked toggle .active', 'en'); // Native idiom
parse('upon clicking toggle .active', 'en'); // Formal alternative
parse('if clicked toggle .active', 'en'); // Conditional style
```

### Command Synonyms

Alternative verbs that map to standard hyperscript commands:

| Synonym    | Maps To     | Example                     |
| ---------- | ----------- | --------------------------- |
| `flip`     | `toggle`    | `flip .active`              |
| `switch`   | `toggle`    | `switch .visible on #panel` |
| `increase` | `increment` | `increase #counter`         |
| `decrease` | `decrement` | `decrease #counter`         |
| `display`  | `show`      | `display #tooltip`          |
| `reveal`   | `show`      | `reveal #modal`             |
| `conceal`  | `hide`      | `conceal #dropdown`         |

```typescript
// These are equivalent:
parse('toggle .active', 'en');
parse('flip .active', 'en');
parse('switch .active', 'en');
```

### Natural Articles

Optional articles make code read more like natural English:

| Natural Form              | Equivalent To    |
| ------------------------- | ---------------- |
| `toggle the .active`      | `toggle .active` |
| `show the #tooltip`       | `show #tooltip`  |
| `add the .visible class`  | `add .visible`   |
| `toggle the active class` | `toggle .active` |

```typescript
// All equivalent:
parse('toggle .active', 'en');
parse('toggle the .active', 'en');
parse('toggle the active class', 'en');
```

### Temporal Expressions

Natural delay syntax as alternatives to `wait`:

| Natural Form | Equivalent To |
| ------------ | ------------- |
| `in 2s`      | `wait 2s`     |
| `in 500ms`   | `wait 500ms`  |
| `after 2s`   | `wait 2s`     |

```typescript
// These parse as wait commands:
parse('in 2s', 'en'); // action: 'wait', duration: '2s'
parse('after 500ms', 'en'); // action: 'wait', duration: '500ms'
```

### British Spelling

Common British spellings are automatically normalized:

| British      | American (normalized) |
| ------------ | --------------------- |
| `colour`     | `color`               |
| `grey`       | `gray`                |
| `centre`     | `center`              |
| `behaviour`  | `behavior`            |
| `initialise` | `initialize`          |
| `favourite`  | `favorite`            |

```typescript
// Both work identically:
parse('set colour to red', 'en');
parse('set color to red', 'en');
```

## Japanese Native Idioms

HyperFixi accepts multiple natural Japanese forms, following Nadeshiko's approach of "accepting multiple orthodox native Japanese expressions."

| Form                 | Example                              | Notes                            |
| -------------------- | ------------------------------------ | -------------------------------- |
| Standard             | `クリック で .active を 切り替え`    | Instrumental particle (で)       |
| Conditional (したら) | `クリックしたら .active を 切り替え` | Most natural - "if/when clicked" |
| Conditional (すると) | `クリックすると .active を 切り替え` | Habitual/expected outcome        |
| Conditional (すれば) | `クリックすれば .active を 切り替え` | Hypothetical condition           |
| Temporal (時に)      | `クリック時に .active を 切り替え`   | Formal - "at the time of click"  |
| Compact              | `.activeを切り替え`                  | No spaces - natural writing      |

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('クリック で 増加', 'ja'); // Standard (instrumental)
parse('クリックしたら 増加', 'ja'); // Conditional (native)
parse('クリック時に 増加', 'ja'); // Temporal (formal)

// With source filter:
parse('#button から クリックしたら 増加', 'ja');
```

### Toggle Commands

```typescript
// All parse to equivalent toggle nodes:
parse('.active を 切り替え', 'ja'); // Standard (spaced)
parse('.activeを切り替え', 'ja'); // Compact (no spaces)
parse('.active を 切り替える', 'ja'); // With verb ending (る)
parse('.active を トグルする', 'ja'); // With katakana loanword
```

### Morphological Normalization

The parser handles Japanese verb conjugations automatically:

| Conjugation        | Example        | Normalized |
| ------------------ | -------------- | ---------- |
| Dictionary         | クリックする   | クリック   |
| Conditional (たら) | クリックしたら | クリック   |
| Conditional (と)   | クリックすると | クリック   |
| Conditional (ば)   | クリックすれば | クリック   |
| て-form            | 切り替えて     | 切り替え   |
| Past               | 切り替えた     | 切り替え   |
| Polite             | 切り替えます   | 切り替え   |
| Progressive        | 切り替えている | 切り替え   |

## Korean Native Idioms

HyperFixi accepts multiple natural Korean forms, following Nadeshiko's approach.

| Form                  | Example                      | Notes                          |
| --------------------- | ---------------------------- | ------------------------------ |
| Conditional (-면)     | `클릭하면 .active 를 토글`   | **Recommended** - "if clicked" |
| Honorific (-시면)     | `클릭하시면 .active 를 토글` | Polite/formal - "if you click" |
| Temporal (-ㄹ 때)     | `클릭할때 .active 를 토글`   | "When clicking"                |
| Immediate (-자마자)   | `클릭하자마자 증가`          | "As soon as clicked"           |
| Sequential (-고 나서) | `클릭하고 나서 증가`         | "After clicking"               |
| With source           | `#button 에서 클릭하면 증가` | "When clicked from #button"    |
| Compact               | `.active를토글`              | No spaces - natural writing    |

> **Note**: The `클릭 에` pattern is intentionally omitted because `에` is ambiguous (event marker vs destination marker). Use native conditional forms `-하면` or `-할때` instead—they're more natural Korean!

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('클릭 에 증가', 'ko'); // Standard (location particle)
parse('클릭하면 증가', 'ko'); // Conditional (native)
parse('클릭할때 증가', 'ko'); // Temporal (native)

// With source filter:
parse('#button 에서 클릭하면 증가', 'ko');
```

### Toggle Commands

```typescript
// All parse to equivalent toggle nodes:
parse('.active 를 토글', 'ko'); // Standard (spaced)
parse('.active를토글', 'ko'); // Compact (no spaces)
parse('.active 를 토글하다', 'ko'); // With dictionary form
parse('.active 를 토글해요', 'ko'); // With polite ending
```

### Morphological Normalization

The parser handles Korean verb conjugations automatically:

| Conjugation         | Example    | Normalized |
| ------------------- | ---------- | ---------- |
| Dictionary (-하다)  | 클릭하다   | 클릭       |
| Conditional (-하면) | 클릭하면   | 클릭       |
| Temporal (-할때)    | 클릭할때   | 클릭       |
| Causal (-하니까)    | 클릭하니까 | 클릭       |
| Polite (-해요)      | 토글해요   | 토글       |
| Formal (-합니다)    | 토글합니다 | 토글       |
| Honorific (-하세요) | 토글하세요 | 토글       |
| Past (-했어요)      | 토글했어요 | 토글       |

## Spanish Native Idioms

HyperFixi accepts multiple natural Spanish forms.

| Form                     | Example                        | Notes                                |
| ------------------------ | ------------------------------ | ------------------------------------ |
| Native (al + infinitive) | `al hacer clic toggle .active` | **Most idiomatic** - "upon clicking" |
| Conditional (si)         | `si hace clic toggle .active`  | "If clicks"                          |
| Standard (en)            | `en clic toggle .active`       | Direct translation                   |
| Temporal (cuando)        | `cuando clic toggle .active`   | "When"                               |

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('al hacer clic aumentar', 'es'); // Native (al + infinitive)
parse('si hace clic aumentar', 'es'); // Conditional
parse('en clic aumentar', 'es'); // Standard

// With source filter:
parse('al hacer clic en #button aumentar', 'es');
```

### Toggle Commands

```typescript
// All parse to equivalent toggle nodes:
parse('toggle .active', 'es'); // English loanword
parse('cambiar .active', 'es'); // Native verb
parse('alternar .active', 'es'); // Formal alternative
```

## Chinese Native Idioms

HyperFixi accepts multiple natural Chinese forms using native temporal and aspect markers.

| Form                | Example                    | Notes             |
| ------------------- | -------------------------- | ----------------- |
| Standard (当)       | `当 点击 切换 .active`     | "When" - formal   |
| Temporal (的时候)   | `点击 的时候 切换 .active` | "At the time of"  |
| Immediate (一...就) | `一 点击 就 切换 .active`  | "As soon as"      |
| Completion (了)     | `点击 了 切换 .active`     | Perfective aspect |
| Whenever (每当)     | `每当 点击 切换 .active`   | "Whenever"        |
| Conditional (如果)  | `如果 点击 切换 .active`   | "If"              |

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('当 点击 切换 .active', 'zh'); // Standard (当)
parse('点击 的时候 切换 .active', 'zh'); // Temporal (的时候)
parse('一 点击 就 切换 .active', 'zh'); // Immediate (一...就)
parse('每当 点击 切换 .active', 'zh'); // Whenever (每当)

// With source filter:
parse('当 从 #button 点击 切换 .active', 'zh');
```

### Toggle Commands

```typescript
// All parse to equivalent toggle nodes:
parse('切换 .active', 'zh'); // Native verb
parse('把 .active 切换', 'zh'); // BA construction (把)
```

## Arabic Native Idioms

HyperFixi accepts multiple natural Arabic forms, supporting VSO word order.

| Form              | Example                             | Notes                     |
| ----------------- | ----------------------------------- | ------------------------- |
| Standard (عندما)  | `عندما نقر بدّل .active`            | "When" - formal           |
| Classical (حين)   | `حين نقر بدّل .active`              | Classical Arabic          |
| Conditional (إذا) | `إذا نقر بدّل .active`              | "If"                      |
| With source       | `عندما نقر من #button بدّل .active` | "When click from #button" |

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('عندما نقر زيادة', 'ar'); // Standard (عندما)
parse('إذا نقر زيادة', 'ar'); // Conditional (إذا)
parse('حين نقر زيادة', 'ar'); // Classical (حين)
```

### Morphological Normalization

The parser handles Arabic verb patterns and prefix stripping:

| Input  | Normalized | Notes                    |
| ------ | ---------- | ------------------------ |
| النقر  | نقر        | Article ال stripped      |
| بالنقر | نقر        | Prefix بال stripped      |
| والنقر | نقر        | Conjunction وال stripped |

## Turkish Native Idioms

HyperFixi accepts multiple natural Turkish forms with full vowel harmony support.

| Form                   | Example                        | Notes                             |
| ---------------------- | ------------------------------ | --------------------------------- |
| Conditional (-dığında) | `tıklandığında toggle .active` | **Most natural** - "when clicked" |
| Temporal (-ınca)       | `tıklayınca toggle .active`    | "When/upon"                       |
| Hypothetical (-rsa)    | `tıklarsa toggle .active`      | "If"                              |
| Simultaneous (-ken)    | `tıklarken toggle .active`     | "While"                           |
| Repetitive (-dikçe)    | `tıkladıkça toggle .active`    | "Whenever"                        |

### Vowel Harmony

All Turkish suffixes support 4-way vowel harmony + consonant softening:

| Base     | Back Unrounded | Front Unrounded | Back Rounded | Front Rounded |
| -------- | -------------- | --------------- | ------------ | ------------- |
| -dığında | -dığında       | -diğinde        | -duğunda     | -düğünde      |
| -ınca    | -ınca          | -ince           | -unca        | -ünce         |
| -dikçe   | -dıkça         | -dikçe          | -dukça       | -dükçe        |

Consonant softening (d→t after voiceless consonants): `-tığında`, `-tikçe`, etc.

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('tıklandığında artır', 'tr'); // Conditional
parse('tıklayınca artır', 'tr'); // Temporal
parse('tıklarsa artır', 'tr'); // Hypothetical

// With source filter:
parse('#button den tıklandığında artır', 'tr');
```

## Portuguese Native Idioms

HyperFixi accepts multiple natural Portuguese forms.

| Form                     | Example                                 | Notes                                |
| ------------------------ | --------------------------------------- | ------------------------------------ |
| Native (ao + infinitive) | `ao clicar alternar .active`            | **Most idiomatic** - "upon clicking" |
| Standard (quando)        | `quando clicar alternar .active`        | "When"                               |
| Conditional (se)         | `se clicar alternar .active`            | "If"                                 |
| With source              | `ao clicar em #button alternar .active` | "Upon clicking on #button"           |

### Portuguese Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('ao clicar incrementar', 'pt'); // Native (ao + infinitive)
parse('quando clicar incrementar', 'pt'); // Standard (quando)
parse('se clicar incrementar', 'pt'); // Conditional (se)

// With source filter:
parse('ao clicar em #button incrementar', 'pt');
```

### Portuguese Morphological Normalization

The parser handles Portuguese verb conjugations automatically:

| Conjugation   | Example  | Normalized |
| ------------- | -------- | ---------- |
| Infinitive    | clicar   | clica      |
| Gerund        | clicando | clica      |
| Present (3sg) | clica    | clica      |
| Past          | clicou   | clica      |
| Subjunctive   | clique   | clica      |

## Direct AST Building

The semantic package can build AST nodes directly from semantic parsing results, bypassing English text generation and re-parsing.

### The Direct Path

```text
Input (any language) → Semantic Parser → AST Builder → AST
```

Instead of the traditional path:

```text
Input → Semantic Parser → English Text → Core Parser → AST
```

### Basic AST Building

```typescript
import { parse, buildAST } from '@hyperfixi/semantic';

// Parse input to semantic node
const node = parse('#button の .active を 切り替え', 'ja');

// Build AST directly
const ast = buildAST(node);
// {
//   type: 'command',
//   name: 'toggle',
//   args: [{ type: 'selector', value: '.active' }],
//   modifiers: { on: { type: 'selector', value: '#button' } }
// }
```

### With MultilingualHyperscript (Core Package)

```typescript
import { MultilingualHyperscript } from '@hyperfixi/core';

const ml = new MultilingualHyperscript();
await ml.initialize();

// Parse directly to AST
const ast = await ml.parseToAST('#button の .active を 切り替え', 'ja');

// With detailed result
const result = await ml.parseToASTWithDetails('toggle .active', 'en');
if (result.usedDirectPath) {
  console.log('Direct AST:', result.ast);
} else if (result.fallbackText) {
  // Use fallback text with core parser
  console.log('Fallback:', result.fallbackText);
}
```

### AST Node Types

| Semantic Node           | AST Node               |
| ----------------------- | ---------------------- |
| `kind: 'command'`       | `type: 'command'`      |
| `kind: 'event-handler'` | `type: 'eventHandler'` |
| `kind: 'conditional'`   | `type: 'if'`           |
| `kind: 'compound'`      | `type: 'compound'`     |

### Command Mappers

46 commands have dedicated mappers that convert semantic roles to AST structure:

```typescript
// Semantic: toggle patient:.active destination:#button
// AST: { name: 'toggle', args: ['.active'], modifiers: { on: '#button' } }

import { getCommandMapper, registerCommandMapper } from '@hyperfixi/semantic';

// Get mapper for a command
const mapper = getCommandMapper('toggle');

// Register custom mapper
registerCommandMapper({
  action: 'myCommand',
  toAST(node, builder) {
    return { type: 'command', name: 'myCommand', args: [...] };
  }
});
```

## API Reference

### Core Functions

- `parse(input, language)` - Parse input to semantic node
- `canParse(input, language)` - Check if input can be parsed with confidence
- `translate(input, fromLang, toLang)` - Translate between languages
- `tokenize(input, language)` - Get token stream for input
- `render(node, language)` - Render semantic node to language
- `buildAST(node)` - Build AST directly from semantic node

### Supported Languages

| Code | Language   | Word Order | Tier   |
| ---- | ---------- | ---------- | ------ |
| en   | English    | SVO        | Tier 1 |
| ja   | Japanese   | SOV        | Tier 1 |
| ko   | Korean     | SOV        | Tier 1 |
| es   | Spanish    | SVO        | Tier 1 |
| zh   | Chinese    | SVO        | Tier 1 |
| ar   | Arabic     | VSO        | Tier 2 |
| tr   | Turkish    | SOV        | Tier 2 |
| de   | German     | SVO/SOV    | Tier 2 |
| fr   | French     | SVO        | Tier 2 |
| pt   | Portuguese | SVO        | Tier 2 |
| id   | Indonesian | SVO        | Tier 3 |
| qu   | Quechua    | SOV        | Tier 3 |
| sw   | Swahili    | SVO        | Tier 3 |

## Language Support Tiers

### Tier 1: Native Idiom Support (en, ja, ko, es, zh)

- Multiple natural phrasings accepted (conditional, temporal, compact forms)
- Native speaker reviewed patterns
- Comprehensive morphological normalization
- Dedicated idiom test suites (50-400+ tests per language)
- English: Event alternatives (`when`, `upon`, `if`), command synonyms, natural articles, British spelling

### Tier 2: Full Grammar Support (ar, tr, de, fr, pt)

- Complete word order transformation (SVO/SOV/VSO)
- Morphological normalization for verb conjugations
- Dictionary-based translation
- Language-specific grammar rules

### Tier 3: Functional (id, qu, sw)

- Basic parsing and translation
- Standard tokenization
- Community contributions welcome

## Language Editor

A browser-based editor for viewing and editing language profiles is available at `editor/index.html`.

```bash
# From packages/semantic/editor:
./serve.sh

# Or from project root:
npx http-server . -p 3000 -c-1
# Then open: http://127.0.0.1:3000/packages/semantic/editor/
```

Features:

- Edit keywords, role markers, references, possessive config
- View patterns per language (read-only)
- Live parse testing
- Export as TypeScript for PRs

## License

MIT
