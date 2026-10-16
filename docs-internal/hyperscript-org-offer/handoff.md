# Hand-off message

> **Not sent (2026-10-06).** Refreshed against 4.1.0: the hook (`addBeforeProcessHook`, not a
> `getScript()` override), the sizes, the host-parser check, and the fork answer. The opening line
> needs something current when it goes out.

The guide and the live demo do the heavy lifting.

---

**Subject:** `_hyperscript in 24 languages — drop-in plugin if you want it`

> Quick share in case it's useful.
>
> We've been running a plugin that lets people write `_=` attributes in any of 24 languages —
> Spanish, Japanese, Korean, Arabic, Mandarin, etc. It uses `_hyperscript`'s own
> `addBeforeProcessHook`: each non-English script is translated to English before the runtime reads
> it, and your parser does the rest. No AST changes, no fork, no patches.
>
> Live demo: <https://lokascript.org/patterns>
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
> Full guide (one screen) with bundle sizes, language coverage, and the build-time companion
> (`@hyperscript-tools/i18n`, for pre-translated docs):
>
> <https://lokascript.org/integration-guide>
>
> MIT, namespace-neutral, and the CDN bundles are self-contained: no HyperFixi or LokaScript runtime
> to load. If you want to ship language support on hyperscript.org, the bare minimum is two
> `<script>` tags. If you'd rather we transfer the packages to a `bigskysoftware` scope so the
> long-term home is with `_hyperscript` itself, that works too — just say the word.
>
> No expectation of any specific outcome. Throwing it over the fence in case it's useful.
>
> P.S. Before the plugin uses a translation, it asks your parser whether the English parses; if it
> doesn't, or the translation's confidence is low, the author's text stays as written, so an error
> always names code the author wrote.

---

## Pre-send checklist

- [x] `@hyperscript-tools/multilingual` is on npm with the bundles (4.1.0, 2026-10-06).
- [x] `@hyperscript-tools/i18n` is on npm (4.1.0, 2026-10-06).
- [x] lokascript.org/patterns has the language chips and live execution.
- [ ] lokascript.org/integration-guide (or the URL you pick) is deployed with
      [integration-guide.md](./integration-guide.md). It was a 404 on 2026-10-06. If you use the live
      /multilingual-plugin/ page instead, change the link above.
- [x] `unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n-es.global.js` resolves (455 KB
      raw, 119 KB gzipped, 2026-10-06). Re-check on the day.
- [x] hyperfixi.org/patterns and lokascript.org/patterns both load (2026-10-06). Re-check the
      cross-link on the day.
- [ ] You're prepared for either response: "yes, link it from the docs" (= add a small note to the
      hyperscript.org docs); "yes, transfer the package scope" (= move to
      `bigskysoftware/hyperscript-i18n` and republish under that name with `@hyperscript-tools/*`
      left as a deprecated alias for one minor version).

---

## Anticipated questions and short answers

**"How does this work without forking the parser?"**

> `_hyperscript`'s `addBeforeProcessHook` runs before the runtime reads a subtree's scripts. The
> plugin translates each non-English `_=` attribute (or `<script type="text/hyperscript">` body) to
> English there, with a semantic parser, and rewrites it in place. Your lexer and parser are
> unchanged.

**"What if the translation is wrong, or the parse confidence is low?"**

> A low-confidence parse leaves the original text as written. A translation your parser rejects is
> dropped too (the plugin calls `_hyperscript.parse()` on it first), so an error names what the
> author wrote, not generated English.

**"How big is this?"**

> A single-language bundle is 455 KB (119 KB gzipped); a regional one about 140 KB gzipped; all 24
> languages 1.2 MB (258 KB gzipped). The lite build, which uses a separately loaded semantic bundle,
> is 3 KB.

**"Does everything translate?"**

> Commands, event handlers, blocks and `behavior` do. The `def` keyword stays English (its body
> translates). `worker` isn't covered: it needs your worker extension. Translations follow each
> language's word order, but some don't read naturally yet: a few English words remain (some loop
> forms, event modifiers), and native review is ongoing.

**"Why @hyperscript-tools and not lokascript or hyperfixi?"**

> We deliberately chose a neutral npm scope so it could live next to `_hyperscript` without
> implying allegiance to a fork. Happy to transfer the scope to `bigskysoftware` if that's a
> better home.

**"Is this related to your fork?"**

> The plugin reuses the semantic parser we built for HyperFixi, and it runs on vanilla
> `_hyperscript`. Its CDN bundles carry everything they need; the npm package wraps
> `@lokascript/hyperscript-adapter`. HyperFixi itself no longer forks your language: since 4.0 its
> engine is checked against `_hyperscript`'s own test suite (1,401 of 0.9.93's 1,467 tests), and
> its examples are written in your spelling.

**"Can I see the hook?"**

> [`packages/hyperscript-adapter/src/attribute-translator.ts`](https://github.com/codetalcott/hyperfixi/tree/main/packages/hyperscript-adapter/src/attribute-translator.ts),
> `installAttributeTranslator`: about 120 lines. A host that offers a source transform (a hook that
> hands each script to the plugin as it is read) needs no rewriting at all, and the attribute keeps
> the author's text. That's a small proposal of its own, if it interests you.
