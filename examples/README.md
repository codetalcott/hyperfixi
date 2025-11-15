# HyperFixi Example Gallery

Welcome to the HyperFixi Example Gallery! This collection of interactive examples demonstrates the full power of hyperscript patterns, from basic event handling to advanced behaviors and animations.

## 🎯 What is this?

The Example Gallery is an organized, interactive tutorial that teaches hyperscript through hands-on examples. Each example:

- ✅ **Runs in isolation** - Can be opened and tested independently
- ✅ **Fully documented** - Includes code explanation and concepts
- ✅ **Interactive** - Try it live in your browser
- ✅ **Progressively structured** - Organized by difficulty level

## 📂 Directory Structure

```
examples/
├── index.html              # Gallery home page (start here!)
├── basics/                 # Fundamental patterns (5 examples)
│   ├── 01-hello-world.html
│   ├── 02-toggle-class.html
│   ├── 03-show-hide.html
│   ├── 04-input-mirror.html
│   └── 05-counter.html
├── intermediate/           # Moderate complexity (5 examples)
│   ├── 01-form-validation.html
│   ├── 02-fetch-data.html
│   ├── 03-fade-effects.html
│   ├── 04-tabs.html
│   └── 05-modal.html
└── advanced/               # Complex patterns (5+ examples)
    ├── 01-color-cycling.html
    ├── 02-draggable.html
    ├── 03-sortable-list.html
    ├── 04-infinite-scroll.html
    └── 05-state-machine.html
```

## 🚀 Getting Started

### Viewing the Gallery

1. **Start HTTP Server** (from project root):
   ```bash
   npx http-server -p 3000 -c-1
   ```

2. **Open in Browser**:
   ```
   http://localhost:3000/examples/index.html
   ```

3. **Browse Examples**: Click any card to view an interactive example

### Running Individual Examples

Each example is self-contained and can be opened directly:

```bash
# Example: Open the counter example
open http://localhost:3000/examples/basics/05-counter.html
```

## 📚 Learning Path

### 🌱 Level 1: Basics

**Start here if you're new to hyperscript!**

Learn fundamental patterns:
- Event handling (`on click`, `on input`)
- DOM manipulation (`put`, `toggle`, `show/hide`)
- Element selection (CSS selectors: `#id`, `.class`)
- Simple state management (`increment`, `decrement`)

**Time:** ~30 minutes
**Prerequisites:** Basic HTML/CSS knowledge

### 🚀 Level 2: Intermediate

**Ready for more complex patterns?**

Explore real-world features:
- Form handling and validation
- AJAX/Fetch requests
- CSS transitions and animations
- Tab navigation and UI components
- Modal dialogs with accessibility

**Time:** ~1-2 hours
**Prerequisites:** Completed Basics

### 🎯 Level 3: Advanced

**Master complex hyperscript patterns!**

Build sophisticated interactions:
- Custom behaviors (reusable components)
- Drag-and-drop with event loops
- State machines and transitions
- Infinite scroll with intersection observers
- Complex event coordination

**Time:** ~2-3 hours
**Prerequisites:** Completed Intermediate

## 🎨 Featured Examples

### 🌈 Color Cycling (Advanced)
**File:** `advanced/01-color-cycling.html`

Demonstrates:
- Event-driven loops (`repeat until event`)
- CSS transitions
- Global scope access (`Math.random()`)
- Template string interpolation

```hyperscript
on pointerdown
  set originalColor to my *background-color
  repeat until event pointerup from the document
    set rand to Math.random() * 360
    transition *background-color to `hsl(${rand} 100% 90%)` over 250ms
  end
  transition *background-color to originalColor
end
```

### 🖱️ Draggable Elements (Advanced)
**File:** `advanced/02-draggable.html`

Demonstrates:
- Reusable behaviors
- Custom events and hooks
- Element measurement
- Event parameter destructuring
- CSS injection via template strings

```hyperscript
behavior Draggable(dragHandle)
  init
    if no dragHandle set the dragHandle to me
  end
  on pointerdown(clientX, clientY) from dragHandle
    halt the event
    trigger draggable:start
    measure my x, y
    -- ... drag logic
  end
end
```

## 🔗 Complete Example Showcase

Want to see multiple advanced examples on one page?

**Visit:** [compound-examples.html](../compound-examples.html)

This page combines:
- Color cycling with HSL animation
- Draggable behavior with custom events
- Live metrics display
- Debug mode toggle

Perfect for testing multiple patterns together!

## 🛠️ Development

### Adding New Examples

1. **Create HTML file** in appropriate directory:
   ```bash
   # Create new example
   touch examples/basics/06-my-example.html
   ```

2. **Use existing template** - Copy structure from similar example

3. **Include required elements**:
   - Breadcrumb navigation
   - Code explanation
   - Interactive demo
   - Previous/Next navigation
   - HyperFixi script tag

4. **Update index.html** - Add card to appropriate section

5. **Test in browser** - Verify it works in isolation

### Example Template Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>Example Title - HyperFixi Examples</title>
    <!-- Styles -->
</head>
<body>
    <div class="container">
        <!-- Breadcrumb -->
        <!-- Title & Description -->
        <!-- Tags -->
        <!-- Interactive Demo -->
        <!-- Code Explanation -->
        <!-- Navigation -->
    </div>
    <script src="../../packages/core/dist/hyperfixi-browser.js"></script>
</body>
</html>
```

## 📖 Documentation Resources

- **HyperFixi Docs:** [packages/core/docs/](../packages/core/docs/)
- **API Reference:** [packages/core/docs/API.md](../packages/core/docs/API.md)
- **Test Dashboard:** [packages/core/test-dashboard.html](../packages/core/test-dashboard.html)
- **Compatibility Tests:** [packages/core/compatibility-test.html](../packages/core/compatibility-test.html)

## 🎓 Learning Tips

1. **Start Simple**: Begin with basics, don't skip ahead
2. **Experiment**: Modify examples in the browser console
3. **Read Code**: Study the hyperscript attribute carefully
4. **Try Variations**: Change events, selectors, values
5. **Build Your Own**: Create examples for your use cases

## 🌟 Pattern Categories

### Event Handling
- Click, hover, input, focus events
- Event delegation
- Event conditions and filtering
- Custom events

### DOM Manipulation
- Content updates (`put`, `append`)
- Class management (`add`, `remove`, `toggle`)
- Visibility (`show`, `hide`)
- Style manipulation

### Control Flow
- Conditionals (`if`, `unless`)
- Loops (`repeat`, `repeat until`)
- Waiting (`wait`)
- Event-driven loops

### Advanced Features
- Behaviors (reusable components)
- Transitions and animations
- Form handling
- AJAX/Fetch
- Measurements and positioning

## 🔍 Finding Examples by Feature

### Want to learn about `fetch`?
→ See: `intermediate/02-fetch-data.html`

### Need drag-and-drop?
→ See: `advanced/02-draggable.html` or `advanced/03-sortable-list.html`

### Looking for form validation?
→ See: `intermediate/01-form-validation.html`

### Want smooth animations?
→ See: `intermediate/03-fade-effects.html` or `advanced/01-color-cycling.html`

## 💡 Pro Tips

- **Debug Mode**: Open browser console to see HyperFixi debug output
- **Live Edit**: Use browser DevTools to modify `_=""` attributes live
- **Inspect Network**: Watch AJAX requests in the Network tab
- **Test Responsive**: Resize window to test on different screen sizes
- **Read the Code**: Each example includes detailed explanations

## 🤝 Contributing

Found a bug or want to add an example?

1. Create a new example following the template
2. Test in multiple browsers
3. Document all features used
4. Submit a pull request

## 📜 License

These examples are part of the HyperFixi project and follow the same license.

---

**Built with ❤️ using HyperFixi**
100% _hyperscript compatible • TypeScript powered • Production ready

**Questions?** Check the [main documentation](../packages/core/docs/) or open an issue!
