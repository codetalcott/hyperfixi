# @lokascript/domain-flow

Multilingual reactive data flow DSL built on `@lokascript/framework`. Describe fetch, polling, streaming, form submission, and data transformation pipelines in 8 natural languages and compile to vanilla JS or HTMX attributes.

## Supported Languages

| Language | Code | Word Order | Example                                      |
| -------- | ---- | ---------- | -------------------------------------------- |
| English  | `en` | SVO        | `fetch /api/users as json into #list`        |
| Spanish  | `es` | SVO        | `obtener /api/users como json en #list`      |
| Japanese | `ja` | SOV        | `/api/users json で 取得 #list に`           |
| Arabic   | `ar` | VSO        | `جلب /api/users ك json في #list`             |
| Korean   | `ko` | SOV        | `/api/users json 로 가져오기`                |
| Chinese  | `zh` | SVO        | `获取 /api/users 以 json 到 #list`           |
| Turkish  | `tr` | SOV        | `/api/users json olarak getir`               |
| French   | `fr` | SVO        | `récupérer /api/users comme json dans #list` |

## Commands

| Command     | Description                     | Example                                          |
| ----------- | ------------------------------- | ------------------------------------------------ |
| `fetch`     | HTTP GET, parse response        | `fetch /api/users as json into #list`            |
| `poll`      | Repeated fetch on interval      | `poll /api/status every 5s as json into #status` |
| `stream`    | Server-Sent Events (SSE)        | `stream /api/events as sse into #feed`           |
| `submit`    | POST form data                  | `submit #login-form to /api/login`               |
| `transform` | Client-side data transformation | `transform data with uppercase`                  |

## Usage

```typescript
import { createFlowDSL } from '@lokascript/domain-flow';

const flow = createFlowDSL();

// Parse
const node = flow.parse('fetch /api/users as json into #list', 'en');

// Compile to vanilla JS
const result = flow.compile('fetch /api/users as json into #list', 'en');
// → fetch('/api/users').then(r => r.json()).then(data => { ... })

// Validate
const validation = flow.validate('poll /api/status every 5s', 'en');
// → { valid: true }
```

### Pipelines

Chain commands with `→` or `->`:

```typescript
import { compilePipeline } from '@lokascript/domain-flow';

const result = compilePipeline(
  flow,
  'fetch /api/data as json → transform data with uppercase into #output',
  'en'
);
```

### HTMX Generation

```typescript
import { toFlowSpec, generateHTMX } from '@lokascript/domain-flow';

const node = flow.parse('fetch /api/users as json into #list', 'en');
const spec = toFlowSpec(node, 'en');
const htmx = generateHTMX(spec);
// → { attrs: { 'hx-get': '/api/users', 'hx-target': '#list', 'hx-swap': 'innerHTML' }, notes: [...] }
```

### Route Extraction

```typescript
import { toFlowSpec, extractRoute } from '@lokascript/domain-flow';

const spec = toFlowSpec(flow.parse('submit #form to /api/orders', 'en'), 'en');
const route = extractRoute(spec);
// → { path: '/api/orders', method: 'POST', handlerName: 'createOrders', ... }
```

### Translation

```typescript
import { renderFlow } from '@lokascript/domain-flow';

const node = flow.parse('fetch /api/users as json into #list', 'en');
renderFlow(node, 'ja'); // → /api/users json で 取得 #list に
renderFlow(node, 'es'); // → obtener /api/users como json en #list
```

## API

### `createFlowDSL(): MultilingualDSL`

Create a DSL instance with all 8 languages.

### `toFlowSpec(node, language): FlowSpec`

Convert a parsed semantic node to a structured `FlowSpec`.

### `renderFlow(node, language): string`

Render a semantic node back to natural-language DSL text.

### `generateHTMX(spec): HTMXAttributes | null`

Generate HTMX attributes from a `FlowSpec`. Returns null for `transform`.

### `extractRoute(spec): FlowRouteDescriptor | null`

Extract a server route descriptor from a `FlowSpec`.

### `parseFlowPipeline(dsl, input, language): PipelineParseResult`

Parse arrow-delimited multi-step pipelines.

### `compilePipeline(dsl, input, language): { ok, code, errors }`

Parse and compile a pipeline to JS.
