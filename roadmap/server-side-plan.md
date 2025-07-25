# Architecture Strategy for Server-Side Hyperscript Integration

### 1. **Server-Side Script Generation with Template Integration**

You can leverage your existing template compiler to embed Hyperscript directly into server-rendered HTML. Here's the approach:

```typescript
// Server-side view/handler
export async function renderPage(request: Request) {
  // Define your hyperscript behaviors at the view level
  const pageScripts = {
    // Component-specific behaviors
    searchBehavior: `
      on keyup in <input#search/> 
        if the event's key is "Enter"
          fetch /api/search put the result into <#results/>
        else
          debounce 300ms then 
            fetch /api/search?q={me.value} put the result into <#results/>
    `,
    
    // Page-level interactions
    modalBehavior: `
      behavior modal
        on click on <.modal-trigger/>
          show <#modal/> with *opacity transition
        on click on <.modal-close/> or on escape
          hide <#modal/> with *opacity transition
      end
    `,
    
    // Form enhancements
    formValidation: `
      on submit on <form.validated/>
        halt the event
        if not all <input:required/> in me have a value
          add .error to the first <input:required:empty/> in me
          focus() the first <input:required:empty/> in me
        else
          send submit to me
    `
  };

  // Compile scripts using your AST toolkit
  const compiledScripts = await compileHyperscripts(pageScripts);
  
  // Render template with integrated scripts
  return renderTemplate('page.html', {
    scripts: compiledScripts,
    data: await fetchPageData()
  });
}
```

### 2. **Enhanced Template Engine Integration**

Extend your template compiler to handle inline Hyperscript directives:

```html
<!-- Enhanced template syntax -->
<div class="search-container">
  <input 
    id="search" 
    type="text" 
    _="{{scripts.searchBehavior}}"
  />
  <div id="results">
    <!-- Server-rendered initial results -->
    {{#each results}}
      <div class="result-item" _="on click add .selected to me">
        {{title}}
      </div>
    {{/each}}
  </div>
</div>

<!-- Or use template directives -->
@hyperscript searchBehavior
  on keyup 
    if the event's key is "Enter"
      fetch /api/search put the result into <#results/>
@end

<input id="search" _="install searchBehavior" />
```

### 3. **AST-Based Script Optimization**

Use your AST toolkit to optimize and validate scripts at build time:

```typescript
// Script processor for server-side rendering
export class ServerHyperscriptProcessor {
  private astToolkit: ASTToolkit;
  private lsp: LSPIntegration;
  
  async processViewScripts(scripts: Record<string, string>) {
    const processed: Record<string, ProcessedScript> = {};
    
    for (const [name, script] of Object.entries(scripts)) {
      // Parse and analyze
      const ast = await this.astToolkit.parse(script);
      const analysis = await this.astToolkit.analyze(ast);
      
      // Validate with LSP
      const diagnostics = this.lsp.astToLSPDiagnostics(ast);
      if (diagnostics.some(d => d.severity === DiagnosticSeverity.Error)) {
        throw new Error(`Script ${name} has errors`);
      }
      
      // Optimize
      const optimized = await this.astToolkit.optimize(ast, {
        minify: true,
        batchOperations: true,
        deduplicateSelectors: true
      });
      
      // Generate final script
      processed[name] = {
        original: script,
        optimized: this.astToolkit.generate(optimized),
        metadata: {
          complexity: analysis.complexity,
          dependencies: analysis.dependencies,
          selectors: this.extractSelectors(ast)
        }
      };
    }
    
    return processed;
  }
  
  // Extract selectors for prefetching/prerendering
  private extractSelectors(ast: ASTNode): string[] {
    return findNodes(ast, node => node.type === 'Selector')
      .map(node => (node as any).value);
  }
}
```

### 4. **Server Template Engine Extension**

Create a custom template engine that integrates with your Hyperscript compiler:

```typescript
// Template engine extension
export class HyperscriptTemplateEngine {
  private compiler: TemplateCompiler;
  private executor: TemplateExecutor;
  private scriptProcessor: ServerHyperscriptProcessor;
  
  async render(template: string, context: ViewContext): Promise<string> {
    // Phase 1: Extract and process embedded scripts
    const { html, scripts } = await this.extractScripts(template);
    
    // Phase 2: Process scripts through AST pipeline
    const processedScripts = await this.scriptProcessor.processViewScripts(scripts);
    
    // Phase 3: Inject optimized scripts back into HTML
    const enhanced = await this.injectScripts(html, processedScripts);
    
    // Phase 4: Render with data context
    return this.renderWithContext(enhanced, {
      ...context,
      scripts: processedScripts
    });
  }
  
  private async extractScripts(template: string): Promise<ExtractedTemplate> {
    const scriptRegex = /@hyperscript\s+(\w+)([\s\S]*?)@end/g;
    const scripts: Record<string, string> = {};
    
    const html = template.replace(scriptRegex, (match, name, content) => {
      scripts[name] = content.trim();
      return `<!-- hyperscript:${name} -->`;
    });
    
    return { html, scripts };
  }
  
  private async injectScripts(html: string, scripts: ProcessedScripts): Promise<string> {
    // Inject as inline scripts or data attributes
    return html.replace(/<!-- hyperscript:(\w+) -->/g, (match, name) => {
      const script = scripts[name];
      if (!script) return match;
      
      // Option 1: Inline script tag
      return `<script type="text/hyperscript">${script.optimized}</script>`;
      
      // Option 2: Data attribute (for later hydration)
      // return `<template data-hyperscript="${name}">${script.optimized}</template>`;
    });
  }
}
```

### 5. **Django/Flask Integration Example**

Here's how you could integrate this with Django:

```python
# Django view
from django.shortcuts import render
from hyperfixi import HyperscriptProcessor

def product_list(request):
    # Define view-specific behaviors
    scripts = {
        'product_interactions': '''
            behavior product-card
                on mouseenter add .highlighted to me
                on mouseleave remove .highlighted from me
                on click send product-selected(productId: my @data-product-id) to document
            end
        ''',
        
        'infinite_scroll': '''
            on intersection(intersecting) from bottom
                if intersecting
                    fetch /api/products?page={my @data-next-page} 
                    put it at the end of <#product-list/>
                    increment my @data-next-page
        '''
    }
    
    # Process scripts through Hyperfixi
    processor = HyperscriptProcessor()
    compiled_scripts = processor.compile_for_view(scripts)
    
    context = {
        'products': Product.objects.all()[:20],
        'scripts': compiled_scripts,
        'next_page': 2
    }
    
    return render(request, 'products/list.html', context)
```

### 6. **Template Integration Patterns**

```html
<!-- Django template with Hyperscript -->
{% extends "base.html" %}

{% block content %}
<div id="product-list" data-next-page="{{ next_page }}"
     _="{{ scripts.infinite_scroll }}">
  {% for product in products %}
    <div class="product-card" 
         data-product-id="{{ product.id }}"
         _="install product-card">
      <h3>{{ product.name }}</h3>
      <p>{{ product.price }}</p>
    </div>
  {% endfor %}
</div>

<!-- Inline behavior definitions -->
<script type="text/hyperscript">
  {{ scripts.product_interactions|safe }}
</script>
{% endblock %}
```

### 7. **Development Workflow Enhancement**

Leverage your LSP for server-side script development:

```typescript
// VS Code extension for server-side Hyperscript
export class ServerHyperscriptExtension {
  activate(context: vscode.ExtensionContext) {
    // Register language support for template files
    const provider = new HyperscriptTemplateProvider();
    
    // Provide completions in template files
    vscode.languages.registerCompletionItemProvider(
      { pattern: '**/*.{html,django,jinja2}' },
      {
        provideCompletionItems(document, position) {
          // Detect if we're in a hyperscript context
          if (isInHyperscriptBlock(document, position)) {
            return provider.getCompletions(document, position);
          }
        }
      }
    );
    
    // Live validation
    vscode.languages.registerDiagnosticProvider(
      { pattern: '**/*.{html,django,jinja2}' },
      new HyperscriptDiagnosticProvider()
    );
  }
}
```

### Benefits of This Approach

1. **Type Safety**: Your AST can validate scripts at build time
2. **Performance**: Scripts are optimized before serving
3. **Developer Experience**: LSP support in templates
4. **Progressive Enhancement**: Scripts enhance server-rendered HTML
5. **SEO Friendly**: Full content available without JavaScript
6. **Maintainability**: Scripts co-located with views

This architecture allows you to write Hyperscript directly in your server-side view handlers while maintaining all the benefits of your AST toolkit and LSP integration. The scripts are validated, optimized, and integrated seamlessly with your server-side templates.

## FastHTML's Approach to Front-End Scripting at the Handler Level

FastHTML takes a unique approach that aligns well with your goals:

### 1. **Python Functions as HTML Components**
FastHTML represents HTML elements as Python functions that can contain inline scripts:

```python
from fasthtml.common import *

@rt("/interactive")
def get():
    # Script defined right in the handler
    canvas_script = """
    var canvas = new fabric.Canvas('canvas');
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.color = '#3CDD8C';
    canvas.freeDrawingBrush.width = 10;
    
    document.getElementById('color-picker').onchange = function() {
        canvas.freeDrawingBrush.color = this.value;
    };
    """
    
    return Div(
        Canvas(id="canvas", width="800", height="600"),
        Input(type="color", id="color-picker", value="#3CDD8C"),
        Script(src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"),
        Script(canvas_script)  # Inline script defined at handler level
    )
```

### 2. **Adapting This Pattern for Hyperfixi**

Here's how you can implement a similar pattern with your Hyperscript AST:

```typescript
// Server-side handler with integrated Hyperscript
export class HyperscriptHandler {
  private compiler: HyperscriptCompiler;
  private templateEngine: TemplateEngine;
  
  async renderInteractivePage(request: Request) {
    // Define behaviors at the handler level
    const pageDefinition = {
      components: {
        searchBox: {
          element: 'input#search',
          behavior: `
            on keyup
              if the event's key is "Enter"
                send search-submit
              else
                debounce 300ms
                send search-preview
              end
          `,
          attributes: {
            type: 'text',
            placeholder: 'Search...'
          }
        },
        
        resultsList: {
          element: 'div#results',
          behavior: `
            on search-submit from #search
              fetch /api/search with {query: #search.value}
              put the result into me
              
            on search-preview from #search
              if #search.value.length > 2
                fetch /api/search/preview with {query: #search.value}
                put the result into me with *fade
              else
                put "" into me
              end
          `
        }
      },
      
      // Page-level behaviors
      globalBehaviors: `
        behavior enhance-links
          on click on a[href^="/"]
            halt the event
            fetch the event.target.href
            put the result into main
            push the event.target.href to history
        end
      `
    };
    
    // Compile and optimize behaviors
    const compiled = await this.compilePageDefinition(pageDefinition);
    
    // Render with template engine
    return this.renderTemplate('page', {
      components: compiled.components,
      scripts: compiled.scripts,
      data: await this.fetchData(request)
    });
  }
  
  private async compilePageDefinition(definition: PageDefinition) {
    const compiled = {
      components: {},
      scripts: []
    };
    
    // Process each component
    for (const [name, component] of Object.entries(definition.components)) {
      const ast = await this.compiler.parse(component.behavior);
      const optimized = await this.compiler.optimize(ast);
      
      compiled.components[name] = {
        html: this.createHTMLElement(component),
        script: this.compiler.generate(optimized)
      };
    }
    
    // Process global behaviors
    if (definition.globalBehaviors) {
      const globalAst = await this.compiler.parse(definition.globalBehaviors);
      compiled.scripts.push(this.compiler.generate(globalAst));
    }
    
    return compiled;
  }
}
```

### 3. **ScriptX Pattern for Parameterized Scripts**

FastHTML uses `ScriptX` for parameterized scripts. You can create a similar pattern:

```typescript
// Hyperscript template component
export class HyperscriptX {
  constructor(
    private template: string,
    private params: Record<string, any> = {}
  ) {}
  
  async render(context: ExecutionContext): Promise<string> {
    // Parse template with parameters
    const ast = await parseHyperscriptTemplate(this.template, this.params);
    
    // Optimize based on context
    const optimized = await optimizeForContext(ast, context);
    
    // Generate final script
    return generateHyperscript(optimized);
  }
}

// Usage in handler
async function productHandler(request: Request) {
  const products = await fetchProducts();
  
  return {
    products: products.map(product => ({
      element: 'div.product-card',
      attributes: { 'data-id': product.id },
      script: new HyperscriptX(`
        on click
          add .selected to me
          send product-selected(id: {{productId}}, price: {{price}})
        on mouseenter
          show <.product-details/> in me with *fade
      `, {
        productId: product.id,
        price: product.price
      })
    }))
  };
}
```

### 4. **Component-Scoped Behaviors**

Following FastHTML's component pattern:

```typescript
// Define reusable component behaviors
export const ComponentBehaviors = {
  modal: `
    behavior modal
      on show-modal
        show me with *opacity
        add .modal-open to body
      on hide-modal or on escape
        hide me with *opacity
        remove .modal-open from body
      on click on .modal-backdrop
        send hide-modal to me
    end
  `,
  
  dropdown: `
    behavior dropdown
      on click on .dropdown-toggle in me
        toggle .show on .dropdown-menu in me
      on click elsewhere
        remove .show from .dropdown-menu in me
    end
  `,
  
  sortable: (options = {}) => `
    behavior sortable
      init
        set my draggedElement to null
      end
      
      on dragstart on .sortable-item in me
        set my draggedElement to event.target
        add .dragging to event.target
      end
      
      on dragend on .sortable-item in me
        remove .dragging from my draggedElement
        send sorted(items: [...<.sortable-item/> in me])
      end
    end
  `
};

// Use in handler
async function dashboardHandler() {
  return {
    modals: {
      userModal: {
        behavior: ComponentBehaviors.modal,
        content: await renderUserModal()
      }
    },
    
    lists: {
      taskList: {
        behavior: ComponentBehaviors.sortable({ 
          handle: '.drag-handle' 
        }),
        items: await fetchTasks()
      }
    }
  };
}
```

### 5. **Template Integration Pattern**

Create a template engine that processes Hyperscript alongside HTML:

```html
<!-- Template file with embedded Hyperscript -->
<template id="search-component">
  <div class="search-container" _="install search-enhanced">
    <input 
      type="text" 
      id="search"
      _="{{behaviors.searchInput}}"
    />
    <div id="suggestions" _="{{behaviors.suggestions}}"></div>
    <div id="results"></div>
  </div>
  
  <script type="text/hyperscript">
    behavior search-enhanced
      {{globalBehavior}}
    end
  </script>
</template>
```

### 6. **Server-Side AST Processing Pipeline**

```typescript
export class ServerHyperscriptPipeline {
  async processHandler(handler: HandlerFunction): Promise<ProcessedHandler> {
    // Extract Hyperscript from handler
    const scripts = await this.extractScripts(handler);
    
    // Parse all scripts
    const asts = await Promise.all(
      scripts.map(script => this.parser.parse(script))
    );
    
    // Analyze dependencies
    const analysis = await this.analyzer.analyzeDependencies(asts);
    
    // Optimize based on analysis
    const optimized = await this.optimizer.optimize(asts, {
      mergeSelectors: true,
      deduplicateHandlers: true,
      inlineSmallBehaviors: true,
      precompileSelectors: true
    });
    
    // Generate output
    return {
      html: await this.generateHTML(handler, optimized),
      scripts: await this.generateScripts(optimized),
      metadata: {
        selectors: analysis.selectors,
        events: analysis.events,
        complexity: analysis.complexity
      }
    };
  }
}
```

### 7. **Django/Flask Integration Example**

```python
from hyperfixi import HyperscriptHandler, behaviors

class ProductListView(HyperscriptHandler):
    template_name = 'products/list.html'
    
    def get_hyperscript_context(self):
        return {
            'behaviors': {
                'product_card': '''
                    on click
                        toggle .selected on me
                        if I match .selected
                            send product-selected(id: my @data-id)
                        else
                            send product-deselected(id: my @data-id)
                        end
                ''',
                
                'infinite_scroll': '''
                    on intersection(intersecting) from bottom
                        if intersecting and not my @data-loading
                            set my @data-loading to "true"
                            fetch /products?page={my @data-page}
                            put it at the end of me
                            increment my @data-page
                            set my @data-loading to "false"
                        end
                '''
            },
            
            'components': self.build_components()
        }
    
    def build_components(self):
        products = self.get_products()
        return [
            {
                'tag': 'div',
                'attrs': {'class': 'product-card', 'data-id': p.id},
                'behavior': 'product_card',
                'content': self.render_product(p)
            }
            for p in products
        ]
```

### Key Benefits of This Approach

1. **Co-location**: Scripts are defined right where they're used
2. **Type Safety**: Your AST can validate scripts at compile time
3. **Optimization**: Scripts are optimized before serving
4. **Reusability**: Component behaviors can be shared across handlers
5. **Progressive Enhancement**: Works without JavaScript, enhanced with it
6. **Developer Experience**: LSP support in your handlers

This approach combines FastHTML's elegant handler-level scripting with your powerful Hyperscript AST toolkit, giving you the best of both worlds.