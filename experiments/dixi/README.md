# dixi — i18n for fixi-family attribute names

> _dixi_ (Latin: "I have spoken") — let people write fixi/moxi/ssexi declarations in their own language.

**Status:** Early development (M1). See [the plan](../../../../.claude/plans/dixi-js-launch.md).

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

## License

[BSD-0](LICENSE) — do whatever you want.

## Acknowledgments

- Locale resolution adapted from [`@lokascript/hyperscript-adapter`](https://github.com/codetalcott/hyperfixi/tree/main/packages/hyperscript-adapter).
- Naming and ethos follow the [fixi project](https://fixiproject.org) family.
