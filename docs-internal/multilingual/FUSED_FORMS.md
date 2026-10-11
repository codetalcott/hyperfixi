# Fused forms and attached suffixes (M2, N3 wave 3 + N5): design

Status: design, 2026-10-10. Nothing here is built yet; the owner's answers to the
questions in §6 decide the order and scope.

## 1. What is left

N3's first two waves write a pronoun in the case its marker takes wherever the form is
a free word (#1450: `me` after a marker in es, pt, it, tl, pl, ru, uk, de, hi; #1451: `it`
after a marker, and `me` as a verb's object). What they could not write is a form where
the marker and the pronoun, or the verb and the pronoun, become **one word**:

| Kind | Examples (written today → the language's own) | Languages |
| ---- | --------------------------------------------- | --------- |
| marker + pronoun | tr `ben e` → `bana`, `o i` → `onu`; ar `إلى أنا` → `إليّ`, `في هو` → `فيه`; he `אל אני` → `אליי`, `ב אני` → `בי`; bn `আমি তে` → `আমাতে`; hi `मैं को` → `मुझे`, `यह को` → `इसे`; tl `sa ito` → `dito`; pt `em ele` → `nele`, `de ele` → `dele` | tr, ar, he, bn, hi, tl, pt |
| marker + pronoun, a compound | de `in es` → `darin`/`hinein`, `auf es` → `darauf`, `zu es` → `dazu` | de |
| verb + object pronoun | es `poner ello` → `ponerlo`, `mostrar yo` → `mostrarme`; it `mettere esso` → `metterlo`; pt `colocar ele` → `colocá-lo`; ar `ضع هو` → `ضعه`, `أظهر أنا` → `أظهرني` | es, it, pt, ar |
| object pronoun before the verb | fr `mettre il` → `le mettre`, `dans il` → `y` (+ verb) | fr (word order: **ask the owner**, §6 Q1) |
| a marker attached to any word (N5 proper) | tr `#out e` → `#out'a`, `.active i` → `.active'i`; ko `#out 에` → `#out에`; bn `#out তে` → `#outতে` | tr, ko, bn (and ja, qu: the same spacing) |

What the gate counts today (2026-10-10, after #1451): `case:me` in tr, ar, he, bn (the
fused forms) and hi (`मैं को`); `case:it` in tr, hi, ar, de (directions), tl, pt;
`case:it-object` in es, pt, it, fr, ar; `case:me-object` in es, pt, it, ar. N5's spacing
has no gate.

## 2. What the readers do with these today (measured)

- Read as a variable: tr `bana`, `onu`; bn `আমাকে`; tl `dito`; pt `nele`; de `darin`,
  `dazu`; es `ponerlo`; it `metterlo`.
- Split wrong by the proclitic extractor: ar `فيه` → `ف` (then) + `يه`; he `ממני` → `מ`
  + `מ` + `ני`. ar `إليه` and he `אליי` read as variables.
- hi `मुझे` reads as `me` (#1447), but without its `को`, so a role that needs the marker
  is lost.
- Attached particles **already read** in ko (`나에`, `#out에`), bn (`#outতে`) and ja
  (`#outに`): the tokenizers split a particle off a word or a selector. tr does not:
  `#out'a` gives a stray `'` token, and `#outa` swallows the suffix into the selector.

## 3. Design

One table drives the render and the reader, as in waves 1 and 2.

### 3.1 Render: the same `obliqueReferences` table

A phrase with no space is a fused form (`tr: me: { e: 'bana', i: 'beni', den: 'benden',
de: 'bende' }`). It already renders: `obliqueAt` replaces "marker + pronoun" (or
"pronoun + marker" where markers follow) with the phrase. The verified render keeps it only
where the reader brings it back as the nominative render reads (`readAlike`). So a form
ships the moment its reader exists, and not before.

Object clitics need one more shape, because the word they fuse with is the verb, not a
marker. Proposed: `objectClitics` on the profile, the pronoun's clitic and how it
attaches:

- es `{ me: 'me', it: 'lo', attach: 'suffix' }`: the infinitive + clitic (`poner` →
  `ponerlo`); renders write the infinitive, which takes a clitic with no accent change.
- it `{ me: 'mi', it: 'lo', attach: 'suffix-drop-e' }`: `mettere` → `metterlo`.
- pt `{ me: 'me', it: 'o', attach: 'hyphen' }`: `mostrar-me`. For `o` the infinitive's
  `-r` drops and the vowel takes an accent (`colocá-lo`); a small rule per ending (-ar
  → -á-lo, -er → -ê-lo, -ir → -i-lo).
- ar `{ me: 'ني', it: 'ه', attach: 'suffix' }`: on the imperative the renderer writes.

The renderer writes the clitic form where a verb literal is followed by the patient
reference (the object branch of `obliqueAt`, which waves 1–2 already have).

### 3.2 Reader: one post-tokenize split, derived from the same tables

`splitFusedForms(stream, profile)`, run in each affected tokenizer the way
`splitReferencePossessive` runs for uk and qu:

- For each one-word phrase in `obliqueReferences`, the inverse: `bana` → the reference
  `me` + the marker `e`, in the language's order (tr pronoun first), with positions inside
  the word. A one-token phrase table, so no stemming and no guessing.
- For `objectClitics`: a word that is a known verb form (profile keyword or a pattern's
  opening literal, the gate's verb set) plus a clitic splits into the verb and the
  reference (`ponerlo` → `poner` + `it`). Only known verbs split, so `pelo` and `solo`
  stay words.
- ar and he: the proclitic extractors split ب/ف/מ… off any word unless the WHOLE word is
  a keyword (the he `בתוך`, `מסמך` trap). The fused forms register as whole-word keywords
  so the extractor leaves them alone, and the split runs after. This is the ordering the
  kickoff names: the split must see `فيه` before `ف` is taken off it.
- de's compounds split the same way (`darin` → `in` + `es`, `dazu` → `zu` + `es`).
  `hinein` is already a keyword (`into`) and stays one.

Traps carried over: tokenize every new form in its language first (a fused form can
already be another keyword, as 9 of 46 sheet words were); a form that is a plausible
identifier is not added (de `dir`); a new keyword can merge with `if`
(`tokenizers/if-not-split.ts`); a word with two senses goes in `AMBIGUOUS_SENSES`, never
as a profile alternative.

### 3.3 N5 proper: a marker attached to any word

- ko, bn, ja: the readers already split an attached particle, so this is render-only.
  Write the particle onto the previous token (`#out에`, `#outতে`, `#outに`). The verified
  render re-reads it like any native word. The gate needs a spacing check (§4).
- tr: needs reader work first. Turkish writes a suffix on a code word or an abbreviation
  after an apostrophe (`#out'a`, `.active'i`), with vowel harmony by how the word is read.
  The tokenizer must take `'` + suffix after a selector, a number or a variable as the
  marker, and harmony for a code word is a native question (§6 Q2).
- qu: the same spacing (`#out man`); its suffixes attach too. Not in N5's list; ask.

## 4. Gates

- `case:*` (english-leaks) already counts every fused case above. Nothing to add for
  them.
- N5 has no gate. Proposed `spacing:<marker>`: a marker of a language whose markers attach
  (ko, bn, ja, tr, qu), written as its own word after a token it could attach to. Same
  shrink-only baseline. A design decision, as `case` was (§6 Q3).
- The verified render's `readAlike` keeps a form only where it reads back. The probes
  (23 languages × the shapes, against main) and the mutation runs stay as in waves 1–2.

## 5. Order (one PR each, after the owner's answers)

1. tr fused pronouns (`bana`/`beni`/`benden`/`bende`, `ona`/`onu`/`ondan`/`onda`): table
   + split. The largest count (tr `case:me` 353 + `case:it` 112 in shapes).
2. ar and he: the whole-word registration + split (ar `إليّ`/`فيّ`/`منّي`/`عليّ`,
   `إليه`/`فيه`; he `אליי`/`בי`/`ממני`/`עליי`/`אותי`).
3. bn (`আমাকে`, `আমাতে`), hi `को` (`मुझे`, `इसे`), tl `dito`/`rito`, pt `nele`/`dele`.
4. de da-compounds (if the owner prefers them to `zu ihm`, §6 Q4).
5. Object clitics: es, it, pt, ar (`objectClitics`).
6. N5 render: ko, bn, ja attach (with the spacing gate if wanted).
7. N5 tr apostrophe suffixes (reader first).
8. fr clitic order: only with the owner's yes (§6 Q1).

## 6. Questions for the owner

- **Q1 (fr clitic order).** French puts an object pronoun before the verb: `mettre il` →
  `le mettre`, `mettre 1 dans il` → `y mettre 1`. That changes word order (the pronoun
  moves ahead of the verb), which the plan says needs your approval. Options: (a) do it
  (reader takes `le`/`la`/`y`/`en` before a verb); (b) keep `lui` after the preposition
  (wave 2's `dans lui`, already written) and leave the object `il` as is; (c) a
  verb-final paraphrase. Recommended: (b) for now; (a) after a native French reviewer.
- **Q2 (tr suffixes on code words).** Write `#out'a`, `.active'i` (apostrophe + suffix,
  harmony by how the selector is read), or keep the spaced `#out e` until a native
  reviewer picks? Recommended: build the reader for both, render the apostrophe form only
  for pronouns and words, keep selectors spaced until review.
- **Q3 (N5 gate).** Add a `spacing:` finding to the leak gate for ko, bn, ja, tr (qu?)
  before the render work, as `case` was? Recommended: yes, ko/bn/ja/tr; qu after a
  check.
- **Q4 (de).** For `it` after a preposition: da-compounds (`darin`, `darauf`, `dazu`),
  natural German, fused; or `ihm` (wave 2, written now for the dative and location)?
  Recommended: da-compounds for every preposition, `ihm` kept as a reader form.
