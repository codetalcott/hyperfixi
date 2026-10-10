# Vocabulary sheet: the English left in translations (M2 step 3)

**Decided 2026-10-08 by the owner: all as recommended.** A and B rows are to be implemented; C1–C3 are
kept English (`KEPT_ENGLISH`, `packages/testing-framework/src/multilingual/english-leaks.ts`), and C4 is
deferred (kept English for now, still counted against the target).

**Implemented:** A1 (#1431; for-loops keep the verb, es `repetir para x en`: a bare `para x en` is the
separate `for` command), A2 (#1432; its negation `I do not match`, #1435), A8 (#1433), A7 and B3–B6
(#1434), A5 (#1436; where a language's `in` would read as a marker the command wants, es `obtener
<input/> en yo`, the translation keeps English's), A4 (#1437; the word stands before the type, as
English's does, in every language, where the reader takes it; it keeps English's where it would read as
something else: ko `로` is also a marker, th `เป็น` is also `is` before a type core does not have built
in), A3 (#1438; inside an expression, with an element owner, in the construction a top-level property
path already used: es `valor de #price`, ja `#priceの値`; only where the property comes first before `as`,
which converts the owner, and for a one-link phrase that is the whole value (`set @role of #x`, which ja
would read back as a property path); `toggle the *X of Y`, a kept clause, and an owner that is not an
element, `the length of my value`, stay English), A9 and B2 (#1439; a handler's and a function's `catch
e` and `finally`), A10 (#1440; `the element's x` is written the same as `element x`, one name on both
engines, except before an index, where only the possessive spelling reads), B1 (#1441; `def` as the
noun "function", es `función greet(name)`), and B7: bn/th/vi `document`/`window` (#1442; a dot access
keeps the English base in every language, `window.scrollY`), and he's words with its `document`, `window`
and `is` (2026-10-10, the owner's call for those three; `between` comes with A6). Open: A6. The
words of B3–B6, A5, A4, A9, B2 and B1 are in `packages/semantic/src/parser/utils/grammar-words.ts`, and
A10's in `packages/semantic/src/element-scope.ts`, each held to the dictionaries by a test.

**Words changed from the appendix while implementing.** Each proposed word below was already another word
of its language (a keyword or a role marker), or the tokenizer split it into one; the table has the word
used instead. The native review checks these too.

| row | words |
| --- | ----- |
| B3 back | ar `خلفا` (`للخلف` reads as two markers); id `mundur`, ms `undur`, ja `バック`, th `ย้อน` (`kembali`, `戻る`, `กลับ` are `return`); sw `kurudi` (`nyuma` is a marker) |
| B4 elsewhere | es `afuera`, pt `exterior`, sw `kwingineko` (`fuera`, `fora`, `nje` are markers); he `חוץ` (`ב` + word); hi `अन्यत्र` (`बाहर` is `exit`); id `luaran`, ms `luar` (`di` is a marker); pl `zewnątrz` (`gdzie` is `where`); qu `hawa` (`-pi` is a marker); vi `ngoài`; ar `الخارج`, tr `dışarı` (read after `من` / before `den`) |
| B5 index | ar `مؤشر` (`فهرس` reads as `ف`, `then`) |
| B6 start | bn `আরম্ভ`, es `comenzar`, he `יזום`, id `memulai`, ms `memulakan`, pt `começar`, sw `zindua`, tl `umpisahan`, tr `başla` (the proposed word is the language's `init`); qu `qallay` (`qallariy` is `default`) |
| A9 catch | id `menangkap`, tr `yakalarsa` (the dictionary's `tangkap`, `yakala` are `intercept`); tl `saluhin` (`hulihin` reads as `last`) |
| B1 function | qu `rurana` (`ruray` is `make`) |
| B7 he | `as` `כ`, the word he's `fetch … as` already wrote (`בתור` reads as `ב` + `תור`); `at end of` `ב סוף של` (`אצל` is "at someone's"); `in` `בתוך` and `document` `מסמך` read whole, as keywords (bare, the tokenizer reads `ב` + `תוך`, `מ` + `סמך`); `empty` `ריק` and `is` `הוא` are also the reader's `null` and `it`, and read as the copula's words beside it, as sw `tupu` and ar `هو` do; `next` `הבא` is also he's `fetch`, and position tells them apart |
| B2 finally | he `סופית` (`לבסוף` reads as `ל` + `ב` + `סוף`, to/on/end); ja `最終的に`, ko `결국`, th `ท้ายที่สุด`, vi `rốt cuộc` (`最後に`, `마지막으로`, `สุดท้าย`, `cuối cùng` are `last`); qu `qhipamanqa` (`puchukaypi` reads as `end`) |

> For the owner, 2026-10-08. Each row is one decision. The words target in M2's exit
> (`MULTILINGUAL_NEXT_STEPS.md`, M2 step 1) waits on it: without these words, 13.3% of corpus
> renders and 19.4% of command-shape renders hold English the language has no word for. Answer per
> row: **yes** (as recommended), **keep** (stays English, recorded with a reason and not counted
> against the target), or another word. "All as recommended" is a valid answer.

**How the counts read.** Tokens of English the leak gate finds, corpus / command shapes, summed over
the 23 languages (`npx tsx tools/regen-english-leaks-baseline.ts --report`, measured on main
51bdb56a2); a phrase is counted by its words (`do not throw` by `do`). The corpus is authors' scripts;
the shapes are upstream's documented and tested forms.

**What a yes costs.** Each accepted word is added to the i18n dictionary and the language profile (the
render lexicon is locked to the dictionary, policy 5). Then the renderer writes it and the reader takes
it back, checked for collisions with the language's other words (vocab V1–V4, name collisions). Rows in
group A need no new word; group B rows add one per language (proposals in the appendix). A native
speaker checks every new word before release (M2 step 6).

## A. No new word: the dictionary already has one

The engine reads each spelling on the right the same as the English on the left (checked on
`@hyperfixi/engine`), so a translation can use words the language already has.

| #   | English kept today                     | Written as                                   | Tokens    | Recommendation                                                     |
| --- | -------------------------------------- | -------------------------------------------- | --------- | ------------------------------------------------------------------ |
| A1  | `repeat for x in .items`, `repeat until …` | the language's words: `<for> x <in> .items` (es `para x en .items`; `for x in` is a loop on its own) and `<repeat> <until> …` (es `repetir hasta …`; a bare `until` is not) | 158 / 399 | yes |
| A2  | `I match .x`, `I am a Node`            | `me` + `matches` / the copula (es `yo coincide .x`); `me matches` reads the same | 138 / 276 | yes                                                                |
| A3  | `the textContent of #a`                | `X <of> Y` (es `textContent de #a`); `the` is dropped here, where the engine reads the same without it (never in `halt the event`, which needs it) | 71 / 1,401 | yes: the renderer translates inside values here, past semantic's "commands only" line |
| A4  | `as Int`, `as JSON`                    | `<as>` + the type name in English (es `como Int`) | 46 / 649  | yes: revises policy 6's "conversion words" (type names stay English) |
| A5  | `first <li/> in #list`, `<p/> in me`   | `<in>` (es `en`); 19 languages (4 already spell it `in`) | 117 / 573 | yes: revises policy 6's "query-scope `in`"                          |
| A6  | `toggle between .a and .b`             | `<between>` (es `entre .a y .b`)              | 0 / 148   | yes                                                                |
| A7  | `on first click`                       | `<first>` (es `primero`)                      | 25 / 28   | yes                                                                |
| A8  | `fetch /x do not throw`                | `<not> <throw>` (es `no lanzar`)              | 44 / 22   | yes                                                                |
| A9  | `catch e`                              | the dictionary's word (es `atrapar`); bn, he, th need one (appendix) | 0 / 450   | yes: revises policy 6's "`catch`/`finally` until they have words" |
| A10 | `element x` (a scope word)             | the dictionary's word (es `elemento`); bn, he, th, vi need one (appendix) | 0 / 190   | yes                                                                |

## B. A new word in every language

| #   | English kept today                   | Meaning                                        | Tokens    | Recommendation                                                         |
| --- | ------------------------------------ | ---------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| B1  | `def greet(name) … end`              | define a function                              | 0 / 1,327 | translate as the noun "function" (es `función`), as JavaScript spells it |
| B2  | `finally`                            | the block that always runs after `catch`       | 0 / 253   | translate (with A9)                                                    |
| B3  | `go back`                            | history back                                   | 23 / 22   | translate                                                              |
| B4  | `on click elsewhere`, `from elsewhere` | an event outside the element                 | 46 / 63   | translate as "outside" (fr `ailleurs`, de `außerhalb`)                 |
| B5  | `for x in … with index i`            | the loop's counter                             | 23 / 22   | translate                                                              |
| B6  | `start view transition`              | begin a View Transition                        | 23 / 276  | translate `start`; keep `view transition`, the web API's name (policy 6 already keeps `using view transition`) |
| B7  | he's missing words (N7), and bn/th/vi `document`/`window` | he has no word for `of`, `as`, `in`, `between`, `not`, `first`, `at`, `matches`, `closest`, `next`, `previous`, `empty`, `exists`, `or` | he: 35% of its corpus renders hold English, the others 15–22% | fill (appendix) |

## C. Keep English (recommended)

| #   | English                                  | Tokens        | Why keep                                                                                      |
| --- | ---------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| C1  | `debounced at`, `throttled at`           | 69 / 92       | terms of art with no settled native word; developers use them as loanwords                     |
| C2  | `url` (`go to url "/x"`)                 | 23 / 68       | an international loanword; policy 6 already keeps it for `push`/`replace`                      |
| C3  | `dom` (`set dom count`), `view transition` | 0 / 46, (B6) | an acronym, and a web API's name                                                              |
| C4  | rare forms, shapes only: `pick items`, `render … here`, `having threshold` (intersection), `scroll … top`, `take … giving`, `global x` | 0 / ~250 | defer: no corpus row uses them; they fit the shapes' 10% allowance. A native reviewer can supply words later |

## Appendix: proposed words

From Claude. A native reviewer checks each word before release. `?` marks low confidence; `(dict)`
marks a word the language's dictionary already has. Several entries are two words (id `di luar`, vi
`cuối cùng`), which the profiles already allow (ko `할 때`); none is joined with `_` (policy 5).

| lang | B1 function | B2 finally | B3 back | B4 outside | B5 index | B6 start |
| ---- | ----------- | ---------- | ------- | ---------- | -------- | -------- |
| ar   | دالة        | أخيرا      | للخلف   | خارجا      | فهرس     | ابدأ     |
| bn   | ফাংশন       | অবশেষে     | পিছনে   | বাইরে      | সূচক (dict) | শুরু  |
| de   | funktion    | schließlich | zurück | außerhalb  | index    | starte   |
| es   | función     | finalmente | atrás   | fuera      | índice   | iniciar  |
| fr   | fonction    | finalement | arrière | ailleurs   | indice   | démarrer |
| he   | פונקציה     | לבסוף      | אחורה   | בחוץ       | אינדקס   | התחל     |
| hi   | फ़ंक्शन       | अंततः       | पीछे     | बाहर        | सूचकांक   | शुरू      |
| id   | fungsi      | akhirnya   | kembali | di luar    | indeks   | mulai    |
| it   | funzione    | infine     | indietro | altrove   | indice   | avvia    |
| ja   | 関数        | 最後に     | 戻る    | 外側       | インデックス | 開始  |
| ko   | 함수        | 마지막으로 | 뒤로    | 바깥       | 인덱스   | 시작     |
| ms   | fungsi      | akhirnya   | kembali | di luar    | indeks (dict) | mulakan |
| pl   | funkcja     | ostatecznie | wstecz | gdzie indziej ? | indeks | rozpocznij |
| pt   | função      | finalmente | atrás   | fora       | índice   | iniciar  |
| qu   | ruray ?     | puchukaypi ? | kutiy ? | hawapi ? | yupay ?  | qallariy ? |
| ru   | функция     | наконец    | назад   | снаружи    | индекс   | начать   |
| sw   | kitendakazi ? | mwishowe | nyuma   | nje        | faharasa ? | anza   |
| th   | ฟังก์ชัน     | สุดท้าย     | กลับ     | ภายนอก     | ดัชนี (dict) | เริ่ม  |
| tl   | punsiyon ?  | panghuli   | pabalik | labas      | indeks (dict) | simulan |
| tr   | fonksiyon   | sonunda    | geri    | dışarıda   | indeks   | başlat   |
| uk   | функція     | нарешті    | назад   | ззовні     | індекс   | почати   |
| vi   | hàm         | cuối cùng  | lùi ?   | bên ngoài  | chỉ số   | bắt đầu  |
| zh   | 函数        | 最终       | 后退    | 外部       | 索引     | 开始     |

Group A's missing words (A9, A10) and the lexicon gaps (B7):

| lang | words                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------- |
| bn   | catch ধরুন · element উপাদান · document ডকুমেন্ট · window উইন্ডো                                           |
| th   | catch จับ · element องค์ประกอบ · document เอกสาร · window หน้าต่าง                                         |
| vi   | element phần tử · document tài liệu · window cửa sổ                                                       |
| he   | catch תפוס · element אלמנט · of של · as בתור · in בתוך · between בין · not לא · first ראשון · at אצל ? · matches תואם · closest הקרוב · next הבא · previous הקודם · empty ריק · exists קיים · or או · document מסמך · window חלון · is הוא (the last three: owner, 2026-10-10) |

Not on this sheet: the pronoun case after a marker (N3, es `a mí`, de `zu mir`). Its forms are fixed by
each language's grammar rather than chosen, so they come with the N3 design (M2 step 4) and the same
native review.
