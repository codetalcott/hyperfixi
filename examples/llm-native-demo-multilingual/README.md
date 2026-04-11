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

## Pre-computed vs live parsing

The demo uses **pre-computed** protocol JSON rather than parsing in the browser. Reasons:

1. **Recording reliability.** The demo is designed for a screen recording; any in-browser runtime failure during the recording would sink it. Pre-computing the JSON offline (via the Phase 0 script) eliminates the possibility of a parser stall mid-recording.
2. **Proof by identity.** The canonical JSON is a single JavaScript constant used for all 5 language buttons. If the 5 languages truly normalize to the same output (which Phase 0 verified), then using the same JSON for all of them is semantically correct — it's the normalized form.
3. **No extra browser bundle needed.** `@lokascript/semantic`'s browser bundle would add ~90 KB to the page for a benefit (live parsing) that doesn't change the demo's message.

If you want to see the live parser in action, use the existing `examples/multilingual/semantic-demo.html` — it loads the semantic browser bundle and parses at runtime across all 24 languages. This demo is narrower on purpose.

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
- **Pre-computed JSON.** The demo asserts the equivalence; it doesn't re-derive it live. For live parsing, use `examples/multilingual/semantic-demo.html`.
- **No LLM in the loop.** The demo shows that the same protocol emerges from 5 language inputs. An LLM is one way to produce those inputs; the demo is agnostic about the input source.
- **The Arabic parser has a known word-order bug** on the variant that fronts the destination (see `phase-0-verification.md`). The demo uses the working phrasing and files the other for future work.

## What this validates

The session before this demo (commits `6ac63b00`, `d1fc5e9d`, `0722874e`) built the full LSE + trigger + unwrap pipeline. This demo is the first end-to-end validation that the pipeline handles multilingual input as advertised. Specifically:

1. **Phase 0 confirmed** that all 5 languages parse to structurally identical protocol JSON.
2. **The demo page confirmed** that `<lse-intent>` with the compact + trigger-sugar form executes correctly in a real browser.
3. **The Playwright spec confirmed** that the end-to-end click-triggers-toggle behavior works reliably.

This is not a full validation of Direction 2 (LLM-native UI generation). It is a validation of the **one unique capability** that differentiates LokaScript from other LLM-UI tools: multilingual natural-language input normalizing to one canonical protocol.
