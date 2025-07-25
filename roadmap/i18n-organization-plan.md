# Hyperfixi I18n Code Organization Plan

## Overview

This document outlines how to properly organize internationalization (i18n) code within the Hyperfixi monorepo structure, ensuring clean separation of concerns, reusability, and maintainability.

## Proposed Structure

```
hyperfixi/
├── packages/
│   ├── i18n/                      # Core i18n package
│   │   ├── src/
│   │   │   ├── index.ts          # Main exports
│   │   │   ├── translator.ts     # Core translation engine
│   │   │   ├── types.ts          # TypeScript definitions
│   │   │   ├── dictionaries/     # Language dictionaries
│   │   │   │   ├── index.ts      # Dictionary registry
│   │   │   │   ├── es.ts         # Spanish
│   │   │   │   ├── ko.ts         # Korean
│   │   │   │   ├── zh.ts         # Chinese (Simplified)
│   │   │   │   ├── zh-TW.ts      # Chinese (Traditional)
│   │   │   │   ├── ja.ts         # Japanese
│   │   │   │   ├── fr.ts         # French
│   │   │   │   ├── de.ts         # German
│   │   │   │   ├── pt.ts         # Portuguese
│   │   │   │   ├── hi.ts         # Hindi
│   │   │   │   └── ar.ts         # Arabic
│   │   │   ├── validators/        # Dictionary validation
│   │   │   │   ├── index.ts
│   │   │   │   └── schema.ts     # Dictionary schema
│   │   │   ├── utils/            # Utility functions
│   │   │   │   ├── locale.ts     # Locale detection/parsing
│   │   │   │   ├── rtl.ts        # RTL language support
│   │   │   │   └── plurals.ts    # Pluralization rules
│   │   │   └── plugins/          # Framework integrations
│   │   │       ├── vite.ts       # Vite plugin
│   │   │       ├── webpack.ts    # Webpack plugin
│   │   │       └── rollup.ts     # Rollup plugin
│   │   ├── tests/
│   │   │   ├── translator.test.ts
│   │   │   ├── dictionaries.test.ts
│   │   │   └── integration.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── lsp/                       # LSP with i18n support
│   │   └── src/
│   │       ├── providers/
│   │       │   └── i18n-provider.ts
│   │       └── i18n/
│   │           ├── completions.ts  # Multi-language completions
│   │           ├── diagnostics.ts  # I18n-aware diagnostics
│   │           └── hover.ts        # Translation hover info
│   │
│   ├── ast-toolkit/               # AST with i18n support
│   │   └── src/
│   │       └── i18n/
│   │           ├── parser.ts      # I18n-aware parser
│   │           └── analyzer.ts    # Multi-language analyzer
│   │
│   └── core/                      # Core with i18n integration
│       └── src/
│           └── i18n/
│               └── runtime.ts     # Runtime i18n support
│
├── apps/
│   ├── playground/
│   │   └── src/
│   │       └── i18n/
│   │           ├── config.ts      # I18n configuration
│   │           └── examples/      # Multi-language examples
│   │
│   └── docs/
│       └── i18n/                  # Internationalized docs
│           ├── es/               # Spanish docs
│           ├── ko/               # Korean docs
│           └── zh/               # Chinese docs
│
└── tools/
    └── i18n/
        ├── scripts/
        │   ├── validate-dictionaries.ts
        │   ├── generate-types.ts
        │   └── sync-translations.ts
        └── cli/
            └── translate.ts       # CLI translation tool
```

## Package Details

### 1. Core I18n Package (`packages/i18n`)

**Purpose**: Central i18n functionality for all Hyperfixi packages

**Key Components**:

```typescript
// packages/i18n/src/types.ts
export interface Dictionary {
  [key: string]: string | Dictionary;
}

export interface I18nConfig {
  locale: string;
  fallbackLocale?: string;
  dictionaries?: Record<string, Dictionary>;
  detectLocale?: boolean;
  rtlLocales?: string[];
}

export interface TranslationOptions {
  from?: string;
  to: string;
  preserveOriginal?: boolean;
  validate?: boolean;
}

// packages/i18n/src/translator.ts
export class HyperscriptTranslator {
  constructor(config: I18nConfig);
  
  translate(text: string, options: TranslationOptions): string;
  translateAST(ast: ASTNode, targetLocale: string): ASTNode;
  validateDictionary(locale: string): ValidationResult;
  addDictionary(locale: string, dictionary: Dictionary): void;
  detectLanguage(text: string): string;
  isRTL(locale: string): boolean;
}

// packages/i18n/src/dictionaries/es.ts
export const es: Dictionary = {
  // Commands
  commands: {
    on: 'en',
    tell: 'decir',
    take: 'tomar',
    put: 'poner',
    set: 'establecer',
    if: 'si',
    else: 'sino',
    end: 'fin',
    // ... complete dictionary
  },
  
  // Modifiers
  modifiers: {
    to: 'a',
    from: 'de',
    into: 'en',
    with: 'con',
    // ...
  },
  
  // Events
  events: {
    click: 'clic',
    change: 'cambio',
    hover: 'flotar',
    // ...
  }
};
```

### 2. LSP I18n Integration

```typescript
// packages/lsp/src/providers/i18n-provider.ts
export class I18nLanguageProvider {
  private translator: HyperscriptTranslator;
  
  constructor(locale: string) {
    this.translator = new HyperscriptTranslator({ locale });
  }
  
  async provideCompletions(
    document: TextDocument,
    position: Position
  ): Promise<CompletionItem[]> {
    const context = this.getContext(document, position);
    return this.translator.getCompletions(context);
  }
  
  async provideHover(
    document: TextDocument,
    position: Position
  ): Promise<Hover | null> {
    const word = this.getWordAt(document, position);
    const translation = this.translator.getTranslation(word);
    
    if (translation) {
      return {
        contents: {
          kind: 'markdown',
          value: `**${word}** → \`${translation}\``
        }
      };
    }
    
    return null;
  }
}
```

### 3. Build Tool Plugins

```typescript
// packages/i18n/src/plugins/vite.ts
export function hyperscriptI18nPlugin(options: I18nPluginOptions) {
  return {
    name: 'hyperscript-i18n',
    
    transform(code: string, id: string) {
      if (id.endsWith('.html')) {
        return transformHyperscriptI18n(code, options);
      }
    },
    
    configureServer(server) {
      // Add middleware for runtime translation
      server.middlewares.use(i18nMiddleware(options));
    }
  };
}
```

### 4. CLI Tools

```typescript
// tools/i18n/cli/translate.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { HyperscriptTranslator } from '@hyperfixi/i18n';

const program = new Command();

program
  .name('hyperfixi-translate')
  .description('Translate hyperscript between languages')
  .version('1.0.0');

program
  .command('file <input> <output>')
  .option('-f, --from <locale>', 'source locale', 'en')
  .option('-t, --to <locale>', 'target locale', 'es')
  .action(async (input, output, options) => {
    const translator = new HyperscriptTranslator({
      locale: options.from
    });
    
    const content = await fs.readFile(input, 'utf8');
    const translated = translator.translate(content, {
      to: options.to
    });
    
    await fs.writeFile(output, translated);
  });

program.parse();
```

## Integration Points

### 1. Parser Integration

```typescript
// packages/ast-toolkit/src/i18n/parser.ts
export class I18nAwareParser extends Parser {
  private translator: HyperscriptTranslator;
  
  constructor(locale: string = 'en') {
    super();
    this.translator = new HyperscriptTranslator({ locale });
  }
  
  parse(source: string): ASTNode {
    // Detect source language
    const detectedLocale = this.translator.detectLanguage(source);
    
    // Translate to English for parsing if needed
    const englishSource = detectedLocale !== 'en'
      ? this.translator.translate(source, { to: 'en' })
      : source;
    
    // Parse English hyperscript
    const ast = super.parse(englishSource);
    
    // Attach locale metadata
    ast.metadata = {
      ...ast.metadata,
      sourceLocale: detectedLocale,
      isTranslated: detectedLocale !== 'en'
    };
    
    return ast;
  }
}
```

### 2. Runtime Integration

```typescript
// packages/core/src/i18n/runtime.ts
export class I18nRuntime {
  private translator: HyperscriptTranslator;
  
  enableI18n(config: I18nConfig) {
    this.translator = new HyperscriptTranslator(config);
    
    // Override attribute processing
    this.interceptAttributeProcessing((element, attrValue) => {
      const locale = this.detectElementLocale(element);
      
      if (locale && locale !== 'en') {
        return this.translator.translate(attrValue, {
          from: locale,
          to: 'en'
        });
      }
      
      return attrValue;
    });
  }
}
```

## Testing Strategy

### 1. Unit Tests

```typescript
// packages/i18n/tests/translator.test.ts
describe('HyperscriptTranslator', () => {
  it('should translate Spanish to English', () => {
    const translator = new HyperscriptTranslator({ locale: 'es' });
    
    expect(translator.translate('en clic alternar .activo', { to: 'en' }))
      .toBe('on click toggle .activo');
  });
  
  it('should handle nested expressions', () => {
    const input = `
      si verdadero entonces
        establecer x a 5
      sino
        establecer x a 10
      fin
    `;
    
    const expected = `
      if true then
        set x to 5
      else
        set x to 10
      end
    `;
    
    expect(translator.translate(input, { to: 'en' }))
      .toBe(expected);
  });
});
```

### 2. Integration Tests

```typescript
// packages/i18n/tests/integration.test.ts
describe('I18n Integration', () => {
  it('should work with parser', async () => {
    const parser = new I18nAwareParser('es');
    const ast = parser.parse('en clic alternar .activo');
    
    expect(ast.type).toBe('Program');
    expect(ast.metadata.sourceLocale).toBe('es');
  });
  
  it('should work with LSP', async () => {
    const provider = new I18nLanguageProvider('ko');
    const completions = await provider.provideCompletions(
      document,
      position
    );
    
    expect(completions).toContainEqual(
      expect.objectContaining({
        label: '클릭',
        detail: 'click'
      })
    );
  });
});
```

## Migration Plan

### Phase 1: Core Package (Week 1)
1. Create `packages/i18n` structure
2. Move existing i18n code to package
3. Implement core translator
4. Add initial dictionaries (es, ko, zh)

### Phase 2: Integration (Week 2)
1. Update parser for i18n awareness
2. Add LSP i18n providers
3. Create build tool plugins
4. Update runtime for i18n support

### Phase 3: Tooling (Week 3)
1. Create CLI translation tool
2. Add dictionary validation scripts
3. Build documentation generator
4. Create playground examples

### Phase 4: Extended Languages (Week 4)
1. Add more language dictionaries
2. Implement RTL support
3. Add pluralization rules
4. Create community contribution guide

## Benefits

1. **Clean Separation**: I18n code isolated in dedicated package
2. **Reusability**: All packages can import from `@hyperfixi/i18n`
3. **Type Safety**: Full TypeScript support with generated types
4. **Extensibility**: Easy to add new languages
5. **Tool Integration**: Works with all build tools
6. **Testing**: Comprehensive test coverage
7. **Documentation**: Auto-generated multilingual docs

## Community Contribution

```markdown
# Contributing Translations

1. Fork the repository
2. Create dictionary file: `packages/i18n/src/dictionaries/[locale].ts`
3. Follow the template structure
4. Add tests for your language
5. Submit PR with examples

## Dictionary Template

```typescript
export const locale: Dictionary = {
  commands: {
    // All command keywords
  },
  modifiers: {
    // All modifier keywords
  },
  events: {
    // All event keywords
  },
  // ... other categories
};
```
```

This organization ensures that i18n is a first-class citizen in Hyperfixi while maintaining clean architecture and enabling easy community contributions.
