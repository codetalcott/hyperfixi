# TDD Plan for Language-Agnostic Hyperfixi Integration

## Phase 1: Core Hyperscript Processing Foundation

### Step 1.1: AST Parser Enhancement for Server-Side Context
```typescript
// Test: Parser handles server-side template variables
describe('ServerContextParser', () => {
  it('should parse template variables in hyperscript', () => {
    const input = `
      on click
        fetch /api/users/{{userId}}
        put the result into #user-{{userId}}
    `;
    
    const ast = parser.parse(input, {
      templateVars: { userId: '123' }
    });
    
    expect(ast).toMatchObject({
      type: 'EventHandler',
      commands: [
        {
          type: 'FetchCommand',
          url: '/api/users/123'
        },
        {
          type: 'PutCommand',
          target: '#user-123'
        }
      ]
    });
  });
});

// Implementation
export class ServerContextParser extends Parser {
  parse(input: string, context?: ParseContext): ASTNode {
    const processed = this.preprocessTemplate(input, context?.templateVars);
    return super.parse(processed);
  }
  
  private preprocessTemplate(input: string, vars?: Record<string, any>): string {
    if (!vars) return input;
    return input.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
  }
}
```

### Step 1.2: Compilation Cache System
```typescript
// Test: Compilation results are cached
describe('CompilationCache', () => {
  it('should cache compilation results', async () => {
    const cache = new CompilationCache();
    const compiler = new HyperscriptCompiler(cache);
    
    const input = 'on click toggle .active';
    
    // First compilation
    const result1 = await compiler.compile(input);
    const compileTime1 = compiler.lastCompileTime;
    
    // Second compilation (should be cached)
    const result2 = await compiler.compile(input);
    const compileTime2 = compiler.lastCompileTime;
    
    expect(result1).toEqual(result2);
    expect(compileTime2).toBe(0); // Cached, no compile time
  });
  
  it('should invalidate cache on options change', async () => {
    const cache = new CompilationCache();
    const compiler = new HyperscriptCompiler(cache);
    
    const input = 'on click toggle .active';
    
    const result1 = await compiler.compile(input, { minify: false });
    const result2 = await compiler.compile(input, { minify: true });
    
    expect(result1).not.toEqual(result2);
  });
});
```

## Phase 2: Language-Agnostic Service Layer

### Step 2.1: HTTP Service API
```typescript
// Test: Service responds to compilation requests
describe('HyperfixiService', () => {
  let service: HyperfixiService;
  
  beforeEach(async () => {
    service = new HyperfixiService();
    await service.start(3001);
  });
  
  afterEach(() => service.stop());
  
  it('should compile hyperscript via HTTP', async () => {
    const response = await fetch('http://localhost:3001/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scripts: {
          search: 'on keyup debounce 300ms send search'
        }
      })
    });
    
    const result = await response.json();
    
    expect(result).toMatchObject({
      compiled: {
        search: expect.stringContaining('function')
      },
      metadata: {
        search: {
          events: ['keyup'],
          commands: ['send'],
          complexity: expect.any(Number)
        }
      }
    });
  });
  
  it('should validate hyperscript without compiling', async () => {
    const response = await fetch('http://localhost:3001/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: 'on click toggle .' // Invalid selector
      })
    });
    
    const result = await response.json();
    
    expect(result).toMatchObject({
      valid: false,
      errors: [{
        type: 'InvalidSelector',
        message: expect.stringContaining('selector'),
        line: 1,
        column: 17
      }]
    });
  });
});
```

### Step 2.2: Batch Processing
```typescript
// Test: Service handles batch compilation efficiently
describe('BatchCompilation', () => {
  it('should compile multiple scripts in one request', async () => {
    const response = await fetch('http://localhost:3001/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        definitions: [
          {
            id: 'search',
            script: 'on keyup send search',
            options: { minify: true }
          },
          {
            id: 'modal',
            script: 'on click toggle .modal',
            options: { compatibility: 'legacy' }
          }
        ]
      })
    });
    
    const result = await response.json();
    
    expect(result.compiled).toHaveProperty('search');
    expect(result.compiled).toHaveProperty('modal');
    expect(result.timings.total).toBeLessThan(100); // ms
  });
});
```

## Phase 3: Language Client Libraries

### Step 3.1: Python Client
```python
# test_hyperfixi_client.py
import pytest
from hyperfixi import HyperfixiClient, Component

@pytest.fixture
def client():
    return HyperfixiClient(host="localhost", port=3001)

def test_compile_single_behavior(client):
    result = client.compile({
        "search": "on keyup send search-query"
    })
    
    assert "search" in result["compiled"]
    assert result["metadata"]["search"]["events"] == ["keyup"]

def test_component_builder(client):
    component = Component("div#search") \
        .on("keyup", "send search-query") \
        .on("focus", "add .focused")
    
    compiled = client.compile_component(component)
    
    assert compiled["selector"] == "div#search"
    assert len(compiled["handlers"]) == 2

def test_django_integration():
    from hyperfixi.contrib.django import HyperscriptView
    
    class SearchView(HyperscriptView):
        def get_behaviors(self):
            return {
                "search": "on keyup send search"
            }
    
    view = SearchView()
    context = view.get_context_data()
    
    assert "hyperscript" in context
    assert context["hyperscript"]["compiled"]["search"]
```

### Step 3.2: Go Client
```go
// hyperfixi_test.go
package hyperfixi_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/hyperfixi/hyperfixi-go"
)

func TestCompileBasicBehavior(t *testing.T) {
    client := hyperfixi.NewClient("localhost", 3001)
    
    result, err := client.Compile(map[string]string{
        "search": "on keyup send search-query",
    }, nil)
    
    assert.NoError(t, err)
    assert.NotEmpty(t, result.Compiled["search"])
    assert.Contains(t, result.Metadata["search"].Events, "keyup")
}

func TestComponentBuilder(t *testing.T) {
    component := hyperfixi.NewComponent("div#search").
        On("keyup", "send search-query").
        On("focus", "add .focused")
    
    client := hyperfixi.NewClient("localhost", 3001)
    compiled, err := client.CompileComponent(component)
    
    assert.NoError(t, err)
    assert.Equal(t, "div#search", compiled.Selector)
    assert.Len(t, compiled.Handlers, 2)
}

func TestGinMiddleware(t *testing.T) {
    router := gin.New()
    client := hyperfixi.NewClient("localhost", 3001)
    
    router.Use(hyperfixi.Middleware(client))
    
    router.GET("/test", func(c *gin.Context) {
        hf := c.MustGet("hyperfixi").(*hyperfixi.Client)
        assert.NotNil(t, hf)
    })
}
```

### Step 3.3: JavaScript/TypeScript Client
```typescript
// test/hyperfixi-client.test.ts
import { HyperfixiClient, Component } from 'hyperfixi-js';

describe('HyperfixiClient', () => {
  let client: HyperfixiClient;
  
  beforeEach(() => {
    client = new HyperfixiClient('localhost', 3001);
  });
  
  it('should compile behaviors', async () => {
    const result = await client.compile({
      search: 'on keyup send search-query'
    });
    
    expect(result.compiled.search).toBeDefined();
    expect(result.metadata.search.events).toContain('keyup');
  });
  
  it('should build components fluently', async () => {
    const component = new Component('div#search')
      .on('keyup', 'send search-query')
      .on('focus', 'add .focused');
    
    const compiled = await client.compileComponent(component);
    
    expect(compiled.selector).toBe('div#search');
    expect(compiled.handlers).toHaveLength(2);
  });
  
  it('should work with Express middleware', async () => {
    const app = express();
    app.use(HyperfixiClient.middleware());
    
    app.get('/test', async (req, res) => {
      const compiled = await req.hyperfixi.compile({
        test: 'on click log "clicked"'
      });
      
      expect(compiled).toBeDefined();
      res.json({ success: true });
    });
  });
});
```

## Phase 4: Universal Component Format

### Step 4.1: Component Definition Schema
```typescript
// Test: Validate universal component format
describe('UniversalComponentFormat', () => {
  it('should validate component definitions', () => {
    const definition: HyperfixiDefinition = {
      version: "1.0",
      components: {
        searchBox: {
          selector: "#search",
          behavior: "on keyup send search",
          attributes: { placeholder: "Search..." }
        }
      },
      behaviors: {
        "search-enhanced": "on focus add .focused"
      },
      global: "install search-enhanced on all input[type=search]"
    };
    
    const result = validateDefinition(definition);
    expect(result.valid).toBe(true);
  });
  
  it('should merge component definitions', () => {
    const base: HyperfixiDefinition = {
      version: "1.0",
      components: {
        search: { selector: "#search", behavior: "on keyup log" }
      }
    };
    
    const extension: Partial<HyperfixiDefinition> = {
      components: {
        search: { behavior: "on focus add .focused" }
      }
    };
    
    const merged = mergeDefinitions(base, extension);
    
    expect(merged.components.search.behavior).toContain('on keyup log');
    expect(merged.components.search.behavior).toContain('on focus add .focused');
  });
});
```

## Phase 5: Template Integration

### Step 5.1: Template Compiler Integration
```typescript
// Test: Template compiler processes hyperscript
describe('TemplateCompilerIntegration', () => {
  it('should compile templates with embedded hyperscript', async () => {
    const template = `
      <div id="search" _="{{behaviors.search}}">
        <input type="text" />
      </div>
      
      @hyperscript search-enhanced
        on keyup from input in me
          debounce 300ms
          send search-query
      @end
    `;
    
    const compiler = new HyperfixiTemplateCompiler();
    const result = await compiler.compile(template, {
      behaviors: {
        search: 'on load focus on input in me'
      }
    });
    
    expect(result.html).toContain('_="on load focus on input in me"');
    expect(result.scripts).toHaveProperty('search-enhanced');
  });
});
```

### Step 5.2: Server-Side Rendering
```typescript
// Test: SSR with hyperscript
describe('ServerSideRendering', () => {
  it('should render components with behaviors', async () => {
    const handler = new HyperfixiHandler();
    
    const result = await handler.render({
      component: 'ProductList',
      data: { products: [{ id: 1, name: 'Test' }] },
      behaviors: {
        'product-card': 'on click toggle .selected'
      }
    });
    
    expect(result.html).toContain('data-id="1"');
    expect(result.html).toContain('_="on click toggle .selected"');
    expect(result.head).toContain('script');
  });
});
```

## Phase 6: Progressive Enhancement

### Step 6.1: Enhancement Levels
```typescript
// Test: Progressive enhancement strategies
describe('ProgressiveEnhancement', () => {
  it('should generate appropriate enhancement level', async () => {
    const enhancer = new ProgressiveEnhancer();
    
    const component = enhancer.enhance({
      base: '<form action="/search" method="GET">',
      capabilities: ['fetch', 'htmx'],
      behaviors: {
        basic: 'on submit halt',
        enhanced: 'on submit halt then fetch action then put result into #results',
        advanced: 'on keyup from input debounce 300ms then send preview'
      }
    });
    
    expect(component.selectedLevel).toBe('enhanced');
    expect(component.fallbacks).toContain('basic');
  });
});
```

## Phase 7: Multi-Tenant Support

### Step 7.1: Tenant Behavior Customization
```typescript
// Test: Tenant-specific behaviors
describe('MultiTenantBehaviors', () => {
  it('should apply tenant customizations', async () => {
    const tenantManager = new TenantBehaviorManager();
    
    await tenantManager.registerTenant('acme-corp', {
      overrides: {
        'checkout': 'on submit validate coupon first'
      }
    });
    
    const compiled = await tenantManager.compile('checkout', 'acme-corp');
    
    expect(compiled).toContain('validate coupon');
  });
});
```

## Phase 8: Analytics and Testing

### Step 8.1: Behavior Analytics
```typescript
// Test: Analytics instrumentation
describe('BehaviorAnalytics', () => {
  it('should instrument behaviors with analytics', async () => {
    const analytics = new BehaviorAnalytics();
    
    const instrumented = analytics.instrument({
      name: 'search',
      behavior: 'on keyup send search'
    });
    
    expect(instrumented.wrapped).toContain('send to analytics');
    expect(instrumented.wrapped).toContain('trigger original behavior');
  });
});
```

### Step 8.2: Cross-Platform Testing
```typescript
// Test: Behavior consistency across platforms
describe('CrossPlatformTesting', () => {
  it('should behave consistently across backends', async () => {
    const tester = new CrossPlatformTester();
    
    const results = await tester.test({
      behavior: 'on click toggle .active',
      platforms: ['python', 'go', 'node'],
      scenarios: [
        { action: 'click', expected: 'class added' },
        { action: 'click', expected: 'class removed' }
      ]
    });
    
    expect(results.consistent).toBe(true);
    expect(results.platforms).toHaveLength(3);
  });
});
```

## Phase 9: Developer Tools

### Step 9.1: Visual Builder API
```typescript
// Test: Visual builder integration
describe('VisualBuilder', () => {
  it('should convert visual flow to hyperscript', async () => {
    const builder = new VisualBehaviorBuilder();
    
    const flow = {
      nodes: [
        { id: '1', type: 'trigger', event: 'click' },
        { id: '2', type: 'action', action: 'toggle .active' }
      ],
      connections: [{ from: '1', to: '2' }]
    };
    
    const hyperscript = await builder.generateFromFlow(flow);
    
    expect(hyperscript).toBe('on click toggle .active');
  });
});
```

### Step 9.2: CLI Tools
```typescript
// Test: CLI functionality
describe('CLI', () => {
  it('should compile files via CLI', async () => {
    const result = await exec('hyperfixi compile --input ./behaviors --output ./dist');
    
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync('./dist/compiled.js')).toBe(true);
  });
});
```

## Phase 10: Production Features

### Step 10.1: Smart Bundling
```typescript
// Test: Intelligent bundling
describe('SmartBundling', () => {
  it('should optimize bundle based on usage', async () => {
    const bundler = new SmartBundler();
    
    const result = await bundler.analyzePage({
      search: { selector: '#search', usage: 'above-fold' },
      modal: { selector: '.modal', usage: 'user-triggered' }
    });
    
    expect(result.critical).toContain('search');
    expect(result.lazy).toContain('modal');
  });
});
```

## Integration Test Suite

```typescript
// Full integration test
describe('End-to-End Integration', () => {
  it('should handle complete workflow', async () => {
    // 1. Start service
    const service = new HyperfixiService();
    await service.start(3001);
    
    // 2. Create Python client
    const pythonApp = await startPythonApp();
    
    // 3. Define behavior in Python
    await pythonApp.post('/api/behaviors', {
      name: 'search',
      behavior: 'on keyup debounce 300ms send search'
    });
    
    // 4. Render page
    const page = await pythonApp.get('/search');
    
    // 5. Verify behavior is active
    const browser = await playwright.chromium.launch();
    const browserPage = await browser.newPage();
    await browserPage.goto(pythonApp.url + '/search');
    
    // 6. Test behavior
    await browserPage.type('#search input', 'test');
    await browserPage.waitForTimeout(400); // After debounce
    
    // 7. Verify search was triggered
    const searchRequests = await pythonApp.getRequests('/api/search');
    expect(searchRequests).toHaveLength(1);
    
    // Cleanup
    await browser.close();
    await pythonApp.stop();
    await service.stop();
  });
});
```

This TDD plan ensures that each component is thoroughly tested before implementation, and that the entire system works together seamlessly across different languages and platforms.