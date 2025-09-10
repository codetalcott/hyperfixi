# Hello World - Concatenate Two Strings

**Demonstrates**: Basic event handling, DOM querying, string operations

## HTML Attribute Approach (Traditional)

```html
<p id="first">Hello</p>
<p id="second">World</p>
<button class="btn primary" _="on click set my.innerText to #first.innerText + ' ' + #second.innerText">
  Concat
</button>

<script type="module">
  import { hyperscript } from '@hyperfixi/core';
  
  // Process all hyperscript attributes on the page
  hyperscript.processNode(document.body);
</script>
```

## JavaScript API Approach (HyperFixi)

```html
<p id="first">Hello</p>
<p id="second">World</p>
<button id="concat-btn" class="btn primary">Concat</button>

<script type="module">
  import { hyperscript } from '@hyperfixi/core';
  
  // Method 1: Using evaluate() for event setup
  const button = document.getElementById('concat-btn');
  const context = hyperscript.createContext(button);
  
  // Set up the event handler using hyperscript.evaluate()
  await hyperscript.evaluate('on click set my.innerText to #first.innerText + " " + #second.innerText', context);
  
  // Method 2: Using evaluate() for direct execution
  button.addEventListener('click', async () => {
    const result = await hyperscript.evaluate('#first.innerText + " " + #second.innerText');
    button.innerText = result;
  });
</script>
```

## Working Demo

```html
<!DOCTYPE html>
<html>
<head>
  <title>HyperFixi - String Concatenation</title>
  <style>
    .btn { padding: 10px 20px; margin: 10px; cursor: pointer; }
    .primary { background: #007bff; color: white; border: none; border-radius: 4px; }
  </style>
</head>
<body>
  <h2>String Concatenation Examples</h2>
  
  <div>
    <p id="first">Hello</p>
    <p id="second">World</p>
    
    <!-- Traditional hyperscript approach -->
    <button class="btn primary" _="on click set my.innerText to #first.innerText + ' ' + #second.innerText">
      Concat (Traditional)
    </button>
    
    <!-- HyperFixi API approach -->
    <button id="concat-api" class="btn primary">Concat (API)</button>
  </div>

  <script type="module">
    import { hyperscript } from '@hyperfixi/core';
    
    // Process traditional hyperscript attributes
    hyperscript.processNode(document.body);
    
    // Set up API-based example
    const apiButton = document.getElementById('concat-api');
    apiButton.addEventListener('click', async () => {
      try {
        const result = await hyperscript.evaluate('#first.innerText + " " + #second.innerText');
        apiButton.innerText = result;
      } catch (error) {
        console.error('HyperFixi evaluation error:', error);
        apiButton.innerText = 'Error occurred';
      }
    });
  </script>
</body>
</html>
```

## Key Points

1. **Traditional Approach**: Uses `_` attribute, processed by `hyperscript.processNode()`
2. **API Approach**: Uses `hyperscript.evaluate()` for direct expression evaluation  
3. **Context Management**: Create contexts with `hyperscript.createContext()` for element-specific operations
4. **Error Handling**: Wrap `hyperscript.evaluate()` calls in try/catch for robust applications

This example illustrates how to use event handlers to fetch state from other elements, perform simple operations, and store results - with both traditional hyperscript syntax and the new HyperFixi API.