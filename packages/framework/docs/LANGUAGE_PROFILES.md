# Language Profiles Guide

This guide explains how to add new languages to your multilingual DSL using language profiles.

## Table of Contents

- [Overview](#overview)
- [Linguistic Concepts](#linguistic-concepts)
- [Profile Types](#profile-types)
- [Pattern Generation Profiles](#pattern-generation-profiles)
- [Grammar Transformation Profiles](#grammar-transformation-profiles)
- [Complete Examples](#complete-examples)
- [Step-by-Step Guide](#step-by-step-guide)
- [Language Family Reference](#language-family-reference)

---

## Overview

Language profiles capture the essential typological features of a language so the framework can:

1. **Generate patterns** - Automatically create language-specific patterns from command schemas
2. **Transform grammar** - Translate between languages with correct word order and markers
3. **Tokenize correctly** - Handle language-specific character classification and morphology

There are two types of profiles:

- **PatternGenLanguageProfile** - For pattern generation (required)
- **LanguageProfile** - For grammar transformation (optional)

---

## Linguistic Concepts

### Word Order

Word order describes the default arrangement of Subject (S), Verb (V), and Object (O) in a sentence.

| Order    | Languages                         | Example            |
| -------- | --------------------------------- | ------------------ |
| **SVO**  | English, Chinese, Spanish, French | "I **eat** apples" |
| **SOV**  | Japanese, Korean, Turkish, Hindi  | "I apples **eat**" |
| **VSO**  | Arabic, Irish, Filipino           | "**Eat** I apples" |
| **VOS**  | Malagasy, Fijian                  | "**Eat** apples I" |
| **OVS**  | Hixkaryana (rare)                 | "Apples **eat** I" |
| **OSV**  | Warao (rare)                      | "Apples I **eat**" |
| **free** | Latin, Russian (flexible)         | Any order valid    |

**In DSL commands:**

```typescript
// SVO (English): verb-first
'toggle .active on #button';

// SOV (Japanese): verb-last
'#button の .active を トグル';

// VSO (Arabic): verb-first, different order
'بدّل .active على #button';
```

### Adposition Type

Where grammatical markers appear relative to their noun.

| Type               | Position   | Languages        | Example               |
| ------------------ | ---------- | ---------------- | --------------------- |
| **preposition**    | Before     | English, Spanish | "**from** source"     |
| **postposition**   | After      | Japanese, Korean | "source **から**"     |
| **circumposition** | Both sides | German (some)    | "**von** ... **aus**" |
| **none**           | Not used   | Chinese (mostly) | Word order only       |

### Morphology Type

How words are constructed and inflected.

| Type              | Description                       | Languages                 | Example                        |
| ----------------- | --------------------------------- | ------------------------- | ------------------------------ |
| **isolating**     | No inflection, word order matters | Chinese, Vietnamese       | 我 吃 苹果                     |
| **agglutinative** | Morphemes stack predictably       | Turkish, Japanese, Korean | evler**im**den (house-my-from) |
| **fusional**      | Morphemes blend together          | Spanish, Arabic, Russian  | comí (ate, irregular)          |
| **polysynthetic** | Complex words encode sentences    | Quechua, Inuit            | Single word = full sentence    |

### Text Direction

- **ltr** (left-to-right) - Most languages
- **rtl** (right-to-left) - Arabic, Hebrew, Persian, Urdu

---

## Profile Types

### PatternGenLanguageProfile

Minimal profile for pattern generation.

```typescript
interface PatternGenLanguageProfile {
  readonly code: string; // ISO 639-1 language code
  readonly wordOrder: WordOrder; // Word order type
  readonly keywords: Record<
    string,
    {
      primary: string; // Main translation
      alternatives?: string[]; // Alternative spellings
    }
  >;
  readonly roleMarkers?: Record<
    string,
    {
      primary: string; // Main marker (e.g., 'from')
      alternatives?: string[]; // Alternative forms
      position?: 'before' | 'after'; // Marker position
    }
  >;
}
```

**Purpose:** Generate patterns for parsing DSL commands.

---

### LanguageProfile (Grammar Transformation)

Complete profile for grammar transformation.

```typescript
interface LanguageProfile {
  code: string; // ISO 639-1 code
  name: string; // Native name
  wordOrder: WordOrder; // Word order
  adpositionType: AdpositionType; // Marker position
  morphology: MorphologyType; // Morphology type
  direction: 'ltr' | 'rtl'; // Text direction
  markers: GrammaticalMarker[]; // Grammatical markers
  canonicalOrder: SemanticRole[]; // Role ordering
  rules?: GrammarRule[]; // Special transformation rules
}
```

**Purpose:** Transform commands between languages.

---

## Pattern Generation Profiles

### Creating a Pattern Profile

```typescript
const englishPatternProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',

  // Keyword translations
  keywords: {
    select: { primary: 'select', alternatives: ['query'] },
    insert: { primary: 'insert', alternatives: ['add', 'create'] },
    update: { primary: 'update', alternatives: ['modify', 'change'] },
    delete: { primary: 'delete', alternatives: ['remove', 'drop'] },
  },

  // Role markers
  roleMarkers: {
    source: { primary: 'from', position: 'before' },
    destination: { primary: 'to', alternatives: ['into'], position: 'before' },
    condition: { primary: 'where', position: 'before' },
    quantity: { primary: 'limit', position: 'before' },
  },
};
```

### Example: Japanese (SOV)

```typescript
const japanesePatternProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',

  keywords: {
    select: { primary: '選択', alternatives: ['セレクト'] },
    insert: { primary: '挿入', alternatives: ['インサート'] },
    update: { primary: '更新', alternatives: ['アップデート'] },
    delete: { primary: '削除', alternatives: ['デリート'] },
  },

  roleMarkers: {
    source: { primary: 'から', position: 'after' }, // Postposition
    destination: { primary: 'に', position: 'after' }, // Postposition
    patient: { primary: 'を', position: 'after' }, // Object marker
  },
};
```

### Example: Spanish (SVO)

```typescript
const spanishPatternProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',

  keywords: {
    select: { primary: 'seleccionar', alternatives: ['consultar'] },
    insert: { primary: 'insertar', alternatives: ['agregar'] },
    update: { primary: 'actualizar', alternatives: ['modificar'] },
    delete: { primary: 'eliminar', alternatives: ['borrar'] },
  },

  roleMarkers: {
    source: { primary: 'de', position: 'before' }, // Preposition
    destination: { primary: 'a', alternatives: ['hacia'], position: 'before' },
    condition: { primary: 'donde', position: 'before' },
  },
};
```

### Example: Arabic (VSO, RTL)

```typescript
const arabicPatternProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',

  keywords: {
    select: { primary: 'اختر', alternatives: ['حدد'] },
    insert: { primary: 'أدخل' },
    update: { primary: 'حدّث' },
    delete: { primary: 'احذف' },
  },

  roleMarkers: {
    source: { primary: 'من', position: 'before' },
    destination: { primary: 'إلى', position: 'before' },
    condition: { primary: 'حيث', position: 'before' },
  },
};
```

---

## Grammar Transformation Profiles

Full profiles for translating between languages.

### Creating a Grammar Profile

```typescript
const englishGrammarProfile: LanguageProfile = {
  code: 'en',
  name: 'English',
  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'isolating',
  direction: 'ltr',

  // Grammatical markers for each role
  markers: [
    { form: 'from', role: 'source', position: 'preposition', required: true },
    { form: 'to', role: 'destination', position: 'preposition', required: true },
    { form: 'into', role: 'destination', position: 'preposition', required: false },
    { form: 'where', role: 'condition', position: 'preposition', required: true },
    { form: 'by', role: 'quantity', position: 'preposition', required: false },
  ],

  // Canonical role order for English
  canonicalOrder: ['action', 'patient', 'source', 'destination', 'condition', 'quantity'],
};
```

### Example: Japanese (SOV, Agglutinative)

```typescript
const japaneseGrammarProfile: LanguageProfile = {
  code: 'ja',
  name: '日本語',
  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  markers: [
    { form: 'を', role: 'patient', position: 'postposition', required: true },
    { form: 'から', role: 'source', position: 'postposition', required: true },
    { form: 'に', role: 'destination', position: 'postposition', required: true },
    { form: 'の', role: 'possessive', position: 'postposition', required: false },
  ],

  // Japanese order: patient first, action last
  canonicalOrder: ['patient', 'source', 'destination', 'condition', 'quantity', 'action'],
};
```

### Example: Korean (SOV, Agglutinative)

```typescript
const koreanGrammarProfile: LanguageProfile = {
  code: 'ko',
  name: '한국어',
  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  markers: [
    { form: '을', role: 'patient', position: 'postposition', required: true, alternatives: ['를'] }, // Vowel harmony
    { form: '에서', role: 'source', position: 'postposition', required: true },
    { form: '에', role: 'destination', position: 'postposition', required: true },
    { form: '의', role: 'possessive', position: 'postposition', required: false },
  ],

  canonicalOrder: ['patient', 'source', 'destination', 'action'],
};
```

---

## Complete Examples

### SQL DSL - English + Spanish

```typescript
import { createMultilingualDSL } from '@lokascript/framework';

// Define schemas
const selectSchema = {
  action: 'select',
  description: 'Select data from source',
  primaryRole: 'columns',
  category: 'data',
  roles: [
    {
      role: 'columns',
      description: 'Columns to select',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
    },
    {
      role: 'source',
      description: 'Data source',
      required: true,
      expectedTypes: ['literal'],
      svoPosition: 2,
      markerOverride: { en: 'from', es: 'de' },
    },
  ],
};

// Create English profile
const englishProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: {
    select: { primary: 'select' },
  },
  roleMarkers: {
    source: { primary: 'from' },
  },
};

// Create Spanish profile
const spanishProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    select: { primary: 'seleccionar' },
  },
  roleMarkers: {
    source: { primary: 'de' },
  },
};

// Create DSL
const sqlDSL = createMultilingualDSL({
  name: 'SQL',
  schemas: [selectSchema],
  languages: [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      tokenizer: englishTokenizer,
      patternProfile: englishProfile,
    },
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      tokenizer: spanishTokenizer,
      patternProfile: spanishProfile,
    },
  ],
});

// Use both languages
sqlDSL.parse('select name from users', 'en');
sqlDSL.parse('seleccionar name de users', 'es');
```

---

## Step-by-Step Guide

### Step 1: Identify Language Features

Before creating a profile, identify these features:

1. **Word order** - Where does the verb go? (SVO, SOV, VSO, etc.)
2. **Markers** - Prepositions or postpositions? Which ones?
3. **Direction** - Left-to-right or right-to-left?
4. **Morphology** - How are words formed?

**Example: Turkish**

- Word order: SOV
- Markers: Postpositions (agglutinative suffixes)
- Direction: LTR
- Morphology: Agglutinative

### Step 2: Create Keyword Translations

Translate all your DSL commands to the target language.

```typescript
const keywords = {
  select: { primary: 'seç' },
  insert: { primary: 'ekle' },
  update: { primary: 'güncelle' },
  delete: { primary: 'sil' },
};
```

### Step 3: Define Role Markers

Map semantic roles to their grammatical markers.

```typescript
const roleMarkers = {
  source: { primary: 'den', alternatives: ['dan'], position: 'after' }, // Vowel harmony
  destination: { primary: 'e', alternatives: ['a'], position: 'after' },
  patient: { primary: 'i', alternatives: ['ı', 'u', 'ü'], position: 'after' },
};
```

### Step 4: Create Pattern Profile

```typescript
const turkishProfile: PatternGenLanguageProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  keywords,
  roleMarkers,
};
```

### Step 5: Create Tokenizer

```typescript
import { BaseTokenizer } from '@lokascript/framework/core/tokenization';

class TurkishTokenizer extends BaseTokenizer {
  constructor() {
    super({
      language: 'tr',
      direction: 'ltr',
      keywords: Object.fromEntries(Object.entries(keywords).map(([k, v]) => [k, v.primary])),
    });
  }

  protected isWordChar(char: string): boolean {
    return /[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(char);
  }

  protected normalizeWord(word: string): string {
    return word.toLowerCase();
  }
}
```

### Step 6: Add to DSL Config

```typescript
const dsl = createMultilingualDSL({
  schemas: [...],
  languages: [
    // ... other languages
    {
      code: 'tr',
      name: 'Turkish',
      nativeName: 'Türkçe',
      tokenizer: new TurkishTokenizer(),
      patternProfile: turkishProfile,
      grammarProfile: turkishGrammarProfile,  // Optional
    },
  ],
});
```

### Step 7: Test

```typescript
// Test parsing
const node = dsl.parse('users den name i seç', 'tr');
console.log(node);

// Test translation
const english = dsl.translate('users den name i seç', 'tr', 'en');
// → "select name from users"
```

---

## Language Family Reference

### Romance Languages (SVO, Prepositions)

**Spanish, French, Portuguese, Italian, Romanian**

Common features:

- Word order: SVO
- Adpositions: Prepositions
- Morphology: Fusional
- Direction: LTR

```typescript
const spanishProfile = {
  code: 'es',
  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',
};
```

---

### Germanic Languages (SVO, Prepositions)

**English, German, Dutch, Swedish, Norwegian**

Common features:

- Word order: SVO (German: V2 in main clauses)
- Adpositions: Prepositions
- Morphology: Isolating (English) to Fusional (German)
- Direction: LTR

```typescript
const germanProfile = {
  code: 'de',
  wordOrder: 'SVO', // Simplified (V2 rule complex)
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',
};
```

---

### East Asian Languages

**Japanese (SOV, Postpositions)**

```typescript
const japaneseProfile = {
  code: 'ja',
  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',
  roleMarkers: {
    patient: { primary: 'を', position: 'after' },
    source: { primary: 'から', position: 'after' },
    destination: { primary: 'に', position: 'after' },
  },
};
```

**Korean (SOV, Postpositions)**

```typescript
const koreanProfile = {
  code: 'ko',
  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',
  roleMarkers: {
    patient: { primary: '을', alternatives: ['를'], position: 'after' },
    source: { primary: '에서', position: 'after' },
    destination: { primary: '에', position: 'after' },
  },
};
```

**Chinese (SVO, No markers)**

```typescript
const chineseProfile = {
  code: 'zh',
  wordOrder: 'SVO',
  adpositionType: 'preposition', // 从, 到
  morphology: 'isolating',
  direction: 'ltr',
  roleMarkers: {
    source: { primary: '从', position: 'before' },
    destination: { primary: '到', position: 'before' },
  },
};
```

---

### Semitic Languages (VSO, RTL)

**Arabic, Hebrew**

```typescript
const arabicProfile = {
  code: 'ar',
  wordOrder: 'VSO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'rtl',
  roleMarkers: {
    source: { primary: 'من', position: 'before' },
    destination: { primary: 'إلى', position: 'before' },
  },
};

const hebrewProfile = {
  code: 'he',
  wordOrder: 'SVO', // Modern Hebrew often SVO
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'rtl',
  roleMarkers: {
    source: { primary: 'מ', alternatives: ['מן'], position: 'before' },
    destination: { primary: 'ל', alternatives: ['אל'], position: 'before' },
  },
};
```

---

### Turkic Languages (SOV, Agglutinative)

**Turkish, Azerbaijani, Kazakh, Uzbek**

```typescript
const turkishProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',
  roleMarkers: {
    source: { primary: 'den', alternatives: ['dan'], position: 'after' },
    destination: { primary: 'e', alternatives: ['a'], position: 'after' },
  },
};
```

---

### Indo-Aryan Languages

**Hindi (SOV, Postpositions)**

```typescript
const hindiProfile = {
  code: 'hi',
  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'fusional',
  direction: 'ltr',
  roleMarkers: {
    source: { primary: 'से', position: 'after' },
    destination: { primary: 'को', position: 'after' },
    patient: { primary: 'को', position: 'after' },
  },
};
```

---

## Tips and Best Practices

### 1. Start with Native Speaker Input

Work with native speakers to ensure:

- Natural keyword translations
- Correct marker usage
- Proper word order for your domain

### 2. Handle Morphological Variations

For languages with rich morphology (Turkish, Arabic), provide alternatives:

```typescript
roleMarkers: {
  source: {
    primary: 'den',
    alternatives: ['dan'],  // Vowel harmony
  },
}
```

### 3. Test with Real Examples

Create a comprehensive test suite:

```typescript
describe('Turkish DSL', () => {
  it('parses select statements', () => {
    const node = dsl.parse('users den name i seç', 'tr');
    expect(node.action).toBe('select');
  });

  it('translates to English', () => {
    const english = dsl.translate('users den name i seç', 'tr', 'en');
    expect(english).toBe('select name from users');
  });
});
```

### 4. Document Cultural Conventions

Add notes about language-specific conventions:

```typescript
const profile = {
  code: 'ja',
  wordOrder: 'SOV',
  notes: 'Japanese prefers verb-final order. Particles (を、に、から) are mandatory.',
};
```

### 5. Support Multiple Scripts

For languages with multiple scripts (e.g., Serbian: Cyrillic + Latin):

```typescript
const serbianCyrillicProfile = { code: 'sr-Cyrl', ... };
const serbianLatinProfile = { code: 'sr-Latn', ... };
```

---

## See Also

- [API Reference](./API.md) - Complete API documentation
- [Grammar Transformation](./GRAMMAR.md) - Deep dive into grammar transformation
- [Extractor Guide](./EXTRACTORS.md) - Custom value extraction
- [Examples](../examples/) - Real DSL examples
