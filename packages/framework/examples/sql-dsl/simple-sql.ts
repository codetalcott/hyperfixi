/**
 * Simple SQL DSL Example
 *
 * Demonstrates that the framework is truly generic and works for non-hyperscript DSLs.
 * This SQL DSL has:
 * - No CSS selectors
 * - No DOM events
 * - No JavaScript-specific syntax
 * - Different semantic roles (columns, table, condition)
 */

import {
  createMultilingualDSL,
  defineCommand,
  defineRole,
  BaseTokenizer,
  getDefaultExtractors,
  type SemanticNode,
} from '../../src';

// =============================================================================
// 1. Define SQL Commands (Domain-Specific)
// =============================================================================

const selectCommand = defineCommand({
  action: 'select',
  description: 'Retrieve data from a table',
  category: 'query',
  primaryRole: 'columns',
  roles: [
    defineRole({
      role: 'columns',
      description: 'Columns to select',
      required: true,
      expectedTypes: ['expression'], // Changed from 'literal' to 'expression'
      svoPosition: 2, // Higher numbers come first in pattern
      sovPosition: 1,
    }),
    defineRole({
      role: 'source',
      description: 'Table to select from',
      required: true,
      expectedTypes: ['expression'], // Changed from 'selector' to 'expression'
      svoPosition: 1, // Lower numbers come later in pattern
      sovPosition: 2,
      markerOverride: { en: 'from', es: 'de', ja: 'から' },
    }),
    defineRole({
      role: 'condition',
      description: 'WHERE clause condition',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: { en: 'where', es: 'donde', ja: 'で' },
    }),
  ],
});

// =============================================================================
// 2. Create Tokenizers (Language-Specific)
// =============================================================================

class EnglishSQLTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Register default extractors - handles strings, numbers, operators, punctuation, identifiers
    this.registerExtractors(getDefaultExtractors());
  }

  // No need to implement tokenize() - uses extractor-based tokenization from BaseTokenizer

  classifyToken(token: string): 'keyword' | 'identifier' | 'literal' | 'operator' {
    const keywords = ['select', 'from', 'where', 'insert', 'update', 'delete'];
    if (keywords.includes(token.toLowerCase())) {
      return 'keyword';
    }
    if (/^\d+$/.test(token)) {
      return 'literal';
    }
    if (['>', '<', '=', '>=', '<=', '!='].includes(token)) {
      return 'operator';
    }
    return 'identifier';
  }
}

class SpanishSQLTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Register default extractors - handles strings, numbers, operators, punctuation, identifiers
    this.registerExtractors(getDefaultExtractors());
  }

  // No need to implement tokenize() - uses extractor-based tokenization from BaseTokenizer

  classifyToken(token: string): 'keyword' | 'identifier' | 'literal' | 'operator' {
    const keywords = ['seleccionar', 'de', 'donde'];
    if (keywords.includes(token.toLowerCase())) {
      return 'keyword';
    }
    if (/^\d+$/.test(token)) {
      return 'literal';
    }
    if (['>', '<', '=', '>=', '<=', '!='].includes(token)) {
      return 'operator';
    }
    return 'identifier';
  }
}

// =============================================================================
// 3. Create Language Profiles
// =============================================================================

const englishProfile = {
  code: 'en',
  wordOrder: 'SVO' as const,
  keywords: {
    select: { primary: 'select' },
    insert: { primary: 'insert' },
    update: { primary: 'update' },
    delete: { primary: 'delete' },
  },
  roleMarkers: {
    source: { primary: 'from', position: 'before' as const },
    condition: { primary: 'where', position: 'before' as const },
  },
};

const spanishProfile = {
  code: 'es',
  wordOrder: 'SVO' as const,
  keywords: {
    select: { primary: 'seleccionar' },
    insert: { primary: 'insertar' },
    update: { primary: 'actualizar' },
    delete: { primary: 'eliminar' },
  },
  roleMarkers: {
    source: { primary: 'de', position: 'before' as const },
    condition: { primary: 'donde', position: 'before' as const },
  },
};

// =============================================================================
// 4. Create Code Generator (Optional)
// =============================================================================

function generateSQL(node: SemanticNode): string {
  if (node.action === 'select') {
    const columns = node.roles.get('columns');
    const source = node.roles.get('source');
    const condition = node.roles.get('condition');

    // Extract the actual value from SemanticValue union types
    // For 'expression' type, we need to access the 'raw' property
    const columnsValue = columns ? ('raw' in columns ? columns.raw : columns.value) : '*';
    const sourceValue = source ? ('raw' in source ? source.raw : source.value) : 'table';
    
    let sql = `SELECT ${columnsValue} FROM ${sourceValue}`;

    if (condition) {
      const conditionValue = 'raw' in condition ? condition.raw : condition.value;
      sql += ` WHERE ${conditionValue}`;
    }

    return sql;
  }

  throw new Error(`Unknown SQL command: ${node.action}`);
}

// =============================================================================
// 5. Create SQL DSL Instance
// =============================================================================

export const sqlDSL = createMultilingualDSL({
  name: 'Simple SQL DSL',
  schemas: [selectCommand],
  languages: [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      tokenizer: new EnglishSQLTokenizer(),
      patternProfile: englishProfile,
    },
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      tokenizer: new SpanishSQLTokenizer(),
      patternProfile: spanishProfile,
    },
  ],
  codeGenerator: {
    generate: generateSQL,
  },
});

// =============================================================================
// 6. Usage Examples
// =============================================================================

// Parse English
const englishQuery = sqlDSL.parse('select name from users', 'en');
console.log('English parsed:', englishQuery);
// → { action: 'select', roles: { columns: 'name', source: 'users' } }

// Parse Spanish
const spanishQuery = sqlDSL.parse('seleccionar nombre de usuarios', 'es');
console.log('Spanish parsed:', spanishQuery);
// → { action: 'select', roles: { columns: 'nombre', source: 'usuarios' } }

// Compile to SQL
const sql = sqlDSL.compile('select name from users', 'en');
console.log('Generated SQL:', sql);
// → { ok: true, code: 'SELECT name FROM users' }

// Validate
const valid = sqlDSL.validate('select name from users', 'en');
console.log('Validation:', valid);
// → { valid: true, node: {...} }

// Get supported languages
console.log('Supported languages:', sqlDSL.getSupportedLanguages());
// → ['en', 'es']
