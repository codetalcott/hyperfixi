# Semantic Parser

The semantic parser understands hyperscript in 23 languages without translating to English first.

## Using Multiple Languages in HTML

The semantic parser works automatically when you use hyperscript in different languages:

**English:**

```html
<button _="on click toggle .active on me">Toggle</button>
```

**Japanese:**

```html
<button _="クリック で 切り替え .active を 私">トグル</button>
```

**Spanish:**

```html
<button _="en clic alternar .active en yo">Alternar</button>
```

**Arabic (RTL):**

```html
<button _="عند النقر بدّل .active على أنا" dir="rtl">تبديل</button>
```

All of these work identically - the parser understands the semantic meaning regardless of language or word order.

**See also:** [Interactive Examples](/en/cookbook/) | [Multilingual Guide](/en/guide/multilingual)

## How It Works

Traditional approach:

```
Japanese input → Translate to English → Parse English → Execute
```

Semantic approach:

```
Japanese input → Parse directly → Execute
```

The semantic parser:

1. **Tokenizes** using language-specific rules
2. **Identifies semantic roles** (action, patient, destination)
3. **Builds AST** from semantic understanding
4. **Executes** directly

## Semantic Roles

The parser understands meaning through roles, not word order:

| Role            | Description                | Example                 |
| --------------- | -------------------------- | ----------------------- |
| **action**      | The command verb           | toggle, add, show       |
| **patient**     | What's being acted on      | `.active`, `#modal`     |
| **destination** | Where the action targets   | `on me`, `into #output` |
| **source**      | Where something comes from | `from #input`           |
| **instrument**  | How/with what              | `with method:'POST'`    |
| **temporal**    | When/duration              | `after 1s`, `on click`  |

This works regardless of word order:

```
English (SVO):  toggle .active on me
                action patient dest

Japanese (SOV): .active を me に 切り替え
                patient   dest   action

Arabic (VSO):   بدّل .active على me
                action patient   dest
```

## Confidence Scoring

The parser returns a confidence score (0-1):

```javascript
const result = await hyperscript.compileAsync('toggle .active', {
  language: 'en',
});

console.log(result.meta.confidence); // 0.95
```

If confidence is below threshold, it falls back to the traditional parser.

## Native Idioms

The parser accepts natural expressions in each language.

### English Idioms

```javascript
// All equivalent:
parse('on click toggle .active', 'en'); // Standard
parse('when clicked toggle .active', 'en'); // Temporal
parse('flip .active', 'en'); // Synonym
parse('toggle the active class', 'en'); // Natural article
```

| Idiom           | Standard    | Notes         |
| --------------- | ----------- | ------------- |
| `when clicked`  | `on click`  | Temporal form |
| `upon clicking` | `on click`  | Formal        |
| `flip`          | `toggle`    | Synonym       |
| `switch`        | `toggle`    | Synonym       |
| `increase`      | `increment` | Synonym       |
| `reveal`        | `show`      | Synonym       |
| `conceal`       | `hide`      | Synonym       |

### Japanese Idioms

```javascript
// All equivalent:
parse('クリック で 増加', 'ja'); // Instrumental
parse('クリックしたら 増加', 'ja'); // Conditional (native)
parse('クリック時に 増加', 'ja'); // Temporal (formal)
```

| Form         | Pattern          | Notes        |
| ------------ | ---------------- | ------------ |
| Instrumental | `クリック で`    | Standard     |
| Conditional  | `クリックしたら` | Most natural |
| Temporal     | `クリック時に`   | Formal       |

### Korean Idioms

```javascript
// All equivalent:
parse('클릭 토글 .active', 'ko'); // Standard
parse('클릭하면 .active 토글', 'ko'); // Conditional
parse('클릭하시면 .active 토글', 'ko'); // Honorific
```

### Spanish Idioms

```javascript
// All equivalent:
parse('en clic alternar .active', 'es'); // Standard
parse('al hacer clic alternar .active', 'es'); // Native form
parse('cuando clic alternar .active', 'es'); // Temporal
```

## Morphological Normalization

The parser handles verb conjugations automatically.

### Japanese

| Conjugation        | Input          | Normalized |
| ------------------ | -------------- | ---------- |
| Dictionary         | クリックする   | クリック   |
| Conditional (たら) | クリックしたら | クリック   |
| Conditional (と)   | クリックすると | クリック   |
| Conditional (ば)   | クリックすれば | クリック   |

### Korean

| Conjugation | Input      | Normalized |
| ----------- | ---------- | ---------- |
| Base        | 클릭       | 클릭       |
| Conditional | 클릭하면   | 클릭       |
| Honorific   | 클릭하시면 | 클릭       |

### Turkish

The parser handles Turkish vowel harmony and agglutination:

| Input           | Meaning      | Normalized |
| --------------- | ------------ | ---------- |
| tıklandığında   | when clicked | tıkla      |
| gösterildiğinde | when shown   | göster     |

## API Usage

### Parse

```javascript
import { parse } from '@lokascript/semantic';

const node = parse('toggle .active', 'en');
const nodeJa = parse('.active を 切り替え', 'ja');
```

### Translate

```javascript
import { translate } from '@lokascript/semantic';

const japanese = translate('toggle .active', 'en', 'ja');
// → '.active を 切り替え'

const english = translate('トグル .active', 'ja', 'en');
// → 'toggle .active'
```

### Check Parsability

```javascript
import { canParse } from '@lokascript/semantic';

const result = canParse('クリックしたら 増加', 'ja');
if (result.canParse) {
  console.log('Confidence:', result.confidence);
}
```

## Bundle Selection

Choose based on your target languages:

```javascript
// English only
import '@lokascript/semantic/dist/browser-en.en.global.js';

// Western languages
import '@lokascript/semantic/dist/browser-western.western.global.js';

// East Asian
import '@lokascript/semantic/dist/browser-east-asian.east-asian.global.js';

// All languages
import '@lokascript/semantic/dist/browser.global.js';
```

## Next Steps

- [Grammar Transformation](/en/guide/grammar) - Word order transformation
- [Multilingual Guide](/en/guide/multilingual) - Writing in your language
- [@lokascript/semantic](/en/packages/semantic) - Package reference
