---
name: hyperscript-i18n
description: 'Adds multilingual support to the original _hyperscript runtime (hyperscript.org) via the @lokascript/hyperscript-adapter preprocessor. Use when user has an existing _hyperscript project and wants to write code in non-English languages.'
---

# \_hyperscript Multilingual Adapter

Add 24-language support to the original `_hyperscript` runtime via the `@lokascript/hyperscript-adapter` preprocessor plugin. Existing English code works unchanged -- the adapter only translates non-English `_="..."` attributes before the standard parser runs.

## When to Use

- User has an existing `_hyperscript` project and wants multilingual support
- User wants to write `_hyperscript` in their native language (Spanish, Japanese, Arabic, etc.)
- User asks about integrating LokaScript i18n with original `_hyperscript`
- User needs bundle recommendations for `_hyperscript` + adapter

**For HyperFixi's own semantic engine**, see the `hyperfixi-developer` skill instead.

## Workflow

### 1. Choose the Right Bundle

| Bundle                                  | Size      | Languages                        | Use When                             |
| --------------------------------------- | --------- | -------------------------------- | ------------------------------------ |
| `hyperscript-i18n-{lang}.global.js`     | 85-101 KB | Single language                  | Most projects -- one target audience |
| `hyperscript-i18n-western.global.js`    | 146 KB    | es, pt, fr, de                   | Western European audience            |
| `hyperscript-i18n-east-asian.global.js` | 146 KB    | ja, ko, zh                       | East Asian audience                  |
| `hyperscript-i18n.global.js`            | 568 KB    | All 24                           | Full multilingual support            |
| `hyperscript-i18n-lite.global.js`       | 2 KB      | (needs external semantic bundle) | Minimal footprint                    |

Use `get_bundle_config` with `runtime: "hyperscript"` for a recommendation:

```
get_bundle_config({ runtime: "hyperscript", languages: ["es", "ja"], commands: ["toggle", "add"] })
```

### 2. Add the Scripts

```html
<!-- 1. Original _hyperscript (from hyperscript.org) -->
<script src="https://unpkg.com/hyperscript.org"></script>

<!-- 2. Adapter bundle (auto-registers on load) -->
<script src="https://unpkg.com/@lokascript/hyperscript-adapter@2/dist/hyperscript-i18n-es.global.js"></script>
```

### 3. Set the Language

The adapter resolves language in order:

1. `data-lang` attribute on the element
2. `data-hyperscript-lang` on nearest ancestor
3. `<html lang="...">` on the document
4. `defaultLanguage` plugin option

```html
<!-- Per-element -->
<button _="on click alternar .active en me" data-lang="es">Toggle</button>

<!-- Document-wide -->
<html lang="es">
  <button _="on click alternar .active en me">Toggle</button>
</html>
```

### 4. Validate the Translation

Use `translate_to_english` to preview what the adapter produces:

```
translate_to_english({ code: "alternar .active en me", sourceLanguage: "es" })
  => { english: "toggle .active on me", confidence: 0.95 }
```

## Integration Patterns

### Browser (CDN)

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@lokascript/hyperscript-adapter@2/dist/hyperscript-i18n-es.global.js"></script>
```

### Node.js / Bundlers

```javascript
import { hyperscriptI18n } from '@lokascript/hyperscript-adapter';

_hyperscript.use(
  hyperscriptI18n({
    defaultLanguage: 'ja',
    confidenceThreshold: 0.6,
    debug: true,
  })
);
```

### Programmatic Translation

```javascript
import { preprocess } from '@lokascript/hyperscript-adapter';

const english = preprocess('トグル .active', 'ja');
_hyperscript(english); // runs "toggle .active"
```

## Confidence Thresholds

SOV/VSO languages produce lower confidence scores. Tune per-language:

```javascript
_hyperscript.use(
  hyperscriptI18n({
    confidenceThreshold: {
      es: 0.7, // SVO -- tight gating
      ja: 0.1, // SOV -- more permissive
      ko: 0.05,
      tr: 0.1,
      ar: 0.3, // VSO
      '*': 0.5, // default
    },
  })
);
```

If confidence is below the threshold, the original text passes through unchanged to the standard parser.

## Common Mistakes

1. **Forgetting the base script** -- the adapter is a plugin, not a replacement; load `_hyperscript` first
2. **Wrong language code** -- use ISO codes (`es`, not `spa`; `ja`, not `jpn`)
3. **Missing `data-lang`** -- without language hints, the adapter can't translate
4. **SOV confidence too strict** -- Japanese/Korean/Turkish need lower thresholds than SVO languages
5. **Using `_hyperscript("code")` programmatically** -- the plugin only intercepts DOM attributes; use `preprocess()` for programmatic calls
6. **Translating feature declarations** -- `def` and `worker` must stay in English; command bodies inside them translate normally

## Limitations

- **Feature declarations** (`def`, `worker`) -- keep in English; `behavior` is supported
- **Standalone expressions** -- boolean expressions outside command context don't translate
- **~85% command coverage** -- matches HyperFixi's semantic pattern coverage of original `_hyperscript`

## Troubleshooting

| Issue                               | Cause                                                   | Fix                                                                     |
| ----------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| "Translation unchanged" warning     | Wrong lang code, missing bundle, or unsupported command | Check `data-lang` matches ISO code; verify bundle includes the language |
| SOV languages not translating       | Confidence threshold too high                           | Lower to `{ ja: 0.1, ko: 0.05 }`                                        |
| Programmatic `_hyperscript()` fails | Plugin only intercepts DOM attributes                   | Use `preprocess(code, lang)` instead                                    |

## MCP Tools

| Tool                       | When to Use                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `get_bundle_config`        | Get adapter bundle recommendation (`runtime: "hyperscript"`) |
| `translate_to_english`     | Preview what the adapter translates to                       |
| `parse_multilingual`       | Parse code in any language with confidence scores            |
| `validate_hyperscript`     | Validate code syntax (any language)                          |
| `explain_in_language`      | Explain what code does, with translations                    |
| `list_supported_languages` | List all 24 languages with metadata                          |

## References

- [Adapter Setup Guide](./references/adapter-setup.md) -- Detailed integration for Django, Flask, Rails, etc.
