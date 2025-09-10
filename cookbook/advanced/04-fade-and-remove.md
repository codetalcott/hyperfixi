# Fade and Remove Elements

**Demonstrates**: CSS transitions, element removal, chained commands, timing

## HTML Attribute Approach (Traditional)

```html
<button _="on click transition opacity to 0 then remove me">
  Fade & Remove (Traditional)
</button>

<script type="module">
  import { hyperscript } from '@hyperfixi/core';
  hyperscript.processNode(document.body);
</script>
```

## JavaScript API Approach (HyperFixi)

```html
<button id="fade-remove-api">
  Fade & Remove (API)
</button>

<script type="module">
  import { hyperscript } from '@hyperfixi/core';
  
  // Method 1: Direct command sequence
  const button = document.getElementById('fade-remove-api');
  const context = hyperscript.createContext(button);
  
  await hyperscript.evaluate('on click transition opacity to 0 then remove me', context);
  
  // Method 2: Manual implementation with evaluate
  button.addEventListener('click', async () => {
    // Fade out
    await hyperscript.evaluate('transition opacity to 0', context);
    
    // Wait for transition, then remove
    setTimeout(async () => {
      await hyperscript.evaluate('remove me', context);
    }, 300); // Match CSS transition duration
  });
  
  // Method 3: Using CSS classes for animations
  button.addEventListener('click', async () => {
    await hyperscript.evaluate('add .fade-out to me', context);
    
    // Listen for transition end
    button.addEventListener('transitionend', async () => {
      await hyperscript.evaluate('remove me', context);
    }, { once: true });
  });
</script>
```

## Working Demo

```html
<!DOCTYPE html>
<html>
<head>
  <title>HyperFixi - Fade and Remove</title>
  <style>
    .demo-container {
      padding: 20px;
      border: 2px dashed #ccc;
      margin: 20px 0;
      min-height: 100px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    
    .fade-btn {
      padding: 12px 24px;
      background: linear-gradient(45deg, #ff6b6b, #ee5a24);
      color: white;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      transition: opacity 0.3s ease, transform 0.2s ease;
      font-weight: bold;
    }
    
    .fade-btn:hover {
      transform: translateY(-2px);
    }
    
    .fade-out {
      opacity: 0 !important;
      transform: scale(0.8) !important;
    }
    
    .regenerate-btn {
      padding: 8px 16px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>🎭 Fade and Remove Elements</h1>
  
  <div>
    <button class="regenerate-btn" onclick="regenerateButtons()">
      🔄 Regenerate All Buttons
    </button>
  </div>
  
  <div class="demo-container" id="traditional-demo">
    <h3 style="width: 100%; margin: 0;">Traditional HyperScript</h3>
    <button class="fade-btn" _="on click transition opacity to 0 then remove me">
      Traditional Fade & Remove
    </button>
  </div>
  
  <div class="demo-container" id="api-demo">
    <h3 style="width: 100%; margin: 0;">HyperFixi API Methods</h3>
    <button class="fade-btn api-method-1">
      API: Event Handler Setup
    </button>
    <button class="fade-btn api-method-2">
      API: Manual Sequence
    </button>
    <button class="fade-btn api-method-3">
      API: CSS Class Animation
    </button>
  </div>

  <script type="module">
    import { hyperscript } from '@hyperfixi/core';
    
    console.log('🎭 Setting up Fade & Remove Examples...');
    
    async function setupTraditional() {
      // Process traditional hyperscript attributes
      hyperscript.processNode(document.getElementById('traditional-demo'));
      console.log('✅ Traditional hyperscript processed');
    }
    
    async function setupApiExamples() {
      try {
        // Method 1: Event handler setup with evaluate
        const method1Btns = document.querySelectorAll('.api-method-1');
        for (const btn of method1Btns) {
          const context = hyperscript.createContext(btn);
          await hyperscript.evaluate('on click transition opacity to 0 then remove me', context);
        }
        
        // Method 2: Manual sequence implementation
        const method2Btns = document.querySelectorAll('.api-method-2');
        for (const btn of method2Btns) {
          const context = hyperscript.createContext(btn);
          btn.addEventListener('click', async () => {
            try {
              // Start fade transition
              await hyperscript.evaluate('set my.style.transition to "opacity 0.3s ease, transform 0.3s ease"', context);
              await hyperscript.evaluate('set my.style.opacity to "0"', context);
              await hyperscript.evaluate('set my.style.transform to "scale(0.8)"', context);
              
              // Remove after transition
              setTimeout(async () => {
                await hyperscript.evaluate('remove me', context);
                console.log('🗑️ Method 2: Element removed after fade');
              }, 300);
            } catch (error) {
              console.error('❌ Method 2 error:', error);
            }
          });
        }
        
        // Method 3: CSS class-based animation
        const method3Btns = document.querySelectorAll('.api-method-3');
        for (const btn of method3Btns) {
          const context = hyperscript.createContext(btn);
          btn.addEventListener('click', async () => {
            try {
              await hyperscript.evaluate('add .fade-out to me', context);
              
              // Listen for transition end
              btn.addEventListener('transitionend', async () => {
                await hyperscript.evaluate('remove me', context);
                console.log('🎨 Method 3: Element removed after CSS transition');
              }, { once: true });
            } catch (error) {
              console.error('❌ Method 3 error:', error);
            }
          });
        }
        
        console.log('✅ All API examples setup complete');
        
      } catch (error) {
        console.error('❌ Error setting up API examples:', error);
      }
    }
    
    // Global function for regenerating buttons
    window.regenerateButtons = function() {
      // Regenerate traditional section
      const traditionalDemo = document.getElementById('traditional-demo');
      const traditionalHTML = `
        <h3 style="width: 100%; margin: 0;">Traditional HyperScript</h3>
        <button class="fade-btn" _="on click transition opacity to 0 then remove me">
          Traditional Fade & Remove
        </button>
      `;
      traditionalDemo.innerHTML = traditionalHTML;
      
      // Regenerate API section
      const apiDemo = document.getElementById('api-demo');
      const apiHTML = `
        <h3 style="width: 100%; margin: 0;">HyperFixi API Methods</h3>
        <button class="fade-btn api-method-1">
          API: Event Handler Setup
        </button>
        <button class="fade-btn api-method-2">
          API: Manual Sequence
        </button>
        <button class="fade-btn api-method-3">
          API: CSS Class Animation
        </button>
      `;
      apiDemo.innerHTML = apiHTML;
      
      // Re-setup all examples
      setupTraditional();
      setupApiExamples();
      
      console.log('🔄 All buttons regenerated and re-setup');
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setupTraditional();
        setupApiExamples();
      });
    } else {
      setupTraditional();
      setupApiExamples();
    }
  </script>
</body>
</html>
```

## Advanced Techniques

### 1. Chained Commands
```javascript
// Traditional hyperscript chaining
'on click transition opacity to 0 then remove me'

// API equivalent 
await hyperscript.evaluate('transition opacity to 0 then remove me', context);
```

### 2. Timing Control
```javascript
// Method 1: Built-in timing with 'then'
await hyperscript.evaluate('add .fade-out to me then wait 300ms then remove me', context);

// Method 2: JavaScript setTimeout
setTimeout(() => {
  hyperscript.evaluate('remove me', context);
}, 300);

// Method 3: CSS transition events
element.addEventListener('transitionend', () => {
  hyperscript.evaluate('remove me', context);
});
```

### 3. CSS Integration
```css
.fade-out {
  opacity: 0 !important;
  transform: scale(0.8) !important;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
```

## Key Commands Demonstrated

- `transition opacity to 0` - Animate CSS property changes
- `remove me` - Remove element from DOM  
- `add .class-name to me` - Add CSS classes
- `then` - Chain commands sequentially
- `wait Nms` - Add delays between commands

## Error Handling

```javascript
try {
  await hyperscript.evaluate('transition opacity to 0 then remove me', context);
} catch (error) {
  console.error('Animation failed:', error);
  // Fallback: immediate removal
  element.remove();
}
```

This example shows how HyperFixi handles complex animations and DOM manipulation with both declarative and programmatic approaches.