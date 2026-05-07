# Carson hand-off message

Two variants below — pick whichever matches the channel you use to reach
Carson (GitHub issue or email). Both stay short on purpose; the integration
guide and live demo do the heavy lifting.

---

## Variant A — GitHub issue on `bigskysoftware/_hyperscript`

**Title:** `Optional plugin: write _hyperscript in 24 languages (no fork, MIT)`

**Body:**

> Hey Carson — the recent hyperscript.org refresh is great. Wanted to put
> something in front of you that's been ready for a while: a runtime plugin
> that lets visitors write `_=` attributes in any of 24 languages, and a
> companion build-time tool for translating docs/code samples.
>
> **Live demo:** https://lokascript.org/patterns — click a language chip to
> flip every pattern; toggle "Live execution" and the patterns run in the
> chosen language. Same engine; just a `getScript()` override.
>
> **Integration guide:** https://lokascript.org/integration-guide (one
> screen, all the install snippets and tradeoffs).
>
> **Packages (MIT, namespace-neutral):**
>
> - [`@hyperscript-tools/multilingual`](https://www.npmjs.com/package/@hyperscript-tools/multilingual)
>   — runtime plugin. One `<script>` tag, auto-registers.
> - [`@hyperscript-tools/i18n`](https://www.npmjs.com/package/@hyperscript-tools/i18n)
>   — build-time CLI + Eleventy plugin for pre-translated docs.
>
> The plugin is non-invasive: it overrides `runtime.getScript()` only, hands
> English to your existing lexer, and falls through unchanged when parse
> confidence is too low. No AST work. Bundle sizes range from ~140 KB
> (single language) to ~720 KB (all 24).
>
> No expectation of merge — happy if you just point people at it from the
> docs, or fork the demo, or ignore it. If you'd rather we transfer the
> packages to a `bigskysoftware`-owned scope, or co-maintain, let me know.
>
> — _William Talcott_

---

## Variant B — email

**Subject:** `_hyperscript in 24 languages — drop-in plugin if you want it`

> Hey Carson,
>
> Site refresh looks great. Quick share in case it's useful.
>
> We've been running a runtime plugin that lets people write `_=` attributes
> in any of 24 languages — Spanish, Japanese, Korean, Arabic, Mandarin, etc.
> It overrides exactly one function (`runtime.getScript()`) and hands
> English back to your existing lexer. No AST changes, no fork, no patches.
>
> Live demo: https://lokascript.org/patterns
>
> Click a chip; every pattern flips. Hit "Live execution"; they run.
>
> Drop-in install:
>
> ```html
> <script src="https://unpkg.com/hyperscript.org"></script>
> <script src="https://unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n-es.global.js"></script>
> ```
>
> Full guide (one screen) with bundle sizes, language coverage, and the
> build-time companion (`@hyperscript-tools/i18n` for pre-translated docs):
>
> https://lokascript.org/integration-guide
>
> MIT, namespace-neutral, zero HyperFixi/LokaScript runtime dependency. If
> you want to ship language support on hyperscript.org, the bare minimum is
> two `<script>` tags. If you'd rather we transfer the packages to a
> `bigskysoftware` scope so the long-term home is with `_hyperscript`
> itself, that works too — just say the word.
>
> No expectation of any specific outcome. Throwing it over the fence in case
> it's useful.
>
> — William
>
> P.S. The runtime is a few hundred lines on top of a precomputed semantic
> pattern catalog. Below-threshold input falls through unchanged, so a
> low-confidence guess never replaces what the author wrote.

---

## Pre-send checklist

- [ ] `@hyperscript-tools/multilingual@2.x.y` is published to npm with
      Step 1's bundles.
- [ ] `@hyperscript-tools/i18n@2.x.y` is published to npm.
- [ ] lokascript.org/patterns is deployed with the language chip strip from
      `lokascript-docs-patch.md`.
- [ ] lokascript.org/integration-guide (or whatever URL you pick) is
      deployed with [integration-guide.md](./integration-guide.md) as the
      content. Update both message variants if the URL is different.
- [ ] `unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n-es.global.js`
      resolves (smoke-test the URL in a browser; should serve ~140 KB JS).
- [ ] hyperfixi.org/patterns and lokascript.org/patterns both load cleanly
      and the cross-link between them works.
- [ ] You're prepared for either response: "yes, link it from the docs"
      (= add a small note to hyperscript.org docs); "yes, transfer the
      package scope" (= move to `bigskysoftware/hyperscript-i18n` and
      republish under that name with `@hyperscript-tools/*` left as a
      deprecated alias for one minor version).

---

## Anticipated questions and short answers

**"How does this work without forking the parser?"**

> A `runtime.getScript()` override translates non-English source to English
> via a semantic parser before your lexer sees it. The lexer is unchanged.

**"What if parse confidence is low?"**

> The original text falls through unchanged. The plugin never replaces
> author text with a low-confidence guess.

**"How big is this?"**

> Single-language bundles are ~140 KB. The all-24 bundle is ~720 KB. Lite
> mode that expects an external semantic bundle is ~2 KB.

**"What about expressions, `def`, `worker`?"**

> Standalone expressions outside command bodies and the `def` / `worker`
> feature keywords stay English. Everything inside command bodies, plus the
> `behavior` feature, translates fully.

**"Why @hyperscript-tools and not lokascript or hyperfixi?"**

> We deliberately chose a neutral npm scope so it could live next to
> `_hyperscript` without implying allegiance to a fork. Happy to transfer
> the scope to `bigskysoftware` if that's a better home.

**"Is this related to your fork?"**

> The implementation reuses the semantic parser we built for HyperFixi, but
> the runtime plugin has zero dependency on HyperFixi or LokaScript at
> runtime. It's MIT, standalone, and works against vanilla `_hyperscript`.

**"Can I see the runtime override?"**

> [`packages/hyperscript-adapter/src/plugin.ts`](https://github.com/codetalcott/hyperfixi/tree/main/packages/hyperscript-adapter/src/plugin.ts)
> — ~80 lines, the meaningful diff is one method.
