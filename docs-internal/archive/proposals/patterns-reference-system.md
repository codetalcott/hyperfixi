# Patterns Reference System

**Proposal for a comprehensive, queryable patterns database**

## Overview

A SQLite-backed patterns reference system that serves as:

1. Living documentation for hyperscript patterns
2. Test suite for automated verification
3. LLM context for code generation
4. Multilingual translation tracker
5. API for tooling integration

---

## Related Projects & Integration Strategy

### Project Landscape

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    hyperscript-lsp (external)                           │
│   /Users/williamtalcott/projects/hyperscript-lsp                        │
│                                                                         │
│   Language Specification Database:                                      │
│   - commands, expressions, features, keywords, special_symbols          │
│   - code_examples (cookbook examples from hyperscript.org)              │
│   - JSON extracted data → SQLite                                        │
│   - LSP server, MCP tools, VS Code extension                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────────┐
        │                        │                            │
        ▼                        ▼                            ▼
┌───────────────────┐  ┌───────────────────┐  ┌─────────────────────────┐
│ packages/         │  │ packages/         │  │ packages/               │
│ ast-toolkit       │  │ developer-tools   │  │ patterns-reference      │
│                   │  │                   │  │ (NEW)                   │
│ - AST visitor     │  │ - CLI scaffolding │  │                         │
│ - Pattern match   │  │ - Templates       │  │ - Usage patterns        │
│ - LSP integration │  │ - Dev server      │  │ - Translations (13 lang)│
│ - MCP server      │  │ - Generator       │  │ - Test verification     │
│ - AI analysis     │  │                   │  │ - LLM context           │
└───────────────────┘  └───────────────────┘  └─────────────────────────┘
        │                        │                            │
        └────────────────────────┼────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              sqlite-extensions-framework (patterns)                     │
│   /Users/williamtalcott/projects/sqlite-extensions-framework            │
│                                                                         │
│   Mature infrastructure patterns to adopt:                              │
│   - Connection pooling                                                  │
│   - Schema evolution/migrations                                         │
│   - Research tools integration                                          │
│   - Innovation engine patterns                                          │
│   - MCP server templates                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integration Strategy

| Source                          | What to Import                               | How                           |
| ------------------------------- | -------------------------------------------- | ----------------------------- |
| **hyperscript-lsp**             | Language definitions (commands, expressions) | Link via foreign keys or sync |
| **hyperscript-lsp**             | code_examples table                          | Import as seed patterns       |
| **ast-toolkit**                 | Pattern matching APIs                        | Use for AST verification      |
| **developer-tools**             | Template patterns                            | Reference in scaffolding      |
| **sqlite-extensions-framework** | DB patterns, connection pooling              | Adopt architecture            |

### Key Decision: Shared vs Separate Databases

**Option A: Shared Database (Recommended)**

- Extend hyperscript-lsp's database schema
- Add `pattern_translations`, `pattern_tests`, `llm_examples` tables
- Single source of truth

**Option B: Separate Database with Links**

- Patterns Reference has own SQLite database
- Links to hyperscript-lsp via element IDs
- More modular but requires sync

**Recommendation**: Option A for now, with ability to split later if needed.

---

## hyperscript-lsp Updates Needed

The `hyperscript-lsp` project needs updates to support the Patterns Reference integration:

### Current State (Updated: Dec 2025)

**Implemented ✅:**

- Database created at `hyperscript-lsp/data/hyperscript.db`
- Schema extended with LokaScript integration tables
- 116 code examples ingested from hyperscript.org cookbook
- 1,118 pattern translations (86 examples × 13 languages)
- 86.8% validation pass rate (970/1,118 translations parse correctly)

**Database contents:**

- 37 commands, 22 expressions, 9 features, 27 keywords, 8 special symbols
- `pattern_translations`: Multilingual translations with verification status
- `pattern_tests`: Test results tracking (runtime version, success/failure)
- `llm_examples`: Ready for curated LLM training data

### Proposed Schema Extensions

Add to `hyperscript-lsp/src/db/schema.ts`:

```sql
-- Pattern translations for multilingual support
CREATE TABLE IF NOT EXISTS pattern_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT NOT NULL REFERENCES code_examples(id),
  language TEXT NOT NULL,              -- 'ja', 'es', 'ar', etc.
  hyperscript TEXT NOT NULL,           -- Translated code
  word_order TEXT,                     -- 'SOV', 'SVO', 'VSO'
  translation_method TEXT,             -- 'auto-generated', 'hand-crafted'
  confidence REAL,                     -- 0.0-1.0 for auto
  verified_parses INTEGER DEFAULT 0,
  verified_executes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(code_example_id, language)
);

-- Pattern test results
CREATE TABLE IF NOT EXISTS pattern_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT NOT NULL REFERENCES code_examples(id),
  language TEXT NOT NULL,
  test_date TEXT NOT NULL,
  browser TEXT,
  runtime_version TEXT,
  parse_success INTEGER,
  execute_success INTEGER,
  error_message TEXT
);

-- LLM training examples (curated)
CREATE TABLE IF NOT EXISTS llm_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT NOT NULL REFERENCES code_examples(id),
  language TEXT NOT NULL,
  prompt TEXT NOT NULL,
  completion TEXT NOT NULL,
  quality_score REAL DEFAULT 1.0,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_translations_lang ON pattern_translations(language);
CREATE INDEX IF NOT EXISTS idx_tests_example ON pattern_tests(code_example_id);
CREATE INDEX IF NOT EXISTS idx_llm_lang ON llm_examples(language);
```

### Integration Workflow

```
hyperscript-lsp                    lokascript
─────────────────                  ─────────────────

code_examples ◄──────────────────► packages/patterns-reference
(canonical English)                 │
       │                            │
       ▼                            ▼
pattern_translations ◄────────── semantic parser
(13 languages)                    (auto-generate)
       │                            │
       ▼                            ▼
pattern_tests ◄─────────────── playwright tests
(verification)                    (verify execution)
       │
       ▼
llm_examples ◄───────────────── curated selection
(AI training)
```

### Sync Strategy

Option 1: **Shared Database** (recommended for now)

```typescript
// lokascript reads directly from hyperscript-lsp database
const LSP_DB_PATH = process.env.LSP_DB_PATH || '../hyperscript-lsp/data/hyperscript.db';
const db = new Database(LSP_DB_PATH);
```

Option 2: **Periodic Sync**

```bash
# Sync script in lokascript
npm run sync:lsp-patterns  # Copies/imports from hyperscript-lsp
```

---

## Integration with LokaScript Systems

| Existing System                       | Integration                              |
| ------------------------------------- | ---------------------------------------- |
| **Semantic Parser** (13 languages)    | Auto-verify translations parse correctly |
| **Grammar Transformer** (SOV/VSO/SVO) | Store natural word-order variants        |
| **Command Schemas**                   | Link patterns to schema definitions      |
| **Language Profiles**                 | Use for translation generation           |
| **LLM Generation Context**            | Feed patterns as few-shot examples       |

## Database Schema

```sql
-- Core patterns table
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,           -- 'toggle-class-basic'
  category TEXT NOT NULL,        -- 'basics', 'intermediate', 'advanced', 'htmx-like'
  subcategory TEXT,              -- 'class-manipulation', 'navigation', etc.
  name TEXT NOT NULL,            -- 'Toggle Class'
  slug TEXT UNIQUE NOT NULL,     -- 'toggle-class'
  description TEXT,
  difficulty TEXT DEFAULT 'beginner',  -- beginner/intermediate/advanced

  -- The pattern content
  hyperscript TEXT NOT NULL,     -- 'on click toggle .active on me'
  html_context TEXT,             -- '<button _="...">Click</button>'

  -- Metadata
  related_commands JSON,         -- ['toggle', 'add', 'remove']
  tags JSON,                     -- ['class', 'toggle', 'click']
  prerequisites JSON,            -- ['toggle-class-basic'] (learning path)

  -- Schema linkage
  primary_command TEXT,          -- 'toggle' (links to command_schemas)

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual translations
CREATE TABLE pattern_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id TEXT NOT NULL REFERENCES patterns(id),
  language TEXT NOT NULL,        -- 'ja', 'es', 'ar', etc.

  -- Translated content
  hyperscript TEXT NOT NULL,     -- 'クリック で .active を 切り替え'
  word_order TEXT,               -- 'SOV', 'SVO', 'VSO'

  -- Translation metadata
  translation_method TEXT,       -- 'auto-generated', 'hand-crafted', 'verified'
  translator TEXT,               -- 'semantic-parser', 'human:name'
  confidence REAL,               -- 0.0-1.0 for auto-generated

  -- Verification
  verified_parses INTEGER DEFAULT 0,  -- Does it parse back correctly?
  verified_executes INTEGER DEFAULT 0, -- Does it execute correctly?

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(pattern_id, language)
);

-- Test results for verification
CREATE TABLE pattern_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id TEXT NOT NULL REFERENCES patterns(id),
  language TEXT NOT NULL,        -- 'en', 'ja', etc.

  -- Test execution
  test_date TEXT NOT NULL,
  browser TEXT,                  -- 'chromium', 'firefox', 'webkit'
  runtime_version TEXT,          -- LokaScript version

  -- Results
  parse_success INTEGER,
  execute_success INTEGER,
  error_message TEXT,
  execution_time_ms INTEGER,

  -- Optional: screenshot path for visual verification
  screenshot_path TEXT
);

-- LLM context entries (curated for few-shot learning)
CREATE TABLE llm_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id TEXT NOT NULL REFERENCES patterns(id),
  language TEXT NOT NULL,

  -- LLM prompt/completion pair
  prompt TEXT NOT NULL,          -- 'Toggle a class when button clicked'
  completion TEXT NOT NULL,      -- 'on click toggle .active on me'

  -- Ranking for selection
  quality_score REAL DEFAULT 1.0,
  usage_count INTEGER DEFAULT 0,

  -- Context
  context_type TEXT,             -- 'zero-shot', 'few-shot', 'chain-of-thought'

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Categories (for organization)
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER,
  parent_id TEXT REFERENCES categories(id)
);

-- Command schema references (link to code)
CREATE TABLE command_schemas (
  action TEXT PRIMARY KEY,       -- 'toggle', 'add', 'remove'
  category TEXT,                 -- 'dom-class', 'dom-content'
  description TEXT,
  roles JSON,                    -- From CommandSchema
  has_body INTEGER DEFAULT 0,
  source_file TEXT               -- 'packages/semantic/src/generators/command-schemas.ts'
);

-- Indexes for common queries
CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_patterns_difficulty ON patterns(difficulty);
CREATE INDEX idx_patterns_command ON patterns(primary_command);
CREATE INDEX idx_translations_language ON pattern_translations(language);
CREATE INDEX idx_tests_pattern ON pattern_tests(pattern_id);
```

## API Design

### TypeScript Interface

```typescript
interface PatternsReference {
  // Query patterns
  getPatternById(id: string): Promise<Pattern | null>;
  getPatternsByCategory(category: string): Promise<Pattern[]>;
  getPatternsByCommand(command: string): Promise<Pattern[]>;
  getPatternsByTag(tag: string): Promise<Pattern[]>;
  searchPatterns(query: string): Promise<Pattern[]>;

  // Translations
  getTranslation(patternId: string, language: string): Promise<Translation | null>;
  getAllTranslations(patternId: string): Promise<Translation[]>;
  generateTranslation(patternId: string, language: string): Promise<Translation>;
  verifyTranslation(patternId: string, language: string): Promise<VerificationResult>;

  // Testing
  runPatternTest(patternId: string, options?: TestOptions): Promise<TestResult>;
  runAllTests(options?: TestOptions): Promise<TestSummary>;

  // LLM support
  getLLMExamples(prompt: string, language?: string, limit?: number): Promise<LLMExample[]>;

  // Admin
  importPattern(pattern: PatternInput): Promise<Pattern>;
  importFromExamples(examplesDir: string): Promise<ImportResult>;
  exportToMarkdown(outputDir: string): Promise<void>;
}
```

### REST API (optional)

```
GET  /patterns                     # List all patterns
GET  /patterns/:id                 # Get pattern by ID
GET  /patterns/search?q=toggle     # Search patterns
GET  /patterns/category/:category  # Filter by category
GET  /patterns/:id/translations    # Get all translations
GET  /patterns/:id/translations/:lang  # Get specific translation
POST /patterns/:id/test            # Run tests for pattern
GET  /llm/examples?prompt=...      # Get LLM context examples
```

## Use Cases

### 1. Documentation Generation

```typescript
// Generate markdown docs from database
const patterns = await ref.getPatternsByCategory('basics');
for (const pattern of patterns) {
  const translations = await ref.getAllTranslations(pattern.id);
  generateMarkdownDoc(pattern, translations);
}
```

### 2. Automated Translation Verification

```typescript
// Verify all Japanese translations parse correctly
const jaPatterns = await ref.getAllTranslations('ja');
for (const translation of jaPatterns) {
  const result = await semanticParser.parse(translation.hyperscript, 'ja');
  if (result.confidence < 0.9) {
    console.log(`Low confidence: ${translation.patternId}`);
  }
}
```

### 3. LLM Code Generation Context

```typescript
// Get relevant examples for LLM prompt
const examples = await ref.getLLMExamples('toggle visibility when clicked', 'en', 3);
const context = examples.map(e => `${e.prompt}\n${e.completion}`).join('\n\n');
// Use as few-shot examples for LLM
```

### 4. CI/CD Testing

```yaml
# GitHub Action
- name: Verify all patterns
  run: |
    npm run patterns:test
    npm run patterns:verify-translations
```

### 5. Interactive Reference Site

```html
<!-- Search patterns -->
<input
  type="search"
  _="
  on input
    fetch `/api/patterns/search?q=${my value}` as json
    swap innerHTML of #results with it
"
/>
<div id="results"></div>
```

## Integration Points

### With Semantic Parser

```typescript
// Auto-generate translations using semantic parser
async function generateTranslation(patternId: string, targetLang: string) {
  const pattern = await ref.getPatternById(patternId);
  const ml = new MultilingualHyperscript();
  await ml.initialize();

  // Translate English → target language
  const translated = await ml.translate(pattern.hyperscript, 'en', targetLang);

  // Verify it parses back
  const parseResult = await ml.parse(translated, targetLang);

  return {
    hyperscript: translated,
    confidence: parseResult.confidence,
    verified_parses: parseResult.success ? 1 : 0,
  };
}
```

### With Command Schemas

```typescript
// Link patterns to schema definitions
function linkToSchema(pattern: Pattern) {
  const schema = commandSchemas[pattern.primary_command];
  return {
    ...pattern,
    schema: {
      roles: schema.roles,
      category: schema.category,
      hasBody: schema.hasBody,
    },
  };
}
```

### With Examples Directory

```typescript
// Import existing examples into database
async function importExamples() {
  const files = glob('examples/**/*.html');
  for (const file of files) {
    const patterns = extractPatternsFromHTML(file);
    for (const pattern of patterns) {
      await ref.importPattern(pattern);
    }
  }
}
```

## Project Structure

```
packages/patterns-reference/
├── src/
│   ├── database/
│   │   ├── schema.sql           # SQLite schema
│   │   ├── migrations/          # Schema migrations
│   │   └── seed.sql             # Initial data
│   ├── api/
│   │   ├── patterns.ts          # Pattern queries
│   │   ├── translations.ts      # Translation handling
│   │   ├── testing.ts           # Test runner
│   │   └── llm.ts               # LLM context generation
│   ├── import/
│   │   ├── from-examples.ts     # Import from examples/
│   │   ├── from-schemas.ts      # Import from command schemas
│   │   └── from-markdown.ts     # Import from docs
│   ├── export/
│   │   ├── to-markdown.ts       # Generate docs
│   │   ├── to-json.ts           # Export as JSON
│   │   └── to-site.ts           # Generate static site
│   └── index.ts
├── data/
│   └── patterns.db              # SQLite database
├── scripts/
│   ├── import-all.ts            # Import everything
│   ├── verify-translations.ts   # Verify all translations
│   └── generate-docs.ts         # Generate documentation
└── tests/
    └── patterns.test.ts
```

## Implementation Phases

### Phase 1: Core Database ✅

- [x] Create SQLite schema (`hyperscript-lsp/scripts/database/schema.ts`)
- [x] Import existing examples (116 cookbook examples)
- [x] Extend schema for LokaScript integration

### Phase 2: Translation Support ✅

- [x] Auto-generate translations (`packages/semantic/scripts/sync-lsp-translations.ts`)
- [x] Verification against semantic parser (`packages/semantic/scripts/validate-translations.ts`)
- [x] Track translation quality (verified_parses flag, pattern_tests table)
- [ ] Improve coverage gaps (set: 33%, log: 25%, get: 0%)

### Phase 3: Testing Infrastructure 🔄

- [x] Pattern test runner (validate-translations.ts)
- [x] Discovery analysis (`packages/semantic/scripts/pattern-discovery.ts`)
- [ ] CI/CD integration
- [ ] Browser testing with Playwright

### Phase 4: LLM Integration

- [ ] Curate LLM examples (llm_examples table ready)
- [ ] Vector search for semantic matching
- [ ] Integration with LLM Generation Context

### Phase 5: Documentation Site

- [ ] Static site generation
- [ ] Interactive search
- [ ] Live pattern playground

## Benefits Summary

| Benefit                    | Description                                    |
| -------------------------- | ---------------------------------------------- |
| **Single Source of Truth** | All patterns in one queryable database         |
| **Automated Testing**      | Verify patterns work across languages/browsers |
| **LLM Support**            | Curated examples for code generation           |
| **Translation Tracking**   | Know which patterns have quality translations  |
| **Documentation**          | Auto-generate docs from database               |
| **Discoverability**        | Search by command, tag, difficulty             |
| **Learning Paths**         | Prerequisites and progression                  |
