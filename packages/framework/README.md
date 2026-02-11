# @lokascript/framework

> **Generic framework for building multilingual domain-specific languages (DSLs)**

Build DSLs that work in 24+ human languages with semantic parsing, pattern generation, and grammar transformation.

## Features

- **🌍 Multilingual**: Support 24+ languages out of the box (English, Japanese, Spanish, Arabic, etc.)
- **🧠 Semantic Parsing**: Parse natural language commands into language-neutral semantic representations
- **🔄 Grammar Transformation**: Automatically handle word order (SVO/SOV/VSO) and grammatical markers
- **📦 Zero Dependencies**: Pure TypeScript, no runtime dependencies
- **🎯 Type-Safe**: Full TypeScript support with generic types
- **🔌 Extensible**: Custom roles, value types, and transformation rules
- **⚡ Fast**: Efficient pattern matching and caching

## Installation

```bash
npm install @lokascript/framework
```

## Quick Start

```typescript
import { createMultilingualDSL } from '@lokascript/framework';

// Define your DSL's commands
const selectCommand = {
  action: 'select',
  primaryRole: 'columns',
  roles: [
    { role: 'columns', required: true, expectedTypes: ['expression'] },
    { role: 'source', required: true, expectedTypes: ['literal'] },
  ],
};

// Create your DSL instance
const sqlDSL = createMultilingualDSL({
  schemas: [selectCommand],
  languages: [
    {
      code: 'en',
      profile: { wordOrder: 'SVO', keywords: { select: 'select' } },
      tokenizer: new EnglishTokenizer(),
    },
  ],
});

// Use your DSL
const node = sqlDSL.parse('select name from users', 'en');
// → { action: 'select', roles: { columns: 'name', source: 'users' } }
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
- [Language Profiles](./docs/LANGUAGE_PROFILES.md)
- [Grammar Transformation](./docs/GRAMMAR.md)
- [Examples](./examples/)

## Examples

- [SQL DSL](./examples/sql-dsl/) - Query language in English + Spanish
- [Animation DSL](./examples/animation-dsl/) - Animation commands in English + Japanese
- [Form Validation DSL](./examples/validation-dsl/) - Validation rules

## Status

🚧 **Alpha** - API is stable but may change before 1.0.0

Currently extracted from [HyperFixi/LokaScript](https://github.com/codetalcott/hyperfixi), a production-tested multilingual hyperscript implementation with:

- 8100+ tests passing
- 24 languages supported
- Used in real applications

## License

MIT © LokaScript Contributors
