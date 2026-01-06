# Semantic Package Bundle Strategy

## Bundle Matrix

All sizes measured after minification. Choose the smallest bundle that supports your target languages.

### Tier 1: Single-Language IIFE Bundles
For users who only need one language. Smallest possible bundles.

| Bundle | Global Name | Size | Use Case |
|--------|-------------|------|----------|
| `browser-en.en.global.js` | `HyperFixiSemanticEn` | 82 KB | English-only apps |
| `browser-es.es.global.js` | `HyperFixiSemanticEs` | 64 KB | Spanish-only apps |
| `browser-ja.ja.global.js` | `HyperFixiSemanticJa` | 67 KB | Japanese-only apps |
| `browser-zh.zh.global.js` | `HyperFixiSemanticZh` | 58 KB | Chinese-only apps |
| `browser-ko.ko.global.js` | `HyperFixiSemanticKo` | 69 KB | Korean-only apps |
| `browser-ar.ar.global.js` | `HyperFixiSemanticAr` | 66 KB | Arabic-only apps |
| `browser-tr.tr.global.js` | `HyperFixiSemanticTr` | 73 KB | Turkish-only apps |
| `browser-pt.pt.global.js` | `HyperFixiSemanticPt` | 56 KB | Portuguese-only apps |
| `browser-fr.fr.global.js` | `HyperFixiSemanticFr` | 57 KB | French-only apps |
| `browser-de.de.global.js` | `HyperFixiSemanticDe` | 57 KB | German-only apps |
| `browser-id.id.global.js` | `HyperFixiSemanticId` | 57 KB | Indonesian-only apps |
| `browser-qu.qu.global.js` | `HyperFixiSemanticQu` | 56 KB | Quechua-only apps |
| `browser-sw.sw.global.js` | `HyperFixiSemanticSw` | 56 KB | Swahili-only apps |

### Tier 2: Regional IIFE Bundles
For users targeting specific regions.

| Bundle | Global Name | Languages | Size | Use Case |
|--------|-------------|-----------|------|----------|
| `browser-western.western.global.js` | `HyperFixiSemanticWestern` | en, es, pt, fr, de | 127 KB | Western markets |
| `browser-east-asian.east-asian.global.js` | `HyperFixiSemanticEastAsian` | ja, zh, ko | 99 KB | East Asian markets |
| `browser-es-en.es-en.global.js` | `HyperFixiSemanticEsEn` | en, es | 99 KB | Americas bilingual |

### Tier 3: Comprehensive IIFE Bundles
For users needing broad language support.

| Bundle | Global Name | Languages | Size | Use Case |
|--------|-------------|-----------|------|----------|
| `browser-priority.priority.global.js` | `HyperFixiSemanticPriority` | 11 priority | 231 KB | Global apps |
| `browser.global.js` | `HyperFixiSemantic` | All 13 | 324 KB | Maximum compatibility |
| `browser-lazy.lazy.global.js` | `HyperFixiSemanticLazy` | All 13 + lazy API | 323 KB | On-demand loading |

### Tier 4: Modular ESM (for Bundlers)
For users with build systems (Vite, Webpack, etc.)

| Import | What it includes | Tree-shakeable |
|--------|------------------|----------------|
| `@hyperfixi/semantic` | Full package | Yes |
| `@hyperfixi/semantic/languages/en` | English only | Yes |
| `@hyperfixi/semantic/languages/ja` | Japanese only | Yes |
| ... | (all 13 languages) | Yes |

### Tier 5: Core + CDN Loading
For users who want minimal initial bundle with on-demand loading.

| Bundle | Global Name | What it includes | Size |
|--------|-------------|------------------|------|
| `browser-core.core.global.js` | `HyperFixiSemanticCore` | Parser, registry, URL loader (no languages) | 44 KB |

Usage:
```html
<script src="browser-core.core.global.js"></script>
<script src="lang/en.global.js"></script> <!-- Self-registering -->
<script>
  const ast = HyperFixiSemanticCore.parse('toggle .active', 'en');
</script>
```

Or load dynamically:
```html
<script src="browser-core.core.global.js"></script>
<script>
  // Load language from URL on demand
  await HyperFixiSemanticCore.loadLanguageFromUrl('ja', '/lang/browser-ja.ja.global.js');
  const ast = HyperFixiSemanticCore.parse('トグル .active', 'ja');
</script>
```

---

## User Consumption Patterns

### Pattern A: Simple Script Tag (Single Language)
```html
<script src="https://cdn.example.com/hyperfixi-semantic.browser-en.en.global.js"></script>
<script>
  const node = HyperFixiSemanticEn.parse('toggle .active', 'en');
</script>
```

### Pattern B: Regional Bundle
```html
<script src="https://cdn.example.com/hyperfixi-semantic.browser-western.western.global.js"></script>
<script>
  // Works with en, es, pt, fr, de
  const node = HyperFixiSemanticWestern.parse('alternar .active', 'es');
</script>
```

### Pattern C: ESM with Bundler
```typescript
// Only English is bundled (tree-shaking)
import '@hyperfixi/semantic/languages/en';
import { parse } from '@hyperfixi/semantic';

const node = parse('toggle .active', 'en');
```

### Pattern D: Dynamic Loading (Node/Build Time)
```typescript
import { loadLanguage, parse } from '@hyperfixi/semantic';

// Load Japanese on demand
await loadLanguage('ja');
const node = parse('トグル .active', 'ja');
```

### Pattern E: Core + CDN Chunks (Browser)
```html
<script src="hyperfixi-semantic.browser-core.core.global.js"></script>
<script>
  // Minimal initial load, then fetch languages as needed
  const userLang = navigator.language.slice(0, 2);
  await HyperFixiSemanticCore.loadLanguageFromUrl(
    userLang,
    `/js/lang/browser-${userLang}.${userLang}.global.js`
  );
  const node = HyperFixiSemanticCore.parse('...', userLang);
</script>
```

---

## Bundle Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Single language | `browser-{lang}.{lang}.global.js` | `browser-ja.ja.global.js` |
| Multi-language | `browser-{lang1}-{lang2}.{lang1}-{lang2}.global.js` | `browser-es-en.es-en.global.js` |
| Regional | `browser-{region}.{region}.global.js` | `browser-western.western.global.js` |
| Core only | `browser-core.core.global.js` | `browser-core.core.global.js` |
| Full | `browser.global.js` | `browser.global.js` |

---

## Size Budget Guidelines

| Scenario | Recommended Bundle | Raw Size |
|----------|-------------------|----------|
| Single language app | Tier 1 | 56-82 KB |
| Bilingual app | Tier 2 (es-en) | 99 KB |
| Regional app | Tier 2 | 99-127 KB |
| Global app | Tier 3 (priority) | 231 KB |
| Minimal + on-demand | Tier 5 (core) | 44 KB + chunks |

---

## Generating Custom Bundles

Use the bundle generator to create custom combinations:

```bash
# Generate single-language bundle
node scripts/generate-bundle.mjs ja

# Generate all missing single-language bundles
node scripts/generate-bundle.mjs --auto

# Estimate sizes without generating
node scripts/generate-bundle.mjs --estimate
```
