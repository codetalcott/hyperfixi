# Domain Author Guide

Build a multilingual DSL in ~500 lines using `@lokascript/framework`.

## What You Get

When you create a domain on the framework, you automatically get:

- **Multilingual parsing** — your DSL works in any language you configure (SVO, SOV, VSO word orders)
- **AI tools via MCP** — parse, compile, validate, translate tools for Claude Code / Cursor / etc.
- **Translation** — translate commands between any configured languages
- **Confidence scoring** — pattern matcher rates how well each input matched
- **Validation** — structured error reporting for invalid input

## 30-Minute Overview

Here's what building a domain looks like, using a **Timer** example (3 commands, 3 languages):

**1. Schema** -- Define commands and roles (language-neutral):

```typescript
const startSchema = defineCommand({
  action: 'start',
  primaryRole: 'timer',
  roles: [defineRole({ role: 'timer', required: true, expectedTypes: ['expression'] })],
});
```

**2. Profiles** -- Translate keywords per language:

```typescript
const enProfile = { code: 'en', wordOrder: 'SVO', keywords: { start: { primary: 'start' } } };
const jaProfile = { code: 'ja', wordOrder: 'SOV', keywords: { start: { primary: '開始' } } };
```

**3. Wire** -- Create the DSL:

```typescript
const timerDSL = createMultilingualDSL({ name: 'Timer', schemas: [startSchema], languages: [...], codeGenerator });
```

**Result** -- The DSL parses in all configured languages and outputs via your generator:

```
timerDSL.compile('start countdown', 'en')   // -> { ok: true, code: '...' }
timerDSL.compile('countdown 開始', 'ja')     // -> same semantics, SOV word order
timerDSL.translate('start countdown', 'en', 'ja')  // -> 'countdown 開始'
```

Register with `DomainRegistry` and you automatically get MCP tools: `parse_timer`, `compile_timer`, `validate_timer`, `translate_timer`.

See [EXPLICIT_SYNTAX_IR.md](./EXPLICIT_SYNTAX_IR.md) for how the explicit syntax `[start timer:countdown]` connects all 6 existing domains.

---

## Quick Start

### 1. Scaffold

```bash
cd packages/framework
npm run create-domain -- \
  --name=myapi \
  --description="Natural language interface for MyAPI" \
  --commands=create,delete,list,update \
  --languages=en,es,ja
```

This generates a complete domain package in `packages/domain-myapi/` with:

```
packages/domain-myapi/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── tsup.config.ts
└── src/
    ├── index.ts                    # createMyapiDSL() factory
    ├── schemas/index.ts            # Command schemas (defineCommand/defineRole)
    ├── profiles/index.ts           # Language profiles (keyword translations)
    ├── tokenizers/index.ts         # Language tokenizers
    ├── generators/myapi-generator.ts  # Code generator (SemanticNode → target code)
    └── __test__/myapi-domain.test.ts  # Tests
```

### 2. Define Schemas

Schemas declare **what your commands do** — their roles (arguments), types, and markers.

```typescript
// src/schemas/index.ts
import { defineCommand, defineRole } from '@lokascript/framework';

export const createSchema = defineCommand({
  action: 'create',
  description: 'Create a new resource',
  category: 'lifecycle',
  primaryRole: 'name',
  roles: [
    defineRole({
      role: 'name',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
    }),
    defineRole({
      role: 'type',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 2,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'として',
      },
    }),
  ],
});
```

**Key concepts:**

- `primaryRole` — the main argument (appears right after the keyword in SVO)
- `svoPosition` — order in SVO languages (1 = closest to keyword)
- `markerOverride` — the preposition/particle before this role per language
  - SVO: `create "mydb" as database` → "as" marks the `type` role
  - SOV: `"mydb" を データベース として 作成` → "として" marks the `type` role

### 3. Fill In Language Profiles

Profiles define **how commands appear** in each language — keyword translations and role markers.

```typescript
// src/profiles/index.ts
import type { PatternGenLanguageProfile } from '@lokascript/framework';

export const enProfile: PatternGenLanguageProfile = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  wordOrder: 'SVO',
  keywords: {
    create: { primary: 'create', aliases: ['new', 'add'] },
    delete: { primary: 'delete', aliases: ['remove', 'destroy'] },
    list: { primary: 'list', aliases: ['show'] },
    update: { primary: 'update', aliases: ['modify', 'set'] },
  },
  roleMarkers: {},
};

export const jaProfile: PatternGenLanguageProfile = {
  code: 'ja',
  name: 'Japanese',
  nativeName: '日本語',
  wordOrder: 'SOV',
  keywords: {
    create: { primary: '作成', aliases: ['新規'] },
    delete: { primary: '削除', aliases: [] },
    list: { primary: '一覧', aliases: ['表示'] },
    update: { primary: '更新', aliases: ['変更'] },
  },
  roleMarkers: {},
};
```

**Word order affects pattern generation:**

| Word Order | Pattern                                      | Example                              |
| ---------- | -------------------------------------------- | ------------------------------------ |
| SVO        | `keyword [role] [marker role]...`            | `create "mydb" as database`          |
| SOV        | `[role] [marker] [role] [marker]... keyword` | `"mydb" を データベース として 作成` |
| VSO        | `keyword [role] [marker role]...`            | (same as SVO for simple commands)    |

### 4. Configure Tokenizers

Tokenizers split input text into tokens. For most languages, `createSimpleTokenizer()` is sufficient.

```typescript
// src/tokenizers/index.ts
import { createSimpleTokenizer } from '@lokascript/framework';

export const EnglishMyapiTokenizer = createSimpleTokenizer({
  language: 'en',
  direction: 'ltr',
  keywords: [
    'create',
    'delete',
    'list',
    'update',
    'new',
    'add',
    'remove',
    'destroy',
    'show',
    'modify',
    'set',
    'as',
    'from',
    'to',
  ],
});

export const JapaneseMyapiTokenizer = createSimpleTokenizer({
  language: 'ja',
  direction: 'ltr',
  keywords: ['作成', '削除', '一覧', '更新', '新規', '表示', '変更', 'を', 'として', 'から', 'に'],
});
```

**When to use BaseTokenizer instead:**

- Your domain has CSS selectors (`#id`, `.class`) — add a `CSSSelectorExtractor`
- Your input has duration values (`300ms`, `2s`) — add a `DurationExtractor`
- You need custom identifier rules — extend `classifyToken()`

```typescript
import { BaseTokenizer } from '@lokascript/framework';

class MyTokenizer extends BaseTokenizer {
  constructor() {
    super({
      language: 'en',
      direction: 'ltr',
      keywords: new Set(['create', 'delete']),
    });
    // Register custom extractors BEFORE default ones
    this.registerExtractor(new MyCustomExtractor());
  }
}
```

### 5. Implement Code Generator

The generator transforms `SemanticNode` → target code string. This is where your domain-specific logic lives.

```typescript
// src/generators/myapi-generator.ts
import type { CodeGenerator, SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

export const myapiCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      case 'create':
        return generateCreate(node);
      case 'delete':
        return generateDelete(node);
      case 'list':
        return generateList(node);
      case 'update':
        return generateUpdate(node);
      default:
        return `/* unknown: ${node.action} */`;
    }
  },
};

function generateCreate(node: SemanticNode): string {
  const name = extractRoleValue(node, 'name');
  const type = extractRoleValue(node, 'type');
  if (type) {
    return `await client.create({ name: "${name}", type: "${type}" });`;
  }
  return `await client.create("${name}");`;
}

function generateDelete(node: SemanticNode): string {
  const name = extractRoleValue(node, 'name');
  return `await client.delete("${name}");`;
}

function generateList(node: SemanticNode): string {
  return `await client.list();`;
}

function generateUpdate(node: SemanticNode): string {
  const name = extractRoleValue(node, 'name');
  return `await client.update("${name}");`;
}
```

**Key utility:** `extractRoleValue(node, 'roleName')` — safely gets a string from any role, returns `''` if missing.

### 6. Write Tests

```typescript
// src/__test__/myapi-domain.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createMyapiDSL } from '../index';

describe('domain-myapi', () => {
  let dsl;
  beforeAll(() => {
    dsl = createMyapiDSL();
  });

  it('parses English create', () => {
    const node = dsl.parse('create mydb', 'en');
    expect(node.action).toBe('create');
  });

  it('compiles to SDK code', () => {
    const result = dsl.compile('create mydb', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('client.create');
  });

  it('parses Japanese create (SOV)', () => {
    const node = dsl.parse('mydb を 作成', 'ja');
    expect(node.action).toBe('create');
  });

  it('produces equivalent output across languages', () => {
    const en = dsl.compile('create mydb', 'en');
    const ja = dsl.compile('mydb を 作成', 'ja');
    expect(en.code).toBe(ja.code);
  });
});
```

### 7. Run

```bash
cd packages/domain-myapi
npm install
npm test        # Run tests
npm run build   # Build for publishing
```

---

## Multi-Statement Parsing

If your DSL needs multi-line input (test specs, scenarios, workflows), use the framework's multi-statement parser.

```typescript
import { createMultiStatementParser, accumulateBlocks } from '@lokascript/framework';

// Wrap your single-command DSL with multi-statement parsing
const multiParser = createMultiStatementParser(dsl, {
  split: { mode: 'line', commentPrefixes: ['--', '//'] },
  keywords: {
    categories: {
      test: { en: ['test'], ja: ['テスト'] },
      given: { en: ['given'], ja: ['前提'] },
      when: { en: ['when'], ja: ['もし'] },
    },
    wordOrders: { ja: 'SOV' },
  },
});

const result = multiParser.parse(
  `
  test "Login"
    given page /login
    when user clicks on #submit
`,
  'en'
);

// result.statements — array of ParsedStatement (with .node, .line, .category, .indent)
// result.errors — array of StatementError (with .message, .line, .source)
```

### Block Accumulation

Group parsed statements into hierarchical blocks:

```typescript
const blocks = accumulateBlocks(result.statements, {
  blockTypes: ['test', 'feature'],
  nesting: 'indent', // or 'flat'
  extractName: text => text.match(/"([^"]+)"/)?.[1],
});

// blocks.blocks — array of StatementBlock (with .type, .name, .statements, .children)
// blocks.orphans — statements outside any block
```

### Continuation Keywords

Handle "and" / "y" / "かつ" continuation:

```typescript
const multiParser = createMultiStatementParser(dsl, {
  split: { mode: 'delimiter', defaultDelimiter: /,\s*|\n\s*/ },
  keywords: { categories: { given: { en: ['given'] }, when: { en: ['when'] } } },
  continuation: {
    keywords: { en: ['and'], es: ['y'], ja: ['かつ'] },
  },
});

// "given visible, and enabled" → parses "given enabled" (re-prefixes with previous keyword)
```

### Preprocessors

Transform lines before parsing (article stripping, keyword prepending, etc.):

```typescript
const multiParser = createMultiStatementParser(dsl, {
  split: { mode: 'line' },
  preprocessor: (line, category, language, context) => {
    // Strip articles
    line = line.replace(/\b(the|a|an)\s+/gi, '');
    // Prepend "expect" to bare assertion lines
    if (!category && context.previous?.category === 'when') {
      return `expect ${line}`;
    }
    return line;
  },
});
```

---

## MCP Integration

Add `--mcp` when scaffolding to generate MCP tool definitions:

```bash
npm run create-domain -- --name=myapi --commands=create,delete --mcp
```

This generates 4 standard tools: `parse_myapi`, `compile_myapi`, `validate_myapi`, `translate_myapi`.

Register them in the MCP server's `index.ts`:

```typescript
import { myapiDomainTools, handleMyapiDomainTool } from './tools/myapi-domain';

// Add to tools array:
...myapiDomainTools,

// Add to handler:
if (name.startsWith('parse_myapi') || name.startsWith('compile_myapi') || ...) {
  return handleMyapiDomainTool(name, args);
}
```

---

## Design Patterns

### Marker Override Strategy

Markers (prepositions/particles) attach to different roles in different word orders:

```typescript
defineRole({
  role: 'target',
  markerOverride: {
    en: 'on', // SVO: "run test on myenv"
    es: 'en', // SVO: "ejecutar test en myenv"
    ja: 'で', // SOV: "myenv で test を 実行" — particle attaches to target
    ar: 'على', // VSO: "نفذ test على myenv"
  },
});
```

SOV languages place markers **after** the role value. SVO/VSO place markers **before**.

### Optional Roles

```typescript
defineRole({
  role: 'comment',
  required: false,
  expectedTypes: ['expression'],
  markerOverride: { en: 'comment', ja: 'コメント' },
});
```

Optional roles are matched if the marker is present, skipped otherwise. The pattern matcher has single-step backtracking for unmarked optional roles.

### Commands with No Required Roles

```typescript
export const listSchema = defineCommand({
  action: 'list',
  description: 'List all resources',
  category: 'query',
  primaryRole: 'target',
  roles: [], // No roles — "list" is the entire command
});
```

### Natural Language Renderer

For translation support, implement a renderer that converts `SemanticNode` → human-readable text.

**Option 1: Auto-generate from schemas** (simplest — handles word order automatically):

```typescript
import { createSchemaRenderer } from '@lokascript/framework';

const renderer = createSchemaRenderer(schemas, profiles);
renderer.render(node, 'ja'); // → "users から name 選択"
```

**Option 2: Use renderer helpers** (more control):

```typescript
import { lookupKeyword, lookupMarker, buildPhrase } from '@lokascript/framework';
import type { KeywordTable, MarkerTable } from '@lokascript/framework';

const KEYWORDS: KeywordTable = {
  select: { en: 'select', ja: '選択', es: 'seleccionar' },
};
const MARKERS: MarkerTable = {
  from: { en: 'from', ja: 'から', es: 'de' },
};

export function renderSelect(node: SemanticNode, lang: string): string {
  const kw = lookupKeyword(KEYWORDS, 'select', lang);
  const cols = extractRoleValue(node, 'columns');
  const src = extractRoleValue(node, 'source');
  const mk = lookupMarker(MARKERS, 'from', lang);

  if (isSOV(lang)) return buildPhrase(src, mk, cols, kw);
  return buildPhrase(kw, cols, mk, src);
}
```

**Option 3: Implement `NaturalLanguageRenderer` directly** (full control):

```typescript
import type { NaturalLanguageRenderer } from '@lokascript/framework';

export const myRenderer: NaturalLanguageRenderer = {
  render(node, language) {
    switch (node.action) {
      case 'select':
        return renderSelect(node, language);
      default:
        return node.action;
    }
  },
};
```

Wire it into translation: parse in source language, render in target language.

### Structured Diagnostics

Use the diagnostic collector for validation with rich error reporting:

```typescript
import { createDiagnosticCollector, fromError } from '@lokascript/framework';

function validateMyDSL(input: string, language: string) {
  const collector = createDiagnosticCollector();

  // Check for issues
  if (!input.trim()) {
    collector.error('Empty input', { code: 'empty-input' });
  }

  try {
    const node = dsl.parse(input, language);
    if (node.metadata?.confidence && node.metadata.confidence < 0.7) {
      collector.warning('Low confidence match', {
        code: 'low-confidence',
        suggestions: ['Check spelling', 'Try a different phrasing'],
      });
    }
  } catch (err) {
    collector.add(fromError(err, { code: 'parse-error', line: 1, source: input }));
  }

  return collector.toResult();
  // { ok: false, diagnostics: [...], summary: { errors: 1, warnings: 0, infos: 0 } }
}
```

### Domain Registry (MCP Integration)

Instead of manually writing MCP tool definitions, use the domain registry:

```typescript
import { DomainRegistry } from '@lokascript/framework';

const registry = new DomainRegistry();

registry.register({
  name: 'myapi',
  description: 'Natural language MyAPI',
  languages: ['en', 'es', 'ja'],
  inputLabel: 'query',
  inputDescription: 'MyAPI query in natural language',
  getDSL: () => createMyapiDSL(),
  getRenderer: () => myRenderer,
});

// Auto-generates: parse_myapi, compile_myapi, validate_myapi, translate_myapi
const tools = registry.getToolDefinitions();

// Dispatch tool calls automatically
const result = await registry.handleToolCall('parse_myapi', { query: 'create foo' });
```

In the MCP server, register your domain with the shared registry instead of writing a custom tool file.

---

## Troubleshooting

**Parsing fails in SOV languages but works in SVO.**
Check that your tokenizer's `keywordExtras` includes `{ native: '...', normalized: 'english_keyword' }` for every non-Latin keyword. The pattern matcher compares stop markers against both `token.value` (native) and `token.normalized` (English) — if normalization is missing, the matcher can't recognize when to stop consuming tokens.

**Role values aren't captured — the matcher skips them or returns low confidence.**
Only put structural tokens (command keywords, markers like "from"/"から") in your tokenizer's `keywords` list. If a word that should be a role _value_ is in the keyword list, it gets classified as `type: 'literal'` instead of `type: 'expression'`, and roles expecting `['expression']` won't match it.

**Multiple unmarked optional roles before a keyword — only the last one backtracks.**
The pattern matcher has single-step backtracking: if an optional role consumes a token and the next pattern token fails, it resets that one role and retries. This doesn't chain across multiple consecutive unmarked optional roles. Fix: add markers to optional roles so they form groups, which the matcher handles reliably.

**CSS selectors (`#id`, `.class`) aren't recognized as role values.**
Register a `CSSSelectorExtractor` in your tokenizer _before_ the default extractors. The default identifier extractor will consume `#` and `.` as separate tokens otherwise. See `domain-bdd` for an example.

---

## Existing Domains (Reference)

| Domain                                            | Commands                                  | Languages | Compiles To      | Lines |
| ------------------------------------------------- | ----------------------------------------- | --------- | ---------------- | ----- |
| [domain-sql](../../domain-sql/)                   | 4 (SELECT, INSERT, UPDATE, DELETE)        | 8         | Standard SQL     | ~500  |
| [domain-bdd](../../domain-bdd/)                   | 3 (GIVEN, WHEN, THEN)                     | 8         | Playwright tests | ~600  |
| [domain-behaviorspec](../../domain-behaviorspec/) | 6 (TEST, GIVEN, WHEN, EXPECT, AFTER, NOT) | 8         | Playwright tests | ~900  |
| [domain-sprites](../../../sprite-dsl/)            | 10 (create, destroy, list, run, ...)      | 1         | TypeScript SDK   | ~500  |

domain-sql is the simplest reference. domain-behaviorspec is the most complete. Start with domain-sql as your template.
