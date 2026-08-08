# Python Code Generator Prototype

> Concrete implementation sketch for generating Python from SemanticNode

## Overview

This prototype shows how to generate Python code from LokaScript's semantic IR, enabling:

1. **Browser automation** via Selenium/Playwright
2. **Web scraping** scripts
3. **Test generation**
4. **Educational** - side-by-side hyperscript + Python

---

## Core Renderer Implementation

```typescript
// packages/python-codegen/src/renderer.ts

import type { SemanticNode, SemanticValue, CommandSemanticNode } from '@lokascript/semantic';

export interface PythonRenderOptions {
  /** Target framework: 'selenium', 'playwright', 'pywebview', 'vanilla' */
  framework: 'selenium' | 'playwright' | 'pywebview' | 'vanilla';
  /** Whether to generate type hints */
  typeHints: boolean;
  /** Import style: 'inline' or 'module' */
  importStyle: 'inline' | 'module';
  /** Element reference name (default: 'element') */
  elementRef: string;
}

export class PythonRenderer {
  private imports = new Set<string>();
  private options: PythonRenderOptions;

  constructor(options: Partial<PythonRenderOptions> = {}) {
    this.options = {
      framework: 'playwright',
      typeHints: true,
      importStyle: 'module',
      elementRef: 'element',
      ...options,
    };
  }

  render(node: SemanticNode): string {
    this.imports.clear();
    const code = this.renderNode(node);
    return this.wrapWithImports(code);
  }

  private renderNode(node: SemanticNode): string {
    switch (node.kind) {
      case 'command':
        return this.renderCommand(node as CommandSemanticNode);
      case 'event-handler':
        return this.renderEventHandler(node);
      case 'compound':
        return node.body.map(n => this.renderNode(n)).join('\n');
      default:
        return `# Unsupported node kind: ${node.kind}`;
    }
  }

  private renderCommand(node: CommandSemanticNode): string {
    switch (node.action) {
      case 'toggle':
        return this.renderToggle(node);
      case 'add':
        return this.renderAdd(node);
      case 'remove':
        return this.renderRemove(node);
      case 'put':
        return this.renderPut(node);
      case 'set':
        return this.renderSet(node);
      case 'fetch':
        return this.renderFetch(node);
      case 'show':
        return this.renderShow(node);
      case 'hide':
        return this.renderHide(node);
      case 'wait':
        return this.renderWait(node);
      case 'log':
        return this.renderLog(node);
      default:
        return `# TODO: Implement ${node.action}`;
    }
  }

  // =========================================================================
  // Command Renderers
  // =========================================================================

  private renderToggle(node: CommandSemanticNode): string {
    const patient = node.roles.get('patient');
    const dest = node.roles.get('destination');

    if (!patient || patient.type !== 'selector') {
      return '# toggle: missing or invalid patient';
    }

    const element = this.resolveElement(dest);

    if (patient.selectorKind === 'class') {
      const className = patient.value.slice(1); // Remove leading .
      switch (this.options.framework) {
        case 'playwright':
          return `await ${element}.evaluate("el => el.classList.toggle('${className}')")`;
        case 'selenium':
          this.imports.add('from selenium.webdriver.common.by import By');
          return `driver.execute_script("arguments[0].classList.toggle('${className}')", ${element})`;
        default:
          return `${element}.classList.toggle('${className}')`;
      }
    }

    return `# toggle: unsupported selector kind ${patient.selectorKind}`;
  }

  private renderAdd(node: CommandSemanticNode): string {
    const patient = node.roles.get('patient');
    const dest = node.roles.get('destination');

    if (!patient || patient.type !== 'selector') {
      return '# add: missing or invalid patient';
    }

    const element = this.resolveElement(dest);

    if (patient.selectorKind === 'class') {
      const className = patient.value.slice(1);
      switch (this.options.framework) {
        case 'playwright':
          return `await ${element}.evaluate("el => el.classList.add('${className}')")`;
        case 'selenium':
          return `driver.execute_script("arguments[0].classList.add('${className}')", ${element})`;
        default:
          return `${element}.classList.add('${className}')`;
      }
    }

    return `# add: unsupported selector kind`;
  }

  private renderRemove(node: CommandSemanticNode): string {
    const patient = node.roles.get('patient');
    const dest = node.roles.get('destination');

    if (!patient || patient.type !== 'selector') {
      return '# remove: missing or invalid patient';
    }

    const element = this.resolveElement(dest);

    if (patient.selectorKind === 'class') {
      const className = patient.value.slice(1);
      switch (this.options.framework) {
        case 'playwright':
          return `await ${element}.evaluate("el => el.classList.remove('${className}')")`;
        case 'selenium':
          return `driver.execute_script("arguments[0].classList.remove('${className}')", ${element})`;
        default:
          return `${element}.classList.remove('${className}')`;
      }
    }

    return `# remove: unsupported selector kind`;
  }

  private renderPut(node: CommandSemanticNode): string {
    const patient = node.roles.get('patient');
    const dest = node.roles.get('destination');

    const content = this.renderValue(patient);
    const element = this.resolveElement(dest);

    switch (this.options.framework) {
      case 'playwright':
        return `await ${element}.evaluate(f"el => el.textContent = {${content}!r}")`;
      case 'selenium':
        return `driver.execute_script(f"arguments[0].textContent = {${content}!r}", ${element})`;
      default:
        return `${element}.textContent = ${content}`;
    }
  }

  private renderSet(node: CommandSemanticNode): string {
    const patient = node.roles.get('patient');
    const source = node.roles.get('source');

    if (!patient) return '# set: missing patient';

    const varName = this.renderValue(patient);
    const value = this.renderValue(source);

    return `${varName} = ${value}`;
  }

  private renderFetch(node: CommandSemanticNode): string {
    const dest = node.roles.get('destination');
    const responseType = node.roles.get('responseType');

    if (!dest) return '# fetch: missing destination';

    const url = this.renderValue(dest);
    const asJson = responseType?.type === 'literal' && responseType.value === 'json';

    this.imports.add('import requests');

    if (asJson) {
      return `result = requests.get(${url}).json()`;
    }
    return `result = requests.get(${url}).text`;
  }

  private renderShow(node: CommandSemanticNode): string {
    const dest = node.roles.get('destination') ?? node.roles.get('patient');
    const element = this.resolveElement(dest);

    switch (this.options.framework) {
      case 'playwright':
        return `await ${element}.evaluate("el => el.style.display = ''")`;
      case 'selenium':
        return `driver.execute_script("arguments[0].style.display = ''", ${element})`;
      default:
        return `${element}.style.display = ''`;
    }
  }

  private renderHide(node: CommandSemanticNode): string {
    const dest = node.roles.get('destination') ?? node.roles.get('patient');
    const element = this.resolveElement(dest);

    switch (this.options.framework) {
      case 'playwright':
        return `await ${element}.evaluate("el => el.style.display = 'none'")`;
      case 'selenium':
        return `driver.execute_script("arguments[0].style.display = 'none'", ${element})`;
      default:
        return `${element}.style.display = 'none'`;
    }
  }

  private renderWait(node: CommandSemanticNode): string {
    const duration = node.roles.get('duration');

    if (!duration || duration.type !== 'literal') {
      return '# wait: missing duration';
    }

    // Parse duration (e.g., "2s", "500ms")
    const value = String(duration.value);
    let seconds: number;

    if (value.endsWith('ms')) {
      seconds = parseInt(value) / 1000;
    } else if (value.endsWith('s')) {
      seconds = parseFloat(value);
    } else {
      seconds = parseFloat(value);
    }

    this.imports.add('import asyncio');
    return `await asyncio.sleep(${seconds})`;
  }

  private renderLog(node: CommandSemanticNode): string {
    const patient = node.roles.get('patient');
    const value = this.renderValue(patient);
    return `print(${value})`;
  }

  // =========================================================================
  // Event Handler
  // =========================================================================

  private renderEventHandler(node: SemanticNode): string {
    const event = node.roles.get('event');
    const eventName = event?.type === 'literal' ? event.value : 'click';
    const dest = node.roles.get('destination');
    const element = this.resolveElement(dest);

    const body = (node as any).body || [];
    const bodyCode = body.map((n: SemanticNode) => '    ' + this.renderNode(n)).join('\n');

    switch (this.options.framework) {
      case 'playwright':
        return `async def on_${eventName}():\n${bodyCode}\n\nawait ${element}.click()  # Triggers ${eventName}`;
      case 'selenium':
        return `def on_${eventName}():\n${bodyCode}\n\n${element}.click()  # Triggers ${eventName}`;
      default:
        return `# Event handler: on ${eventName}\n${bodyCode}`;
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private resolveElement(value: SemanticValue | undefined): string {
    if (!value) {
      return this.options.elementRef;
    }

    if (value.type === 'reference') {
      if (value.value === 'me') return this.options.elementRef;
      if (value.value === 'body') return 'document.body';
      return value.value;
    }

    if (value.type === 'selector') {
      switch (this.options.framework) {
        case 'playwright':
          return `page.locator("${value.value}")`;
        case 'selenium':
          this.imports.add('from selenium.webdriver.common.by import By');
          return `driver.find_element(By.CSS_SELECTOR, "${value.value}")`;
        default:
          return `document.querySelector("${value.value}")`;
      }
    }

    return this.options.elementRef;
  }

  private renderValue(value: SemanticValue | undefined): string {
    if (!value) return 'None';

    switch (value.type) {
      case 'literal':
        if (typeof value.value === 'string') return `"${value.value}"`;
        if (typeof value.value === 'boolean') return value.value ? 'True' : 'False';
        return String(value.value);

      case 'reference':
        if (value.value === 'me') return this.options.elementRef;
        if (value.value === 'result') return 'result';
        if (value.value === 'it') return 'it';
        return value.value;

      case 'selector':
        return `"${value.value}"`;

      case 'expression':
        return value.raw;

      case 'property-path':
        return `${this.renderValue(value.object)}.${value.property}`;

      default:
        return 'None';
    }
  }

  private wrapWithImports(code: string): string {
    if (this.imports.size === 0) return code;
    const importBlock = Array.from(this.imports).sort().join('\n');
    return `${importBlock}\n\n${code}`;
  }
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { parse } from '@lokascript/semantic';
import { PythonRenderer } from '@lokascript/python-codegen';

// Parse hyperscript in any language
const node = parse('toggle .active on #button', 'en');
// Or: parse('#button の .active を 切り替え', 'ja');

// Generate Python
const renderer = new PythonRenderer({ framework: 'playwright' });
const python = renderer.render(node);

console.log(python);
// Output:
// await page.locator("#button").evaluate("el => el.classList.toggle('active')")
```

### Selenium Framework

```typescript
const renderer = new PythonRenderer({ framework: 'selenium' });
const python = renderer.render(node);

console.log(python);
// Output:
// from selenium.webdriver.common.by import By
//
// driver.execute_script("arguments[0].classList.toggle('active')", driver.find_element(By.CSS_SELECTOR, "#button"))
```

### Multiple Commands (Compound)

```typescript
const input = `
  on click
    add .loading
    fetch /api/data as json
    put result into #output
    remove .loading
`;

const node = parse(input, 'en');
const python = renderer.render(node);

// Output (Playwright):
// import requests
//
// async def on_click():
//     await page.locator("me").evaluate("el => el.classList.add('loading')")
//     result = requests.get("/api/data").json()
//     await page.locator("#output").evaluate(f"el => el.textContent = {result!r}")
//     await page.locator("me").evaluate("el => el.classList.remove('loading')")
//
// await element.click()  # Triggers click
```

---

## Test Generation Extension

```typescript
// packages/python-codegen/src/test-generator.ts

export class PlaywrightTestGenerator {
  generateTest(node: SemanticNode, description: string): string {
    const renderer = new PythonRenderer({ framework: 'playwright' });

    return `
import pytest
from playwright.async_api import async_playwright

@pytest.mark.asyncio
async def test_${this.slugify(description)}():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:3000")

        # Action
        ${renderer.render(node)}

        # Assertion
        ${this.generateAssertion(node)}

        await browser.close()
`;
  }

  private generateAssertion(node: SemanticNode): string {
    switch (node.action) {
      case 'toggle':
        const patient = node.roles.get('patient');
        const dest = node.roles.get('destination');
        if (patient?.type === 'selector' && patient.selectorKind === 'class') {
          const className = patient.value.slice(1);
          const selector = dest?.type === 'selector' ? dest.value : '#element';
          return `await expect(page.locator("${selector}")).to_have_class(re.compile(r"${className}"))`;
        }
        break;

      case 'put':
        const content = node.roles.get('patient');
        const target = node.roles.get('destination');
        if (content?.type === 'literal' && target?.type === 'selector') {
          return `await expect(page.locator("${target.value}")).to_have_text("${content.value}")`;
        }
        break;

      case 'hide':
        const elem = node.roles.get('destination') ?? node.roles.get('patient');
        if (elem?.type === 'selector') {
          return `await expect(page.locator("${elem.value}")).to_be_hidden()`;
        }
        break;
    }

    return '# TODO: Add assertion';
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }
}
```

### Generated Test Example

```python
import pytest
from playwright.async_api import async_playwright

@pytest.mark.asyncio
async def test_clicking_button_toggles_active_class():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:3000")

        # Action
        await page.locator("#button").evaluate("el => el.classList.toggle('active')")

        # Assertion
        await expect(page.locator("#button")).to_have_class(re.compile(r"active"))

        await browser.close()
```

---

## CLI Tool

```typescript
// packages/python-codegen/src/cli.ts

import { Command } from 'commander';
import { parse } from '@lokascript/semantic';
import { PythonRenderer } from './renderer';

const program = new Command();

program
  .name('lokascript-to-python')
  .description('Convert hyperscript to Python')
  .argument('<input>', 'Hyperscript code or file path')
  .option('-l, --language <code>', 'Source language', 'en')
  .option('-f, --framework <name>', 'Target framework', 'playwright')
  .option('-o, --output <file>', 'Output file')
  .action(async (input, options) => {
    const code = input.endsWith('.hs') ? readFileSync(input, 'utf-8') : input;
    const node = parse(code, options.language);
    const renderer = new PythonRenderer({ framework: options.framework });
    const python = renderer.render(node);

    if (options.output) {
      writeFileSync(options.output, python);
      console.log(`Written to ${options.output}`);
    } else {
      console.log(python);
    }
  });

program.parse();
```

### CLI Usage

```bash
# Simple conversion
npx lokascript-to-python "toggle .active on #button"

# From Japanese with Selenium output
npx lokascript-to-python "#button の .active を 切り替え" -l ja -f selenium

# From file
npx lokascript-to-python ./scripts/handler.hs -o handler.py
```

---

## Package Structure

```
packages/python-codegen/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Main exports
│   ├── renderer.ts        # PythonRenderer class
│   ├── test-generator.ts  # Test generation
│   ├── cli.ts             # CLI tool
│   └── frameworks/
│       ├── playwright.ts  # Playwright-specific helpers
│       ├── selenium.ts    # Selenium-specific helpers
│       └── vanilla.ts     # Plain Python (no browser)
├── tests/
│   ├── renderer.test.ts
│   ├── test-generator.test.ts
│   └── fixtures/
│       ├── toggle.hs
│       ├── toggle.py.expected
│       └── ...
└── README.md
```

---

## Next Steps

1. **Implement core renderer** with top 15 commands
2. **Add Playwright framework adapter**
3. **Create test suite** with input/output fixtures
4. **Build CLI tool** for easy conversion
5. **Integration tests** with actual Playwright/Selenium runs

This prototype demonstrates the feasibility of Python code generation. The same pattern extends to JavaScript, Go, or any target language.
