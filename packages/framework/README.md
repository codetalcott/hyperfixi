# @lokascript/framework

> **Generic framework for building multilingual domain-specific languages (DSLs)**

Build DSLs that work in many human languages (grammars for 24 ship in `@lokascript/framework/languages`) with semantic parsing, pattern generation, and grammar transformation.

## Features

- **🌍 Multilingual**: Grammars for 24 languages (English, Japanese, Spanish, Arabic, etc.); you supply your DSL's vocabulary
- **🧠 Semantic Parsing**: Parse natural language commands into language-neutral semantic representations
- **🔄 Grammar Transformation**: Automatically handle word order (SVO/SOV/VSO) and grammatical markers
- **📦 One Dependency**: Pure TypeScript; the only runtime dependency is `@lokascript/intent`
- **🎯 Type-Safe**: Full TypeScript support with generic types
- **🔌 Extensible**: Custom roles, value types, and transformation rules

## Installation

```bash
npm install @lokascript/framework
```

## Quick Start

```typescript
import {
  createMultilingualDSL,
  defineCommand,
  defineRole,
  createSimpleTokenizer,
} from '@lokascript/framework';

// Define your DSL's commands
const selectCommand = defineCommand({
  action: 'select',
  primaryRole: 'columns',
  roles: [
    defineRole({ role: 'columns', required: true, expectedTypes: ['expression'], svoPosition: 2 }),
    defineRole({ role: 'source', required: true, expectedTypes: ['expression'], svoPosition: 1 }),
  ],
});

// Create your DSL instance
const sqlDSL = createMultilingualDSL({
  name: 'SQL',
  schemas: [selectCommand],
  languages: [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      tokenizer: createSimpleTokenizer({ language: 'en', keywords: ['select', 'from'] }),
      patternProfile: {
        code: 'en',
        wordOrder: 'SVO',
        keywords: { select: { primary: 'select' } },
        roleMarkers: { source: { primary: 'from', position: 'before' } },
      },
    },
  ],
});

// Use your DSL
const node = sqlDSL.parse('select name from users', 'en');
// node.action → 'select'
// node.roles  → Map { 'columns' => { type: 'expression', raw: 'name' },
//                     'source'  => { type: 'expression', raw: 'users' } }
```

## Core Concepts

### Semantic Roles

Commands are represented as **semantic roles** rather than positional arguments:

```typescript
// Traditional (positional)
command('toggle', '.active', '#button');

// Semantic (role-based)
{
  action: 'toggle',
  roles: {
    patient: '.active',      // What is being acted upon
    destination: '#button'   // Where it's being toggled
  }
}
```

This enables:

- Language-independent meaning
- Automatic word order transformation
- Clear intent for code generation

### Word Order Transformation

The framework automatically handles different word orders:

```typescript
// English (SVO): Subject-Verb-Object
'toggle .active on #button';

// Japanese (SOV): Subject-Object-Verb
'#button の .active を トグル';

// Arabic (VSO): Verb-Subject-Object
'بدّل .active على #button';

// All parse to the same semantic representation!
```

### Pattern Generation

Instead of writing patterns by hand, define schemas and let the framework generate patterns:

```typescript
// Define once
const schema = {
  action: 'select',
  roles: [
    { role: 'columns', required: true },
    { role: 'source', required: true, markerOverride: { en: 'from', ja: 'から' } },
  ],
};

// Framework generates patterns for all languages automatically
// English: "select [columns] from [source]"
// Japanese: "[source] から [columns] を 選択"
```

## Documentation

- [API Reference](./docs/API.md)
- [Domain Author Guide](./docs/DOMAIN_AUTHOR_GUIDE.md)
- [Language Profiles](./docs/LANGUAGE_PROFILES.md)
- [Grammar Transformation](./docs/GRAMMAR.md)
- [Examples](./examples/)

## Examples

- [SQL DSL](./examples/sql-dsl/) - Query language in English + Spanish

## Status

Published at the same version as the rest of the LokaScript packages (see `package.json`). The
surface domain packages build on is pinned by a snapshot test: [docs/API_SURFACE.md](./docs/API_SURFACE.md).
[HyperFixi/LokaScript](https://github.com/codetalcott/hyperfixi)'s multilingual hyperscript
(`@lokascript/semantic`) and the `@lokascript/domains` DSLs are built on it.

## License

MIT © LokaScript Contributors
