# @hyperfixi/patterns-reference

Queryable patterns database for hyperscript with multilingual translations and LLM few-shot learning support.

## Installation

```bash
npm install @hyperfixi/patterns-reference
```

## Quick Start

The package ships with a **pre-populated SQLite database** containing:

- 106 code examples covering hyperscript commands and real-world UI patterns
- 1,378 translations (106 patterns × 13 languages)
- 414 LLM few-shot examples for code generation

No setup required - just install and use:

### Use the API

```typescript
import { createPatternsReference } from '@hyperfixi/patterns-reference';

// Create a patterns reference instance
const ref = createPatternsReference({
  dbPath: './data/patterns.db',
  readonly: true,
});

// Query patterns
const pattern = await ref.getPatternById('toggle-class-basic');
console.log(pattern?.rawCode); // 'on click toggle .active'

// Search patterns
const results = await ref.searchPatterns('toggle');

// Get LLM examples for few-shot learning
const examples = await ref.getLLMExamples('toggle a class on click');

// Get statistics
const stats = await ref.getStats();
console.log(`Total patterns: ${stats.totalPatterns}`);

// Clean up
ref.close();
```

## API Reference

### Pattern Queries

```typescript
// Get pattern by ID
getPatternById(id: string): Promise<Pattern | null>

// Get patterns by category (e.g., 'class-manipulation', 'visibility')
getPatternsByCategory(category: string): Promise<Pattern[]>

// Get patterns containing a specific command
getPatternsByCommand(command: string): Promise<Pattern[]>

// Full-text search across title, code, and description
searchPatterns(query: string, options?: SearchOptions): Promise<Pattern[]>

// Get all patterns (paginated)
getAllPatterns(options?: SearchOptions): Promise<Pattern[]>

// Get pattern statistics
getPatternStats(): Promise<PatternStats>
```

### Translations

```typescript
// Get translation for a specific language
getTranslation(patternId: string, language: string): Promise<Translation | null>

// Get all translations for a pattern
getAllTranslations(patternId: string): Promise<Translation[]>

// Verify a translation parses correctly
verifyTranslation(translation: Translation): Promise<VerificationResult>
```

### LLM Support

```typescript
// Get examples matching a prompt (for few-shot learning)
getLLMExamples(prompt: string, language?: string, limit?: number): Promise<LLMExample[]>

// Get examples by command type
getExamplesByCommand(command: string, language?: string, limit?: number): Promise<LLMExample[]>

// Get high-quality examples
getHighQualityExamples(language?: string, minQuality?: number, limit?: number): Promise<LLMExample[]>

// Build formatted context for LLM prompting
buildFewShotContext(prompt: string, language?: string, numExamples?: number): Promise<string>

// Get LLM example statistics
getLLMStats(): Promise<{ total: number; byLanguage: Record<string, number>; avgQuality: number; totalUsage: number }>
```

## Configuration

### Database Path

The database path can be configured via:

1. **Constructor option:**

   ```typescript
   createPatternsReference({ dbPath: '/path/to/db.sqlite' });
   ```

2. **Environment variables:**

   ```bash
   export LSP_DB_PATH="/path/to/db.sqlite"
   # or
   export HYPERSCRIPT_LSP_DB="/path/to/db.sqlite"
   ```

### Scripts (Development Only)

These scripts are for contributors regenerating the database. **End users don't need these** - the database ships pre-populated.

| Script                      | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `npm run populate`          | Full database setup (init + translations + LLM examples) |
| `npm run db:init`           | Initialize database with seed patterns                   |
| `npm run db:init:force`     | Reinitialize database (overwrites existing)              |
| `npm run sync:translations` | Generate translations for all 13 languages               |
| `npm run seed:llm`          | Generate LLM few-shot examples                           |
| `npm run validate`          | Validate all patterns parse correctly                    |
| `npm run validate:fix`      | Validate and update verified_parses flag                 |
| `npm run build`             | Build the package                                        |
| `npm test`                  | Run tests in watch mode                                  |
| `npm run test:run`          | Run tests once                                           |

## Database Schema

### code_examples

Pattern source code from the hyperscript cookbook.

| Column      | Type | Description                           |
| ----------- | ---- | ------------------------------------- |
| id          | TEXT | Unique identifier                     |
| title       | TEXT | Human-readable title                  |
| raw_code    | TEXT | Hyperscript code                      |
| description | TEXT | Pattern description                   |
| feature     | TEXT | Category (e.g., 'class-manipulation') |
| created_at  | TEXT | Creation timestamp                    |

### pattern_translations

Multilingual translations of patterns.

| Column          | Type    | Description                      |
| --------------- | ------- | -------------------------------- |
| id              | INTEGER | Auto-increment ID                |
| code_example_id | TEXT    | Foreign key to code_examples     |
| language        | TEXT    | Language code (en, ja, es, etc.) |
| hyperscript     | TEXT    | Translated code                  |
| word_order      | TEXT    | SVO, SOV, VSO, or V2             |
| confidence      | REAL    | Translation confidence (0-1)     |
| verified_parses | INTEGER | Whether translation parses (0/1) |

### llm_examples

Prompt/completion pairs for few-shot learning.

| Column          | Type    | Description                  |
| --------------- | ------- | ---------------------------- |
| id              | INTEGER | Auto-increment ID            |
| code_example_id | TEXT    | Foreign key to code_examples |
| language        | TEXT    | Language code                |
| prompt          | TEXT    | Natural language prompt      |
| completion      | TEXT    | Hyperscript code             |
| quality_score   | REAL    | Quality rating (0-1)         |
| usage_count     | INTEGER | Retrieval count              |

## Supported Languages

The database supports 13 languages with different word orders:

| Language   | Code | Word Order |
| ---------- | ---- | ---------- |
| English    | en   | SVO        |
| Spanish    | es   | SVO        |
| French     | fr   | SVO        |
| Portuguese | pt   | SVO        |
| Indonesian | id   | SVO        |
| Swahili    | sw   | SVO        |
| Chinese    | zh   | SVO        |
| Japanese   | ja   | SOV        |
| Korean     | ko   | SOV        |
| Turkish    | tr   | SOV        |
| Quechua    | qu   | SOV        |
| Arabic     | ar   | VSO        |
| German     | de   | V2         |

## Integration with @lokascript/semantic

The patterns-reference package integrates with @lokascript/semantic to provide runtime pattern matching from the database.

### Semantic Bridge

```typescript
import { initializeSemanticIntegration } from '@hyperfixi/patterns-reference';

// Initialize integration (registers database as pattern source)
const result = await initializeSemanticIntegration();

if (result.success) {
  console.log(`Registered with: ${result.registeredWith}`);
  // 'semantic' if @lokascript/semantic is available
  // 'standalone' if running without semantic package
}

// Query patterns directly
import { queryPatterns, getSupportedLanguages } from '@hyperfixi/patterns-reference';

const jaPatterns = await queryPatterns('ja');
const languages = await getSupportedLanguages();
```

### LLM Adapter (for @lokascript/core)

The package provides a unified LLM adapter that replaces the deprecated `llm-examples-query.ts`:

```typescript
import { findRelevantExamples, buildFewShotContextSync } from '@hyperfixi/patterns-reference';

// Find examples matching a prompt
const examples = findRelevantExamples('toggle a class on click', 'en', 5);

// Build formatted context for LLM prompting
const context = buildFewShotContextSync('show a modal', 'en', 3);
```

## Development

```bash
# Install dependencies
npm install

# Full database setup
npm run populate

# Run tests
npm test

# Validate translations
npm run validate

# Build
npm run build
```

## Troubleshooting

### Native Module Installation

This package uses `better-sqlite3`, a native Node.js module. If you encounter installation errors:

**macOS:**

```bash
xcode-select --install  # Install Xcode command line tools
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt-get install build-essential python3
```

**Windows:**

```bash
npm install --global windows-build-tools
```

`better-sqlite3` ships with prebuilt binaries for most platforms, so compilation is usually not required. If you encounter issues, ensure you're using a supported Node.js version (18, 20, or 22 LTS).

### Database Not Found

If you get "database not found" errors, the database path may not be resolving correctly. Set it explicitly:

```typescript
import { createPatternsReference } from '@hyperfixi/patterns-reference';
import { join } from 'path';

const ref = createPatternsReference({
  dbPath: join(__dirname, 'node_modules/@hyperfixi/patterns-reference/data/patterns.db'),
});
```

Or use environment variables:

```bash
export LSP_DB_PATH="/absolute/path/to/patterns.db"
```

## License

MIT
