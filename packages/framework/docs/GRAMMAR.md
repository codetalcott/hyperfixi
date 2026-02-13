# Grammar Transformation Guide

Complete guide to multilingual grammar transformation in `@lokascript/framework`.

## Table of Contents

- [Overview](#overview)
- [Transformation Pipeline](#transformation-pipeline)
- [Word Order Transformation](#word-order-transformation)
- [Grammatical Markers](#grammatical-markers)
- [Special Cases](#special-cases)
- [Configuration](#configuration)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Overview

Grammar transformation enables automatic translation between languages with different:

- **Word orders** (SVO, SOV, VSO, etc.)
- **Grammatical markers** (prepositions, postpositions, particles)
- **Text directions** (LTR, RTL)
- **Morphological systems** (isolating, agglutinative, fusional)

### What Grammar Transformation Does

```typescript
// English (SVO): Verb-first
'select name from users';

// Japanese (SOV): Verb-last + postpositions
'users から name を 選択';

// Arabic (VSO): Verb-first + RTL
'اختر name من users'; // (displayed right-to-left)
```

All three represent the **same semantic meaning**, just with different surface forms.

---

## Transformation Pipeline

The framework transforms statements through five stages:

```
Input → Parse → Translate → Reorder → Insert Markers → Join → Output
```

### Stage 1: Parse

Break input into semantic roles.

```typescript
Input: "select name from users"

Parsed roles:
{
  action: "select",
  patient: "name",       // What is selected
  source: "users"        // Where from
}
```

### Stage 2: Translate

Translate keywords using dictionary.

```typescript
Dictionary lookup:
- "select" (en) → "選択" (ja)
- "from" (marker) → "から" (ja)

Translated roles:
{
  action: "選択",
  patient: "name",       // Kept (not a keyword)
  source: "users"        // Kept (not a keyword)
}
```

### Stage 3: Reorder

Rearrange roles based on target language word order.

```typescript
English order (SVO): [action, patient, source]
→ ["選択", "name", "users"]

Japanese order (SOV): [source, patient, action]
→ ["users", "name", "選択"]
```

### Stage 4: Insert Markers

Add grammatical markers (prepositions/postpositions).

```typescript
English (prepositions):
["select", "name", "from", "users"]
             ↑ marker before source

Japanese (postpositions):
["users", "から", "name", "を", "選択"]
         ↑ marker after source   ↑ marker after patient
```

### Stage 5: Join

Join tokens with proper spacing.

```typescript
English: 'select name from users';
Japanese: 'users から name を 選択';
```

---

## Word Order Transformation

### SVO → SOV (English → Japanese)

```typescript
// English (SVO)
"toggle .active on #button"

// Parse
{
  action: "toggle",
  patient: ".active",
  destination: "#button"
}

// Reorder for SOV
[destination, patient, action]
["#button", ".active", "toggle"]

// Translate + markers
["#button", "の", ".active", "を", "トグル"]

// Output (Japanese SOV)
"#button の .active を トグル"
```

### SVO → VSO (English → Arabic)

```typescript
// English (SVO)
"toggle .active on #button"

// Parse
{
  action: "toggle",
  patient: ".active",
  destination: "#button"
}

// Reorder for VSO
[action, patient, destination]
["toggle", ".active", "#button"]

// Translate + markers
["بدّل", ".active", "على", "#button"]

// Output (Arabic VSO)
"بدّل .active على #button"
```

### SOV → SVO (Japanese → English)

```typescript
// Japanese (SOV)
"#button の .active を トグル"

// Parse
{
  destination: "#button",
  patient: ".active",
  action: "トグル"
}

// Reorder for SVO
[action, patient, destination]
["トグル", ".active", "#button"]

// Translate + markers
["toggle", ".active", "on", "#button"]

// Output (English SVO)
"toggle .active on #button"
```

---

## Grammatical Markers

### Prepositions (Before nouns)

Used in SVO languages (English, Spanish, Arabic).

```typescript
const englishMarkers = [
  { form: 'from', role: 'source', position: 'preposition', required: true },
  { form: 'to', role: 'destination', position: 'preposition', required: true },
  { form: 'on', role: 'destination', position: 'preposition', required: true },
];

// Result
"select name from users"
            ↑ preposition
```

### Postpositions (After nouns)

Used in SOV languages (Japanese, Korean, Turkish).

```typescript
const japaneseMarkers = [
  { form: 'から', role: 'source', position: 'postposition', required: true },
  { form: 'に', role: 'destination', position: 'postposition', required: true },
  { form: 'を', role: 'patient', position: 'postposition', required: true },
];

// Result
"users から name を 選択"
      ↑ postposition   ↑ postposition
```

### No Markers (Isolating languages)

Some languages (Chinese) rely on word order without markers.

```typescript
const chineseMarkers = [
  { form: '从', role: 'source', position: 'preposition', required: false },
  // Optional markers for emphasis
];

// Result (markers optional)
('选择 name 从 users');
or;
('从 users 选择 name');
```

### Marker Alternatives (Vowel harmony, etc.)

```typescript
const koreanMarkers = [
  {
    form: '을',
    role: 'patient',
    position: 'postposition',
    required: true,
    alternatives: ['를'], // Vowel harmony: 을/를
  },
];

// Usage
('사용자를 선택'); // After vowel
('이름을 선택'); // After consonant
```

---

## Special Cases

### Agglutinative Languages

Languages like Turkish and Quechua attach markers directly to words.

```typescript
// Turkish suffix attachment
const turkishMarkers = [
  { form: '-den', role: 'source', position: 'postposition' },   // Suffix
  { form: '-e', role: 'destination', position: 'postposition' },
];

// Join with joinTokens() - recognizes '-' prefix/suffix markers
["users", "-den"] → "usersden"
["home", "-e"] → "homee"
```

**joinTokens() handles agglutination:**

```typescript
// Suffix (starts with -)
[' users', '-den'] → 'usersden'  // No space before suffix

// Prefix (ends with -)
['بـ-', 'الماوس'] → 'بـالماوس'    // No space after prefix

// Normal tokens
['value', 'を'] → 'value を'      // Regular space
```

### RTL Languages

Arabic and Hebrew require special handling.

```typescript
const arabicProfile: LanguageProfile = {
  code: 'ar',
  direction: 'rtl', // Right-to-left
  wordOrder: 'VSO',
  adpositionType: 'preposition',
  markers: [
    { form: 'من', role: 'source', position: 'preposition' },
    { form: 'إلى', role: 'destination', position: 'preposition' },
  ],
  canonicalOrder: ['action', 'patient', 'destination', 'source'],
};

// Output (displayed RTL)
('اختر name من users');
// Visual: users من name اختر (right to left)
```

**Note:** The framework produces the text in logical order - the browser/UI handles RTL display.

### Free Word Order

Languages like Latin and Russian allow flexible word order.

```typescript
const latinProfile: LanguageProfile = {
  code: 'la',
  wordOrder: 'free', // Any order valid
  // Framework uses canonical order as default
  canonicalOrder: ['action', 'patient', 'source', 'destination'],
};
```

---

## Configuration

### Complete Profile Example

```typescript
import type { LanguageProfile } from '@lokascript/framework/grammar';

const spanishProfile: LanguageProfile = {
  code: 'es',
  name: 'Español',
  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  markers: [
    { form: 'de', role: 'source', position: 'preposition', required: true },
    { form: 'a', role: 'destination', position: 'preposition', required: true },
    { form: 'hacia', role: 'destination', position: 'preposition', required: false },
    { form: 'donde', role: 'condition', position: 'preposition', required: true },
  ],

  canonicalOrder: [
    'action',
    'patient',
    'source',
    'destination',
    'condition',
    'quantity',
    'duration',
  ],
};
```

### Using GrammarTransformer

```typescript
import {
  GrammarTransformer,
  InMemoryDictionary,
  InMemoryProfileProvider,
} from '@lokascript/framework';

// Create dictionary
const dictionary = new InMemoryDictionary({
  en: { select: 'select', toggle: 'toggle' },
  es: { select: 'seleccionar', toggle: 'alternar' },
  ja: { select: '選択', toggle: 'トグル' },
});

// Create profile provider
const profileProvider = new InMemoryProfileProvider({
  en: englishProfile,
  es: spanishProfile,
  ja: japaneseProfile,
});

// Create transformer
const transformer = new GrammarTransformer({
  dictionary,
  profileProvider,
});

// Transform
const spanish = transformer.transform('select name from users', 'en', 'es');
// → "seleccionar name de users"

const japanese = transformer.transform('select name from users', 'en', 'ja');
// → "users から name を 選択"
```

---

## Examples

### Example 1: SQL DSL (English → Spanish → Japanese)

```typescript
// English (SVO)
'select name from users where active';

// Spanish (SVO)
'seleccionar name de users donde active';

// Japanese (SOV)
'active で users から name を 選択';
```

**Transformation steps (English → Japanese):**

```typescript
// 1. Parse
{
  action: "select",
  patient: "name",
  source: "users",
  condition: "active"
}

// 2. Translate
{
  action: "選択",
  patient: "name",
  source: "users",
  condition: "active"
}

// 3. Reorder (SOV)
[condition, source, patient, action]

// 4. Insert markers
["active", "で", "users", "から", "name", "を", "選択"]

// 5. Join
"active で users から name を 選択"
```

### Example 2: Animation DSL (English → Korean)

```typescript
// English (SVO)
'fade #modal over 300ms';

// Korean (SOV)
'#modal 을 300ms 동안 페이드';
```

**Transformation:**

```typescript
// Parse
{
  action: "fade",
  patient: "#modal",
  duration: "300ms"
}

// Translate
{
  action: "페이드",
  patient: "#modal",
  duration: "300ms"
}

// Reorder for SOV
[patient, duration, action]

// Insert markers
["#modal", "을", "300ms", "동안", "페이드"]

// Join
"#modal 을 300ms 동안 페이드"
```

### Example 3: Complex Statement (English → Turkish)

```typescript
// English (SVO)
'move item from #source to #destination with animation';

// Turkish (SOV + agglutinative)
'#source dan #destination e item i animasyon ile taşı';
```

**Transformation:**

```typescript
// Parse
{
  action: "move",
  patient: "item",
  source: "#source",
  destination: "#destination",
  style: "animation"
}

// Turkish order (SOV)
[source, destination, patient, style, action]

// With markers (postpositions + suffixes)
["#source", "-dan", "#destination", "-e", "item", "-i", "animasyon", "ile", "taşı"]

// Join (agglutinative)
"#sourcedan #destinatione itemi animasyon ile taşı"
```

---

## Troubleshooting

### Problem: Word order doesn't match native language

**Cause:** Incorrect `canonicalOrder` in profile.

**Solution:** Check that role order matches native speaker intuition.

```typescript
// Wrong (Japanese)
canonicalOrder: ['action', 'patient', 'source']; // ❌ Verb-first is wrong for SOV

// Correct (Japanese)
canonicalOrder: ['source', 'patient', 'action']; // ✅ Verb-last
```

### Problem: Markers in wrong position

**Cause:** Incorrect `adpositionType`.

**Solution:** Check if language uses prepositions or postpositions.

```typescript
// Wrong (Japanese)
adpositionType: 'preposition'; // ❌ Would produce "から users"

// Correct (Japanese)
adpositionType: 'postposition'; // ✅ Produces "users から"
```

### Problem: Missing spaces or extra spaces

**Cause:** Agglutinative suffixes not marked correctly.

**Solution:** Use `-` prefix/suffix markers for attached morphemes.

```typescript
// Wrong
markers: [{ form: 'den', position: 'postposition' }];
// → "users den" (space before suffix)

// Correct
markers: [{ form: '-den', position: 'postposition' }];
// → "usersden" (no space)
```

### Problem: Keywords not translating

**Cause:** Missing dictionary entries.

**Solution:** Add translations for all command keywords.

```typescript
const dictionary = new InMemoryDictionary({
  en: { select: 'select', insert: 'insert' },
  es: { select: 'seleccionar', insert: 'insertar' },
  //  ❌ Missing 'delete', 'update'
});

// Fix: Add all keywords
const dictionary = new InMemoryDictionary({
  en: { select: 'select', insert: 'insert', delete: 'delete', update: 'update' },
  es: { select: 'seleccionar', insert: 'insertar', delete: 'eliminar', update: 'actualizar' },
});
```

### Problem: RTL text displays wrong

**Cause:** Frontend not handling RTL correctly.

**Solution:** Set `dir="rtl"` on HTML elements for RTL languages.

```html
<!-- Arabic output -->
<div dir="rtl" lang="ar">اختر name من users</div>
```

---

## Advanced Topics

### Custom Parsing

For complex DSLs, provide custom parsing logic:

```typescript
class AdvancedTransformer extends GrammarTransformer {
  protected parseStatement(input: string, language: string, profile: LanguageProfile) {
    // Custom parsing logic
    const roles = new Map();
    // ... your parsing
    return roles;
  }
}
```

### Grammar Rules

Add special transformation rules for specific patterns:

```typescript
const japaneseProfile: LanguageProfile = {
  // ... other config
  rules: [
    {
      name: 'event-handler',
      description: 'Transform event handlers with special word order',
      match: {
        requiredRoles: ['event', 'action'],
      },
      transform: {
        roleOrder: ['event', 'patient', 'action'], // Special order for events
      },
      priority: 10,
    },
  ],
};
```

### Morphological Normalization

Handle inflected forms:

```typescript
class ArabicDictionary implements Dictionary {
  lookup(word: string, language: string): string | undefined {
    // Remove Arabic prefixes/suffixes
    const stem = this.stemArabicWord(word);
    return this.translations[language]?.[stem];
  }

  private stemArabicWord(word: string): string {
    // Remove prefixes: ال, ب, ل, و
    let stem = word.replace(/^(ال|ب|ل|و)/, '');
    // Remove suffixes: ة, ي, ون
    stem = stem.replace(/(ة|ي|ون)$/, '');
    return stem;
  }
}
```

### Dependency Injection

Inject custom components:

```typescript
const transformer = new GrammarTransformer({
  dictionary: new DatabaseDictionary(db), // From database
  profileProvider: new CloudProfileProvider(api), // From API
});
```

---

## Performance Tips

1. **Cache profiles** - Don't recreate profiles on every transformation
2. **Batch translations** - Translate multiple statements at once
3. **Lazy loading** - Load language profiles on demand
4. **Memoization** - Cache transformed results for common inputs

```typescript
// Cache transformer instance
const transformer = new GrammarTransformer(config);

// Reuse for multiple transformations
const results = inputs.map(input => transformer.transform(input, 'en', 'ja'));
```

---

## See Also

- [API Reference](./API.md) - Complete API documentation
- [Language Profiles](./LANGUAGE_PROFILES.md) - Creating language profiles
- [Extractor Guide](./EXTRACTORS.md) - Custom value extraction
- [Examples](../examples/) - Real DSL examples
