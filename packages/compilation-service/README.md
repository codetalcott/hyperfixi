# @lokascript/compilation-service

Validate, translate, compare and score hyperscript. Input can be in any of 24 languages, in
explicit bracket syntax, or in LLM JSON.

This is the library behind `@hyperfixi/mcp-server`'s `validate_and_compile`, `translate_code`,
`diff_behaviors` and `score_fidelity` tools. It also ships a small HTTP server.

The name is older than what the package does now. It stopped compiling to JavaScript in 4.0, and
6.0 removed test and component generation (see the repo's `MIGRATION.md`).

## Install

```bash
npm install @lokascript/compilation-service @lokascript/semantic
npm install @hyperfixi/engine   # optional: validate's check against the engine that runs the code
```

## Library

```ts
import { CompilationService } from '@lokascript/compilation-service';

const service = await CompilationService.create(); // { confidenceThreshold?: number } (default 0.7)
```

### `validate(request)`

`validate` parses the input into semantic IR and reports diagnostics. It accepts three input
formats:

- natural language: `code` plus a `language` code;
- explicit syntax: `explicit`;
- LLM JSON: `semantic`.

```ts
service.validate({ code: 'on click toggle .active', language: 'en' });
// { ok: true, confidence: 1, semantic: { action: 'toggle', trigger: { event: 'click' }, … }, diagnostics: [] }

service.validate({ code: 'on click put "Saved" in #output', language: 'en' });
// { ok: false, diagnostics: [{ severity: 'error', code: 'ENGINE_PARSE_ERROR',
//   message: "@hyperfixi/engine cannot read this: Expected one of: 'into', 'before', …" }] }

service.validate({ explicit: '[toggle patient:.active destination:#menu]' });
// { ok: true, semantic: { action: 'toggle', roles: { patient: …, destination: … } }, … }
```

**Who decides `ok`.** For natural-language input, `@hyperfixi/engine` (when installed) must also read
the code. For a non-English input, it reads the English translation the page would run.

- **English:** the engine's parse decides `ok`. Semantic's own doubts come back as warnings, such
  as `LOW_CONFIDENCE`, `MISSING_REQUIRED_ROLE`, or `PARSE_FAILED` when semantic can't read the code.
  These warnings mean the returned IR may not show all of the code. A request that sets
  `confidence` keeps them as errors.
- **Other languages:** semantic's doubts stay errors, because the page runs semantic's
  translation.

**Other warnings:**

- `UNCONSUMED_INPUT`: tokens no role read.
- Inert shapes, which parse but do nothing at run time: `INERT_QUANTIFIER_TARGET`,
  `INERT_PROPERTY_WRITE`, `HALF_PARSED_CONDITION`.
- `NAME_COLLISION`, for a foreign variable spelled like a word of its own language (es `si` is
  also `if`). It comes with a suggested rename.

### `translate({ code, from, to, verify? })`

```ts
service.translate({ code: 'on click toggle .active on #menu', from: 'en', to: 'ja' });
// { ok: true, code: 'クリックで #menuに .activeを 切り替え',
//   verification: { faithful: true, scores: { … }, … }, diagnostics: [] }
```

A successful translation is scored against its source; pass `verify: false` to skip that. Its
`NAME_COLLISION` warnings name a source variable that the target language reads as another word.

A translation that would lose part of the script is refused, never truncated:

```ts
service.translate({ code: 'on click halt default then put 1 into me', from: 'en', to: 'ja' });
// { ok: false, partial: 'クリックで 停止 それから 1を 自分に 置く',
//   loss: { kind: 'truncation', lost: ['default'] }, diagnostics: [{ code: 'LOSSY_TRANSLATION', … }] }
```

`partial` is not the translation, so don't show it as one.

### `diff({ a, b, confidence? })`

`diff` compares two inputs by what they do. The two sides can be in different languages and
formats.

```ts
service.diff({
  a: { code: 'on click toggle .active', language: 'en' },
  b: { code: 'クリック で .active を 切り替え', language: 'ja' },
});
// { ok: true, identical: true, summary: 'No semantic change', trigger: null, operations: [ … ] }
```

### `scoreFidelity({ reference, candidate, confidence? })`

`scoreFidelity` scores how faithfully a candidate keeps a reference, using the same scorers as
the multilingual CI ratchet.

```ts
service.scoreFidelity({
  reference: { code: 'on click add .done to #item then wait 1s', language: 'en' },
  candidate: { code: 'on click add .done to #item', language: 'en' },
});
// { ok: true, faithful: false, missingActions: ['wait'],
//   scores: { actionRecall: 0.67, multisetRecall: 0.67, precision: 1, roleFidelity: 0.75, valueRecall: 0.67 }, … }
```

### `generate({ lse, target: 'intent-element', task? })`

`generate` renders LSE (bracket syntax or protocol JSON) as an `<lse-intent>` HTML element. It is
async.

## HTTP

```ts
import { createApp, serve } from '@lokascript/compilation-service/http';

serve({ port: 3001 }); // Node
const app = createApp({ apiKey, corsOrigin, production: true }); // any Hono runtime
```

| Route             | Body                  |
| ----------------- | --------------------- |
| `POST /validate`  | `validate`'s request  |
| `POST /translate` | `translate`'s request |
| `POST /diff`      | `diff`'s request      |
| `POST /generate`  | `generate`'s request  |
| `GET /health`     | —                     |

`createApp` takes these options:

- `apiKey`: requires `Authorization: Bearer <apiKey>` on every route except `/health`.
- `production: true`: adds a body limit (`maxBodyBytes`, default 50 KB), a timeout (`timeoutMs`,
  default 10 s) and structured logs.
- `service`: passes in an instance created up front.

## License

MIT
