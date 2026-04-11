# LLM-Native UI — Multilingual Demo

**Status:** Working. 5 languages verified, Playwright spec passing.

**Date:** 2026-04-10

## What this demo shows

**One behavior. Five languages. One canonical protocol.**

Click a language button (English, 日本語, العربية, Español, 한국어). See the natural-language prompt for that language. See the protocol JSON the parser normalized it to — **the same JSON every time**. Click "Run the intent" to execute it. The behavior is identical across all 5 languages because the protocol layer doesn't know what language the input came from.

## Why this matters

Most LLM + HTML generators accept English prompts only:

- Vercel v0 — English
- Claude Artifacts — English
- GPT-4 inline HTML generation — English (with poor degradation to other languages)

LokaScript's semantic parser handles 24 natural languages natively. Five fundamentally different word orders (SVO, SOV, VSO, V2, agglutinative) all normalize to the same Fillmore-role-based LSE protocol JSON. The result: an LLM prompted in Japanese or Arabic can emit LSE that compiles to the same working HTML as an LLM prompted in English.

This is a genuine, defensible capability. No other LLM-UI tool offers it.

## What's in this demo

| File                      | Purpose                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo.html`               | The self-contained browser demo. Five prompts, one shared protocol JSON, live `<lse-intent>` execution. Open in a browser after starting a local `http-server` on port 3000. |
| `phase-0-verification.md` | The gating experiment that verified all 5 languages produce identical normalized protocol JSON. Read this first if you want to understand why the demo is trustworthy.       |
| `verify.spec.ts`          | Playwright spec that loops over all 5 languages, clicks each language button, triggers the intent, and asserts the sidebar's `.active` class toggles correctly.              |
| `README.md`               | This file.                                                                                                                                                                   |

## How it works

```text
┌────────────────────────────────────────────────────────────────┐
│  Natural language prompts (5 languages)                         │
│  ──────────────────────────────────────────                     │
│  en: on click toggle .active on #button                         │
│  ja: クリック で #button の .active を 切り替え                 │
│  ar: عند النقر بدّل .active على #button                          │
│  es: al clic alternar .active en #button                        │
│  ko: 클릭 할 때 #button 의 .active 를 토글                      │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
               @lokascript/semantic parse(text, lang)
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  Canonical protocol JSON (identical for all 5)                  │
│  ──────────────────────────────────────────                     │
│  {                                                              │
│    "action": "toggle",                                          │
│    "roles": {                                                   │
│      "patient":     { "type": "selector", "value": ".active" }, │
│      "destination": { "type": "selector", "value": "#button" }  │
│    },                                                           │
│    "trigger": { "event": "click" }                              │
│  }                                                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    <lse-intent trigger="click">
                              │
                              ▼
                        evalLSENode()
                              │
                              ▼
                  document.querySelector('#button')
                      .classList.toggle('active')
```

## Live parsing (updated 2026-04-10)

The demo now **parses live in the browser** via `@lokascript/semantic`'s `browser.global.js` bundle. When you click a language button, the demo calls `LokaScriptSemantic.parse(phrase, lang)` — which routes through the grammar-specific pattern handlers in `packages/semantic/src/generators/event-handlers-sov.ts`, `event-handlers-vso.ts`, and `pattern-generator.ts` — then serializes the resulting SemanticNode to wire format and feeds it to `<lse-intent>` for execution.

The parsed-JSON panel in the demo UI also shows:

- **Grammar:** the language's `profile.wordOrder` (SVO / SOV / VSO / V2), read live from `LokaScriptSemantic.getProfile(lang)`. This is the language's _linguistic_ grammar.
- **Matched pattern:** the pattern ID from the parser's internal diagnostics, e.g. `toggle-event-ja-sov`, `toggle-event-ar-vso`. This reveals which code path the parser actually used.

### Note on SVO languages matching `-vso` patterns

You may notice English and Spanish match pattern IDs with a `-vso` suffix (e.g. `event-en-standard` for English, `toggle-event-es-vso` for Spanish). Spanish is declared SVO in its profile, so why VSO?

This is intentional. When the pattern generator encounters an event-wrapped command in an SVO language, it routes through the generic VSO event-handler pattern because the structure — `[event-marker] [verb] [patient]` — is identical to VSO's event handler. See `packages/semantic/src/generators/pattern-generator.ts:453–463`:

```typescript
} else {
  // SVO: Use VSO pattern structure for event handlers
  ...
  patterns.push(
    generateVSOEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
  );
}
```

The `-vso` suffix is an implementation detail of the pattern generator. The language's linguistic grammar (`profile.wordOrder`) is the real fact: Spanish is SVO, and the demo's "Grammar" label reflects that. The "Matched pattern" label is a peek at internals for the curious.

### Canonical role ordering

Different languages emit roles in different iteration orders (ja/ko emit `destination` first; en/ar/es emit `patient` first). The demo's serializer normalizes this by emitting canonical role keys in a fixed order (`patient`, `destination`, `source`, `condition`, ...) regardless of the parser's iteration order. Without this, the JSON-identity assertion would fail on role-ordering alone.

This normalization is cosmetic — the runtime honors the role `Map` regardless of iteration order, and the semantic content is identical. But the displayed JSON needs a canonical shape to make the "same JSON" claim visually true.

### Why not pre-computed?

An earlier version of this demo used pre-computed JSON hardcoded as a single constant. That approach was rejected because the central claim of the demo — _"the grammar code normalizes 5 languages to the same protocol"_ — needs to be **demonstrated live**, not played back. A viewer of a pre-computed version could reasonably ask "how do I know you aren't just serving the same JSON from 5 buttons?" The live-parse version answers that immediately: the parser runs on every click, the pattern ID changes per language, and the normalized output is shown in real time.

### Alternatives for other use cases

- For a **broader multilingual demo** that covers all 24 languages, see `../multilingual/semantic-demo.html`.
- For a **minimal recording target** that doesn't load the semantic bundle, keep pre-computed JSON and reference this version for comparison.

## Re-running the Phase 0 verification

If you want to confirm the 5 canonical phrases still normalize identically after future changes:

```bash
# From the repo root:
node examples/llm-native-demo-multilingual/phase-0-check.mjs
```

The script exits 0 on success, 2 on divergence. See `phase-0-verification.md` for the methodology, the normalization rules, and the full output from the initial run.

## Running the Playwright spec

```bash
# From the repo root, start a local server:
npx http-server . -p 3000 -c-1

# In another terminal, copy the spec into the core Playwright test tree
# (which has the right baseURL) and run it:
cp examples/llm-native-demo-multilingual/verify.spec.ts \
   packages/core/src/compatibility/browser-tests/llm-multilingual-demo.spec.ts
cd packages/core
npx playwright test src/compatibility/browser-tests/llm-multilingual-demo.spec.ts
```

The spec loops over all 5 languages, clicks each picker button, clicks the "Run the intent" button, and asserts that `#button.active` toggles correctly.

## Running the demo locally

```bash
cd /Users/williamtalcott/projects/hyperfixi
npx http-server . -p 3000 -c-1
# Open: http://127.0.0.1:3000/examples/llm-native-demo-multilingual/demo.html
```

## The phrases — where they come from

Drawn verbatim from `packages/semantic/test/language-coverage/test-cases.ts` which is the canonical cross-language fixture set used by the existing 1240+ test suite. See `phase-0-verification.md` for exact line references and why the Arabic phrase uses `toggle-with-destination` (line 605) rather than `toggle-on-click` (line 330).

## Honest limitations

- **5 languages, not 24.** The demo scopes to 5 to fit a recording budget. The underlying parser supports 24.
- **One command (`toggle`).** No form handling, no multi-step sequences, nothing that would trip over the unfixed bugs documented in `../llm-native-todo-demo/README.md`.
- **One canonical phrase per language.** The Phase 0 fixture set was chosen to work with the parser as it exists today. Other phrasings of the same intent may parse differently (or fail entirely — see the Arabic note below).
- **No LLM in the loop.** The demo shows that the same protocol emerges from 5 language inputs. An LLM is one way to produce those inputs; the demo is agnostic about the input source.
- **The Arabic parser has a known word-order bug** on the variant that fronts the destination (see `phase-0-verification.md`). The demo uses the working phrasing and files the other for future work.
- **Role ordering in the wire JSON is normalized in the demo**, not by the protocol itself. The underlying protocol JSON iteration order is unstable across languages; the demo's serializer imposes a canonical order for display. The runtime doesn't care about iteration order, but hand-comparing two wire-format JSONs from different languages requires this normalization.

## What this validates

The session before this demo (commits `6ac63b00`, `d1fc5e9d`, `0722874e`) built the full LSE + trigger + unwrap pipeline. This demo is the first end-to-end validation that the pipeline handles multilingual input as advertised. Specifically:

1. **Phase 0 confirmed** that all 5 languages parse to structurally identical protocol JSON.
2. **The demo page confirmed** that `<lse-intent>` with the compact + trigger-sugar form executes correctly in a real browser.
3. **The Playwright spec confirmed** that the end-to-end click-triggers-toggle behavior works reliably.

This is not a full validation of Direction 2 (LLM-native UI generation). It is a validation of the **one unique capability** that differentiates LokaScript from other LLM-UI tools: multilingual natural-language input normalizing to one canonical protocol.
