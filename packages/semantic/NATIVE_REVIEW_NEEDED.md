# Native Speaker Review Needed

This document tracks native idiom patterns that need validation from native speakers.
Patterns were implemented based on linguistic research but may benefit from real-world usage feedback.

**Deep research audit conducted December 2024** - See [Computational Linguistics Analysis](../../docs/multilingual/Computational%20Linguistics%20%26%20Localization%20Analysis.md) for authoritative findings.

## Status Legend

- ✅ **Verified** - Confirmed by research or native speaker
- ⚠️ **Needs Review** - Implemented but needs native validation
- ❓ **Uncertain** - May not be natural usage
- 🚨 **Critical Issue** - Implementation may be incorrect

---

## Arabic (ar)

### Proclitic Handling ✅ (Implemented December 2025)

**The "wa" (و) conjunction handling has been implemented.**

Arabic "wa" is a **proclitic** - it attaches directly to the following word with no space. The tokenizer now correctly separates proclitics from attached words:

| Input      | Tokenization                               |
| ---------- | ------------------------------------------ |
| `والنقر`   | `و` (conjunction) + `النقر` (the-click)    |
| `فالتبديل` | `ف` (conjunction) + `التبديل` (the-toggle) |

**Implementation details:**

- `tryProclitic()` method in `arabic.ts` detects و and ف attached to following words
- Requires minimum 2 characters after proclitic to avoid false positives
- Emits conjunction token with normalized value (`and` / `then`)
- Enables polysyndetic coordination: `A وB وC` → `[A, و, B, و, C]`

**Source:** [Lancaster Arabic Tagset](https://www.lancaster.ac.uk/staff/hardiea/arabic-annotation-guide.pdf)

### Polysyndetic Coordination

Arabic uses **polysyndetic coordination** (repeating conjunction between ALL items):

- **English:** A, B, and C
- **Arabic:** A wa-B wa-C (A وB وC)

There is **no Oxford comma** in Arabic - it is foreign to the rhetorical structure.

### Verified Patterns ✅

| Pattern        | Meaning               | Notes                        | Source                                                                                                    |
| -------------- | --------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| عندما (indama) | when (temporal)       | Formal, suitable for UI text | [Gemini Analysis](../../docs/multilingual/Computational%20Linguistics%20%26%20Localization%20Analysis.md) |
| حين (hina)     | at the time of        | Classical Arabic (الفصحى)    | Verified                                                                                                  |
| إذا (idha)     | if/when (conditional) | Standard conditional         | Verified                                                                                                  |

### Needs Review ⚠️ → Researched (August 2026)

| Pattern      | Meaning     | Concern                                                                 | Status                            |
| ------------ | ----------- | ----------------------------------------------------------------------- | --------------------------------- |
| لمّا (lamma) | when (past) | **Dialectal/informal** - common in spoken Arabic, NOT in formal writing | ✅ resolved: keep parse-side only |

**Resolution (research, 2026-08):** In MSA, لمّا is grammatical but restricted to
**past-tense** clauses, and modern formal writing strongly prefers عندما — many
writers perceive لمّا as dialectal even where it is technically fuṣḥā
([WordReference discussion](https://forum.wordreference.com/threads/idh-idhaa-lammaa-%D8%A5%D8%B0-%D8%A5%D8%B0%D8%A7-%D9%84%D9%8E%D9%85%D9%91%D8%A7.1040591/)).
The current implementation matches this: لمّا appears only in
`eventMarkerAlts`/tokenizer keywords (parse-side leniency for users who write
it) and is never rendered — عندما/حين stay the rendered forms. No change needed;
do not promote لمّا to a primary.

### Disjunction Distinction (أو vs أم)

| Context                   | Particle | Use Case                                       |
| ------------------------- | -------- | ---------------------------------------------- |
| Declarative list          | أو (aw)  | "A, B, or C" - default for boolean OR          |
| Imperative                | أو (aw)  | "Select A or B"                                |
| Interrogative (selection) | أم (am)  | Only with Hamza (أ-) prefix - "Which: A or B?" |
| Interrogative (yes/no)    | أو (aw)  | Used with هل (hal)                             |

For event handlers, **أو (aw) is the correct pattern.**

### Missing Patterns to Consider — Researched (August 2026)

| Pattern             | Meaning    | Why Consider               | Verdict                           |
| ------------------- | ---------- | -------------------------- | --------------------------------- |
| كلما (kullama)      | whenever   | Common repetitive temporal | ⚠️ hold — see note                |
| بمجرد (bimujjarrad) | as soon as | Immediate temporal         | ⚠️ hold — حالما is the closer fit |

**Research note (2026-08):** كلما is a real MSA "whenever", but it links **two
past-tense clauses** ("كلما ذهبت … شعرت …" — [KALIMAH guide](https://kalimah-center.com/conjunctions-in-arabic/));
as a bare event-handler marker before a noun-like event name it would not be
idiomatic, so it should not be added mechanically as an `on`-marker alternative.
بمجرد is attested formal "as soon as" alongside **حالما**, which functions as a
plain conjunction and would slot into the marker grammar more naturally
([Reverso corpus](https://context.reverso.net/translation/arabic-english/%D8%A8%D9%85%D8%AC%D8%B1%D8%AF+%D8%A3%D9%86)).
Neither is needed for current corpus coverage; revisit only if a native reviewer
asks for them, and prefer حالما over بمجرد if an "as soon as" marker is added.

---

## Turkish (tr)

### Critical Implementation Issue 🚨 → Implemented (verified August 2026)

**Status:** the concerns below are addressed in the current tree:

- `src/tokenizers/morphology/turkish-normalizer.ts` strips verb suffixes with
  an explicit `matchesVowelHarmony()` check (back/front vowel classes), so
  suffix matching is harmony-aware, not static.
- The cliticized instrumental is modeled in the profile's `style` marker:
  primary `le` with alternatives `la`/`yle`/`yla`/`ile` (both the buffer-`y`
  and bare-consonant forms), and free-standing `ile` is a tokenizer keyword.
- `-dığında`/`diğinde` are the profile's `temporalMarkers`; `değilse` (unless)
  and `süresince` (while) are keywords.

**Open question for a native reviewer:** the while-word. The profile renders
`süresince` ("throughout the duration of"), but Turkish programming prose
normally phrases a while-condition as "**(koşul doğru) olduğu sürece**" — bare
`sürece` — (e.g. [tr.wikipedia: While döngüsü](https://tr.wikipedia.org/wiki/While_d%C3%B6ng%C3%BCs%C3%BC)).
`süresince` parses and round-trips today; consider adding `sürece` as a
parse-side alternative after native review. (`iken` is deliberately NOT the
while-word — it collides with the tr `when` primary; see the i18n dict note.)

### Original finding (December 2025): static regex patterns fail due to vowel harmony

Turkish suffixes mutate based on the last vowel of the root word:

- **2-Way Harmony (A/E):** Suffixes take `a` or `e` (e.g., plural -lar/-ler)
- **4-Way Harmony (I/İ/U/Ü):** Suffixes take `ı`, `i`, `u`, or `ü` (e.g., -ip/-ıp/-up/-üp)

| Concept             | Static (Incorrect) | Correct Pattern       |
| ------------------- | ------------------ | --------------------- |
| "With/And" (suffix) | `-la`, `-le`       | `-(y)?(la\|le)`       |
| "And" (sequential)  | `-ip`              | `-(ıp\|ip\|up\|üp)`   |
| "With" (word)       | `ile`              | `\sile\s` (invariant) |
| "And" (word)        | `ve`               | `\sve\s` (invariant)  |

### The "ile" Postposition Complexity

The postposition "ile" (with/and) can:

1. Stand alone as invariant word `ile`
2. Cliticize to preceding noun with:
   - Vowel loss (initial `i` drops)
   - Buffer `y` insertion (if noun ends in vowel)
   - Vowel harmony (`a` or `e`)

| Noun         | + ile | Result                          |
| ------------ | ----- | ------------------------------- |
| Masa (table) | + ile | Masa**yla** (back vowel → a)    |
| Kedi (cat)   | + ile | Kedi**yle** (front vowel → e)   |
| El (hand)    | + ile | El**le** (consonant, no buffer) |

**A parser looking only for `ve` or `ile` will miss these cliticized forms.**

### Suffix Classification

| Suffix          | Function              | Use in Event Handlers     |
| --------------- | --------------------- | ------------------------- |
| -ip/-ıp/-up/-üp | Sequential "and"      | ✅ Valid - chains actions |
| -ince/-ınca     | Temporal "when/upon"  | ✅ Valid                  |
| -dığında        | Temporal "when"       | ✅ Valid                  |
| -ken            | Temporal "while"      | ✅ Valid (sets context)   |
| -dikçe/-dıkça   | Repetitive "whenever" | ✅ Valid                  |
| -sa/-se         | Conditional "if"      | ✅ Valid                  |
| -erek/-arak     | Adverbial "by doing"  | ❌ NOT a list separator   |
| -meden/-madan   | Negative "without"    | ❌ NOT a list separator   |

**Source:** [Turkish Wikibooks - Converbs](https://en.wikibooks.org/wiki/Turkish/Converbs)

### Verified Patterns ✅

| Pattern  | Meaning   | Notes                                             |
| -------- | --------- | ------------------------------------------------- |
| -dığında | when      | Temporal converb - inherits tense from final verb |
| -(y)ınca | when/upon | Temporal converb                                  |
| -sa/-se  | if        | Conditional suffix                                |
| -ken     | while     | Simultaneity (invariant, accepts buffer -y)       |
| -dikçe   | whenever  | Repetitive temporal                               |

---

## Portuguese (pt)

### Critical Finding: Capitalization 🚨

**Months and days are LOWERCASE in Portuguese.**

Unlike English, Portuguese treats month and day names as common nouns:

- **English:** January, Monday
- **Portuguese:** janeiro, segunda-feira

This is **CLDR standard** - Java/Python locale libraries output lowercase by default.

**Source:** [JDK-8017120](https://bugs.openjdk.org/browse/JDK-8017120)

**Implication:** Any NER trained on English capitalization features will fail on Portuguese temporal entities.

### Crasis for Time (às)

The distinction between `as` and `às` is the phenomenon of **Crasis**:

| Form | Meaning                  | Use                              |
| ---- | ------------------------ | -------------------------------- |
| `às` | at (contraction: a + as) | **Required for time** - "às 14h" |
| `as` | the (article)            | NOT for time                     |

- **Correct:** _A reunião é **às** 14h._ (The meeting is at 14h)
- **Incorrect:** _A reunião é **as** 14h._ (Ungrammatical)

**Singular exception:** For 1:00, use `à` (a + a = à): _À uma hora._

### Date Preposition (de)

Portuguese dates **always** use `de` between components:

- **Pattern:** `d de MMMM de yyyy`
- **Example:** _25 de dezembro de 2023_

A parser expecting `25 dezembro` (no `de`) will fail.

### No Oxford Comma

Standard Portuguese grammar **prohibits** a comma before `e` in simple enumerations:

- **Correct:** A, B e C
- **Incorrect:** A, B, e C (grammatical error)

A comma before `e` is only valid if the subject changes.

### Verified Patterns ✅

| Pattern         | Meaning         | Notes                                         |
| --------------- | --------------- | --------------------------------------------- |
| quando          | when            | Standard temporal                             |
| ao + infinitive | upon/when doing | Native idiom (ao clicar) - **most idiomatic** |
| se              | if              | Standard conditional                          |

### Needs Review ⚠️ → Researched (August 2026)

| Pattern   | Meaning  | Concern                                    | Status                     |
| --------- | -------- | ------------------------------------------ | -------------------------- |
| em clique | on click | May not be natural - "ao clicar" preferred | ✅ resolved: ao is primary |

**Resolution (research, 2026-08):** Portuguese programming documentation renders
the `on*` event prefix as "no/na" ("no clique" — [linhadecodigo](http://www.linhadecodigo.com.br/artigo/3617/eventos-em-javascript-tratando-eventos.aspx)),
while "ao + infinitive" ("ao clicar") is the natural prose form
([MDN pt-BR](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Core/Scripting/Events)).
The semantic profile already reflects this: `eventMarker` primary is **ao** with
`no`/`em` as parse-side alternatives, and `click` accepts the infinitive
`clicar` — so `ao clicar`, `no clique` and `em clique` all parse, and renders
prefer `ao`. The i18n pt parser docstring still shows `em clique` as its lead
example; that is parse-side only and remains valid input. No code change needed.

---

## Implementation Recommendations

Based on the deep research audit:

### Arabic

1. Abandon whitespace-delimited patterns for `و` (wa)
2. Implement proclitic-aware pattern: `(?<=\s|^|\p{P})\u0648(?=\p{L})`
3. Adopt polysyndetic logic (A wa-B wa-C) as default

### Turkish

1. Replace static suffix matching with vowel harmony-aware patterns
2. Handle `ile` in both standalone and cliticized forms
3. Recognize `-ip` as a dependency marker (inherits tense from subsequent verb)

### Portuguese

1. Accept lowercase month/day names
2. Enforce `às` validation for time parsing
3. Ensure date parsing requires `de` preposition

---

## Research Sources

### Deep Research Audit

- [Computational Linguistics & Localization Analysis](../../docs/multilingual/Computational%20Linguistics%20%26%20Localization%20Analysis.md) - Comprehensive Gemini analysis

### Arabic

- [Lancaster Arabic Tagset](https://www.lancaster.ac.uk/staff/hardiea/arabic-annotation-guide.pdf)
- [Adros Verse - Arabic Conjunctions](https://www.adrosverse.com/modern-standard-arabic-4-6-conjunctions/)
- [Ultimate Arabic - العَطْف](https://ultimatearabic.com/conjunctions/)

### Turkish

- [Turkish Wikibooks - Converbs](https://en.wikibooks.org/wiki/Turkish/Converbs)
- [TurkishFluent - Sequential Actions](https://turkishfluent.com/blog/sequential-actions-turkish/)
- [ResearchGate - Turkish Morphological Analyzer](https://www.researchgate.net/publication/338060256)

### Portuguese

- [JDK-8017120 - Month capitalization](https://bugs.openjdk.org/browse/JDK-8017120)
- [Speaking Brazilian - Time](https://www.speakingbrazilian.com/how-to-tell-the-time-in-portuguese/)
- [Rio & Learn - Dates](https://rioandlearn.com/dates-in-portuguese/)

---

## Reactive `when … changes` trigger word — all 24 languages ⚠️ (August 2026)

`when <expr> [or <expr>]* changes <body> [end]` is canonical \_hyperscript (0.9.93
verified: `or` is the only separator, `changes` is a REQUIRED literal, `end` is
optional, and the engine has **no** temporal `when <event>` form). Until August
2026 no semantic profile declared a `changes` keyword, so the temporal
`when {event}` handler patterns claimed the reactive head and kept only the
first token of the watched expression — in English too, so every language
scored "clean" by reproducing the truncation.

The parse side now reads the word from `profile.keywords.changes`, and the
renderer emits it. **The 24 words were not chosen here** — they were synced
VERBATIM from the `@lokascript/i18n` dictionaries (`logical.changes`), which is
what wrote every stored corpus row, and the V1 vocab gate requires the two
surfaces to agree. They were authored for the dictionaries without a native
pass, so each is ⚠️ until a native reviewer signs it off. The idiom being asked
for is a reactive-dependency trigger ("whenever this value changes"), **not**
the everyday verb, and not the `change` DOM event.

| Lang | `changes` word | Notes for the reviewer                                                                                                                                                                                                                           |
| ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ar   | يتغير          | imperfect "it changes"                                                                                                                                                                                                                           |
| bn   | পরিবর্তিত হলে  | two words ("when changed"); matched whole by the multi-word keyword walk                                                                                                                                                                         |
| de   | ändert         | conjugated; `ändern` is the `change` event lemma                                                                                                                                                                                                 |
| es   | cambia         | 3sg; event is `cambiar`/`cambio`                                                                                                                                                                                                                 |
| fr   | change         | **doubles as the English `change` event fallback** — `sur change …` (mixed-language `on change`) now reads as the reactive word; `sur changement` is unaffected. Consider `change de valeur` / `est modifié` if the reviewer wants the two apart |
| he   | משתנה          | previously shattered by the proclitic splitter (`מ`+`ש`+`תנה`); whole keyword now                                                                                                                                                                |
| hi   | बदलने पर       | "on changing"; spaced, never register bare `बदलने` (stem collides with the toggle verb)                                                                                                                                                          |
| id   | berubah        | **same surface as the profile's `change` EVENT primary** (`berubah`); the event entry keeps the normalized form, the reactive head matches by surface                                                                                            |
| it   | cambia         |                                                                                                                                                                                                                                                  |
| ja   | 変わったら     | conditional -たら; prefix head `とき $a または $b 変わったら` follows the corpus rows — a native may prefer `$a または $b が変わったら`                                                                                                          |
| ko   | 변경되면       | -면 conditional; same prefix-head caveat as ja                                                                                                                                                                                                   |
| ms   | berubah        |                                                                                                                                                                                                                                                  |
| pl   | zmienia        | 3sg (`zmienia się` would be the reflexive)                                                                                                                                                                                                       |
| pt   | muda           |                                                                                                                                                                                                                                                  |
| qu   | tukurikun      |                                                                                                                                                                                                                                                  |
| ru   | изменяется     |                                                                                                                                                                                                                                                  |
| sw   | inabadilika    |                                                                                                                                                                                                                                                  |
| th   | เปลี่ยน        | **same surface as the profile's `change` EVENT primary**; declared ahead of it so the event reading wins (last-writer-wins keyword map)                                                                                                          |
| tl   | nagbabago      |                                                                                                                                                                                                                                                  |
| tr   | değiştiğinde   | "when it changes" (-diğinde); same prefix-head caveat as ja                                                                                                                                                                                      |
| uk   | змінюється     |                                                                                                                                                                                                                                                  |
| vi   | thay đổi       | two words                                                                                                                                                                                                                                        |
| zh   | 改变时         | 改变 + 时 ("at the time of changing"); the natural head is the 当…时 circumfix — see below                                                                                                                                                       |

**The HEAD word is a second, separate question.** The renderer emits the
profile's `when` primary, which in six languages is NOT the dictionary word the
corpus rows use (the `V1|*|when` waiver): ja `とき` vs `時`, zh `何时` vs `当`,
th `ขณะที่` vs `เมื่อ`, tl `tuwing` vs `kapag`, ms `bila` vs `apabila`, vi `lúc`
vs `khi`. Both parse (the head is discriminated by the `changes` word, not by its
first token), but zh `何时` is interrogative "when?" and a reviewer will likely
want `当 … 改变时`. Reconciling the six `when` primaries with the dictionary is
the Arc B table-alignment item, not something to do per-construct.

**Word order.** The head is prefix — `<when> <expr> <changes>` — in every
language, SOV ones included, because that is the order the i18n transformer
wrote all 48 corpus rows in and the order the structural parser reads. A native
SOV reviewer may prefer the expression-first shape (`$a または $b が変わったら …`);
that would be a renderer change plus a second accepted head shape.

## `me` after a marker, in the case the marker takes (M2 N3) ⚠️ (October 2026)

Translations used to write the nominative pronoun after every marker (es `a yo`,
de `zu ich`, ru `к я`). They now write the form the marker takes, from each
profile's `obliqueReferences`. **The forms come from grammar references, not
a native speaker** (owner decision, 2026-10-10: native review trails the build).
A form is written only where the reader brings it back as the nominative would be;
elsewhere the render keeps the nominative.

Where a marker takes a different case for a direction and for a location (de, ru, uk),
a render picks by command. **Direction:** put into, append to, send to, set … to,
prepend, add to. **Location:** toggle … on, trigger … on, and a query's `in`
(`<p/> in me`). Please check this split per command too.

| Lang | Marker → form                                                                                                                                                                     | Notes for the reviewer                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| es   | `en` → `en mí`, `a` → `a mí`, `de` → `de mí`, `desde` → `desde mí`                                                                                                                | `antes de mí`, `después de mí`, `en fin de mí` follow from `de`                                                              |
| pt   | `em` → `em mim`, `a` → `a mim`, `para` → `para mim`, `de` → `de mim`                                                                                                              | `em fim de mim` follows from `de`                                                                                            |
| it   | `in` → `in me`, `a` → `a me`, `da` → `da me`, `di` → `di me`                                                                                                                      | `a fine di me` follows from `di`                                                                                             |
| tl   | `sa` → `sa akin`, `mula_sa` → `mula_sa akin`                                                                                                                                      | `mula_sa` is written as the profile's marker is (`mula sa` does not read back)                                               |
| pl   | `do` → `do mnie`, `w` → `we mnie`, `na` → `na mnie`, `z` → `ze mnie`, `po` → `po mnie`, `przed` → `przede mną`                                                                    | vocalized `we`, `ze`, `przede`; `mnie` is the same form for a direction and a location; `przy koniec ze mnie` (at end of me) |
| ru   | `к` → `ко мне`, `в` → `в меня` (direction) / `во мне` (location), `на` → `на меня` / `на мне`, `из` → `из меня`, `после` → `после меня`, `перед` → `передо мной`                  | vocalized `ко`, `во`, `передо`; `у конец из меня` (at end of me)                                                             |
| uk   | `до` → `до мене`, `в` → `в мене` / `в мені`, `у` → `у мене` / `у мені`, `на` → `на мене` / `на мені`, `з` → `з мене`, `після` → `після мене`, `перед` → `переді мною`             | `в мене` also reads as "I have"; is it natural for "into me"?                                                                |
| de   | `zu` → `zu mir`, `von` → `von mir`, `nach` → `nach mir`, `in` → `in mich` / `in mir`, `auf` → `auf mich` / `auf mir`, `an` → `an mich` / `an mir`, `vor` → `vor mich` / `vor mir` | accusative for a direction, dative for a location; `bei ende von mir` (at end of me)                                         |
| hi   | `में` → `मुझ में`, `पर` → `मुझ पर`, `से` → `मुझ से`                                                                                                                               | oblique `मुझ`, spaced as the renderer spaces every marker (N5 would join them: `मुझमें`)                                     |

**Still the nominative (open).** These need a reader change or a decision:

- pt `antes eu`, `depois eu` (put before/after me): `antes de mim`, `depois de mim`.
  pt `<p/> dentro eu` (a query's `in`): `dentro de mim`.
- it `su io` (toggle on me): `su di me`. it `prima io` / `dopo io`: `prima di me`, `dopo di me`.
- tl `bago ako` / `matapos ako` (put before/after me): which form is natural here?
  tl `sa wakas ng ako` (at end of me), `<p/> sa_loob ako`.
  tl `akin` followed by another word reads as the possessive "my" (`sa akin for 2s`), so
  the render keeps `ako` there.
- hi `मैं को` (`को` fuses: `मुझे`) and every fused form (tr `bana`, ar `إليّ`, he `אליי`, bn
  `আমাকে`): they wait on N5's attached suffixes.

### `it` after a marker, and `me` as a verb's object (M2 N3, wave 2) ⚠️

**`it` after a marker.** The ru, uk and pl demonstrative and de `es` are already
accusative for a direction (ru `в это`, de `in es`), so those stay. A location and
the other markers take another case:

| Lang | Marker → form                                                                                                                                              | Notes for the reviewer                                                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ru   | `к` → `к этому`, `в` → `в этом` (location), `на` → `на этом` (location), `из` → `из этого`, `после` → `после этого`, `перед` → `перед этим`                |                                                                                                                                                                      |
| uk   | `до` → `до цього`, `в`/`у` → `в цьому`/`у цьому` (location), `на` → `на цьому` (location), `з` → `з цього`, `після` → `після цього`, `перед` → `перед цим` |                                                                                                                                                                      |
| pl   | `do` → `do tego`, `w` → `w tym` (location), `na` → `na tym` (location), `z` → `z tego`, `po` → `po tym`, `przed` → `przed tym`                             |                                                                                                                                                                      |
| de   | `zu` → `zu ihm`, `von` → `von ihm`, `nach` → `nach ihm`; for a location `in ihm`, `auf ihm`, `an ihm`, `vor ihm`                                           | natively a da-compound (`dazu`, `davon`, `darin`, `darauf`): would it read better? A direction keeps `in es`, `auf es` (`hinein`, `darauf` are fused forms, with N5) |
| fr   | `à` → `à lui`, `dans` → `dans lui`, `sur` → `sur lui`, `de` → `de lui`, `avant` → `avant lui`, `après` → `après lui`, `en` → `en lui`                      | `lui` for an element (masculine `il`). Natively `y` / `dedans` / `dessus`, which move before the verb (`y mettre`): a word-order change the owner has to approve     |
| hi   | `में` → `इस में`, `पर` → `इस पर`, `से` → `इस से`                                                                                                           | oblique `इस`, spaced like `मुझ में`; `यह को` → `इसे` is fused (N5)                                                                                                   |

**`me` as a verb's object** (no marker): de `mich` (`zeige mich`, `binden mich zu $x`),
ru `меня` (`показать меня`), uk `мене`, pl `mnie`. It counts as an object when it is
the command's patient, or its destination written right after the verb (`bind me to $x`).
es, pt, it and ar attach the object pronoun to the verb (`mostrarme`, `mostrar-me`,
`mostrarmi`, `أظهرني`), so they wait on N5.

### A pronoun fused with its marker: tr (M2 N3, wave 3) ⚠️

Turkish writes the case on the pronoun, as one word. Renders now write it where a
marker follows `ben` (me) or `o` (it):

| Marker           | `ben` →  | `o` →   |
| ---------------- | -------- | ------- |
| `i` (accusative) | `beni`   | `onu`   |
| `e` (dative)     | `bana`   | `ona`   |
| `den` (ablative) | `benden` | `ondan` |

The reader splits each back into the pronoun and the marker
(`tokenizers/fused-forms-split.ts`). Still spaced: a marker after a whole query phrase
(`<p/> içinde ben i`, where `i` marks the phrase), and put's position words (`"x" önce
beni koy`; Turkish says `benden önce`).

### A pronoun fused with its marker: ar and he (M2 N3, wave 3) ⚠️

| Lang | Marker → `me`                                                                                                         | Marker → `it`                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| ar   | `في` → `فيّ`, `إلى` → `إليّ`, `من` → `منّي`, `على` → `عليّ`, `ب` → `بي`, `قبل` → `قبلي`, `بعد` → `بعدي`               | `فيه`, `إليه`, `منه`, `عليه`, `به`, `قبله`, `بعده`        |
| he   | `ב` → `בי`, `אל` → `אליי`, `ל` → `לי`, `על` → `עליי`, `מ` → `ממני`, `את` → `אותי`, `לפני` → `לפניי`, `אחרי` → `אחריי` | unchanged (`זה`: `את זה` is right; `ב זה` is spacing, N5) |

Notes for the reviewer: ar is written with the shadda (`إليّ`, `عليّ`, `منّي`), which tells
`عليّ` (on me) from the name `علي` and `فيّ` from the marker `في`. Is that what a UI would
write? The reader takes each fused word whole, before the proclitic extractor could take
`ب`/`ف`/`מ` off it (`tokenizers/fused-forms-split.ts`). ar's verb + object (`أظهرني`,
`ضعه`) waits on the object clitics.

### A pronoun fused with its marker: bn, hi, tl, pt (M2 N3, wave 3) ⚠️

| Lang | Forms                                                                                                            | Notes for the reviewer                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| bn   | `আমি কে` → `আমাকে`, `আমি তে`/`এ` → `আমাতে`, `আমি থেকে` → `আমার থেকে`; `এটি কে` → `এটিকে`, `এটি তে`/`এ` → `এটিতে` | the reader reads `আমাতে` back with `এ` (`তে` is also the event marker)                      |
| hi   | `मैं को` → `मुझे`, `यह को` → `इसे`                                                                               | the other postpositions stay spaced (`मुझ में`, `इस में`; N5 joins them)                    |
| tl   | `sa ito` → `dito`                                                                                                | `dito` also means "here": does `ilagay 1 dito` read as "put 1 into it"? `mula_sa ito` stays |
| pt   | `em ele` → `nele`, `de ele` → `dele`                                                                             | `a ele`, `para ele` are right as written                                                    |

## August 2026 research pass — summary

A follow-up research pass (web sources as a native-speaker proxy; items still
benefit from a human native reviewer where marked):

| Item                                | Verdict                                                                                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ar لمّا (lamma)                     | ✅ keep parse-side only; never render (MSA prefers عندما, past-tense-only)                                                                                                                          |
| ar كلما / بمجرد                     | ⚠️ hold — كلما needs paired past-tense clauses; prefer حالما if an "as soon as" marker is ever added                                                                                                |
| pt "em clique"                      | ✅ resolved — profile renders `ao` (ao clicar); `no`/`em` stay parse-side                                                                                                                           |
| tr vowel harmony                    | ✅ implemented (harmony-aware normalizer, cliticized `ile` forms in style marker)                                                                                                                   |
| tr while-word                       | ⚠️ `süresince` works; native reviewer to judge adding `sürece` as alternative                                                                                                                       |
| bn unless                           | ✅ added `যদি না` ("if not"), the standard Bengali negated conditional — bn was the only profile with no unless keyword (#958)                                                                      |
| htmx-v4 `live`/`connect` vocabulary | ✅ landed in all 24 profiles (Phase 8c); per-language choices (`ao-vivo`, `en-direct`, `실시간`, `实时`, `canlı`, …) still open for Phase 8d native sign-off                                        |
| reactive `when … changes` word      | ⚠️ synced from the i18n dictionaries into all 24 profiles (parse + render); native sign-off pending per the table above — fr `change` / id `berubah` / th `เปลี่ยน` double as change-event surfaces |

### Additional sources (August 2026)

- [WordReference: idh/idhaa/lammaa](https://forum.wordreference.com/threads/idh-idhaa-lammaa-%D8%A5%D8%B0-%D8%A5%D8%B0%D8%A7-%D9%84%D9%8E%D9%85%D9%91%D8%A7.1040591/)
- [KALIMAH: Conjunctions in Arabic](https://kalimah-center.com/conjunctions-in-arabic/)
- [Reverso corpus: بمجرد أن](https://context.reverso.net/translation/arabic-english/%D8%A8%D9%85%D8%AC%D8%B1%D8%AF+%D8%A3%D9%86)
- [MDN pt-BR: Introdução a eventos](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Core/Scripting/Events)
- [linhadecodigo: Eventos em JavaScript](http://www.linhadecodigo.com.br/artigo/3617/eventos-em-javascript-tratando-eventos.aspx)
- [tr.wikipedia: While döngüsü](https://tr.wikipedia.org/wiki/While_d%C3%B6ng%C3%BCs%C3%BC)

---

_Last updated: August 2026 (research pass); December 2025 (deep audit)_
_Deep research audit conducted via Gemini; August 2026 pass via web research_
