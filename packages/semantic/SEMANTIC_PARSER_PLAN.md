# Semantic Parser: Unified Multilingual Plan

## Executive Summary

This plan consolidates two previously separate efforts:
1. **Morphological normalization** - Handle verb conjugations at tokenizer level
2. **Pattern generation** - Replace hand-crafted patterns with generated ones

Both serve the same goal: **natural multilingual hyperscript**.

## Current State

### What Works
- **7 languages** defined in `language-profiles.ts` (en, ja, ar, es, ko, zh, tr)
- **40+ command schemas** in `command-schemas.ts`
- **Pattern generator** implemented (`generateAllPatterns()`)
- **Morphological normalizers** for Japanese, Korean, Spanish, Turkish, Arabic
- **3/8 official examples** parse correctly (toggle, put)

### The Gap
- Generator exists but isn't wired to pattern registry
- Hand-crafted patterns in `toggle.ts`, `put.ts` used instead
- Keyword alternatives duplicated between profiles and normalizers

## Architecture: Single Source of Truth

### Before (Duplicated)
```
language-profiles.ts → keywords.alternatives = ['切り替える', 'トグル']
japanese-normalizer.ts → strips suffixes to get '切り替え'
toggle.ts → hand-crafted tokens with same alternatives
```

### After (Unified)
```
language-profiles.ts → keywords = { primary, alternatives, stems }
pattern-generator.ts → generates patterns from profiles
normalizers → reference profile stems for validation
```

### Key Change: Extend KeywordTranslation

```typescript
// generators/language-profiles.ts
export interface KeywordTranslation {
  readonly primary: string;           // Base form: '切り替え'
  readonly alternatives?: string[];   // Synonyms: ['トグル']
  readonly conjugations?: string[];   // Verb forms: ['切り替える', '切り替えた', '切り替えて']
  readonly normalized?: string;       // English action: 'toggle'
}
```

This eliminates duplication:
- Normalizers derive stems from `primary`
- Generator uses `alternatives` for pattern matching
- `conjugations` inform normalizer rules (no separate hardcoding)

## Implementation Phases

### Phase 1: Wire Generated Patterns (Immediate)

**Objective**: Use generator for toggle command

```typescript
// patterns/index.ts
import { generatePatternsForCommand, toggleSchema } from '../generators';
import { putPatterns } from './put';
import { eventHandlerPatterns } from './event-handler';

// Generated
const toggleGenerated = generatePatternsForCommand(toggleSchema);

// Hand-crafted (until migrated)
export const allPatterns: LanguagePattern[] = [
  ...toggleGenerated,
  ...putPatterns,
  ...eventHandlerPatterns,
];
```

**Validation**: All existing tests must pass.

### Phase 2: Extend Language Profiles

**Objective**: Single source of linguistic data

Add `conjugations` to each language profile's keywords:

```typescript
// Japanese profile
keywords: {
  toggle: {
    primary: '切り替え',
    alternatives: ['トグル'],
    conjugations: ['切り替える', '切り替えた', '切り替えて', '切り替えます'],
    normalized: 'toggle',
  },
  // ...
}
```

**Benefit**: Normalizers can be generated from profiles rather than hardcoded.

### Phase 3: Migrate Commands Incrementally

| Batch | Commands | Complexity |
|-------|----------|------------|
| 1 | toggle, add, remove | Low - validated |
| 2 | show, hide | Low |
| 3 | wait, log | Low - single arg |
| 4 | increment, decrement | Low - optional modifier |
| 5 | put, set | Medium - connectors |
| 6 | send, trigger | Medium - events |

For each command:
1. Generate patterns
2. Compare with hand-crafted
3. Run tests
4. Remove hand-crafted

### Phase 4: Derive Normalizers from Profiles

**Objective**: Normalizers read rules from profiles instead of hardcoding

```typescript
// tokenizers/morphology/japanese-normalizer.ts
export class JapaneseNormalizer implements MorphologicalNormalizer {
  constructor(private profile: LanguageProfile) {}

  normalize(word: string): NormalizationResult {
    // Check if word matches any keyword's conjugations
    for (const [action, keyword] of Object.entries(this.profile.keywords)) {
      if (keyword.conjugations?.includes(word)) {
        return { stem: keyword.primary, confidence: 0.85 };
      }
    }
    // Fall back to rule-based suffix stripping
    return this.stripSuffixes(word);
  }
}
```

**Benefit**: Adding a conjugation = editing profile only.

### Phase 5: Full Migration

Final structure:
```
generators/
├── command-schemas.ts    # What commands do
├── language-profiles.ts  # How languages express commands
├── pattern-generator.ts  # Combines schemas + profiles
└── index.ts

patterns/
├── index.ts              # Uses generateAllPatterns()
└── overrides.ts          # Edge cases only (if any)

tokenizers/
├── morphology/
│   ├── types.ts
│   ├── base-normalizer.ts    # Profile-driven base
│   ├── japanese-normalizer.ts
│   └── ...
└── ...
```

## Official Hyperscript Reference

From hyperscript.org - our validation target:

### Tier 1 (Must Work)
```hyperscript
toggle .red on me
toggle .active
add .foo to .bar
put "hello" into #output
hide me / show me
wait 1s
send foo to #target
```

### Tier 2 (Important)
```hyperscript
increment :x
log "Hello Console!"
fetch /clickedMessage
transition my *font-size to 30px
```

## Test Strategy

### Existing Tests (Keep)
- `semantic.test.ts` - Core parsing (49 tests)
- `morphology.test.ts` - Conjugation handling (136 tests)
- `generators.test.ts` - Generator unit tests (54 tests)

### New Tests (Created)
- `generated-patterns.test.ts` - Validates generator output (79 tests)
- `official-examples.test.ts` - Tracks hyperscript.org coverage (36 tests)
- `pattern-comparison.test.ts` - Generated vs hand-crafted (20 tests)

### Coverage Tracking
```
=== Official Example Coverage Report ===
Tier 1 (Core): 3/8 ✓ (toggle, put working)
Tier 2 (Important): 0/2 (increment, log pending)
```

## Success Criteria

1. **All official examples parse** in English
2. **Same AST across languages** for equivalent commands
3. **Morphological forms work**: 切り替えた, 토글해요, alternando
4. **Single source of truth**: Profiles define everything
5. **No regression**: All 360+ tests pass
6. **Maintainable**: New language = add profile only

## Files Summary

### Primary Sources (Edit These)
| File | Purpose |
|------|---------|
| `generators/language-profiles.ts` | All linguistic data |
| `generators/command-schemas.ts` | All command definitions |
| `generators/pattern-generator.ts` | Pattern creation logic |

### Generated/Derived (Don't Edit Directly)
| File | Derives From |
|------|--------------|
| `patterns/index.ts` | `generateAllPatterns()` |
| `tokenizers/morphology/*` | Profile conjugations |

### To Delete (After Migration)
- `patterns/toggle.ts`
- `patterns/put.ts`
- (Keep `event-handler.ts` if complex)

## Next Steps

1. **Immediate**: Wire toggle to use generated patterns
2. **This week**: Migrate add, remove, show, hide
3. **Next week**: Add `conjugations` to profiles
4. **Then**: Derive normalizers from profiles

## Notes

- Turkish normalizer has native speaker available for validation
- Korean tokenizer exists; Korean patterns added
- Spanish reflexive verbs (`mostrarse`) need special handling
- Bundle optimization via tree-shaking (later)
