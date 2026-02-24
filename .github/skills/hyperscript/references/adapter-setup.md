# Adapter Setup Guide

## Server Framework Integration

### Django

```html
{% load static %}
<!DOCTYPE html>
<html lang="es">
  <head>
    <script src="{% static '_hyperscript.js' %}"></script>
    <script src="{% static 'hyperscript-i18n-es.global.js' %}"></script>
  </head>
  <body>
    <button _="on click alternar .activo en me">Activar</button>
    <button _="on click alternar .oculto en #panel">Mostrar/Ocultar</button>
  </body>
</html>
```

### Flask / Jinja2

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <script src="{{ url_for('static', filename='_hyperscript.js') }}"></script>
    <script src="{{ url_for('static', filename='hyperscript-i18n-ja.global.js') }}"></script>
  </head>
  <body>
    <button _="クリック で .active を トグル">切り替え</button>
  </body>
</html>
```

### Rails / ERB

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <%= javascript_include_tag '_hyperscript' %> <%= javascript_include_tag
    'hyperscript-i18n-es.global' %>
  </head>
  <body>
    <button _="on click alternar .active en me">Activar</button>
  </body>
</html>
```

## Mixed-Language Pages

Use `data-lang` for per-element language overrides:

```html
<html lang="es">
  <body>
    <!-- Spanish (inherits from <html>) -->
    <button _="on click alternar .active">Toggle</button>

    <!-- Portuguese (per-element override) -->
    <button _="on click alternar .ativo em mim" data-lang="pt">Ativar</button>

    <!-- English (passes through unchanged) -->
    <button _="on click toggle .active" data-lang="en">Toggle</button>
  </body>
</html>
```

## Lite Adapter + External Semantic Bundle

For smaller total size, pair the lite adapter with a regional semantic bundle:

```html
<script src="_hyperscript.js"></script>
<script src="lokascript-semantic-es.global.js"></script>
<!-- 16 KB -->
<script src="hyperscript-i18n-lite.global.js"></script>
<!-- 2 KB -->
```

Total: ~18 KB for the adapter layer (plus \_hyperscript itself).

## Plugin Options Reference

```javascript
_hyperscript.use(
  hyperscriptI18n({
    // Language settings
    defaultLanguage: 'es', // Default for all elements
    languageAttribute: 'data-lang', // Custom attribute name

    // Confidence gating
    confidenceThreshold: 0.5, // Number or per-language object
    strategy: 'semantic', // 'semantic' | 'i18n' | 'auto'

    // Debugging
    debug: true, // Log translations to console

    // Fallback
    i18nToEnglish: null, // Optional @lokascript/i18n fallback function
  })
);
```
