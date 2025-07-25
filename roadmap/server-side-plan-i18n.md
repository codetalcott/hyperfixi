# Updated Architecture Strategy for Server-Side Hyperscript Integration with I18n

## Overview

This updated plan incorporates internationalization (i18n) support throughout the server-side hyperscript integration, enabling developers worldwide to write behaviors in their native languages.

### 1. **I18n-Aware Server-Side Script Generation**

Extend the server-side handler to support multiple languages:

```typescript
// Server-side view/handler with i18n support
export async function renderPage(request: Request) {
  // Detect user's preferred language
  const userLocale = request.headers.get('accept-language')?.split(',')[0] || 'en';
  
  // Define behaviors in the developer's preferred language
  const pageScripts = {
    // Spanish example
    searchBehavior: `
      en keyup en <input#search/> 
        si el evento's key es "Enter"
          buscar /api/search poner el resultado en <#results/>
        sino
          esperar 300ms entonces 
            buscar /api/search?q={yo.value} poner el resultado en <#results/>
    `,
    
    // Korean example  
    modalBehavior: `
      behavior modal
        클릭 on <.modal-trigger/>
          show <#modal/> with *opacity transition
        클릭 on <.modal-close/> 또는 on escape
          hide <#modal/> with *opacity transition
      end
    `
  };

  // Compile with i18n support
  const compiledScripts = await compileHyperscripts(pageScripts, {
    sourceLocale: userLocale,
    targetLocale: 'en', // Always compile to English for runtime
    preserveOriginal: true // Keep original for debugging
  });
  
  return renderTemplate('page.html', {
    scripts: compiledScripts,
    locale: userLocale,
    data: await fetchPageData()
  });
}
```

### 2. **I18n-Enhanced AST Processing**

Update the AST processor to handle internationalized scripts:

```typescript
export class I18nServerHyperscriptProcessor extends ServerHyperscriptProcessor {
  private translator: HyperscriptI18n;
  
  constructor(options: ProcessorOptions) {
    super(options);
    this.translator = new HyperscriptI18n(options.sourceLocale);
  }
  
  async processViewScripts(scripts: Record<string, string>, locale: string) {
    const processed: Record<string, ProcessedScript> = {};
    
    for (const [name, script] of Object.entries(scripts)) {
      // Translate to English first
      const englishScript = this.translator.translate(script);
      
      // Parse and analyze the English version
      const ast = await this.astToolkit.parse(englishScript);
      const analysis = await this.astToolkit.analyze(ast);
      
      // Store both versions
      processed[name] = {
        original: script,
        originalLocale: locale,
        translated: englishScript,
        optimized: await this.optimize(ast),
        metadata: {
          complexity: analysis.complexity,
          keywords: this.extractLocalizedKeywords(script, locale)
        }
      };
    }
    
    return processed;
  }
  
  // Extract keywords for documentation generation
  private extractLocalizedKeywords(script: string, locale: string): LocalizedKeywords {
    const keywords = new Set<string>();
    const dictionary = HyperscriptI18n.dictionaries[locale] || {};
    
    Object.keys(dictionary).forEach(keyword => {
      if (script.includes(keyword)) {
        keywords.add(keyword);
      }
    });
    
    return {
      locale,
      keywords: Array.from(keywords),
      translations: Object.fromEntries(
        Array.from(keywords).map(k => [k, dictionary[k]])
      )
    };
  }
}
```

### 3. **Multi-Language Template Engine Extension**

Create a template engine that supports multiple languages:

```typescript
export class I18nHyperscriptTemplateEngine extends HyperscriptTemplateEngine {
  private i18nProcessor: I18nServerHyperscriptProcessor;
  
  async render(template: string, context: ViewContext): Promise<string> {
    // Detect script language from template metadata or context
    const locale = context.locale || this.detectLocale(template);
    
    // Extract scripts with language hints
    const { html, scripts, locales } = await this.extractI18nScripts(template);
    
    // Process each script with its detected language
    const processedScripts = await this.processI18nScripts(scripts, locales);
    
    // Inject with locale metadata
    return this.renderWithI18nContext(html, {
      ...context,
      scripts: processedScripts,
      locale,
      translations: await this.loadTranslations(locale)
    });
  }
  
  private async extractI18nScripts(template: string): Promise<ExtractedI18nTemplate> {
    const scriptRegex = /@hyperscript\s+(\w+)(?:\s+lang="(\w+)")?([\\s\\S]*?)@end/g;
    const scripts: Record<string, string> = {};
    const locales: Record<string, string> = {};
    
    const html = template.replace(scriptRegex, (match, name, lang, content) => {
      scripts[name] = content.trim();
      locales[name] = lang || 'en';
      return `<!-- hyperscript:${name}:${lang || 'en'} -->`;
    });
    
    return { html, scripts, locales };
  }
}
```

### 4. **Language-Aware Development Tools**

Extend the LSP to provide multi-language support in templates:

```typescript
export class I18nServerHyperscriptExtension {
  activate(context: vscode.ExtensionContext) {
    // Get user's preferred language
    const config = vscode.workspace.getConfiguration('hyperscript');
    const devLocale = config.get('developmentLocale', 'en');
    
    // Register multi-language support
    const i18nProvider = new HyperscriptI18nLSP(devLocale);
    
    // Provide completions in developer's language
    vscode.languages.registerCompletionItemProvider(
      { pattern: '**/*.{html,django,jinja2}' },
      {
        async provideCompletionItems(document, position) {
          const scriptContext = await detectScriptContext(document, position);
          
          if (scriptContext) {
            // Provide completions in the detected language
            return i18nProvider.getCompletions({
              line: document.lineAt(position).text,
              character: position.character,
              locale: scriptContext.locale || devLocale
            });
          }
        }
      }
    );
    
    // Multi-language diagnostics
    const diagnosticProvider = new I18nDiagnosticProvider();
    vscode.languages.registerDiagnosticProvider(
      { pattern: '**/*.{html,django,jinja2}' },
      diagnosticProvider
    );
  }
}
```

### 5. **Django/Flask Integration with I18n**

```python
from hyperfixi import I18nHyperscriptHandler, get_user_locale

class LocalizedProductListView(I18nHyperscriptHandler):
    template_name = 'products/list.html'
    
    def get_hyperscript_context(self, request):
        # Get user's preferred language
        user_locale = get_user_locale(request)
        
        # Define behaviors in multiple languages
        behaviors = {
            'es': {
                'product_card': '''
                    en clic
                        alternar .selected en yo
                        si yo match .selected
                            enviar product-selected(id: mi @data-id)
                        sino
                            enviar product-deselected(id: mi @data-id)
                        fin
                ''',
                'infinite_scroll': '''
                    en intersection(intersecting) de bottom
                        si intersecting y no mi @data-loading
                            establecer mi @data-loading a "true"
                            buscar /products?page={mi @data-page}
                            poner lo al final de yo
                            incrementar mi @data-page
                            establecer mi @data-loading a "false"
                        fin
                '''
            },
            'ko': {
                'product_card': '''
                    클릭
                        toggle .selected on me
                        만약 I match .selected
                            send product-selected(id: my @data-id)
                        아니면
                            send product-deselected(id: my @data-id)
                        end
                '''
            }
        }
        
        # Select behaviors based on user locale
        user_behaviors = behaviors.get(user_locale, behaviors.get('en', {}))
        
        return {
            'behaviors': user_behaviors,
            'locale': user_locale,
            'components': self.build_components()
        }
```

### 6. **Build Pipeline with I18n Support**

Update the build process to handle multiple languages:

```typescript
// Build configuration
export const hyperscriptBuildConfig = {
  i18n: {
    // Languages to build
    locales: ['en', 'es', 'ko', 'zh'],
    
    // Source language for your team
    sourceLocale: 'es',
    
    // Build outputs
    outputs: {
      // Single bundle with all translations
      bundle: 'dist/hyperscript-i18n.js',
      
      // Separate bundles per language
      split: true,
      splitPattern: 'dist/hyperscript-[locale].js'
    },
    
    // Translation validation
    validation: {
      // Ensure all keywords are translated
      requireComplete: true,
      
      // Validate against hyperscript grammar
      validateGrammar: true
    }
  }
};

// Build task
export async function buildI18nHyperscript() {
  const builder = new HyperscriptI18nBuilder({
    sourceLocale: config.i18n.sourceLocale,
    preserveOriginal: true
  });
  
  // Process all view files
  const results = await builder.processDirectory(
    'src/views',
    'dist/views',
    {
      pattern: '**/*.{html,py,ts}',
      locales: config.i18n.locales
    }
  );
  
  // Generate language packs
  await generateLanguagePacks(results);
  
  // Generate documentation in multiple languages
  await generateI18nDocs(results);
}
```

### 7. **Runtime Language Switching**

Support dynamic language switching without page reload:

```typescript
// Client-side language switcher
export class HyperscriptI18nRuntime {
  constructor(private currentLocale: string) {
    this.dictionaries = {};
  }
  
  async switchLanguage(newLocale: string) {
    // Load language pack if not cached
    if (!this.dictionaries[newLocale]) {
      this.dictionaries[newLocale] = await this.loadLanguagePack(newLocale);
    }
    
    // Find all hyperscript attributes
    const elements = document.querySelectorAll('[_], [script], [data-script]');
    
    elements.forEach(element => {
      // Get original script (preserved during build)
      const originalAttr = `_-${this.currentLocale}`;
      const original = element.getAttribute(originalAttr);
      
      if (original) {
        // Translate to new language
        const translated = this.translateScript(original, this.currentLocale, newLocale);
        
        // Update the hyperscript
        element.setAttribute('_', translated);
        
        // Re-process the element
        _hyperscript.processNode(element);
      }
    });
    
    this.currentLocale = newLocale;
  }
}
```

### 8. **Documentation Generation**

Generate documentation in multiple languages:

```typescript
export class I18nDocGenerator {
  async generateDocs(processedScripts: ProcessedScripts, locale: string) {
    const docs = {
      locale,
      behaviors: {},
      examples: {}
    };
    
    for (const [name, script] of Object.entries(processedScripts)) {
      // Generate docs in the original language
      docs.behaviors[name] = {
        description: await this.generateDescription(script, locale),
        syntax: {
          original: script.original,
          english: script.translated,
          locale: script.originalLocale
        },
        keywords: script.metadata.keywords,
        examples: await this.generateExamples(script, locale)
      };
    }
    
    return docs;
  }
}
```

## Benefits of I18n Integration

1. **Global Accessibility**: Developers can write hyperscript in their native language
2. **Team Flexibility**: International teams can collaborate using their preferred languages
3. **Better Adoption**: Lower barrier to entry for non-English speaking developers
4. **Maintained Performance**: Translation happens at build time, no runtime overhead
5. **IDE Support**: Full autocomplete and validation in multiple languages
6. **Documentation**: Auto-generated docs in multiple languages
7. **Debugging**: Original source preserved for easier debugging

## Migration Path

1. **Phase 1**: Add i18n support to build pipeline
2. **Phase 2**: Enable multi-language IDE support
3. **Phase 3**: Gradually translate existing scripts
4. **Phase 4**: Generate multi-language documentation
5. **Phase 5**: Enable runtime language switching

This integration ensures that hyperscript remains accessible to developers worldwide while maintaining all the benefits of server-side rendering and AST-based optimization.
