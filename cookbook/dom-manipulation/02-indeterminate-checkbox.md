# Indeterminate Checkbox State

**Demonstrates**: DOM property manipulation, form handling, CSS class management

## HTML Attribute Approach (Traditional)

```html
<form>
  <input class="indeterminate" type="checkbox" _="on load set my.indeterminate to true">
  <input type="reset" _="on click set .indeterminate.indeterminate to true">
</form>

<script type="module">
  import { hyperscript } from '@hyperfixi/core';
  hyperscript.processNode(document.body);
</script>
```

## JavaScript API Approach (HyperFixi)

```html
<form>
  <input id="checkbox" class="indeterminate" type="checkbox">
  <input id="reset-btn" type="reset">
</form>

<script type="module">
  import { hyperscript } from '@hyperfixi/core';
  
  // Method 1: Using evaluate() for property setting
  const checkbox = document.getElementById('checkbox');
  const context = hyperscript.createContext(checkbox);
  
  // Set indeterminate on load
  await hyperscript.evaluate('set my.indeterminate to true', context);
  
  // Method 2: Using evaluate() with event handlers
  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', async () => {
    // Reset all indeterminate checkboxes
    await hyperscript.evaluate('set .indeterminate.indeterminate to true');
  });
  
  // Method 3: Direct property manipulation with context
  const resetContext = hyperscript.createContext();
  resetContext.variables = new Map([['elements', document.querySelectorAll('.indeterminate')]]);
  
  resetBtn.addEventListener('click', async () => {
    for (const elem of document.querySelectorAll('.indeterminate')) {
      const elemContext = hyperscript.createContext(elem);
      await hyperscript.evaluate('set my.indeterminate to true', elemContext);
    }
  });
</script>
```

## Working Demo

```html
<!DOCTYPE html>
<html>
<head>
  <title>HyperFixi - Indeterminate Checkbox</title>
  <style>
    form { padding: 20px; border: 1px solid #ccc; margin: 20px 0; }
    label { display: block; margin: 10px 0; }
    input[type="reset"] { padding: 8px 16px; margin: 10px 0; cursor: pointer; }
  </style>
</head>
<body>
  <h2>Indeterminate Checkbox Examples</h2>
  
  <h3>Traditional HyperScript</h3>
  <form>
    <label>
      <input class="indeterminate" type="checkbox" _="on load set my.indeterminate to true">
      Traditional hyperscript checkbox
    </label>
    <input type="reset" _="on click set .indeterminate.indeterminate to true" value="Reset (Traditional)">
  </form>
  
  <h3>HyperFixi API</h3>
  <form>
    <label>
      <input id="api-checkbox" class="indeterminate-api" type="checkbox">
      HyperFixi API checkbox
    </label>
    <input id="api-reset" type="button" value="Reset (API)">
  </form>

  <script type="module">
    import { hyperscript } from '@hyperfixi/core';
    
    // Process traditional hyperscript attributes
    hyperscript.processNode(document.body);
    
    // Set up API-based examples
    async function setupApiExample() {
      try {
        // Set initial indeterminate state
        const apiCheckbox = document.getElementById('api-checkbox');
        const context = hyperscript.createContext(apiCheckbox);
        await hyperscript.evaluate('set my.indeterminate to true', context);
        
        // Set up reset functionality
        const resetBtn = document.getElementById('api-reset');
        resetBtn.addEventListener('click', async () => {
          try {
            // Reset indeterminate state using HyperFixi
            await hyperscript.evaluate('set my.indeterminate to true', context);
            console.log('✅ Checkbox reset to indeterminate state');
          } catch (error) {
            console.error('❌ Error resetting checkbox:', error);
          }
        });
        
        console.log('✅ API example setup complete');
      } catch (error) {
        console.error('❌ Error setting up API example:', error);
      }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupApiExample);
    } else {
      setupApiExample();
    }
  </script>
</body>
</html>
```

## Key Points

1. **Property Access**: Use `my.propertyName` to access DOM element properties
2. **CSS Selectors**: Use `.className` syntax to target elements by class
3. **State Management**: HTML checkboxes have three states - checked, unchecked, and indeterminate
4. **Context Usage**: Create element-specific contexts for targeted operations
5. **Error Handling**: Always wrap HyperFixi operations in try/catch blocks

## Why This Matters

HTML checkboxes technically have three states, but the indeterminate state can only be set via JavaScript runtime. HyperScript and HyperFixi make this DOM manipulation simple and declarative, whether using traditional attributes or the modern API approach.