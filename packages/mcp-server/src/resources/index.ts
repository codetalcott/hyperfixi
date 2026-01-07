/**
 * MCP Resources
 *
 * Static documentation and example resources available to MCP clients.
 */

import type { Resource } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Resource Listing
// =============================================================================

export function listResources(): Resource[] {
  return [
    {
      uri: 'hyperscript://docs/commands',
      name: 'Hyperscript Commands Reference',
      description: 'Complete reference for all hyperscript commands',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://docs/expressions',
      name: 'Hyperscript Expressions Guide',
      description: 'Guide to hyperscript expression syntax',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://docs/events',
      name: 'Hyperscript Events Reference',
      description: 'Event handling and modifiers',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://examples/common',
      name: 'Common Patterns',
      description: 'Frequently used hyperscript patterns',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://languages',
      name: 'Supported Languages',
      description: 'List of 13 supported languages with examples',
      mimeType: 'application/json',
    },
  ];
}

// =============================================================================
// Resource Reading
// =============================================================================

export function readResource(uri: string): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  switch (uri) {
    case 'hyperscript://docs/commands':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getCommandsReference() }] };

    case 'hyperscript://docs/expressions':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getExpressionsGuide() }] };

    case 'hyperscript://docs/events':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getEventsReference() }] };

    case 'hyperscript://examples/common':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getCommonPatterns() }] };

    case 'hyperscript://languages':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(getLanguages(), null, 2) }] };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}

// =============================================================================
// Resource Content
// =============================================================================

function getCommandsReference(): string {
  return `# Hyperscript Commands Reference

## DOM Manipulation

| Command | Usage | Example |
|---------|-------|---------|
| \`toggle\` | Toggle class/attribute | \`toggle .active on #menu\` |
| \`add\` | Add class/attribute/style | \`add .highlight to me\` |
| \`remove\` | Remove class/attribute/element | \`remove .error from #form\` |
| \`show\` | Show element | \`show #modal with *opacity\` |
| \`hide\` | Hide element | \`hide me with *opacity\` |
| \`put\` | Set element content | \`put "Hello" into #greeting\` |
| \`append\` | Add to end | \`append "<li/>" to #list\` |
| \`swap\` | Replace content | \`swap #target innerHTML\` |

## Data Commands

| Command | Usage | Example |
|---------|-------|---------|
| \`set\` | Set variable/property | \`set :count to 0\` |
| \`get\` | Get value | \`get #input.value\` |
| \`increment\` | Add 1 | \`increment :count\` |
| \`decrement\` | Subtract 1 | \`decrement :count\` |

## Events

| Command | Usage | Example |
|---------|-------|---------|
| \`send\` | Dispatch event | \`send refresh to #list\` |
| \`trigger\` | Trigger event | \`trigger submit on #form\` |

## Async

| Command | Usage | Example |
|---------|-------|---------|
| \`wait\` | Pause | \`wait 500ms\` |
| \`fetch\` | HTTP request | \`fetch /api as json\` |

## Control Flow

| Command | Usage | Example |
|---------|-------|---------|
| \`if/else\` | Conditional | \`if me matches .active ... else ... end\` |
| \`repeat\` | Loop N times | \`repeat 5 times ...\` |
| \`for each\` | Iterate | \`for item in items ...\` |
| \`while\` | While loop | \`while :loading wait 100ms\` |

## Navigation

| Command | Usage | Example |
|---------|-------|---------|
| \`go\` | Navigate | \`go to /dashboard\` |
| \`focus\` | Focus element | \`focus #input\` |
| \`blur\` | Blur element | \`blur me\` |

## Utility

| Command | Usage | Example |
|---------|-------|---------|
| \`log\` | Console log | \`log me\` |
| \`call\` | Call function | \`call myFunction()\` |
| \`return\` | Exit handler | \`return\` |
`;
}

function getExpressionsGuide(): string {
  return `# Hyperscript Expressions Guide

## Element References

- \`me\` / \`myself\` - Current element
- \`you\` - Event target
- \`it\` / \`result\` - Last expression result

## Variables

- \`:name\` - Local variable
- \`$name\` - Global variable

## Selectors

- \`#id\` - ID selector
- \`.class\` - Class selector
- \`<tag/>\` - Tag selector
- \`[attr]\` - Attribute selector

## Positional

- \`first\` / \`last\` - First/last in collection
- \`next\` / \`previous\` - Relative navigation
- \`closest\` - Nearest ancestor
- \`parent\` - Direct parent

## Property Access

- \`element's property\` - Possessive syntax
- \`my property\` - Current element property
- \`@attribute\` - Attribute access

## Comparisons

- \`is\` / \`is not\` - Equality
- \`>\`, \`<\`, \`>=\`, \`<=\` - Numeric
- \`matches\` - CSS selector match
- \`contains\` - Membership
- \`exists\` / \`is empty\` - Existence

## Logical

- \`and\` / \`or\` / \`not\` - Boolean operators

## Type Conversion

- \`as Int\` - To integer
- \`as String\` - To string
- \`as json\` - Parse JSON
- \`as FormData\` - Form to FormData
`;
}

function getEventsReference(): string {
  return `# Hyperscript Events Reference

## Event Syntax

\`\`\`
on <event>[.<modifier>...] [from <source>] <commands>
\`\`\`

## Common Events

| Event | Description |
|-------|-------------|
| \`click\` | Mouse click |
| \`dblclick\` | Double click |
| \`submit\` | Form submission |
| \`input\` | Input value change |
| \`change\` | Input change (on blur) |
| \`focus\` | Element focused |
| \`blur\` | Element blurred |
| \`keydown\` | Key pressed |
| \`keyup\` | Key released |
| \`mouseenter\` | Mouse enters |
| \`mouseleave\` | Mouse leaves |
| \`scroll\` | Element scrolled |
| \`load\` | Element loaded |

## Event Modifiers

| Modifier | Description |
|----------|-------------|
| \`.once\` | Handle only once |
| \`.prevent\` | Prevent default |
| \`.stop\` | Stop propagation |
| \`.debounce(Nms)\` | Debounce handler |
| \`.throttle(Nms)\` | Throttle handler |
| \`.ctrl\` | Require Ctrl key |
| \`.shift\` | Require Shift key |
| \`.alt\` | Require Alt key |
| \`.meta\` | Require Meta key |

## Key Modifiers

\`\`\`html
<input _="on keydown.enter submit closest form">
<div _="on keydown.escape hide me">
<input _="on keydown.ctrl.s.prevent call save()">
\`\`\`

## Delegated Events

\`\`\`html
<ul _="on click from li toggle .selected on you">
<form _="on input from input validate(you)">
\`\`\`

## Custom Events

\`\`\`html
<button _="on click send refresh to #list">
<div _="on refresh fetch /api/items put it into me">
\`\`\`
`;
}

function getCommonPatterns(): string {
  return `# Common Hyperscript Patterns

## Toggle Menu
\`\`\`html
<button _="on click toggle .open on #nav">Menu</button>
\`\`\`

## Modal Dialog
\`\`\`html
<button _="on click show #modal with *opacity">Open</button>
<div id="modal" _="on click if target is me hide me with *opacity">
  <div class="content">...</div>
</div>
\`\`\`

## Form Validation
\`\`\`html
<input _="on blur if my value is empty add .error else remove .error">
<form _="on submit prevent default if .error exists return else fetch /api">
\`\`\`

## Loading State
\`\`\`html
<button _="on click add .loading to me fetch /api remove .loading from me">
  Submit
</button>
\`\`\`

## Infinite Scroll
\`\`\`html
<div _="on intersection(intersecting) from .sentinel
        if intersecting
          fetch /more
          append it to me
        end">
</div>
\`\`\`

## Debounced Search
\`\`\`html
<input _="on input.debounce(300ms)
          fetch /search?q={my value} as json
          put it into #results">
\`\`\`

## Countdown
\`\`\`html
<button _="on click repeat 10 times
            decrement #counter.textContent
            wait 1s
          end">
  Start
</button>
\`\`\`

## Tab Navigation
\`\`\`html
<div class="tabs">
  <button _="on click
            remove .active from .tab-btn
            add .active to me
            hide .tab-content
            show next .tab-content">
    Tab 1
  </button>
</div>
\`\`\`

## Copy to Clipboard
\`\`\`html
<button _="on click
          call navigator.clipboard.writeText(#code.textContent)
          add .copied to me
          wait 2s
          remove .copied from me">
  Copy
</button>
\`\`\`

## Dark Mode Toggle
\`\`\`html
<button _="on click
          toggle .dark on <html/>
          if <html/> matches .dark
            set localStorage.theme to 'dark'
          else
            set localStorage.theme to 'light'
          end">
</button>
\`\`\`
`;
}

function getLanguages(): object {
  return {
    supported: [
      { code: 'en', name: 'English', wordOrder: 'SVO' },
      { code: 'es', name: 'Spanish', wordOrder: 'SVO' },
      { code: 'pt', name: 'Portuguese', wordOrder: 'SVO' },
      { code: 'fr', name: 'French', wordOrder: 'SVO' },
      { code: 'de', name: 'German', wordOrder: 'V2' },
      { code: 'ja', name: 'Japanese', wordOrder: 'SOV' },
      { code: 'zh', name: 'Chinese', wordOrder: 'SVO' },
      { code: 'ko', name: 'Korean', wordOrder: 'SOV' },
      { code: 'ar', name: 'Arabic', wordOrder: 'VSO' },
      { code: 'tr', name: 'Turkish', wordOrder: 'SOV' },
      { code: 'id', name: 'Indonesian', wordOrder: 'SVO' },
      { code: 'sw', name: 'Swahili', wordOrder: 'SVO' },
      { code: 'qu', name: 'Quechua', wordOrder: 'SOV' },
    ],
    examples: {
      en: 'on click toggle .active',
      ja: 'クリック で .active を トグル',
      ko: '클릭 시 .active 를 토글',
      zh: '点击 时 切换 .active',
      ar: 'بدّل .active عند نقر',
      es: 'en clic alternar .active',
    },
    bundles: {
      'browser-en': { size: '20 KB', languages: ['en'] },
      'browser-es-en': { size: '25 KB', languages: ['en', 'es'] },
      'browser-western': { size: '30 KB', languages: ['en', 'es', 'pt', 'fr', 'de'] },
      'browser-east-asian': { size: '24 KB', languages: ['ja', 'zh', 'ko'] },
      'browser-priority': { size: '48 KB', languages: ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'ko', 'ar', 'tr', 'id'] },
      'browser.global': { size: '61 KB', languages: 'all' },
    },
  };
}
