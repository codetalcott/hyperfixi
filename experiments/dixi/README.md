# dixi — i18n for fixi-family attribute names

> _dixi_ (Latin: "I have spoken") — let people write fixi/moxi/ssexi declarations in their own language.

**Status:** M2.6 shipped; 80/80 acceptance checks passing across 4 locales (en, es, ja, ar) with the M2 button demo and M2.5 docs-search demo. 24 locale files are now auto-generated from `@lokascript/semantic` profiles — see [EVALUATION.md](./EVALUATION.md) for prospective-value analysis and go/no-go signals.

dixi is a tiny script that rewrites localized hypermedia attribute names to canonical English before fixi-family processors read them. So you can write:

```html
<button fx-acción="/api" fx-disparador="clic" fx-objetivo="#out">Cargar</button>
```

…and `fixi.js` sees this:

```html
<button fx-action="/api" fx-trigger="click" fx-target="#out">Cargar</button>
```

## Load order

```html
<html lang="es">
  <head>
    <script src="dixi.js"></script>
    <script src="locales/es.js"></script>
    <script src="moxi.js"></script>
    <script src="fixi.js"></script>
  </head>
</html>
```

dixi reads `<html lang>` (or `data-dixi-lang` on an element) to pick the active dictionary.

## Locale coverage

24 locale files are generated from `packages/semantic/src/generators/profiles/` (event-name vocabulary) and [`scripts/fx-vocab.mjs`](./scripts/fx-vocab.mjs) (fx-attribute and modifier vocabulary):

- **Native-speaker reviewed:** `es`, `ja`, `ar`. These match the prior hand-authored locales and are exercised by the test suite.
- **Auto-generated (event vocab reviewed, fx-\*/modifier vocab unreviewed):** `fr`, `de`, `it`, `pt`, `ru`, `uk`, `zh`, `ko`, `tr`, `pl`, `vi`, `he`, `hi`, `bn`, `id`, `ms`, `th`, `tl`, `sw`, `qu`. Each generated file carries an `⚠ Unreviewed` banner explaining what to edit and where. Corrections are welcome via PR.

To regenerate locale files after editing `fx-vocab.mjs` or the upstream semantic profiles:

```bash
cd experiments/dixi && npm run gen
```

## License

[BSD-0](LICENSE) — do whatever you want.

## Acknowledgments

- Locale resolution adapted from [`@lokascript/hyperscript-adapter`](https://github.com/codetalcott/hyperfixi/tree/main/packages/hyperscript-adapter).
- Event-name vocabulary derived from [`@lokascript/semantic`](https://github.com/codetalcott/hyperfixi/tree/main/packages/semantic) language profiles via [`scripts/gen-locales.mjs`](./scripts/gen-locales.mjs).
- Naming and ethos follow the [fixi project](https://fixiproject.org) family.
