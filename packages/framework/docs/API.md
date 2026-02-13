# API Reference

Complete reference for `@lokascript/framework` API.

## Table of Contents

- [Main API](#main-api)
  - [createMultilingualDSL()](#createmultilingualdsl)
  - [MultilingualDSL Interface](#multilingualdsl-interface)
- [Configuration Types](#configuration-types)
  - [DSLConfig](#dslconfig)
  - [LanguageConfig](#languageconfig)
  - [CommandSchema](#commandschema)
  - [RoleSpec](#rolespec)
- [Semantic Types](#semantic-types)
  - [SemanticNode](#semanticnode)
  - [SemanticValue](#semanticvalue)
  - [SemanticRole](#semanticrole)
- [Dependency Injection](#dependency-injection)
  - [Dictionary](#dictionary)
  - [ProfileProvider](#profileprovider)
  - [ValueExtractor](#valueextractor)
  - [CodeGenerator](#codegenerator)
- [Helper Functions](#helper-functions)
- [Advanced Usage](#advanced-usage)

---

## Main API

### createMultilingualDSL()

Factory function that creates a new multilingual DSL instance.

```typescript
function createMultilingualDSL(config: DSLConfig): MultilingualDSL;
```

**Parameters:**

- `config` - DSL configuration object (see [DSLConfig](#dslconfig))

**Returns:**

- `MultilingualDSL` instance with parsing, compilation, and translation capabilities

**Example:**

```typescript
import { createMultilingualDSL } from '@lokascript/framework';

const myDSL = createMultilingualDSL({
  name: 'MyDSL',
  schemas: [
    {
      action: 'select',
      description: 'Select data from a source',
      primaryRole: 'columns',
      category: 'data',
      roles: [
        {
          role: 'columns',
          description: 'Columns to select',
          required: true,
          expectedTypes: ['expression'],
        },
        {
          role: 'source',
          description: 'Data source',
          required: true,
          expectedTypes: ['literal', 'selector'],
          markerOverride: { en: 'from', es: 'de', ja: 'から' },
        },
      ],
    },
  ],
  languages: [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      tokenizer: englishTokenizer,
      patternProfile: englishProfile,
      grammarProfile: englishGrammarProfile,
    },
  ],
  codeGenerator: {
    generate: node => generateSQL(node),
  },
});
```

---

### MultilingualDSL Interface

Main interface for interacting with your DSL.

```typescript
interface MultilingualDSL {
  // Parsing
  parse(input: string, language: string): SemanticNode;
  parseWithConfidence(
    input: string,
    language: string
  ): {
    node: SemanticNode;
    confidence: number;
  };

  // Validation
  validate(input: string, language: string): ValidationResult;

  // Compilation
  compile(input: string, language: string): CompileResult;

  // Translation
  translate(input: string, fromLanguage: string, toLanguage: string): string;

  // Language support
  getSupportedLanguages(): string[];
}
```

#### parse()

Parse DSL input into a semantic AST.

```typescript
parse(input: string, language: string): SemanticNode
```

**Parameters:**

- `input` - DSL command string
- `language` - ISO 639-1 language code (e.g., 'en', 'ja', 'es')

**Returns:**

- `SemanticNode` - Parsed semantic AST

**Throws:**

- `Error` if no tokenizer is registered for the language
- `Error` if no pattern matches the input

**Example:**

```typescript
const node = dsl.parse('select name from users', 'en');
// {
//   kind: 'command',
//   action: 'select',
//   roles: Map {
//     'columns' => { type: 'expression', raw: 'name' },
//     'source' => { type: 'literal', value: 'users' }
//   },
//   metadata: {
//     sourceLanguage: 'en',
//     sourceText: 'select name from users',
//     patternId: 'select-en',
//     confidence: 1.0
//   }
// }
```

#### parseWithConfidence()

Parse with confidence score to understand match quality.

```typescript
parseWithConfidence(input: string, language: string): {
  node: SemanticNode;
  confidence: number;
}
```

**Confidence scores:**

- `1.0` - Exact match with all required roles captured
- `0.8-0.99` - High confidence with minor uncertainty
- `0.6-0.8` - Medium confidence (normalization, defaults applied)
- `<0.6` - Low confidence (may need fallback)

**Example:**

```typescript
const { node, confidence } = dsl.parseWithConfidence('select * from users', 'en');
console.log(`Parsed with ${(confidence * 100).toFixed(0)}% confidence`);
```

#### validate()

Validate input without throwing errors.

```typescript
validate(input: string, language: string): ValidationResult

interface ValidationResult {
  valid: boolean;
  node?: SemanticNode;
  errors?: string[];
}
```

**Example:**

```typescript
const result = dsl.validate('select name from users', 'en');
if (result.valid) {
  console.log('Valid DSL command:', result.node);
} else {
  console.error('Validation errors:', result.errors);
}
```

#### compile()

Compile DSL input to target code (requires code generator).

```typescript
compile(input: string, language: string): CompileResult

interface CompileResult {
  ok: boolean;
  code?: string;
  errors?: string[];
  node?: SemanticNode;
  metadata?: {
    parser: string;
    confidence: number;
  };
}
```

**Example:**

```typescript
const result = dsl.compile('select name from users', 'en');
if (result.ok) {
  console.log('Generated SQL:', result.code);
  // → "SELECT name FROM users"
} else {
  console.error('Compilation errors:', result.errors);
}
```

#### translate()

Translate between languages using grammar transformation.

```typescript
translate(input: string, fromLanguage: string, toLanguage: string): string
```

**Example:**

```typescript
const japanese = dsl.translate('select name from users', 'en', 'ja');
// → "users から name を 選択"

const spanish = dsl.translate('select name from users', 'en', 'es');
// → "seleccionar name de users"
```

#### getSupportedLanguages()

Get list of supported language codes.

```typescript
getSupportedLanguages(): string[]
```

**Example:**

```typescript
const languages = dsl.getSupportedLanguages();
// → ['en', 'es', 'ja']
```

---

## Configuration Types

### DSLConfig

Main configuration object for creating a DSL.

```typescript
interface DSLConfig {
  // Basic configuration
  readonly name?: string;
  readonly schemas: readonly CommandSchema[];
  readonly languages: readonly LanguageConfig[];

  // Dependency injection (optional)
  readonly dictionary?: Dictionary;
  readonly profileProvider?: ProfileProvider;
  readonly valueExtractors?: ValueExtractor[];
  readonly codeGenerator?: CodeGenerator;

  // Options
  readonly generatePatterns?: boolean;
  readonly customPatterns?: LanguagePattern[];
}
```

**Properties:**

- **name** (optional) - DSL name for debugging/documentation
- **schemas** (required) - Array of command schemas defining DSL grammar
- **languages** (required) - Language configurations (tokenizers + profiles)
- **dictionary** (optional) - Keyword translation provider (default: auto-generated from language configs)
- **profileProvider** (optional) - Grammar transformation profiles (default: auto-generated)
- **valueExtractors** (optional) - Custom token extractors (default: generic extractors)
- **codeGenerator** (optional) - Target code generator (default: none)
- **generatePatterns** (optional) - Auto-generate patterns from schemas (default: true)
- **customPatterns** (optional) - Additional hand-written patterns

---

### LanguageConfig

Configuration for a single language.

```typescript
interface LanguageConfig {
  readonly code: string; // ISO 639-1 language code
  readonly name: string; // English name
  readonly nativeName: string; // Native name
  readonly tokenizer: LanguageTokenizer;
  readonly patternProfile: PatternGenLanguageProfile;
  readonly grammarProfile?: GrammarProfile;
}
```

**Example:**

```typescript
const englishConfig: LanguageConfig = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  tokenizer: new EnglishTokenizer({
    keywords: { select: 'select', insert: 'insert' },
  }),
  patternProfile: {
    code: 'en',
    wordOrder: 'SVO',
    adpositionType: 'preposition',
    keywords: {
      select: { primary: 'select', alternatives: ['query'] },
      insert: { primary: 'insert', alternatives: ['add'] },
    },
    roleMarkers: {
      source: 'from',
      destination: 'to',
      condition: 'where',
    },
  },
  grammarProfile: {
    code: 'en',
    wordOrder: 'SVO',
    roleMarkers: {
      source: { marker: 'from' },
      destination: { marker: 'to' },
    },
  },
};
```

---

### CommandSchema

Defines a DSL command's structure.

```typescript
interface CommandSchema {
  readonly action: ActionType;
  readonly description: string;
  readonly roles: RoleSpec[];
  readonly primaryRole: SemanticRole;
  readonly category: string;
  readonly hasBody?: boolean;
  readonly notes?: string;
}
```

**Properties:**

- **action** - Command name (e.g., 'select', 'toggle', 'fetch')
- **description** - Human-readable description
- **roles** - Array of role specifications
- **primaryRole** - The main role (what the command acts on)
- **category** - Category for grouping (e.g., 'data', 'dom', 'animation')
- **hasBody** (optional) - Whether command has a body (like event handlers, blocks)
- **notes** (optional) - Special handling notes

**Example:**

```typescript
const selectSchema: CommandSchema = {
  action: 'select',
  description: 'Select data from a source',
  primaryRole: 'columns',
  category: 'data',
  roles: [
    {
      role: 'columns',
      description: 'Columns to select',
      required: true,
      expectedTypes: ['expression'],
    },
    {
      role: 'source',
      description: 'Data source',
      required: true,
      expectedTypes: ['literal', 'selector'],
      markerOverride: { en: 'from', ja: 'から' },
    },
    {
      role: 'condition',
      description: 'Filter condition',
      required: false,
      expectedTypes: ['expression'],
      markerOverride: { en: 'where', ja: 'で' },
    },
  ],
};
```

---

### RoleSpec

Specification for a semantic role in a command.

```typescript
interface RoleSpec {
  readonly role: SemanticRole;
  readonly description: string;
  readonly required: boolean;
  readonly expectedTypes: Array<ExpectedType>;
  readonly default?: SemanticValue;
  readonly svoPosition?: number;
  readonly sovPosition?: number;
  readonly markerOverride?: Record<string, string>;
  readonly renderOverride?: Record<string, string>;
}
```

**Properties:**

- **role** - Semantic role name (e.g., 'patient', 'source', 'destination')
- **description** - What this role represents
- **required** - Whether this role must be present
- **expectedTypes** - Expected value types (`'literal'`, `'selector'`, `'expression'`, etc.)
- **default** (optional) - Default value if not provided
- **svoPosition** (optional) - Position hint for SVO languages (higher = earlier)
- **sovPosition** (optional) - Position hint for SOV languages (higher = earlier)
- **markerOverride** (optional) - Override default role marker per language
- **renderOverride** (optional) - Override rendering marker separately from parsing

**Expected Types:**

- `'literal'` - String, number, boolean
- `'selector'` - CSS selector, identifier
- `'reference'` - Variable reference
- `'property-path'` - Object property access
- `'expression'` - Complex expression

**Example:**

```typescript
const sourceRole: RoleSpec = {
  role: 'source',
  description: 'Data source to select from',
  required: true,
  expectedTypes: ['literal', 'selector'],
  svoPosition: 2, // After action and columns in SVO
  sovPosition: 1, // Before action and columns in SOV
  markerOverride: {
    en: 'from',
    es: 'de',
    ja: 'から',
    ko: '에서',
  },
};
```

---

## Semantic Types

### SemanticNode

Base interface for all semantic AST nodes.

```typescript
interface SemanticNode {
  readonly kind: 'command' | 'event-handler' | 'conditional' | 'compound' | 'loop';
  readonly action: ActionType;
  readonly roles: ReadonlyMap<SemanticRole, SemanticValue>;
  readonly metadata?: SemanticMetadata;
}
```

**Specialized nodes:**

```typescript
// Simple command
interface CommandSemanticNode extends SemanticNode {
  readonly kind: 'command';
}

// Event handler with body
interface EventHandlerSemanticNode extends SemanticNode {
  readonly kind: 'event-handler';
  readonly body: SemanticNode[];
  readonly eventModifiers?: EventModifiers;
}

// Conditional (if/then/else)
interface ConditionalSemanticNode extends SemanticNode {
  readonly kind: 'conditional';
  readonly thenBranch: SemanticNode[];
  readonly elseBranch?: SemanticNode[];
}

// Multiple statements chained together
interface CompoundSemanticNode extends SemanticNode {
  readonly kind: 'compound';
  readonly statements: SemanticNode[];
  readonly chainType: 'then' | 'and' | 'async' | 'sequential';
}

// Loop (repeat/for/while)
interface LoopSemanticNode extends SemanticNode {
  readonly kind: 'loop';
  readonly loopVariant: 'forever' | 'times' | 'for' | 'while' | 'until';
  readonly body: SemanticNode[];
  readonly loopVariable?: string;
  readonly indexVariable?: string;
}
```

---

### SemanticValue

Language-neutral typed values.

```typescript
type SemanticValue =
  | LiteralValue
  | SelectorValue
  | ReferenceValue
  | PropertyPathValue
  | ExpressionValue;

interface LiteralValue {
  readonly type: 'literal';
  readonly value: string | number | boolean;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'duration';
}

interface SelectorValue {
  readonly type: 'selector';
  readonly value: string;
  readonly selectorKind?: 'id' | 'class' | 'attribute' | 'element' | 'complex' | 'identifier';
}

interface ReferenceValue {
  readonly type: 'reference';
  readonly value: string;
}

interface PropertyPathValue {
  readonly type: 'property-path';
  readonly object: SemanticValue;
  readonly property: string;
}

interface ExpressionValue {
  readonly type: 'expression';
  readonly raw: string;
}
```

---

### SemanticRole

Generic semantic role string. Common roles include:

**Core Thematic Roles:**

- `'action'` - The command/verb
- `'patient'` - What is acted upon
- `'destination'` - Where something goes
- `'source'` - Where something comes from
- `'event'` - Trigger event
- `'condition'` - Boolean expression

**Quantitative Roles:**

- `'quantity'` - Numeric amount
- `'duration'` - Time span

**Adverbial/Modifier Roles:**

- `'style'` - Animation/behavior style
- `'manner'` - Insertion position
- `'method'` - HTTP method/technique
- `'responseType'` - Response format

**DSL-Specific Roles:**
Each DSL can define its own roles (e.g., `'columns'`, `'table'`, `'orderBy'` for SQL).

---

## Dependency Injection

### Dictionary

Provides keyword translation between languages.

```typescript
interface Dictionary {
  lookup(localizedWord: string, language: string): string | undefined;
  translate(canonical: string, targetLanguage: string): string | undefined;
  getAllTranslations(word: string, sourceLanguage: string): Record<string, string>;
  getCategory?(word: string, language: string): string | undefined;
}
```

**Built-in implementations:**

```typescript
// In-memory dictionary
const dict = new InMemoryDictionary({
  en: { select: 'select', insert: 'insert' },
  es: { select: 'seleccionar', insert: 'insertar' },
  ja: { select: '選択', insert: '挿入' },
});

// Null dictionary (single-language DSL)
const nullDict = new NullDictionary();
```

**Custom implementation:**

```typescript
class DatabaseDictionary implements Dictionary {
  constructor(private db: Database) {}

  async lookup(word: string, language: string): Promise<string | undefined> {
    return await this.db.query(
      'SELECT canonical FROM translations WHERE localized = ? AND lang = ?',
      [word, language]
    );
  }

  // ... implement other methods
}
```

---

### ProfileProvider

Provides language profiles for grammar transformation.

```typescript
interface ProfileProvider {
  getProfile(language: string): LanguageProfile | undefined;
  getSupportedLanguages(): string[];
}
```

**Built-in implementations:**

```typescript
// In-memory provider
const provider = new InMemoryProfileProvider({
  en: englishProfile,
  ja: japaneseProfile,
  es: spanishProfile,
});
```

---

### ValueExtractor

Extracts typed values from token streams during tokenization.

```typescript
interface ValueExtractor {
  readonly name: string;
  readonly priority: number;
  extract(input: string, position: number): ValueExtractionResult | null;
}

interface ValueExtractionResult {
  readonly value: string;
  readonly length: number;
  readonly kind: TokenKind;
  readonly metadata?: Record<string, unknown>;
}
```

**Example:**

```typescript
class EmailExtractor implements ValueExtractor {
  name = 'email';
  priority = 10;

  extract(input: string, position: number): ValueExtractionResult | null {
    const remaining = input.slice(position);
    const match = remaining.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    if (match) {
      return {
        value: match[0],
        length: match[0].length,
        kind: 'literal',
        metadata: { dataType: 'email' },
      };
    }

    return null;
  }
}

// Use in DSL config
const dsl = createMultilingualDSL({
  schemas: [...],
  languages: [...],
  valueExtractors: [new EmailExtractor()],
});
```

See [EXTRACTORS.md](./EXTRACTORS.md) for comprehensive guide.

---

### CodeGenerator

Transforms semantic AST to target code.

```typescript
interface CodeGenerator {
  generate(node: SemanticNode): string;
}
```

**Example:**

```typescript
class SQLGenerator implements CodeGenerator {
  generate(node: SemanticNode): string {
    if (node.action === 'select') {
      const columns = node.roles.get('columns');
      const source = node.roles.get('source');
      const condition = node.roles.get('condition');

      let sql = `SELECT ${this.renderValue(columns)} FROM ${this.renderValue(source)}`;

      if (condition) {
        sql += ` WHERE ${this.renderValue(condition)}`;
      }

      return sql;
    }

    throw new Error(`Unknown action: ${node.action}`);
  }

  private renderValue(value: SemanticValue): string {
    switch (value.type) {
      case 'literal': return String(value.value);
      case 'expression': return value.raw;
      case 'selector': return value.value;
      default: throw new Error(`Unsupported value type: ${value.type}`);
    }
  }
}

// Use in DSL config
const dsl = createMultilingualDSL({
  schemas: [...],
  languages: [...],
  codeGenerator: new SQLGenerator(),
});
```

---

## Helper Functions

### Creating Semantic Values

```typescript
import {
  createLiteral,
  createSelector,
  createReference,
  createPropertyPath,
  createExpression,
} from '@lokascript/framework/core/types';

const literal = createLiteral('hello', 'string');
// → { type: 'literal', value: 'hello', dataType: 'string' }

const selector = createSelector('.active', 'class');
// → { type: 'selector', value: '.active', selectorKind: 'class' }

const ref = createReference('myVariable');
// → { type: 'reference', value: 'myVariable' }

const propPath = createPropertyPath(ref, 'length');
// → { type: 'property-path', object: { ... }, property: 'length' }

const expr = createExpression('x + y * 2');
// → { type: 'expression', raw: 'x + y * 2' }
```

### Creating Semantic Nodes

```typescript
import {
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createCompoundNode,
  createLoopNode,
} from '@lokascript/framework/core/types';

// Simple command
const toggleCmd = createCommandNode(
  'toggle',
  {
    patient: createSelector('.active'),
    destination: createSelector('#button'),
  },
  { sourceLanguage: 'en' }
);

// Event handler
const clickHandler = createEventHandlerNode(
  'on',
  { event: createLiteral('click') },
  [toggleCmd],
  { sourceLanguage: 'en' },
  { once: true }
);

// Conditional
const conditional = createConditionalNode(
  'if',
  { condition: createExpression('x > 5') },
  [toggleCmd],
  [
    /* else branch */
  ],
  { sourceLanguage: 'en' }
);

// Compound
const sequence = createCompoundNode([cmd1, cmd2, cmd3], 'sequential');

// Loop
const loop = createLoopNode(
  'repeat',
  { quantity: createLiteral(10, 'number') },
  'times',
  [toggleCmd],
  undefined,
  'index'
);
```

---

## Advanced Usage

### Custom Tokenizer

```typescript
import { BaseTokenizer } from '@lokascript/framework/core/tokenization';

class MyLanguageTokenizer extends BaseTokenizer {
  constructor() {
    super({
      language: 'mylang',
      direction: 'ltr',
      keywords: {
        select: 'SELECT',
        from: 'FROM',
      },
    });
  }

  protected isWordChar(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }

  protected normalizeWord(word: string): string {
    return word.toUpperCase();
  }
}
```

### Pattern Generation Options

```typescript
const dsl = createMultilingualDSL({
  schemas: [selectSchema, insertSchema],
  languages: [englishConfig, spanishConfig],

  // Disable auto-generation
  generatePatterns: false,

  // Provide custom patterns
  customPatterns: [
    {
      id: 'select-advanced',
      language: 'en',
      command: 'select',
      priority: 10,
      template: {
        format: 'select [columns] from [source] where [condition]',
        tokens: [...],
      },
      extraction: {...},
    },
  ],
});
```

### Dependency Injection

```typescript
const dsl = createMultilingualDSL({
  schemas: [...],
  languages: [...],

  // Inject custom dictionary
  dictionary: new DatabaseDictionary(db),

  // Inject custom profile provider
  profileProvider: new CloudProfileProvider(apiKey),

  // Inject custom extractors
  valueExtractors: [
    new EmailExtractor(),
    new URLExtractor(),
    new DateExtractor(),
  ],

  // Inject code generator
  codeGenerator: new OptimizingSQLGenerator(),
});
```

### Error Handling

```typescript
// Validation-first approach
const validation = dsl.validate(input, 'en');
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Try-catch approach
try {
  const node = dsl.parse(input, 'en');
  // Process node...
} catch (error) {
  if (error.message.includes('No pattern matched')) {
    console.error('Invalid syntax:', input);
  } else if (error.message.includes('No tokenizer')) {
    console.error('Language not supported');
  }
}

// Compilation with error handling
const result = dsl.compile(input, 'en');
if (result.ok) {
  executeSQL(result.code);
} else {
  showErrorToUser(result.errors);
}
```

### Metadata and Debugging

```typescript
const { node, confidence } = dsl.parseWithConfidence(input, 'en');

console.log('Source:', node.metadata?.sourceText);
console.log('Language:', node.metadata?.sourceLanguage);
console.log('Pattern:', node.metadata?.patternId);
console.log('Confidence:', node.metadata?.confidence);
console.log('Position:', node.metadata?.sourcePosition);

// Low confidence warning
if (confidence < 0.8) {
  console.warn('Low confidence parse - consider reviewing input');
}
```

---

## See Also

- [Language Profiles Guide](./LANGUAGE_PROFILES.md) - Adding new languages
- [Grammar Transformation](./GRAMMAR.md) - Word order and markers
- [Extractor Guide](./EXTRACTORS.md) - Custom value extraction
- [Examples](../examples/) - Complete DSL examples
