/**
 * MCP Resource Content
 *
 * Exported content functions for use by both MCP server and skill generation.
 * This is the single source of truth for reference documentation.
 */

import { getRegisteredLanguages, tryGetProfile, translate } from '@lokascript/semantic';

// =============================================================================
// Core Reference Content (for Agent Skills generation)
// =============================================================================

export function getCommandsReference(): string {
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
| \`put … at start of\` / \`before\` / \`after\` | Insert content | \`put "<li/>" at start of #list\` |
| \`swap\` | Exchange two values | \`swap #a's textContent with #b's textContent\` |

## Data Commands

| Command | Usage | Example |
|---------|-------|---------|
| \`set\` | Set variable/property | \`set :count to 0\` |
| \`get\` | Get value | \`get #input's value\` |
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
| \`for\` | Iterate | \`for item in items ...\` |
| \`repeat while\` | While loop | \`repeat while :loading wait 100ms end\` |

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

export function getExpressionsGuide(): string {
  return `# Hyperscript Expressions Guide

## Element References

- \`me\` / \`myself\` - Current element
- \`target\` - The element the event happened on (\`event.target\`)
- \`you\` - The element a \`tell\` block talks to (unset in an ordinary handler)
- \`it\` / \`result\` - Last expression result

## Variables

- \`name\` - Local variable (this handler)
- \`:name\` - Element-scoped variable (shared by the element's handlers)
- \`$name\` - Global variable

## Selectors

- \`#id\` - ID selector
- \`.class\` - Class selector
- \`<tag/>\` - Tag selector
- \`<[attr='v']/>\` - Attribute query (a bare \`[attr]\` is not a selector)

## Positional

- \`first\` / \`last\` - First/last in collection
- \`next\` / \`previous\` - Relative navigation
- \`closest\` - Nearest ancestor (\`closest <form/>\`)
- \`my parentElement\` - Direct parent (there is no \`parent\` keyword)

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
- \`as JSON\` - Parse a JSON string
- \`as Values\` - A form's (or element's) input values, as an object
- (\`fetch … as json\` / \`as text\` / \`as html\` choose fetch's response format)
`;
}

export function getEventsReference(): string {
  return `# Hyperscript Events Reference

## Event Syntax

\`\`\`text
on <event>[<filter>] [<count>] [from <source>] [debounced at <time> | throttled at <time>] <commands>
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

## Event Options

Upstream _hyperscript's forms (3.x's dotted \`.once\` / \`.prevent\` / \`.debounce(N)\` modifiers were
core-only: \`on click.prevent\` is an event literally named \`click.prevent\`).

| Option | Meaning |
|--------|---------|
| \`on click[shiftKey]\` | Filter: run only when the expression holds (event properties are in scope) |
| \`on click 1\` | Count: only the first click (\`on click 2 to 4\`, \`on click 3 and on\`) |
| \`on input debounced at 300ms\` | Debounce |
| \`on scroll throttled at 100ms\` | Throttle |
| \`on click from #other\` | Listen on another element |
| \`halt the event\` | (a command) preventDefault + stopPropagation; \`halt the event's default\` for one |

## Key Filters

\`\`\`html
<input _="on keydown[key is 'Enter'] send submit to the closest <form/>">
<div _="on keydown[key is 'Escape'] from window hide me">
<input _="on keydown[ctrlKey and key is 's'] halt the event then call save()">
\`\`\`

## Delegated Events

\`target\` is the element the event happened on.

\`\`\`html
<ul _="on click toggle .selected on the closest <li/> to target">
<form _="on input call validate(target)">
\`\`\`

## Custom Events

\`\`\`html
<button _="on click send refresh to #list">
<div _="on refresh fetch /api/items as html then put it into me">
\`\`\`
`;
}

export function getCommonPatterns(): string {
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
<form _="on submit halt the event then if <.error/> in me exists exit end then fetch /api">
\`\`\`

## Loading State

\`\`\`html
<button _="on click add .loading to me fetch /api remove .loading from me">
  Submit
</button>
\`\`\`

## Infinite Scroll

\`\`\`html
<!-- the sentinel sits at the end of the list and loads more as it scrolls into view -->
<div class="sentinel" _="on intersection(intersecting)
        if intersecting
          fetch /more as html
          put it before me
        end">
</div>
\`\`\`

## Debounced Search

\`\`\`html
<input _="on input debounced at 300ms
          fetch \`/search?q=\${my value}\` as html
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

// =============================================================================
// Additional Content (MCP-only, not needed for Agent Skills)
// =============================================================================

/** The sentence `getLanguages()` shows in every language. */
const EXAMPLE_SOURCE = 'on click toggle .active';

/**
 * The languages `@lokascript/hyperscript-adapter` builds a single-language bundle for
 * (`dist/hyperscript-i18n-<code>.global.js`; one entry per file in its `src/bundles/`).
 */
const ADAPTER_LANGUAGE_BUNDLES = [
  'ar',
  'bn',
  'de',
  'en',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];

/** The adapter's regional bundles (`src/bundles/<name>.ts`). */
const ADAPTER_REGIONAL_BUNDLES: Record<string, string[]> = {
  western: ['es', 'pt', 'fr', 'de'],
  'east-asian': ['ja', 'ko', 'zh'],
  slavic: ['ru', 'pl', 'uk'],
  'south-asian': ['hi', 'bn'],
  'southeast-asian': ['id', 'ms', 'tl', 'th', 'vi'],
};

/** Name, word order and direction of a language, from its semantic profile. */
function describeLanguage(code: string): {
  code: string;
  name: string;
  nativeName?: string;
  wordOrder?: string;
  direction?: string;
} {
  const profile = tryGetProfile(code);
  return {
    code,
    name: profile?.name ?? code,
    nativeName: profile?.nativeName,
    wordOrder: profile?.wordOrder,
    direction: profile?.direction,
  };
}

export function getLanguages(): object {
  // The languages registered in @lokascript/semantic: the ones every translation tool accepts.
  const codes = getRegisteredLanguages().slice().sort();

  // Each example is what semantic renders for EXAMPLE_SOURCE, so it is what
  // `translate_code` returns and what the adapter reads back as that English.
  const examples: Record<string, string> = {};
  for (const code of codes) {
    try {
      examples[code] = code === 'en' ? EXAMPLE_SOURCE : translate(EXAMPLE_SOURCE, 'en', code);
    } catch {
      // No example for a language the renderer refuses this sentence in.
    }
  }

  return {
    supported: codes.map(describeLanguage),
    examples,
    semanticBundles: {
      note: '@lokascript/semantic browser bundles (parse, render, translate; the lite adapter needs one beside it). Each registers English as well as the languages listed. Sizes are approximate, gzipped.',
      'browser.global.js': {
        subpath: '@lokascript/semantic/browser',
        size: 'about 310 KB',
        languages: 'all 24',
      },
      'browser-priority.priority.global.js': {
        subpath: '@lokascript/semantic/browser/priority',
        size: 'about 185 KB',
        languages: ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'ko', 'ar', 'tr', 'id'],
      },
      'browser-western.western.global.js': {
        subpath: '@lokascript/semantic/browser/western',
        size: 'about 155 KB',
        languages: ['en', 'es', 'pt', 'fr', 'de', 'it'],
      },
      'browser-east-asian.east-asian.global.js': {
        subpath: '@lokascript/semantic/browser/east-asian',
        size: 'about 150 KB',
        languages: ['en', 'ja', 'zh', 'ko'],
      },
      'browser-es-en.es-en.global.js': {
        subpath: '@lokascript/semantic/browser/es-en',
        size: 'about 140 KB',
        languages: ['en', 'es'],
      },
      'browser-en.en.global.js': {
        subpath: '@lokascript/semantic/browser/en',
        size: 'about 133 KB',
        languages: ['en'],
      },
      'browser-<lang>.<lang>.global.js': {
        subpath: '@lokascript/semantic/browser/<lang>',
        size: 'about 135–142 KB',
        languages: 'English and one other; one bundle per language except he',
      },
    },
    adapterBundles: {
      note: '@lokascript/hyperscript-adapter bundles, for _hyperscript or @hyperfixi/engine (hyperfixi-hs.js). Each holds the adapter and the semantic parser for its languages, and registers itself on load. Sizes are approximate, gzipped.',
      'hyperscript-i18n-<lang>.global.js': {
        size: 'about 135–140 KB',
        languages: `one language; one bundle for each of ${ADAPTER_LANGUAGE_BUNDLES.join(', ')}`,
      },
      'hyperscript-i18n-western.global.js': {
        size: 'about 150 KB',
        languages: ADAPTER_REGIONAL_BUNDLES.western,
      },
      'hyperscript-i18n-east-asian.global.js': {
        size: 'about 150 KB',
        languages: ADAPTER_REGIONAL_BUNDLES['east-asian'],
      },
      'hyperscript-i18n-slavic.global.js': {
        size: 'about 150 KB',
        languages: ADAPTER_REGIONAL_BUNDLES.slavic,
      },
      'hyperscript-i18n-south-asian.global.js': {
        size: 'about 145 KB',
        languages: ADAPTER_REGIONAL_BUNDLES['south-asian'],
      },
      'hyperscript-i18n-southeast-asian.global.js': {
        size: 'about 150 KB',
        languages: ADAPTER_REGIONAL_BUNDLES['southeast-asian'],
      },
      'hyperscript-i18n.global.js': { size: 'about 290 KB', languages: 'all 24' },
      'hyperscript-i18n-lite.global.js': {
        size: 'about 2.4 KB',
        languages: 'those of the @lokascript/semantic bundle loaded before it',
      },
    },
  };
}

export function getAdapterGuide(): string {
  return `# @lokascript/hyperscript-adapter

Runs hyperscript written in any of 24 languages on the original _hyperscript (hyperscript.org) or on
\`@hyperfixi/engine\` (\`hyperfixi-hs.js\`), without modifying either. It translates each script to
English before the host parses it.

## How It Works

1. A bundle registers the plugin with the host as it loads (\`_hyperscript.use(...)\`); from a
   module you call that yourself.
2. For each scripted element it resolves a language (see Language Resolution). English, or no
   language, passes through untouched.
3. It translates the script to English with \`@lokascript/semantic\`.
4. On _hyperscript it rewrites the script attribute in place before the runtime reads it
   (\`addBeforeProcessHook\`). On \`@hyperfixi/engine\` it hands the English to the engine as the
   engine reads the script (\`addSourceTransform\`), and the attribute keeps the author's text.
5. A translation that would lose part of the script, or that the host's parser rejects, is not
   used: the author's text is kept and a warning is logged.

## Quick Start

### Browser (Script Tags)

\`\`\`html
<!-- 1. Load _hyperscript (or the engine's hyperfixi-hs.js) -->
<script src="https://unpkg.com/hyperscript.org"></script>

<!-- 2. Load an adapter bundle (it registers itself) -->
<script src="hyperscript-i18n-es.global.js"></script>

<!-- 3. Write hyperscript in Spanish; \`lang\` on the element or an ancestor selects the language -->
<button _="al clic alternar .active" lang="es">Alternar</button>
\`\`\`

A single-language bundle translates only its language. Several languages on one page need a
regional bundle or the full one.

### Node.js / Bundler

\`\`\`javascript
import { hyperscriptI18n } from '@lokascript/hyperscript-adapter';

_hyperscript.use(hyperscriptI18n({
  defaultLanguage: 'es',
  debug: true,
}));
\`\`\`

### Programmatic

The plugin translates scripts on elements. For a string you run yourself, translate it first:

\`\`\`javascript
import { preprocess } from '@lokascript/hyperscript-adapter';

const english = preprocess('alternar .active', 'es');
// => 'toggle .active'
_hyperscript(english);
\`\`\`

## Bundle Selection

Sizes are approximate, gzipped, and do not include the host (\`hyperfixi-hs.js\` is about 35 KB).

| Bundle | Size | Languages |
|--------|------|-----------|
| \`hyperscript-i18n-{lang}.global.js\` | about 135–140 KB | One language (a bundle for each of the 24) |
| \`hyperscript-i18n-western.global.js\` | about 150 KB | es, pt, fr, de |
| \`hyperscript-i18n-east-asian.global.js\` | about 150 KB | ja, ko, zh |
| \`hyperscript-i18n-slavic.global.js\` | about 150 KB | ru, pl, uk |
| \`hyperscript-i18n-south-asian.global.js\` | about 145 KB | hi, bn |
| \`hyperscript-i18n-southeast-asian.global.js\` | about 150 KB | id, ms, tl, th, vi |
| \`hyperscript-i18n.global.js\` | about 290 KB | All 24 |
| \`hyperscript-i18n-lite.global.js\` | about 2.4 KB | Those of the semantic bundle beside it |

Most of every bundle is the semantic parser, so one language costs nearly as much as a region.

### Lite Adapter

The lite adapter holds no parser. It uses the \`@lokascript/semantic\` browser bundle loaded
before it (any of them: it looks for a \`LokaScriptSemantic*\` global):

\`\`\`html
<script src="_hyperscript.js"></script>
<script src="browser-es.es.global.js"></script>          <!-- @lokascript/semantic, about 140 KB -->
<script src="hyperscript-i18n-lite.global.js"></script>  <!-- about 2.4 KB -->
\`\`\`

This is not smaller than a self-contained bundle (the pair above is about the size of
\`hyperscript-i18n-es.global.js\`). Use it when the page already loads a semantic bundle, for
\`translate()\` say, or needs a language set that has no adapter bundle (semantic's
\`browser-priority.priority.global.js\`: en, es, pt, fr, de, ja, zh, ko, ar, tr, id).

## Language Resolution

The first of these that is set wins:
1. The attribute named by the \`languageAttribute\` option, on the element (when the option is set)
2. \`data-lang\` on the element
3. \`data-hyperscript-lang\` on the element or its closest ancestor
4. \`lang\` on the element or its closest ancestor (so \`<html lang="es">\` covers the page, and a
   nested \`lang="en"\` opts back out)
5. The \`defaultLanguage\` option

A region subtag is dropped (\`pt-BR\` is \`pt\`). With none set, or \`en\`, the script is not translated.

## Plugin Options

\`\`\`typescript
interface PluginOptions {
  defaultLanguage?: string;      // Language for elements that resolve to none
  languageAttribute?: string;    // An attribute to check first, on the element itself
  confidenceThreshold?: number | Record<string, number>;
                                 // Min parse confidence 0-1 (default 0.5); a map is per language, '*' its default
  strategy?: 'semantic' | 'i18n' | 'auto';  // Default 'semantic'; the others use i18nToEnglish
  i18nToEnglish?: (input: string, locale: string) => string;
  validateWithHost?: boolean;    // Check the English on the host's parser first (default true)
  debug?: boolean;               // Log each translation to the console
}
\`\`\`

## Known Limitations

- **Programmatic calls**: \`_hyperscript("code")\` does not go through the plugin. Use \`preprocess()\`.
- **One bundle, its languages**: a script in a language the loaded bundle does not hold is left as written.
- **Refused translations**: a script the adapter cannot translate in full is left as written, and
  the host reports a parse error on the author's text. The \`translate_to_english\` tool shows what
  a script translates to, or why it is refused.
`;
}

export function getAdapterCompatibility(): object {
  const languages: Record<string, object> = {};
  for (const code of ADAPTER_LANGUAGE_BUNDLES) {
    if (code === 'en') continue; // English passes through untranslated
    const { name, wordOrder, direction } = describeLanguage(code);
    languages[code] = {
      name,
      wordOrder,
      direction,
      hasDedicatedBundle: true,
      bundleName: `hyperscript-i18n-${code}.global.js`,
    };
  }

  return {
    description:
      'The languages @lokascript/hyperscript-adapter translates, and the bundle that holds each. The code defines no per-language support tiers or confidence figures. A script the adapter cannot translate in full is left as written with a console warning, so check a script with the translate_to_english tool.',
    languages,
    availableBundles: {
      perLanguage: ADAPTER_LANGUAGE_BUNDLES,
      perLanguageSize: 'about 135–140 KB gzipped each',
      regional: ADAPTER_REGIONAL_BUNDLES,
      regionalSize: 'about 145–150 KB gzipped each',
      full: 'hyperscript-i18n.global.js (about 290 KB gzipped, all 24 languages)',
      lite: 'hyperscript-i18n-lite.global.js (about 2.4 KB gzipped; needs a @lokascript/semantic browser bundle loaded before it)',
    },
  };
}

export function getSetupGuide(): object {
  return {
    description:
      'Decision tree for setting up hyperscript, in English or in other languages. Follow the questions to determine the right approach. Sizes are approximate, gzipped.',
    steps: [
      {
        question: 'Are you using the original _hyperscript or @hyperfixi/engine?',
        options: {
          hyperscript: {
            recommendation:
              'For non-English hyperscript, add @lokascript/hyperscript-adapter beside _hyperscript.js. English needs nothing more.',
            next: 'step-adapter-bundle',
          },
          hyperfixi: {
            recommendation:
              'Load the engine, and for non-English hyperscript add @lokascript/hyperscript-adapter beside it (the same adapter bundles).',
            next: 'step-engine-bundle',
          },
          unsure: {
            recommendation:
              "_hyperscript is the original project (hyperscript.org, _hyperscript.js). @hyperfixi/engine is a typed port that runs the same grammar: its script-tag bundle is hyperfixi-hs.js, which @hyperfixi/core also ships as hyperfixi.js. The adapter works on both, so the page's existing script tag decides.",
            next: null,
          },
        },
      },
      {
        id: 'step-adapter-bundle',
        question: 'How many non-English languages do you need?',
        options: {
          one: {
            recommendation: `Use a per-language bundle (about 135–140 KB). There is one for each of: ${ADAPTER_LANGUAGE_BUNDLES.filter(code => code !== 'en').join(', ')}.`,
            setup:
              '<script src="_hyperscript.js"></script>\n<script src="hyperscript-i18n-{lang}.global.js"></script>',
            next: null,
          },
          'few-same-region': {
            recommendation:
              'Use a regional bundle (about 145–150 KB): western (es, pt, fr, de), east-asian (ja, ko, zh), slavic (ru, pl, uk), south-asian (hi, bn) or southeast-asian (id, ms, tl, th, vi).',
            setup:
              '<script src="_hyperscript.js"></script>\n<script src="hyperscript-i18n-western.global.js"></script>',
            next: null,
          },
          many: {
            recommendation:
              'Use the full bundle (about 290 KB, all 24 languages). For a set in between, the lite adapter (about 2.4 KB) beside a @lokascript/semantic bundle that holds the set, such as browser-priority.priority.global.js (about 185 KB, 11 languages).',
            setup:
              '<script src="_hyperscript.js"></script>\n<script src="hyperscript-i18n.global.js"></script>',
            alternative:
              '<script src="_hyperscript.js"></script>\n<script src="browser-priority.priority.global.js"></script>\n<script src="hyperscript-i18n-lite.global.js"></script>',
            next: null,
          },
        },
      },
      {
        id: 'step-engine-bundle',
        question: 'Do you need multilingual support or just English?',
        options: {
          'english-only': {
            recommendation:
              "With Vite, use @hyperfixi/vite-plugin, which registers only the engine modules your pages use. Without Vite, load the engine's hyperfixi-hs.js (about 35 KB).",
            next: null,
          },
          multilingual: {
            recommendation:
              "Load the engine's hyperfixi-hs.js (about 35 KB), then an adapter bundle chosen as in step-adapter-bundle (hyperfixi-hs.js goes where _hyperscript.js does).",
            next: 'step-adapter-bundle',
          },
        },
      },
    ],
  };
}

// =============================================================================
// LSE Protocol Reference (for LLM ↔ LSE integration)
// =============================================================================

export function getLSEProtocolSpec(): string {
  return `# LokaScript Explicit Syntax (LSE) Quick Reference

## Syntax

\`\`\`
[command role1:value1 role2:value2 +flag1 ~flag2]
\`\`\`

| Element | Syntax | Example |
|---------|--------|---------|
| Command | first token (lowercased) | \`toggle\`, \`fetch\`, \`add\` |
| Role pair | \`name:value\` | \`patient:.active\` |
| Enabled flag | \`+name\` | \`+primary-key\` |
| Disabled flag | \`~name\` | \`~nullable\` |
| String literal | \`"..."\` or \`'...'\` | \`patient:"hello world"\` |
| Selector | \`#id\` \`.class\` \`[attr]\` \`@aria\` \`*wild\` | \`destination:#button\` |
| Selector literal | \`<...selector.../>\` | \`patient:<ul > li/>\`, \`patient:<.a, .b/>\` |
| Boolean | \`true\` / \`false\` | \`goal:true\` |
| Number | digits with optional decimal | \`quantity:5\` |
| Duration | number + suffix | \`delay:500ms\`, \`timeout:2s\` |
| Reference | built-in name | \`destination:me\`, \`source:it\` |
| Nested body | one bracket command in a structural role | \`body:[toggle patient:.active]\` |
| Compound | chain keyword between commands (\`then\`, \`and\`, \`async\`, \`sequential\`) | \`[add patient:.loading] then [fetch source:/api]\` |
| Annotation | \`@name\` or \`@name(value)\` before the command | \`@timeout(5s) [fetch source:/api]\` |

A selector containing a space, a combinator (\`>\` \`+\` \`~\`), or a comma must use a
selector literal — the tokenizer would otherwise split it. Inside a structural role
(\`body\`, \`then\`, \`else\`, \`condition\`, \`loop-body\`, \`variable\`)
a \`[...]\` value is always one nested command, so an attribute selector there must also
use the literal form: \`condition:<[data-active]/>\`.

Bracket syntax has no expression delimiter. A value of several words that is not a string
(\`x > 0\`, \`it matches .open\`) cannot be written in it: in quotes it is read as a string
literal. Use protocol JSON (an \`expression\` value) for those.

## Value Classification Priority (first match wins)

1. **Selector literal** — starts with \`<\` and ends with \`/>\`; delimiters stripped
2. **Selector** — starts with \`#\`, \`.\`, \`[\`, \`@\`, \`*\`
3. **String** — starts with \`"\` or \`'\`
4. **Object literal** — \`{...}\`, kept as an expression
5. **Boolean** — exact: \`true\` or \`false\`
6. **Reference** — \`me\`, \`you\`, \`it\`, \`result\`, \`event\`, \`target\`, \`body\`, \`document\`, \`window\`, \`detail\`
7. **Duration** — number + \`ms\`/\`s\`/\`m\`/\`h\`
8. **Number** — integer or decimal
9. **Plain** — fallback: a literal with no data type (any non-whitespace)

## Node Kinds

A node's \`kind\` says which it is (on a command it may be left out):

| Kind | Required Fields | Description |
|------|----------------|-------------|
| \`command\` | \`action\`, \`roles\` | Single command (also encodes conditionals and loops via v1.1 fields) |
| \`event-handler\` | \`kind\`, \`action\`, \`roles\`, \`body\` | Event handler with body commands |
| \`compound\` | \`kind\`, \`action\`, \`statements\` | Chained commands with \`chainType\` (\`then\`/\`and\`/\`async\`/\`sequential\`) |

## Value Types

| Type | JSON Shape | Notes |
|------|-----------|-------|
| \`selector\` | \`{ "type": "selector", "value": ".active", "selectorKind?": "class" }\` | \`selectorKind\`: id, class, attribute, element, complex (optional) |
| \`literal\` | \`{ "type": "literal", "value": "hello", "dataType": "string" }\` | \`dataType\`: string, number, boolean, duration |
| \`reference\` | \`{ "type": "reference", "value": "me" }\` | Built-in: me, you, it, result, event, target, body, document, window, detail |
| \`expression\` | \`{ "type": "expression", "raw": "x > 0" }\` | Raw expression text |
| \`property-path\` | \`{ "type": "property-path", "object": { "type": "selector", "value": "#input" }, "property": "value", "access": "possessive" }\` | \`#input's value\`; \`access\` is \`dot\` or \`possessive\` (optional). JSON only: bracket syntax has no form for it |
| \`flag\` | \`{ "type": "flag", "name": "primary-key", "enabled": true }\` | \`+flag\` = enabled, \`~flag\` = disabled |

## JSON Wire Format — Full-Fidelity

The format with \`kind\` on every node. Used for tool-to-tool interchange. It carries commands,
chains, \`if\`, loops and simple event handlers; the writer refuses a node it cannot carry in full.

### Command
\`\`\`json
{
  "kind": "command",
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": ".active" },
    "destination": { "type": "selector", "value": "#button" }
  }
}
\`\`\`

### Event Handler
\`\`\`json
{
  "kind": "event-handler",
  "action": "on",
  "roles": { "event": { "type": "literal", "value": "click", "dataType": "string" } },
  "body": [
    { "kind": "command", "action": "toggle", "roles": { "patient": { "type": "selector", "value": ".active" } } }
  ]
}
\`\`\`

### Compound
\`\`\`json
{
  "kind": "compound",
  "action": "compound",
  "chainType": "then",
  "statements": [
    { "kind": "command", "action": "add", "roles": { "patient": { "type": "selector", "value": ".loading" } } },
    { "kind": "command", "action": "fetch", "roles": { "source": { "type": "literal", "value": "/api/data", "dataType": "string" } } }
  ]
}
\`\`\`

## Control Flow (v1.1)

### Conditional
A command node with \`thenBranch\` and optional \`elseBranch\` arrays. In bracket syntax the
condition is one value and each branch one command:
\`\`\`
[if condition:it then:[toggle patient:.active] else:[remove patient:.active]]
\`\`\`
In JSON the condition can be an expression and a branch can hold several commands:
\`\`\`json
{
  "kind": "command",
  "action": "if",
  "roles": { "condition": { "type": "expression", "raw": "x > 0" } },
  "thenBranch": [
    { "kind": "command", "action": "toggle", "roles": { "patient": { "type": "selector", "value": ".active" } } }
  ],
  "elseBranch": [
    { "kind": "command", "action": "remove", "roles": { "patient": { "type": "selector", "value": ".active" } } }
  ]
}
\`\`\`

### Loop
A command node with \`loopVariant\`, \`loopBody\`, and optional \`loopVariable\`/\`indexVariable\`.
Bracket syntax spells them \`loop-variant:\`, \`loop-body:\` (one command), \`variable:\` and \`index-variable:\`:
\`\`\`
[repeat source:#items loop-variant:for variable:item loop-body:[add patient:.active]]
\`\`\`
\`\`\`json
{
  "kind": "command",
  "action": "repeat",
  "roles": { "source": { "type": "selector", "value": "#items" } },
  "loopVariant": "for",
  "loopBody": [
    { "kind": "command", "action": "add", "roles": { "patient": { "type": "selector", "value": ".active" } } }
  ],
  "loopVariable": "item"
}
\`\`\`

Loop variants: \`forever\`, \`times\`, \`for\`, \`while\`, \`until\`.

## JSON Wire Format — LLM-Simplified

The same format with its optional parts left out: no \`kind\` (a node without one is a command), and
a \`trigger\` on a command in place of an event handler around it.

\`\`\`json
{
  "action": "toggle",
  "roles": { "patient": { "type": "selector", "value": ".active" } },
  "trigger": { "event": "click" }
}
\`\`\`

| Difference | Full-Fidelity | LLM-Simplified |
|-----------|--------------|----------------|
| \`kind\` field | On every node | Left out on a command |
| Event handlers | \`event-handler\` kind with \`body\` | \`trigger\` field on the one command it runs |
| Compound | \`kind: "compound"\` with a \`statements\` array | No short form: \`kind\` is needed |
| Expression values | \`{ "raw": "..." }\` | \`{ "value": "..." }\` is also read |
| Flag values | \`{ "name": "x", "enabled": true }\` | \`{ "value": true }\` is also read |

A reader takes either form.

## Event Handlers (Bracket Syntax)

\`\`\`
[on event:click body:[toggle patient:.active]]
\`\`\`
`;
}
