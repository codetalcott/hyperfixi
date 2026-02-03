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
      description:
        'List of supported languages with examples, LokaScript semantic bundles, and adapter bundles for original _hyperscript',
      mimeType: 'application/json',
    },
    {
      uri: 'hyperscript://adapter',
      name: 'Hyperscript Adapter Guide',
      description:
        'Guide for @lokascript/hyperscript-adapter — multilingual plugin for original _hyperscript. Includes setup, bundle selection, and limitations.',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://adapter/compatibility',
      name: 'Adapter Language Compatibility Matrix',
      description:
        'Structured JSON showing per-language confidence levels, command coverage, bundle availability, and known limitations for the adapter.',
      mimeType: 'application/json',
    },
    {
      uri: 'hyperscript://setup/guide',
      name: 'Setup Decision Guide',
      description:
        'Structured decision tree for choosing between LokaScript and original _hyperscript adapter, and selecting the right bundle.',
      mimeType: 'application/json',
    },
  ];
}

// =============================================================================
// Resource Reading
// =============================================================================

export function readResource(uri: string): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} {
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
      return {
        contents: [
          { uri, mimeType: 'application/json', text: JSON.stringify(getLanguages(), null, 2) },
        ],
      };

    case 'hyperscript://adapter':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getAdapterGuide() }] };

    case 'hyperscript://adapter/compatibility':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(getAdapterCompatibility(), null, 2),
          },
        ],
      };

    case 'hyperscript://setup/guide':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(getSetupGuide(), null, 2),
          },
        ],
      };

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
    semanticBundles: {
      note: 'For LokaScript projects using @lokascript/semantic',
      'browser-en': { size: '20 KB', languages: ['en'] },
      'browser-es-en': { size: '25 KB', languages: ['en', 'es'] },
      'browser-western': { size: '30 KB', languages: ['en', 'es', 'pt', 'fr', 'de'] },
      'browser-east-asian': { size: '24 KB', languages: ['ja', 'zh', 'ko'] },
      'browser-priority': {
        size: '48 KB',
        languages: ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'ko', 'ar', 'tr', 'id'],
      },
      'browser.global': { size: '61 KB', languages: 'all' },
    },
    adapterBundles: {
      note: 'For original _hyperscript projects using @lokascript/hyperscript-adapter',
      'hyperscript-i18n-es': { size: '94 KB', languages: ['es'] },
      'hyperscript-i18n-ja': { size: '95 KB', languages: ['ja'] },
      'hyperscript-i18n-ko': { size: '100 KB', languages: ['ko'] },
      'hyperscript-i18n-zh': { size: '88 KB', languages: ['zh'] },
      'hyperscript-i18n-fr': { size: '87 KB', languages: ['fr'] },
      'hyperscript-i18n-de': { size: '86 KB', languages: ['de'] },
      'hyperscript-i18n-pt': { size: '86 KB', languages: ['pt'] },
      'hyperscript-i18n-ar': { size: '95 KB', languages: ['ar'] },
      'hyperscript-i18n-tr': { size: '101 KB', languages: ['tr'] },
      'hyperscript-i18n-id': { size: '85 KB', languages: ['id'] },
      'hyperscript-i18n-western': { size: '146 KB', languages: ['es', 'pt', 'fr', 'de'] },
      'hyperscript-i18n-east-asian': { size: '146 KB', languages: ['ja', 'ko', 'zh'] },
      'hyperscript-i18n': { size: '568 KB', languages: 'all 24' },
      'hyperscript-i18n-lite': {
        size: '4 KB',
        languages: 'depends on external semantic bundle',
      },
    },
    // Backward compatibility
    bundles: {
      'browser-en': { size: '20 KB', languages: ['en'] },
      'browser-es-en': { size: '25 KB', languages: ['en', 'es'] },
      'browser-western': { size: '30 KB', languages: ['en', 'es', 'pt', 'fr', 'de'] },
      'browser-east-asian': { size: '24 KB', languages: ['ja', 'zh', 'ko'] },
      'browser-priority': {
        size: '48 KB',
        languages: ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'ko', 'ar', 'tr', 'id'],
      },
      'browser.global': { size: '61 KB', languages: 'all' },
    },
  };
}

// =============================================================================
// Adapter Resources
// =============================================================================

function getAdapterGuide(): string {
  return `# @lokascript/hyperscript-adapter

Multilingual plugin for the **original _hyperscript** runtime. Enables writing hyperscript in 24 languages without modifying _hyperscript itself.

## When to Use This vs. LokaScript

| Scenario | Use |
|----------|-----|
| New project, want multilingual hyperscript | LokaScript (built-in i18n support) |
| Existing _hyperscript project, want to add i18n | **This adapter** |
| Already using _hyperscript and don't want to migrate | **This adapter** |
| Need full LokaScript features (custom bundles, API v2) | LokaScript |

## How It Works

The adapter is a text preprocessor that:
1. Intercepts \`_hyperscript\`'s \`runtime.getScript()\` method
2. Detects element language via \`data-lang\` attribute, ancestor inheritance, or \`<html lang>\`
3. Translates non-English input to English via semantic parser
4. Returns English text to _hyperscript for normal parsing

## Quick Start

### Browser (Script Tags)

\`\`\`html
<!-- 1. Load original _hyperscript -->
<script src="https://unpkg.com/hyperscript.org"></script>

<!-- 2. Load adapter (auto-registers) -->
<script src="hyperscript-i18n-es.global.js"></script>

<!-- 3. Write hyperscript in Spanish -->
<button _="en clic alternar .active" data-lang="es">Alternar</button>
\`\`\`

### Node.js / Bundler

\`\`\`javascript
import { hyperscriptI18n } from '@lokascript/hyperscript-adapter';

_hyperscript.use(hyperscriptI18n({
  defaultLanguage: 'es',
  debug: true,
}));
\`\`\`

### Programmatic

\`\`\`javascript
import { preprocess } from '@lokascript/hyperscript-adapter';

const english = preprocess('alternar .active', 'es');
// => 'toggle .active'
_hyperscript(english);
\`\`\`

## Bundle Selection

| Bundle | Size | Languages | Best For |
|--------|------|-----------|----------|
| \`hyperscript-i18n-{lang}.global.js\` | 85-101 KB | Single language | Most projects |
| \`hyperscript-i18n-western.global.js\` | 146 KB | es, pt, fr, de | European sites |
| \`hyperscript-i18n-east-asian.global.js\` | 146 KB | ja, ko, zh | East Asian sites |
| \`hyperscript-i18n.global.js\` | 568 KB | All 24 | Maximum coverage |
| \`hyperscript-i18n-lite.global.js\` | 4 KB | Depends on external | Smallest total with external semantic |

### Lite Adapter (Smallest Total Size)

Pair the lite adapter (~4 KB) with any semantic bundle for minimal total size:

\`\`\`html
<script src="_hyperscript.js"></script>
<script src="lokascript-semantic-es.global.js"></script>  <!-- 16 KB -->
<script src="hyperscript-i18n-lite.global.js"></script>   <!-- 4 KB -->
<!-- Total: ~20 KB vs 94 KB for single-language bundle -->
\`\`\`

## Language Resolution

Language is detected in this order (first match wins):
1. \`data-lang\` attribute on the element
2. \`data-hyperscript-lang\` attribute on element or closest ancestor
3. \`<html lang="...">\` document attribute
4. \`defaultLanguage\` plugin option
5. English (no preprocessing)

## Plugin Options

\`\`\`typescript
interface PluginOptions {
  defaultLanguage?: string;      // Default lang for all elements
  languageAttribute?: string;    // Custom attribute (default: "data-lang")
  confidenceThreshold?: number;  // Min confidence 0-1 (default: 0.5)
  strategy?: 'semantic' | 'i18n' | 'auto';
  debug?: boolean;               // Log translations to console
}
\`\`\`

## Known Limitations

- **Expressions**: Standalone non-English boolean expressions may not translate
- **Feature keywords**: \`behavior\`, \`def\`, \`worker\` remain in English
- **SOV languages**: Japanese, Korean, Turkish have lower translation confidence
- **Programmatic calls**: \`_hyperscript("code")\` bypasses the plugin — use \`preprocess()\` instead
`;
}

function getAdapterCompatibility(): object {
  return {
    description:
      'Per-language compatibility matrix for @lokascript/hyperscript-adapter. Tiers: full-support (SVO, high confidence), partial (moderate confidence), experimental (SOV/VSO, low confidence).',
    languages: {
      es: {
        name: 'Spanish',
        wordOrder: 'SVO',
        confidenceRange: '85-95%',
        tier: 'full-support',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-es.global.js',
        bundleSize: '94 KB',
        knownLimitations: [],
      },
      pt: {
        name: 'Portuguese',
        wordOrder: 'SVO',
        confidenceRange: '80-90%',
        tier: 'full-support',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-pt.global.js',
        bundleSize: '86 KB',
        knownLimitations: [],
      },
      fr: {
        name: 'French',
        wordOrder: 'SVO',
        confidenceRange: '80-90%',
        tier: 'full-support',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-fr.global.js',
        bundleSize: '87 KB',
        knownLimitations: [],
      },
      de: {
        name: 'German',
        wordOrder: 'V2',
        confidenceRange: '75-85%',
        tier: 'full-support',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-de.global.js',
        bundleSize: '86 KB',
        knownLimitations: ['V2 word order may affect complex expressions'],
      },
      zh: {
        name: 'Chinese',
        wordOrder: 'SVO',
        confidenceRange: '80-90%',
        tier: 'full-support',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-zh.global.js',
        bundleSize: '88 KB',
        knownLimitations: [],
      },
      id: {
        name: 'Indonesian',
        wordOrder: 'SVO',
        confidenceRange: '75-85%',
        tier: 'full-support',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-id.global.js',
        bundleSize: '85 KB',
        knownLimitations: [],
      },
      ar: {
        name: 'Arabic',
        wordOrder: 'VSO',
        direction: 'rtl',
        confidenceRange: '50-70%',
        tier: 'partial',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-ar.global.js',
        bundleSize: '95 KB',
        knownLimitations: [
          'VSO word order requires grammar transformation',
          'RTL text direction may affect selector display',
        ],
      },
      ja: {
        name: 'Japanese',
        wordOrder: 'SOV',
        confidenceRange: '5-15%',
        tier: 'experimental',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-ja.global.js',
        bundleSize: '95 KB',
        knownLimitations: [
          'SOV word order results in low confidence scores',
          'Compound statements with native connectors may not split correctly',
          'Particle-based grammar challenging for pattern matching',
        ],
      },
      ko: {
        name: 'Korean',
        wordOrder: 'SOV',
        confidenceRange: '3-10%',
        tier: 'experimental',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-ko.global.js',
        bundleSize: '100 KB',
        knownLimitations: [
          'SOV word order results in very low confidence scores',
          'Agglutinative suffixes challenge pattern matching',
        ],
      },
      tr: {
        name: 'Turkish',
        wordOrder: 'SOV',
        confidenceRange: '1-5%',
        tier: 'experimental',
        hasDedicatedBundle: true,
        bundleName: 'hyperscript-i18n-tr.global.js',
        bundleSize: '101 KB',
        knownLimitations: [
          'SOV word order results in very low confidence scores',
          'Agglutinative morphology challenging for pattern matching',
        ],
      },
      hi: {
        name: 'Hindi',
        wordOrder: 'SOV',
        confidenceRange: '10-30%',
        tier: 'experimental',
        hasDedicatedBundle: false,
        bundleName: null,
        bundleSize: null,
        knownLimitations: [
          'No dedicated per-language bundle — use full bundle or lite adapter',
          'SOV word order results in lower confidence',
        ],
      },
      ru: {
        name: 'Russian',
        wordOrder: 'SVO',
        confidenceRange: '60-80%',
        tier: 'partial',
        hasDedicatedBundle: false,
        bundleName: null,
        bundleSize: null,
        knownLimitations: ['No dedicated per-language bundle — use full bundle or lite adapter'],
      },
      it: {
        name: 'Italian',
        wordOrder: 'SVO',
        confidenceRange: '70-85%',
        tier: 'partial',
        hasDedicatedBundle: false,
        bundleName: null,
        bundleSize: null,
        knownLimitations: ['No dedicated per-language bundle — use full bundle or lite adapter'],
      },
      pl: {
        name: 'Polish',
        wordOrder: 'SVO',
        confidenceRange: '60-80%',
        tier: 'partial',
        hasDedicatedBundle: false,
        bundleName: null,
        bundleSize: null,
        knownLimitations: ['No dedicated per-language bundle — use full bundle or lite adapter'],
      },
      vi: {
        name: 'Vietnamese',
        wordOrder: 'SVO',
        confidenceRange: '65-80%',
        tier: 'partial',
        hasDedicatedBundle: false,
        bundleName: null,
        bundleSize: null,
        knownLimitations: ['No dedicated per-language bundle — use full bundle or lite adapter'],
      },
      sw: {
        name: 'Swahili',
        wordOrder: 'SVO',
        confidenceRange: '50-70%',
        tier: 'partial',
        hasDedicatedBundle: false,
        bundleName: null,
        bundleSize: null,
        knownLimitations: ['No dedicated per-language bundle — use full bundle or lite adapter'],
      },
    },
    tiers: {
      'full-support':
        'SVO languages with 75%+ confidence. Reliable for production use. Most commands translate correctly.',
      partial:
        'Languages with 50-75% confidence. Works for common commands. Test thoroughly before production.',
      experimental:
        'SOV/VSO languages with <50% confidence. Basic commands may work. Compound statements may fail. Not recommended for production.',
    },
    availableBundles: {
      perLanguage: ['es', 'ja', 'ko', 'zh', 'fr', 'de', 'pt', 'ar', 'tr', 'id'],
      regional: {
        western: ['es', 'pt', 'fr', 'de'],
        'east-asian': ['ja', 'ko', 'zh'],
      },
      full: 'hyperscript-i18n.global.js (568 KB, all 24 languages)',
      lite: 'hyperscript-i18n-lite.global.js (4 KB, requires external semantic bundle)',
    },
  };
}

function getSetupGuide(): object {
  return {
    description:
      'Decision tree for setting up multilingual hyperscript. Follow the questions to determine the right approach.',
    steps: [
      {
        question: 'Are you using the original _hyperscript or LokaScript?',
        options: {
          hyperscript: {
            recommendation: 'Use @lokascript/hyperscript-adapter plugin',
            next: 'step-adapter-bundle',
          },
          lokascript: {
            recommendation:
              'Use built-in multilingual support (multilingual bundle or semantic bundle)',
            next: 'step-lokascript-bundle',
          },
          unsure: {
            recommendation:
              '_hyperscript is the original project (hyperscript.org). LokaScript is the extended fork with multilingual support, tree-shaking, and API v2. If you have _hyperscript.js, use the adapter. If you have lokascript-browser.js, use LokaScript.',
            next: null,
          },
        },
      },
      {
        id: 'step-adapter-bundle',
        question: 'How many non-English languages do you need?',
        options: {
          one: {
            recommendation:
              'Use a per-language bundle (85-101 KB). Available: es, ja, ko, zh, fr, de, pt, ar, tr, id.',
            setup:
              '<script src="_hyperscript.js"></script>\n<script src="hyperscript-i18n-{lang}.global.js"></script>',
            next: null,
          },
          'few-same-region': {
            recommendation:
              'Use a regional bundle. Western (es/pt/fr/de, 146 KB) or East Asian (ja/ko/zh, 146 KB).',
            setup:
              '<script src="_hyperscript.js"></script>\n<script src="hyperscript-i18n-western.global.js"></script>',
            next: null,
          },
          many: {
            recommendation:
              'Use the full bundle (568 KB) or the lite adapter + external semantic bundle for smaller total size.',
            setup:
              '<script src="_hyperscript.js"></script>\n<script src="hyperscript-i18n.global.js"></script>',
            alternative:
              'Lite: <script src="_hyperscript.js"></script> + <script src="lokascript-semantic-{region}.global.js"></script> + <script src="hyperscript-i18n-lite.global.js"></script>',
            next: null,
          },
        },
      },
      {
        id: 'step-lokascript-bundle',
        question: 'Do you need multilingual support or just English?',
        options: {
          'english-only': {
            recommendation:
              'Use the smallest bundle that covers your commands. lite (1.9 KB) → hybrid-complete (7.3 KB) → standard (63 KB) → browser (203 KB).',
            next: null,
          },
          multilingual: {
            recommendation:
              'Use lokascript-multilingual.js (250 KB) + a semantic bundle for your languages.',
            next: null,
          },
        },
      },
    ],
  };
}
