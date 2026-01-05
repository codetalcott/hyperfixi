# Cookbook

Practical recipes and patterns for common UI interactions with HyperFixi.

## Getting Started

Each recipe includes:
- A working example you can try
- Step-by-step explanation
- Common variations and tips

<script setup>
import HyperscriptPlayground from '../../.vitepress/theme/components/HyperscriptPlayground.vue'
</script>

## Quick Examples

### Toggle a Class

<HyperscriptPlayground
  initial-code="on click toggle .active on me"
  initial-html='<button class="demo-button">Toggle Active</button>'
/>

### Show/Hide Content

<HyperscriptPlayground
  initial-code="on click toggle .hidden on next <div/>"
  initial-html='<button class="demo-button">Toggle</button><div>Content to toggle</div>'
/>

## Recipes by Category

### Basics
- [Hello World](/en/cookbook/hello-world) - Your first hyperscript
- [Toggle Classes](/en/cookbook/toggle-classes) - Add, remove, toggle CSS classes
- [Show/Hide Elements](/en/cookbook/show-hide) - Visibility control

### Forms & Inputs
- [Form Validation](/en/cookbook/form-validation) - Client-side validation
- [Input Mirroring](/en/cookbook/input-mirror) - Real-time input sync

### Advanced Patterns
- [Fade and Remove](/en/cookbook/fade-remove) - Animated element removal
- [State Machine](/en/cookbook/state-machine) - Complex state management

## Common Patterns

### Event + Action

The basic pattern is: `on [event] [action]`

```html
<button _="on click add .clicked to me">Click me</button>
```

### Chaining Actions

Use `then` to chain multiple actions:

```html
<button _="on click add .loading then wait 1s then remove .loading">
  Load
</button>
```

### Targeting Other Elements

Target other elements with CSS selectors:

```html
<button _="on click toggle .visible on #modal">
  Open Modal
</button>
```

### Conditional Logic

Use `if` for conditional behavior:

```html
<button _="on click if I match .active remove .active else add .active">
  Toggle
</button>
```
