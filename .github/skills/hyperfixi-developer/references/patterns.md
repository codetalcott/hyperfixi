<!-- AUTO-GENERATED from packages/mcp-server/src/resources/content.ts -->
<!-- Do not edit directly. Run: npm run generate:skills -->

# Common Hyperscript Patterns

## Toggle Menu

```html
<button _="on click toggle .open on #nav">Menu</button>
```

## Modal Dialog

```html
<button _="on click show #modal with *opacity">Open</button>
<div id="modal" _="on click if target is me hide me with *opacity">
  <div class="content">...</div>
</div>
```

## Form Validation

```html
<input _="on blur if my value is empty add .error else remove .error" />
<form _="on submit prevent default if .error exists return else fetch /api"></form>
```

## Loading State

```html
<button _="on click add .loading to me fetch /api remove .loading from me">Submit</button>
```

## Infinite Scroll

```html
<div
  _="on intersection(intersecting) from .sentinel
        if intersecting
          fetch /more
          append it to me
        end"
></div>
```

## Debounced Search

```html
<input
  _="on input.debounce(300ms)
          fetch /search?q={my value} as json
          put it into #results"
/>
```

## Countdown

```html
<button
  _="on click repeat 10 times
            decrement #counter.textContent
            wait 1s
          end"
>
  Start
</button>
```

## Tab Navigation

```html
<div class="tabs">
  <button
    _="on click
            remove .active from .tab-btn
            add .active to me
            hide .tab-content
            show next .tab-content"
  >
    Tab 1
  </button>
</div>
```

## Copy to Clipboard

```html
<button
  _="on click
          call navigator.clipboard.writeText(#code.textContent)
          add .copied to me
          wait 2s
          remove .copied from me"
>
  Copy
</button>
```

## Dark Mode Toggle

```html
<button
  _="on click
          toggle .dark on <html/>
          if <html/> matches .dark
            set localStorage.theme to 'dark'
          else
            set localStorage.theme to 'light'
          end"
></button>
```
