# Semantic Parsing Validation & Morphological Handling

**Date**: 2025-12-12
**Status**: Investigation/Proposal

## Overview

This document analyzes the current semantic parsing architecture's ability to provide natural native-language code, with specific focus on morphological handling (conjugation, declension, inflection) across supported languages.

## Current Architecture

### Parser Output: AST (Not JavaScript)

The core parser outputs an **Abstract Syntax Tree (AST)**, which is then interpreted by the runtime. This is important for semantic parsing validation because all language inputs must produce functionally equivalent AST nodes.

```
Source Code → Tokenizer → Parser → AST Nodes → Runtime (interpreted)
```

Key AST node types:
- `CommandNode`: name, args, modifiers, body
- `EventHandlerNode`: event, body (commands)
- `ExpressionNode`: selector, literal, identifier, binary, etc.

### Semantic Parsing Flow

The semantic package provides an alternative parsing path:

```
Native Input → Language Tokenizer → Pattern Matcher → Semantic Roles → AST Node
```

For example:
```
English:   "toggle .active on #button"     ─┐
Japanese:  "#button の .active を 切り替え"  ├─► CommandNode { name: "toggle", ... }
Arabic:    "بدّل .active على #button"      ─┘
```

## Current Morphological Handling

### 1. Tokenizer-Level Normalization

Each language tokenizer maintains a keyword map that normalizes variants to canonical English:

**Arabic** (`packages/semantic/src/tokenizers/arabic.ts`):
```typescript
const ARABIC_KEYWORDS: Map<string, string> = new Map([
  ['بدّل', 'toggle'],   // with shadda (gemination mark)
  ['بدل', 'toggle'],    // without shadda
  ['غيّر', 'toggle'],   // synonym (change)
  ['غير', 'toggle'],    // variant spelling
  ['أضف', 'add'],       // formal (with hamza)
  ['اضف', 'add'],       // informal (without hamza)
  // ...
]);
```

**Japanese** (`packages/semantic/src/tokenizers/japanese.ts`):
```typescript
const JAPANESE_KEYWORDS: Map<string, string> = new Map([
  ['切り替え', 'toggle'],     // noun/stem form
  ['切り替える', 'toggle'],   // dictionary form (infinitive)
  ['トグル', 'toggle'],       // katakana loanword
  ['トグルする', 'toggle'],   // する-verb form
  // ...
]);
```

### 2. Token Normalization Field

Tokens carry a `normalized` field used by the pattern matcher:

```typescript
// pattern-matcher.ts:231-243
private tokenMatches(token: LanguageToken, value: string): boolean {
  if (token.value === value) return true;
  if (token.normalized === value) return true;  // ← Handles variants
  // ...
}
```

### 3. Language Profile Alternatives

Language profiles define keyword alternatives:

```typescript
// language-profiles.ts - Japanese
keywords: {
  toggle: {
    primary: '切り替え',
    alternatives: ['切り替える', 'トグル', 'トグルする'],
    normalized: 'toggle'
  },
  // ...
}
```

### 4. KeywordResolver Interface (Core Parser)

The traditional parser accepts a `KeywordResolver` for translation:

```typescript
interface KeywordResolver {
  resolve(token: string): string | undefined;
  isCommand(token: string): boolean;
  isKeyword(token: string): boolean;
}
```

## Identified Gaps

### Gap 1: Root-Pattern Morphology (Arabic)

Arabic uses triliteral consonant roots with vowel patterns. Current system lists variants explicitly but has no stemming capability.

**Example**: Root ب-د-ل (b-d-l = change/substitute)
```
├── بَدَّلَ (baddala) - he changed (past)        ← NOT in map
├── يُبَدِّل (yubaddil) - he changes (present)   ← NOT in map
├── بَدِّل (baddil) - change! (imperative)       ← Listed ✓
├── تَبْدِيل (tabdīl) - changing (verbal noun)   ← NOT in map
└── مُبَدَّل (mubaddal) - changed (participle)   ← NOT in map
```

**Impact**: Users writing in different tenses or using verbal nouns won't be recognized.

### Gap 2: Agglutinative Suffixes (Turkish, Korean)

Turkish and Korean build words by stacking suffixes. Profile defines markers but no stripping logic exists.

**Example**: Turkish verb with suffixes
```
değiştir-i-yor-um  (I am changing it)
│        │  │  └── 1st person singular
│        │  └───── present continuous
│        └──────── accusative (it)
└───────────────── change (root)
```

**Impact**: Only bare stems are recognized; conjugated forms fail to parse.

### Gap 3: Verb Conjugation Tables

Language profiles define `verb.suffixes` but these aren't used for matching:

```typescript
// Japanese profile
verb: {
  position: 'end',
  suffixes: ['る', 'て', 'た', 'ます', 'ない'],  // Defined but unused
  subjectDrop: true,
}
```

### Gap 4: Compound Words / Sandhi

No handling for:
- Japanese て-form verb compounds (食べてみる)
- Arabic prefix attachments (بِـ + word)
- Korean particle + verb fusions

### Gap 5: No Equivalent Keywords

Some languages may not have natural equivalents to English keywords. For example:
- "toggle" is a fairly technical term without direct translations in many languages
- Some languages use circumlocutions or borrowed words

## Proposed Solutions

### Option A: Expand Explicit Variants (Quick Win)

Add more forms to keyword maps. Simple but doesn't scale.

**Pros**: No new code, immediate improvement
**Cons**: Combinatorial explosion, can't cover all forms

**Recommendation**: Do this as immediate improvement while building better solutions.

### Option B: Lightweight Stemmer per Language

Add optional `stem(word): string` function to tokenizers:

```typescript
interface LanguageTokenizer {
  tokenize(input: string): TokenStream;
  stem?(word: string): string;  // Optional stemmer
}

// Example: Arabic stemmer (simplified)
class ArabicTokenizer {
  stem(word: string): string {
    // Remove common prefixes: ال (al-), و (wa-), ف (fa-), ب (bi-), ل (li-), ك (ka-)
    word = word.replace(/^(ال|و|ف|ب|ل|ك)/, '');

    // Remove common suffixes: ة (taa marbuta), ات (plural), ين/ون (masculine plural)
    word = word.replace(/(ة|ات|ين|ون)$/, '');

    // Attempt root extraction (simplified - real Arabic morphology is complex)
    return this.extractRoot(word);
  }
}
```

**Pros**: Handles unseen forms, language-appropriate
**Cons**: Requires linguistic expertise, may over-stem

### Option C: Morphological Analyzer Libraries

Integrate existing NLP libraries:

| Language | Library Options |
|----------|----------------|
| Arabic | `aramorph`, `qalsadi`, `camel-tools` |
| Japanese | `kuromoji`, `mecab`, `sudachi` |
| Korean | `KoNLPy`, `Mecab-ko` |
| Turkish | `TRmorph`, `zemberek` |

**Pros**: Production-quality analysis, handles edge cases
**Cons**: Bundle size, external dependencies, WASM compilation needed for browser

### Option D: Fuzzy Matching with Confidence

Use edit distance for approximate matching:

```typescript
matchToken(token: LanguageToken, pattern: string): MatchResult {
  // Exact match
  if (token.value === pattern || token.normalized === pattern) {
    return { match: pattern, confidence: 1.0 };
  }

  // Fuzzy match with Levenshtein distance
  const distance = levenshtein(token.value, pattern);
  const maxLen = Math.max(token.value.length, pattern.length);
  const similarity = 1 - (distance / maxLen);

  if (similarity > 0.7) {
    return { match: pattern, confidence: similarity };
  }

  return null;
}
```

**Pros**: Handles typos and minor variations
**Cons**: May match unintended words, needs tuning per language

### Option E: Synonym/Concept Mapping

Define semantic concepts that map to multiple surface forms:

```typescript
const TOGGLE_CONCEPT = {
  en: ['toggle', 'switch', 'flip'],
  ja: ['切り替え', '切り替える', 'トグル', '変える', '変更'],
  ar: ['بدّل', 'غيّر', 'حوّل', 'قلب'],
  es: ['alternar', 'cambiar', 'conmutar'],
};

// Pattern matching uses concepts, not literal strings
template: {
  tokens: [
    { type: 'concept', concept: 'TOGGLE' },  // Matches any form
    { type: 'role', role: 'patient' },
  ]
}
```

**Pros**: Semantically accurate, extensible
**Cons**: Requires concept ontology, more complex matching

## Validation Strategy

### Tier 1: Parsing Coverage

Test that basic forms parse in all languages:

```typescript
describe('Parsing Coverage', () => {
  const CORE_COMMANDS = ['toggle', 'add', 'remove', 'set', 'show', 'hide'];
  const LANGUAGES = ['en', 'ja', 'ar', 'es', 'ko', 'zh', 'tr'];

  CORE_COMMANDS.forEach(cmd => {
    LANGUAGES.forEach(lang => {
      it(`parses ${cmd} in ${lang}`, () => {
        const nativeForm = getNativeForm(cmd, lang);
        expect(canParse(nativeForm, lang)).toBe(true);
      });
    });
  });
});
```

### Tier 2: AST Equivalence

Verify that different language inputs produce equivalent ASTs:

```typescript
describe('AST Equivalence', () => {
  it('English and Japanese toggle produce same AST', () => {
    const englishAST = parse('toggle .active on #button', 'en');
    const japaneseAST = parse('#button の .active を 切り替え', 'ja');

    expect(normalizeAST(japaneseAST)).toEqual(normalizeAST(englishAST));
  });
});
```

### Tier 3: Morphological Variant Coverage

Test common verb forms and inflections:

```typescript
describe('Morphological Variants', () => {
  const arabicToggleForms = [
    'بَدِّل',      // imperative (expected to work)
    'يُبَدِّل',    // present (may not work)
    'بَدَّلَ',     // past (may not work)
    'التَبْدِيل',  // verbal noun (may not work)
  ];

  arabicToggleForms.forEach(form => {
    it(`recognizes Arabic form: ${form}`, () => {
      const tokens = tokenize(form, 'ar');
      expect(tokens[0]?.normalized).toBe('toggle');
    });
  });
});
```

### Tier 4: Round-Trip Fidelity

Test translation preserves meaning:

```typescript
describe('Round-Trip', () => {
  it('English → Japanese → English preserves semantics', () => {
    const original = 'toggle .active on #button';
    const japanese = translate(original, 'en', 'ja');
    const backToEnglish = translate(japanese, 'ja', 'en');

    // Parse both and compare ASTs
    const originalAST = parse(original, 'en');
    const roundTrippedAST = parse(backToEnglish, 'en');

    expect(normalizeAST(roundTrippedAST)).toEqual(normalizeAST(originalAST));
  });
});
```

### Tier 5: Native Speaker Validation (Manual)

Survey native speakers with pairs of forms:

```
For Japanese speakers:
Q: Which feels more natural for "toggle a class on click"?

A) クリック で .active を トグル
B) クリック で .active を 切り替え
C) クリック したら .active を 切り替える
D) Other: _______________

Rate naturalness (1-5): ___
```

## Recommendations

### Immediate Actions

1. **Expand keyword maps** with common verb forms for each language
2. **Add validation tests** for morphological coverage
3. **Document known limitations** for each language

### Short-Term (1-2 weeks)

1. **Implement basic stemming** for Arabic (prefix/suffix stripping)
2. **Add verb conjugation** patterns for Japanese (る→て→た forms)
3. **Create concept mapping** for core commands

### Medium-Term (1-2 months)

1. **Evaluate WASM morphological analyzers** for browser use
2. **Build comprehensive test suite** with native speaker input
3. **Add confidence scoring** to pattern matching

### Long-Term

1. **Machine learning approach** for unknown forms
2. **Community-contributed** keyword dictionaries
3. **IDE integration** with autocomplete for native forms

## Conclusion

The current semantic parsing architecture provides a solid foundation for multilingual hyperscript. The tokenizer normalization and pattern matching system can handle many common cases. However, significant gaps exist in morphological handling that limit naturalness for languages with rich inflection systems.

The recommended approach is:
1. **Immediate**: Expand explicit variants (low effort, immediate benefit)
2. **Short-term**: Add lightweight stemming per language
3. **Long-term**: Integrate proper morphological analysis

The key validation question remains: **Does semantic parsing enable expression that keyword-replacement i18n cannot?** The answer should be "yes" if we can show that native word order and grammatical markers produce code that native speakers find significantly more natural than simple keyword substitution.
