/**
 * SQL DSL Test Fixture
 *
 * Reusable SQL DSL configuration for integration tests.
 * Based on examples/sql-dsl/simple-sql.ts
 */

import {
  createMultilingualDSL,
  defineCommand,
  defineRole,
  BaseTokenizer,
  getDefaultExtractors,
  type SemanticNode,
  type MultilingualDSL,
} from '../../index';

// =============================================================================
// Command Schemas
// =============================================================================

export const selectCommand = defineCommand({
  action: 'select',
  description: 'Retrieve data from a table',
  category: 'query',
  primaryRole: 'columns',
  roles: [
    defineRole({
      role: 'columns',
      description: 'Columns to select',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'source',
      description: 'Table to select from',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: { en: 'from', es: 'de' },
    }),
    defineRole({
      role: 'condition',
      description: 'WHERE clause condition',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: { en: 'where', es: 'donde' },
    }),
  ],
});

// =============================================================================
// Tokenizers
// =============================================================================

class EnglishSQLTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getDefaultExtractors());
  }

  classifyToken(token: string): 'keyword' | 'identifier' | 'literal' | 'operator' {
    const keywords = ['select', 'from', 'where'];
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
    this.registerExtractors(getDefaultExtractors());
  }

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
// Language Profiles
// =============================================================================

const englishProfile = {
  code: 'en',
  wordOrder: 'SVO' as const,
  keywords: {
    select: { primary: 'select' },
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
  },
  roleMarkers: {
    source: { primary: 'de', position: 'before' as const },
    condition: { primary: 'donde', position: 'before' as const },
  },
};

// =============================================================================
// Code Generator
// =============================================================================

function generateSQL(node: SemanticNode): string {
  if (node.action === 'select') {
    const columns = node.roles.get('columns');
    const source = node.roles.get('source');
    const condition = node.roles.get('condition');

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
// SQL DSL Instance
// =============================================================================

export function createSQLDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'SQL DSL Test Fixture',
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
}

// =============================================================================
// Test Data
// =============================================================================

export const testQueries = {
  english: {
    simple: 'select name from users',
    withWhere: 'select name from users where age > 18',
    multipleColumns: 'select name, email from users',
  },
  spanish: {
    simple: 'seleccionar nombre de usuarios',
    withWhere: 'seleccionar nombre de usuarios donde edad > 18',
    multipleColumns: 'seleccionar nombre, email de usuarios',
  },
};

export const expectedSQL = {
  simple: 'SELECT name FROM users',
  withWhere: 'SELECT name FROM users WHERE age > 18',
  multipleColumns: 'SELECT name, email FROM users',
};

export const expectedNodes = {
  simple: {
    action: 'select',
    roles: {
      columns: 'name',
      source: 'users',
    },
  },
  withWhere: {
    action: 'select',
    roles: {
      columns: 'name',
      source: 'users',
      condition: 'age > 18',
    },
  },
};
