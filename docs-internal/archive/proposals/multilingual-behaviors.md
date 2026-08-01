# Multilingual Behaviors: Design Proposal

**Date**: 2026-02-26
**Status**: Draft
**Author**: Claude (with William)

## Context

The `domain-*` packages use `@lokascript/framework`'s `createMultilingualDSL()` to provide parse/compile/validate/translate across 8 languages. The behaviors package has 11 behaviors with rich schemas but is English-only and has no MCP integration beyond core hyperscript tools.

**Key difference**: Domain commands are standalone pipelines (text → AST → compiled output). Behaviors are runtime registrations embedded in hyperscript — they don't produce independent compiled output.

## Goal

Enable multilingual access to behaviors at the right level of abstraction — without over-engineering a full domain DSL for something that doesn't need one.

## Proposed Approach: Level 2 — Name Aliases + MCP Integration

### What this includes

1. **Translated behavior name registry** — `install ドラッグ可能` resolves to `Draggable`
2. **MCP behavior tools** — suggest, validate, translate install commands
3. **Translated schema metadata** — descriptions, parameter docs in target languages
4. **Behavior discovery by language** — search behaviors in native language

### What this does NOT include

- Full `domain-behaviors` DSL package (overkill — no standalone compilation target)
- Grammar transformation for `install` syntax (core i18n already handles hyperscript keywords)
- Translated parameter names (low value, high confusion potential — params are code identifiers)

## Design

### 1. Behavior Name Translation Map

A static map from behavior names to translations in each supported language. Lives in the behaviors package alongside existing schemas.

```
src/i18n/
├── translations.ts        # BehaviorTranslationMap type + data
├── name-resolver.ts       # resolve(name, language?) → canonical English name
└── index.ts               # Exports
```

**translations.ts**:

```typescript
export interface BehaviorTranslation {
  name: string; // Translated behavior name
  description: string; // Translated description
  parameters: Record<string, string>; // param name → translated description
  events: Record<string, string>; // event name → translated description
}

export type BehaviorTranslationMap = Record<string, Record<string, BehaviorTranslation>>;

// Map: behaviorName → languageCode → translation
export const behaviorTranslations: BehaviorTranslationMap = {
  Draggable: {
    ja: {
      name: 'ドラッグ可能',
      description: 'ポインターイベントで要素をドラッグ可能にする',
      parameters: { dragHandle: 'ドラッグハンドル要素のCSSセレクター' },
      events: {
        'draggable:start': 'ドラッグ開始時に発火',
        'draggable:move': '移動中に発火',
        'draggable:end': 'ドラッグ終了時に発火',
      },
    },
    ko: {
      name: '드래그',
      description: '포인터 이벤트로 요소를 드래그 가능하게 만듭니다',
      parameters: { dragHandle: '드래그 핸들 요소의 CSS 선택자' },
      events: {
        /* ... */
      },
    },
    es: {
      name: 'Arrastrable',
      description: 'Hace que los elementos sean arrastrables con eventos de puntero',
      parameters: { dragHandle: 'Selector CSS para el elemento de agarre' },
      events: {
        /* ... */
      },
    },
    // ar, zh, tr, fr, de ...
  },
  FocusTrap: {
    ja: {
      name: 'フォーカストラップ',
      description: 'Tab移動を要素内に制限し、aria-modalを管理する',
      parameters: {
        active: '即座にアクティブにするかどうか',
        initialFocus: '初期フォーカス先のセレクター',
        returnFocus: '閉じた後にフォーカスを戻すかどうか',
      },
      events: {
        /* ... */
      },
    },
    // ...
  },
  // ... all 11 behaviors
};
```

**name-resolver.ts**:

```typescript
import { behaviorTranslations } from './translations';

// Reverse lookup: translated name → [canonicalName, languageCode]
const reverseMap = new Map<string, [string, string]>();

// Build reverse map on module load
for (const [canonical, langs] of Object.entries(behaviorTranslations)) {
  for (const [lang, translation] of Object.entries(langs)) {
    reverseMap.set(translation.name.toLowerCase(), [canonical, lang]);
  }
}

/**
 * Resolve a behavior name (English or translated) to its canonical English name.
 * Returns undefined if no match found.
 */
export function resolveBehaviorName(name: string): string | undefined {
  // Direct English match (case-insensitive)
  const directMatch = Object.keys(behaviorTranslations).find(
    k => k.toLowerCase() === name.toLowerCase()
  );
  if (directMatch) return directMatch;

  // Translated name lookup
  const entry = reverseMap.get(name.toLowerCase());
  return entry?.[0];
}

/**
 * Get translated behavior name for a given language.
 */
export function translateBehaviorName(
  canonicalName: string,
  targetLanguage: string
): string | undefined {
  return behaviorTranslations[canonicalName]?.[targetLanguage]?.name;
}
```

### 2. Registry Integration

The existing `BehaviorRegistry` gains alias support:

```typescript
// In registry.ts — add to existing BehaviorRegistry class

registerAlias(alias: string, canonicalName: string): void {
  this.aliases.set(alias.toLowerCase(), canonicalName);
}

// Modify getBehavior() to check aliases
getBehavior(name: string): BehaviorEntry | undefined {
  const canonical = this.aliases.get(name.toLowerCase()) ?? name;
  return this.behaviors.get(canonical);
}
```

On initialization, auto-register all translated names as aliases:

```typescript
import { behaviorTranslations } from './i18n/translations';

function registerTranslatedAliases(registry: BehaviorRegistry): void {
  for (const [canonical, langs] of Object.entries(behaviorTranslations)) {
    for (const translation of Object.values(langs)) {
      registry.registerAlias(translation.name, canonical);
    }
  }
}
```

### 3. Runtime `install` Command Integration

The `install` command in `packages/core/src/commands/behaviors/install.ts` already resolves behavior names by string lookup. With aliases registered, `install ドラッグ可能` would resolve to `Draggable` automatically — no parser changes needed.

**Requirement**: The `install` command parser must accept non-Latin identifiers. Need to verify the tokenizer handles CJK/Arabic characters as valid identifier tokens.

### 4. MCP Tools

Add 3 behavior-specific MCP tools to the MCP server:

#### `suggest_behavior`

```typescript
{
  name: 'suggest_behavior',
  description: 'Suggest the best behavior for a task description',
  parameters: {
    task: { type: 'string', description: 'What you want to do (e.g., "trap focus in a modal")' },
    language: { type: 'string', default: 'en', description: 'Response language' },
  },
  // Returns: behavior name, translated name, description, parameters, usage example
}
```

**Implementation**: Fuzzy match task description against behavior descriptions + parameter descriptions + event names. Return top 1-3 matches with install syntax examples.

#### `validate_install`

```typescript
{
  name: 'validate_install',
  description: 'Validate a behavior install command',
  parameters: {
    command: { type: 'string', description: 'e.g., "install Draggable(dragHandle: .bar)"' },
    language: { type: 'string', default: 'en' },
  },
  // Returns: { valid, errors[], behaviorName, resolvedParams, suggestions }
}
```

**Implementation**: Parse install command, resolve behavior name (including translated), validate params against schema (type, enum, unknown params).

#### `translate_install`

```typescript
{
  name: 'translate_install',
  description: 'Translate a behavior install command between languages',
  parameters: {
    command: { type: 'string', description: 'e.g., "install Draggable"' },
    from: { type: 'string' },
    to: { type: 'string' },
  },
  // Returns: translated install command
}
```

**Implementation**: Parse command → extract behavior name + params → translate behavior name → reconstruct command. Parameter names stay as-is (they're code identifiers).

#### `get_behavior_docs`

```typescript
{
  name: 'get_behavior_docs',
  description: 'Get behavior documentation in a specific language',
  parameters: {
    behavior: { type: 'string', description: 'Behavior name (English or translated)' },
    language: { type: 'string', default: 'en' },
  },
  // Returns: name, description, parameters (with descriptions), events, usage examples
}
```

### 5. Translation Data Generation

Provide a script to generate translation stubs from schemas, similar to `scripts/generate.ts`:

```bash
npm run generate:i18n --prefix packages/behaviors
```

Reads all `BehaviorSchema` entries, generates stub entries in `translations.ts` for any missing languages. Machine translation can fill initial values; human review refines them.

## Files to Create

| File                                              | Purpose                                  |
| ------------------------------------------------- | ---------------------------------------- |
| `packages/behaviors/src/i18n/translations.ts`     | Translation data for all 11 behaviors    |
| `packages/behaviors/src/i18n/name-resolver.ts`    | Name resolution (translated → canonical) |
| `packages/behaviors/src/i18n/index.ts`            | Exports                                  |
| `packages/behaviors/scripts/generate-i18n.ts`     | Translation stub generator               |
| `packages/mcp-server/src/tools/behavior-tools.ts` | 4 MCP tools                              |

## Files to Modify

| File                                 | Change                                       |
| ------------------------------------ | -------------------------------------------- |
| `packages/behaviors/src/registry.ts` | Add alias support to `BehaviorRegistry`      |
| `packages/behaviors/src/index.ts`    | Export i18n module, register aliases on init |
| `packages/behaviors/package.json`    | Add `./i18n` export                          |
| `packages/mcp-server/src/index.ts`   | Register behavior MCP tools                  |

## Languages

Start with 8 languages matching domain-\* packages:

| Code | Language | Word Order | Behavior Name Style                 |
| ---- | -------- | ---------- | ----------------------------------- |
| en   | English  | SVO        | PascalCase (Draggable)              |
| es   | Spanish  | SVO        | Spanish adjective (Arrastrable)     |
| ja   | Japanese | SOV        | Katakana/descriptive (ドラッグ可能) |
| ko   | Korean   | SOV        | Korean descriptive (드래그)         |
| ar   | Arabic   | VSO        | Arabic descriptive (قابل للسحب)     |
| zh   | Chinese  | SVO        | Chinese descriptive (可拖拽)        |
| tr   | Turkish  | SOV        | Turkish adjective (Sürüklenebilir)  |
| fr   | French   | SVO        | French adjective (Déplaçable)       |

## Open Questions

1. **Should translated names be case-sensitive?** Probably not — `resolveBehaviorName` uses `.toLowerCase()` for lookup.

2. **Should we translate event names?** (e.g., `draggable:start` → `ドラッグ:開始`). Leaning NO — event names are programmatic identifiers, not user-facing syntax. Translate event _descriptions_ only.

3. **How many languages to start with?** 8 matches domain-\* packages. Could start with 4 (en, es, ja, ko) for faster iteration.

4. **Should the MCP tools go in the main mcp-server or a separate package?** Main mcp-server is simplest — the behavior tools are lightweight and fit alongside existing domain tools.

5. **Parser support for non-Latin behavior names**: Does the core `install` command parser accept CJK characters as identifiers? If not, the parser needs a small update to recognize Unicode identifier characters after the `install` keyword.

## Estimated Scope

| Component                                     | Effort                               |
| --------------------------------------------- | ------------------------------------ |
| Translation data (11 behaviors × 8 languages) | Medium (needs native speaker review) |
| Name resolver + registry aliases              | Small                                |
| 4 MCP tools                                   | Medium                               |
| Core parser Unicode check                     | Small                                |
| Tests                                         | Medium                               |
| **Total**                                     | **~2-3 sessions**                    |

## Non-Goals

- Full `domain-behaviors` DSL package — behaviors don't have a compilation target
- Grammar transformation for install syntax — core i18n handles this
- Translated parameter names — params are code identifiers, translation adds confusion
- Translated event names — event names are programmatic, descriptions suffice
