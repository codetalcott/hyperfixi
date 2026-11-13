# @lokascript/semantic

Semantic-first multilingual parser for LokaScript. Parses hyperscript-like syntax from 24 languages into a language-agnostic semantic representation.

It is also the translator: `translate(code, from, to)` (or `render(parse(code, from), to)`) writes code in any of the 24 languages. That used to be `@lokascript/i18n`'s job; its grammar transformer was retired in favor of this package on 2026-08-28, and i18n now provides vocabulary only.

## Features

- **24 Languages**: Arabic, Bengali, Chinese, English, French, German, Hebrew, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Spanish, Swahili, Thai, Tagalog, Turkish, Ukrainian, Vietnamese
- **Semantic Roles**: Language-agnostic intermediate representation (patient, destination, source, etc.)
- **Confidence Scoring**: Graceful degradation with scored parse results
- **Morphological Normalization**: Handles verb conjugations in agglutinative languages

## Installation

```bash
npm install @lokascript/semantic
```

## Bundle Selection Guide

Choose the right bundle for your use case. All bundles are minified IIFE for direct browser usage.

### Bundle Matrix

Sizes are gzipped (bytes / 1024), measured locally on 2026-11-13 at 7.6.0 (`gzip -9`, macOS). Most of every bundle is the shared parser: `browser-core.core.global.js`, with no language registered, is ~112 KB. Every bundle is also exported by path: `@lokascript/semantic/browser` (all 24) and `@lokascript/semantic/browser/<name>` (e.g. `/browser/es`, `/browser/priority`).

#### Tier 1: Single Language (~129-138 KB gzip)

| Bundle                    | Global                 | Size    | Languages |
| ------------------------- | ---------------------- | ------- | --------- |
| `browser-en.en.global.js` | `LokaScriptSemanticEn` | ~129 KB | en        |
| `browser-es.es.global.js` | `LokaScriptSemanticEs` | ~136 KB | es        |
| `browser-ja.ja.global.js` | `LokaScriptSemanticJa` | ~135 KB | ja        |
| `browser-ar.ar.global.js` | `LokaScriptSemanticAr` | ~137 KB | ar        |
| `browser-ko.ko.global.js` | `LokaScriptSemanticKo` | ~136 KB | ko        |
| `browser-zh.zh.global.js` | `LokaScriptSemanticZh` | ~136 KB | zh        |
| `browser-tr.tr.global.js` | `LokaScriptSemanticTr` | ~136 KB | tr        |
| `browser-pt.pt.global.js` | `LokaScriptSemanticPt` | ~135 KB | pt        |
| `browser-fr.fr.global.js` | `LokaScriptSemanticFr` | ~135 KB | fr        |
| `browser-de.de.global.js` | `LokaScriptSemanticDe` | ~135 KB | de        |
| `browser-id.id.global.js` | `LokaScriptSemanticId` | ~133 KB | id        |
| `browser-qu.qu.global.js` | `LokaScriptSemanticQu` | ~135 KB | qu        |
| `browser-sw.sw.global.js` | `LokaScriptSemanticSw` | ~133 KB | sw        |
| `browser-bn.bn.global.js` | `LokaScriptSemanticBn` | ~136 KB | bn        |
| `browser-hi.hi.global.js` | `LokaScriptSemanticHi` | ~136 KB | hi        |
| `browser-it.it.global.js` | `LokaScriptSemanticIt` | ~136 KB | it        |
| `browser-ms.ms.global.js` | `LokaScriptSemanticMs` | ~132 KB | ms        |
| `browser-pl.pl.global.js` | `LokaScriptSemanticPl` | ~135 KB | pl        |
| `browser-ru.ru.global.js` | `LokaScriptSemanticRu` | ~137 KB | ru        |
| `browser-th.th.global.js` | `LokaScriptSemanticTh` | ~134 KB | th        |
| `browser-tl.tl.global.js` | `LokaScriptSemanticTl` | ~134 KB | tl        |
| `browser-uk.uk.global.js` | `LokaScriptSemanticUk` | ~138 KB | uk        |
| `browser-vi.vi.global.js` | `LokaScriptSemanticVi` | ~135 KB | vi        |

Hebrew (`he`) has no single-language browser bundle; use the full or lazy bundle, or the ESM import `@lokascript/semantic/languages/he`.

#### Tier 2-5: Multi-Language Bundles

| Bundle                                    | Global                        | Size    | Languages                                                |
| ----------------------------------------- | ----------------------------- | ------- | -------------------------------------------------------- |
| `browser-es-en.es-en.global.js`           | `LokaScriptSemanticEsEn`      | ~136 KB | en, es                                                   |
| `browser-en-tr.en-tr.global.js`           | `LokaScriptSemanticEnTr`      | ~136 KB | en, tr                                                   |
| `browser-western.western.global.js`       | `LokaScriptSemanticWestern`   | ~151 KB | en, es, pt, fr, de, it                                   |
| `browser-east-asian.east-asian.global.js` | `LokaScriptSemanticEastAsian` | ~147 KB | ja, zh, ko                                               |
| `browser-priority.priority.global.js`     | `LokaScriptSemanticPriority`  | ~180 KB | 11 languages: en, es, pt, fr, de, ja, zh, ko, ar, tr, id |
| `browser.global.js`                       | `LokaScriptSemantic`          | ~297 KB | All 24                                                   |
| `browser-lazy.lazy.global.js`             | `LokaScriptSemanticLazy`      | ~208 KB | On-demand                                                |
| `browser-core.core.global.js`             | `LokaScriptSemanticCore`      | ~112 KB | None (load languages by URL)                             |

### Lazy Loading

The lazy bundle registers no languages until you call `loadLanguage()`. It is an IIFE, so it still carries every language's code (~208 KB gzipped): it defers registration, not download. For the smallest download, pick a single-language or regional bundle.

```html
<script src="node_modules/@lokascript/semantic/dist/browser-lazy.lazy.global.js"></script>
<script>
  const { loadLanguage, parse } = LokaScriptSemanticLazy;

  (async () => {
    // Load languages on demand
    await loadLanguage('en');
    await loadLanguage('ja');

    // Now parsing works for loaded languages
    parse('toggle .active', 'en');
    parse('トグル .active', 'ja');
  })();
</script>
```

### Custom Bundle Generation

Generate bundles with only the languages you need (from a checkout of this repository, in `packages/semantic`; the script is not in the published package):

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
<script src="node_modules/@lokascript/semantic/dist/browser-es.es.global.js"></script>
<script>
  const { parse, tokenize } = LokaScriptSemanticEs;
  parse('alternar .activo', 'es');
</script>

<!-- English only (smallest for English devs) -->
<script src="node_modules/@lokascript/semantic/dist/browser-en.en.global.js"></script>
<script>
  const { parse, canParse } = LokaScriptSemanticEn;
</script>

<!-- Western languages (European users) -->
<script src="node_modules/@lokascript/semantic/dist/browser-western.western.global.js"></script>
<script>
  const { parse, canParse } = LokaScriptSemanticWestern;
</script>

<!-- East Asian languages (CJK users) -->
<script src="node_modules/@lokascript/semantic/dist/browser-east-asian.east-asian.global.js"></script>
<script>
  const { parse, canParse } = LokaScriptSemanticEastAsian;
</script>

<!-- Priority languages (11 most common) -->
<script src="node_modules/@lokascript/semantic/dist/browser-priority.priority.global.js"></script>
<script>
  const { parse, canParse } = LokaScriptSemanticPriority;
</script>

<!-- Full bundle (all 24 languages) -->
<script src="node_modules/@lokascript/semantic/dist/browser.global.js"></script>
<script>
  const { parse, canParse } = LokaScriptSemantic;
</script>
```

### Node.js / Bundler Usage

For tree-shakeable imports in bundlers:

```typescript
// Import specific languages for optimal tree-shaking
import '@lokascript/semantic/languages/en';
import '@lokascript/semantic/languages/ja';

import { parse } from '@lokascript/semantic';
```

## Usage

```typescript
import { parse, translate, canParse, LossyTranslationError } from '@lokascript/semantic';

// Parse from any language
const node = parse('toggle .active on #button', 'en');
const nodeJa = parse('.active を 切り替え', 'ja');

// Translate between languages
const arabic = translate('toggle .active', 'en', 'ar');
// → 'بدّل .active'

// A translation that would lose part of the script is refused, not truncated:
// it throws a LossyTranslationError (`partial`: what it would have returned;
// `loss.lost`: what it drops). `{ lossy: 'allow' }` returns the partial output.
try {
  translate('toggle .a .b', 'en', 'es'); // the parse reads `toggle .a` only
} catch (e) {
  if (e instanceof LossyTranslationError) console.log(e.loss.lost); // ['.b']
}

// Check if input can be parsed (returns a boolean)
if (canParse('クリック で #count を 増加', 'ja')) {
  console.log('parses');
}
```

## English Native Idioms

LokaScript accepts multiple beginner-friendly English forms to make hyperscript easier to learn and more readable.

### Event Handler Alternatives

| Form          | Example                     | Notes                  |
| ------------- | --------------------------- | ---------------------- |
| Standard      | `on click toggle .active`   | Original hyperscript   |
| Upon (formal) | `upon click toggle .active` | Formal/technical style |

```typescript
// All parse to equivalent event handler nodes:
parse('on click toggle .active', 'en');
parse('upon click toggle .active', 'en'); // Formal alternative
```

`if clicked toggle .active` parses as an `if` command (a conditional on a variable named
`clicked`), not as an event handler.

> **`when` is not an event-handler alias.** In \_hyperscript `when` is the reactive
> observer — `when <expr> [or <expr>]* changes … end` re-runs its body whenever a
> watched expression's value changes — and the trailing command guard
> (`show .x when <cond>`). `when clicked toggle .active` is rejected, exactly as
> the reference engine rejects it ("Cannot watch local variable 'click'"). The
> reactive form parses and renders in all 24 languages.

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

The tokenizer normalizes common British spellings (the token keeps its text and records the
American form as `normalized`):

| British      | American (normalized) |
| ------------ | --------------------- |
| `colour`     | `color`               |
| `grey`       | `gray`                |
| `centre`     | `center`              |
| `behaviour`  | `behavior`            |
| `initialise` | `initialize`          |
| `favourite`  | `favorite`            |

## Japanese Native Idioms

LokaScript accepts multiple natural Japanese forms, following Nadeshiko's approach of "accepting multiple orthodox native Japanese expressions."

| Form     | Example                           | Notes                       |
| -------- | --------------------------------- | --------------------------- |
| Standard | `クリック で .active を 切り替え` | Instrumental particle (で)  |
| Compact  | `.activeを切り替え`               | No spaces - natural writing |

The conditional and temporal event forms (`クリックしたら`, `クリックすると`, `クリックすれば`,
`クリック時に`) are tokenized and normalized (below) but do not parse as event handlers today.

### Event Handlers

```typescript
parse('クリック で #count を 増加', 'ja'); // on click increment #count

// With source filter:
parse('#button から クリック で #count を 増加', 'ja'); // on click from #button increment #count
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

The tokenizer's morphological normalizer reduces Japanese verb conjugations to their stem:

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

LokaScript accepts multiple natural Korean forms, following Nadeshiko's approach.

| Form                | Example                       | Notes                          |
| ------------------- | ----------------------------- | ------------------------------ |
| Conditional (-면)   | `클릭하면 .active 를 토글`    | **Recommended** - "if clicked" |
| Honorific (-시면)   | `클릭하시면 .active 를 토글`  | Polite/formal - "if you click" |
| Temporal (-ㄹ 때)   | `클릭할때 .active 를 토글`    | "When clicking"                |
| Immediate (-자마자) | `클릭하자마자 #count 를 증가` | "As soon as clicked"           |
| Compact             | `.active를토글`               | No spaces - natural writing    |

> **Note**: The `클릭 에` pattern is intentionally omitted because `에` is ambiguous (event marker vs destination marker). Use native conditional forms `-하면` or `-할때` instead—they're more natural Korean!

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('클릭하면 #count 를 증가', 'ko'); // Conditional (native)
parse('클릭할때 #count 를 증가', 'ko'); // Temporal (native)
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

The tokenizer's morphological normalizer reduces Korean verb conjugations to their stem:

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

LokaScript accepts multiple natural Spanish forms.

| Form                     | Example                                    | Notes                                |
| ------------------------ | ------------------------------------------ | ------------------------------------ |
| Native (al + infinitive) | `al hacer clic toggle .active`             | **Most idiomatic** - "upon clicking" |
| Standard (en)            | `en clic toggle .active`                   | Direct translation                   |
| Temporal (cuando)        | `cuando clic toggle .active`               | "When"                               |
| With source              | `al hacer clic de #button aumentar #count` | "Upon clicking from #button"         |

`si hace clic …` parses as an `if` command, not as an event handler.

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('al hacer clic aumentar #count', 'es'); // Native (al + infinitive)
parse('en clic aumentar #count', 'es'); // Standard

// With source filter:
parse('al hacer clic de #button aumentar #count', 'es');
```

### Toggle Commands

```typescript
// All parse to equivalent toggle nodes:
parse('toggle .active', 'es'); // English loanword
parse('cambiar .active', 'es'); // Native verb
parse('alternar .active', 'es'); // Formal alternative
```

## Chinese Native Idioms

LokaScript accepts multiple natural Chinese forms using native temporal and aspect markers.

| Form                | Example                   | Notes             |
| ------------------- | ------------------------- | ----------------- |
| Standard (当)       | `当 点击 切换 .active`    | "When" - formal   |
| Immediate (一...就) | `一 点击 就 切换 .active` | "As soon as"      |
| Completion (了)     | `点击 了 切换 .active`    | Perfective aspect |

`如果 点击 …` parses as an `if` command. `点击 的时候 …` and `每当 点击 …` do not parse today.

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('当 点击 切换 .active', 'zh'); // Standard (当)
parse('一 点击 就 切换 .active', 'zh'); // Immediate (一...就)

// With source filter:
parse('当 点击 从 #button 切换 .active', 'zh');
```

### Toggle Commands

```typescript
// All parse to equivalent toggle nodes:
parse('切换 .active', 'zh'); // Native verb
parse('把 .active 切换', 'zh'); // BA construction (把)
```

## Arabic Native Idioms

LokaScript accepts multiple natural Arabic forms, supporting VSO word order.

| Form             | Example                             | Notes                     |
| ---------------- | ----------------------------------- | ------------------------- |
| Standard (عندما) | `عندما نقر بدّل .active`            | "When" - formal           |
| Classical (حين)  | `حين نقر بدّل .active`              | Classical Arabic          |
| With source      | `عندما نقر من #button بدّل .active` | "When click from #button" |

### Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('عندما نقر زِد #count', 'ar'); // Standard (عندما)
parse('حين نقر زِد #count', 'ar'); // Classical (حين)
```

`إذا نقر …` parses as an `if` command, not as an event handler.

### Morphological Normalization

The tokenizer's morphological normalizer strips Arabic prefixes:

| Input  | Normalized | Notes                    |
| ------ | ---------- | ------------------------ |
| النقر  | نقر        | Article ال stripped      |
| بالنقر | نقر        | Prefix بال stripped      |
| والنقر | نقر        | Conjunction وال stripped |

## Turkish Native Idioms

| Form               | Example                                | Notes                   |
| ------------------ | -------------------------------------- | ----------------------- |
| Locative (-da/-de) | `tıklamada .active i değiştir`         | "On click"              |
| With source        | `#button den tıklamada #count i artır` | "On click from #button" |

The converb forms (`tıklandığında`, `tıklayınca`, `tıklarsa`, `tıklarken`, `tıkladıkça`) do not
parse as event handlers today.

### Event Handlers

```typescript
parse('tıklamada #count i artır', 'tr'); // on click increment #count

// With source filter:
parse('#button den tıklamada #count i artır', 'tr');
```

## Portuguese Native Idioms

LokaScript accepts multiple natural Portuguese forms.

| Form                     | Example                                 | Notes                                |
| ------------------------ | --------------------------------------- | ------------------------------------ |
| Native (ao + infinitive) | `ao clicar alternar .active`            | **Most idiomatic** - "upon clicking" |
| Standard (quando)        | `quando clicar alternar .active`        | "When"                               |
| With source              | `ao clicar de #button alternar .active` | "Upon clicking from #button"         |

`se clicar …` parses as an `if` command, not as an event handler.

### Portuguese Event Handlers

```typescript
// All parse to equivalent event handler nodes:
parse('ao clicar incrementar #count', 'pt'); // Native (ao + infinitive)
parse('quando clicar incrementar #count', 'pt'); // Standard (quando)

// With source filter:
parse('ao clicar de #button alternar .active', 'pt');
```

### Portuguese Morphological Normalization

The tokenizer's morphological normalizer reduces Portuguese verb conjugations to the infinitive:

| Conjugation   | Example  | Normalized |
| ------------- | -------- | ---------- |
| Infinitive    | clicar   | clicar     |
| Gerund        | clicando | clicar     |
| Present (3sg) | clica    | clicar     |
| Past          | clicou   | clicar     |

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
import { parse, buildAST } from '@lokascript/semantic';

// Parse input to semantic node
const node = parse('#button の .active を 切り替え', 'ja');

// Build AST directly: buildAST returns { ast, warnings }
const { ast, warnings } = buildAST(node);
// ast (positions and `semanticRoles` omitted):
// {
//   type: 'command',
//   name: 'toggle',
//   args: [{ type: 'selector', value: '.active', selector: '.active', selectorType: 'class' }],
//   modifiers: { on: { type: 'selector', value: '#button', selector: '#button', selectorType: 'id' } }
// }
```

### Through `@hyperfixi/core/multilingual`

Core's multilingual entry is three functions over this package, on text —
`parse`, `render` and `translate`:

```typescript
import { parse, render } from '@hyperfixi/core/multilingual';

const node = await parse('#button の .active を 切り替え', 'ja');
const english = node && (await render(node, 'en')); // hyperscript any host reads
```

(Its `MultilingualHyperscript` class, whose `parseToAST` went through `buildAST` to
core's AST, was removed in the 4.0 cycle, and `schemaRoleInferrer` with core's own engine.)

### AST Node Types

| Semantic Node           | AST Node                             |
| ----------------------- | ------------------------------------ |
| `kind: 'command'`       | `type: 'command'`                    |
| `kind: 'event-handler'` | `type: 'eventHandler'`               |
| `kind: 'conditional'`   | `type: 'command'` (`name: 'if'`)     |
| `kind: 'loop'`          | `type: 'command'` (`name: 'repeat'`) |
| `kind: 'compound'`      | `type: 'CommandSequence'`            |

### Command Mappers

A command's AST shape comes from its schema's declarative `ast` descriptor; a few commands
(`wait`, `put`, `go`, `pick`) have a registered mapper that overrides it:

```typescript
// Semantic: toggle patient:.active destination:#button
// AST: { name: 'toggle', args: ['.active'], modifiers: { on: '#button' } }

import {
  getCommandMapper,
  resolveCommandMapper,
  registerCommandMapper,
} from '@lokascript/semantic';

// The mapper the AST builder applies (registered, else from the schema)
const mapper = resolveCommandMapper('toggle');

// Only an explicitly registered mapper
getCommandMapper('wait'); // a mapper
getCommandMapper('toggle'); // undefined

// Register custom mapper
registerCommandMapper({
  action: 'myCommand',
  toAST(node, builder) {
    return { type: 'command', name: 'myCommand', args: [] };
  },
});
```

## API Reference

### Core Functions

- `parse(input, language)` - Parse input to semantic node
- `canParse(input, language)` - Whether input can be parsed (boolean)
- `translate(input, fromLang, toLang, options?)` - Translate between languages; throws `LossyTranslationError` when the translation would lose part of the script (`{ lossy: 'allow' }` returns it anyway)
- `tokenize(input, language)` - Get token stream for input
- `render(node, language)` - Render semantic node to language
- `buildAST(node)` - Build AST directly from semantic node; returns `{ ast, warnings }`

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
| de   | German     | SVO        | Tier 2 |
| fr   | French     | SVO        | Tier 2 |
| pt   | Portuguese | SVO        | Tier 2 |
| id   | Indonesian | SVO        | Tier 3 |
| qu   | Quechua    | SOV        | Tier 3 |
| sw   | Swahili    | SVO        | Tier 3 |
| bn   | Bengali    | SOV        | —      |
| he   | Hebrew     | SVO        | —      |
| hi   | Hindi      | SOV        | —      |
| it   | Italian    | SVO        | —      |
| ms   | Malay      | SVO        | —      |
| pl   | Polish     | SVO        | —      |
| ru   | Russian    | SVO        | —      |
| th   | Thai       | SVO        | —      |
| tl   | Tagalog    | VSO        | —      |
| uk   | Ukrainian  | SVO        | —      |
| vi   | Vietnamese | SVO        | —      |

## Language Support Tiers

The tiers predate 11 of the 24 languages (bn, he, hi, it, ms, pl, ru, th, tl, uk, vi), which are left untiered. All 24 parse every one of the 157 patterns in the multilingual test corpus faithfully (committed baseline, 2026-09-25).

### Tier 1: Native Idiom Support (en, ja, ko, es, zh)

- Alternative phrasings accepted where the sections above list them
- Idiom patterns are approximations; most have not been reviewed by native speakers
- Morphological normalization (ja, ko)
- English: `upon`, command synonyms, natural articles, British spelling

### Tier 2: Full Grammar Support (ar, tr, de, fr, pt)

- Word order transformation (SVO/SOV/VSO)
- Morphological normalization (ar, de, fr, pt, tr)

### Tier 3: Functional (id, qu, sw)

- Basic parsing and translation
- Standard tokenization
- Community contributions welcome

## Language Editor

A browser-based editor for viewing and editing language profiles is available at `editor/index.html`.

```bash
# In a checkout of this repository (the editor is not in the published package).
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
