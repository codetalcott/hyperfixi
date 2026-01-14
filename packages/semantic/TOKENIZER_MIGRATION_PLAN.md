# Tokenizer Migration Plan: Profile-Derived Keywords

## Status: All Migrations Complete ✅

This plan documents the validated approach for migrating tokenizers from hardcoded keyword maps to the profile-derived pattern.

**Completed**: All 23 tokenizers migrated (2118 semantic tests passing)

---

## Validation Summary

A comparison test was created at `test/tokenizers-profile-derived.test.ts` that:

1. Built a profile-derived Japanese tokenizer variant
2. Compared tokenization output against the original hardcoded implementation
3. Verified 100% equivalence across all test cases

### Test Results (24/24 passing)

| Category                       | Tests | Result  |
| ------------------------------ | ----- | ------- |
| Keyword coverage               | 3     | ✅ Pass |
| Basic tokenization equivalence | 6     | ✅ Pass |
| Keyword recognition            | 8     | ✅ Pass |
| Mixed script handling          | 3     | ✅ Pass |
| Particle handling              | 2     | ✅ Pass |
| Time units                     | 1     | ✅ Pass |
| Code size comparison           | 1     | ✅ Pass |

### Keyword Count Comparison

| Source                    | Count   | Notes                                                    |
| ------------------------- | ------- | -------------------------------------------------------- |
| Profile keywords          | 139     | From `japaneseProfile.keywords` (primary + alternatives) |
| Tokenizer extras          | 49      | Events, positional, idioms, time units                   |
| **Total profile-derived** | **188** | Single source of truth                                   |
| Original hardcoded        | ~185    | Scattered in tokenizer file                              |

---

## Migration Pattern

### Before (Hardcoded)

```typescript
// ~100-200 lines of keyword definitions
const JAPANESE_KEYWORDS: Map<string, string> = new Map([
  ['切り替え', 'toggle'],
  ['切り替える', 'toggle'],
  ['トグル', 'toggle'],
  // ... 180+ more entries
]);

export class JapaneseTokenizer extends BaseTokenizer {
  // Manual keyword lookups throughout
}
```

### After (Profile-Derived)

```typescript
// ~50 lines of extras only
const JAPANESE_EXTRAS: KeywordEntry[] = [
  // Literals, positional, events, idioms not in profile
  { native: 'クリック', normalized: 'click' },
  { native: '最初', normalized: 'first' },
  // ... ~50 entries
];

export class JapaneseTokenizer extends BaseTokenizer {
  constructor() {
    super();
    this.initializeKeywordsFromProfile(japaneseProfile, JAPANESE_EXTRAS);
  }
  // Keyword lookups use this.profileKeywords
}
```

---

## Tokenizers to Migrate

### Already Profile-Derived (Reference Implementations)

| Tokenizer         | Lines | Notes                                   |
| ----------------- | ----- | --------------------------------------- |
| `thai.ts`         | 236   | Original profile-derived implementation |
| `ms.ts` (Malay)   | 193   | Migrated during this session            |
| `tl.ts` (Tagalog) | 193   | Migrated during this session            |

### Priority 1: High Value ✅ COMPLETE

| Tokenizer     | Keywords | Status      |
| ------------- | -------- | ----------- |
| `japanese.ts` | 198      | ✅ Migrated |
| `korean.ts`   | 158      | ✅ Migrated |
| `english.ts`  | 147      | ✅ Migrated |
| `spanish.ts`  | 173      | ✅ Migrated |

### Priority 2: Medium Value ✅ COMPLETE

| Tokenizer       | Status      | Notes                        |
| --------------- | ----------- | ---------------------------- |
| `chinese.ts`    | ✅ Migrated | Segmentation logic preserved |
| `arabic.ts`     | ✅ Migrated | RTL + morphology preserved   |
| `turkish.ts`    | ✅ Migrated | Morphology preserved         |
| `portuguese.ts` | ✅ Migrated |                              |
| `french.ts`     | ✅ Migrated |                              |
| `german.ts`     | ✅ Migrated |                              |

### Priority 3: Lower Value ✅ COMPLETE

| Tokenizer       | Status      | Notes                     |
| --------------- | ----------- | ------------------------- |
| `indonesian.ts` | ✅ Migrated |                           |
| `quechua.ts`    | ✅ Migrated | Suffix handling preserved |
| `swahili.ts`    | ✅ Migrated |                           |

### Priority 4: Additional Languages ✅ COMPLETE

| Tokenizer       | Status      | Notes                               |
| --------------- | ----------- | ----------------------------------- |
| `italian.ts`    | ✅ Migrated | Morphological normalization kept    |
| `polish.ts`     | ✅ Migrated | Slavic language                     |
| `russian.ts`    | ✅ Migrated | Cyrillic script, multi-word phrases |
| `ukrainian.ts`  | ✅ Migrated | Cyrillic script                     |
| `vietnamese.ts` | ✅ Migrated | Tonal language, multi-word phrases  |
| `hindi.ts`      | ✅ Migrated | Devanagari script                   |
| `bengali.ts`    | ✅ Migrated | Bengali script                      |

---

## Migration Steps Per Tokenizer

1. **Create EXTRAS array** with keywords not in profile:
   - Literals: true, false, null, undefined
   - Positional: first, last, next, previous, closest, parent
   - Events: click, change, submit, input, load, scroll
   - Language-specific idioms (attached particles, etc.)

2. **Update constructor**:

   ```typescript
   constructor() {
     super();
     this.initializeKeywordsFromProfile(languageProfile, LANGUAGE_EXTRAS);
   }
   ```

3. **Replace keyword lookups** with `this.profileKeywords`:

   ```typescript
   // Before
   const normalized = HARDCODED_KEYWORDS.get(word);

   // After
   for (const entry of this.profileKeywords) {
     if (word === entry.native) return entry.normalized;
   }
   ```

4. **Update classifyToken()**:

   ```typescript
   classifyToken(token: string): TokenKind {
     for (const entry of this.profileKeywords) {
       if (token.toLowerCase() === entry.native.toLowerCase()) return 'keyword';
     }
     // ... rest unchanged
   }
   ```

5. **Remove hardcoded keyword map** (the large `Map<string, string>`)

6. **Run tests**: `npm test -- --run`

---

## Special Considerations

### Japanese/Korean (No Spaces)

These tokenizers have complex word boundary detection that must remain:

- Character classification functions (isHiragana, isKatakana, isKanji, isHangul)
- Particle handling (を, に, で / 을, 를, 에)
- Morphological normalization integration

Only the keyword map is replaced; all script-specific logic stays.

**FIXED**: Japanese `もし` (if) was incorrectly split as `も` (particle) + `し` (identifier). Fix: when at a single-char particle position, try keyword match first but only accept keywords longer than 1 character (to avoid matching role markers like `を`/`で`/`に` which are also in the profile).

### Arabic (RTL)

- Direction handling remains
- Arabic-specific character classification remains
- Only keyword map is replaced

### Chinese (Segmentation)

- Segmentation logic remains
- Character classification remains
- Only keyword map is replaced

---

## Verification Checklist

For each migrated tokenizer:

- [x] All existing tests pass (2118 tests)
- [x] Keyword recognition works for primary keywords
- [x] Keyword recognition works for alternatives
- [x] Morphological normalization still works (if applicable)
- [x] Particle handling works (if applicable)
- [x] Mixed script handling works (if applicable)
- [x] Time unit parsing works (if applicable)

---

## Benefits After Full Migration

1. **Single source of truth**: All keywords defined in language profiles
2. **Automatic propagation**: Profile changes flow to tokenizers
3. **Reduced maintenance**: ~20-50 extras per tokenizer vs ~100-150 hardcoded
4. **Consistency**: All 23 tokenizers follow same pattern
5. **Code reduction**: Estimated 2,500+ lines saved across all tokenizers

---

## Related Files

- `src/tokenizers/base.ts`: `initializeKeywordsFromProfile()` method
- `src/generators/profiles/*.ts`: Language profiles with keywords
- `test/tokenizers-profile-derived.test.ts`: Validation test
- `scripts/add-language.ts`: Updated to generate profile-derived tokenizers
