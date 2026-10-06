# Value reading: the rules that tell a variable from a structure word

> Live guide, moved out of `MULTILINGUAL_NEXT_STEPS.md` on 2026-09-30 (it was that file's "Value
> reading" and "Name collisions" sections; the per-PR changelog and the closed queues around them are in
> `git show archived/multilingual-next-steps-2026-09-30:docs-internal/MULTILINGUAL_NEXT_STEPS.md`).
> **A PR that moves a rule updates its row.** Each row names the test a mutant reverting the rule fails;
> the value matrix (`packages/testing-framework/src/multilingual/value-matrix.ts`) is the gate over all of
> them.

A translation writes a variable verbatim, so a variable spelled like a structure word of the
target language reaches the parser as that word: a particle (tr `i`, its accusative), a role
marker (ms `ke`), a control word (es `si`), a conjunction (pl `i`), the copula (es `es`), a
command verb (es `ir`), an article (es `a`). Where it stands is all that tells the two apart. PRs
59–84 wrote those rules one case at a time, in three places. This is every one of them on main
`580f010c6`, grouped as the consolidation (the after-85 handoff, part 1) takes them: what it
reads, where it lives, the PR that added it, and the test a mutant reverting it fails. **A PR that
moves a rule updates its row.**


**The role capture** (`PatternMatcher.matchRoleTokenCore` and its helpers, `pattern-matcher.ts`),
in the order it applies:

| #   | Reads                                                                                                                                                                                                                                                                                                                                                       | Where                                                             | PR                                     | Pinned by                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| C1  | `a`/`an` before an operator is a variable, not an article (`put a + b`)                                                                                                                                                                                                                                                                                     | `articleIsVariable` (`value-reading.ts`), from `skipNoiseWords`   | #1175                                  | `en-reference-meaning.test.ts`                                                              |
| C2  | `a`/`an` before the pattern's next marker is a variable (de `erhöhe a um 1`)                                                                                                                                                                                                                                                                                | `articleIsVariable` (`value-reading.ts`), from `skipNoiseWords`   | 84                                     | `colliding-names.test.ts`                                                                   |
| C3  | `then`, `end` (not before a selector) and a curated end word are never a value; an end word where a value stands is one: before an operator, `and`, `or`, the copula, `'s` or its own case marker, after an operator, `not`, `if`, a verb that requires a role, a marker or a word a loop's pattern writes before a role (not a count word after its count), and after the value of a marker the verb's pattern follows with two roles (the block scan, the clause walk, the capture, the operator run and the join agree) | `neverAValue`, `endWordIsVariable` (`value-reading.ts`), `endWordIsValue` (`expression-lexicon.ts`) | #635; before an operator 112; the rest 114; the loop head 117; loop words 121; the role pair 122; a count word 131 | `multilingual-roadmap-fixes.test.ts`, `end-word-value.test.ts`, `native-count-render.test.ts` |
| C4  | a command verb in a `quantity` slot (or `repeat`'s event slot) begins the next command, except one that stands alone right after the slot's marker (es `por ir`), or right before the pattern's next marker (tr `i i al artır`)                                                                                                                           | `verbEndsCountSlot`, `verbStandsAlone` (`value-reading.ts`)       | #961; exemptions 84                    | `repeat-loop-heads.test.ts`, `colliding-names.test.ts`                                      |
| C5  | a command verb in a trailing optional slot, or one the pattern's next marker wants, begins the next command, except one that stands alone right after the slot's marker                                                                                                                                                                                 | `verbSkipsOptionalSlot`, `verbStandsAlone` (`value-reading.ts`)   | a9e4fcf5a, #950; exemption 84          | `marker-less-optional-slot-verb.test.ts`, `colliding-names.test.ts`                         |
| C6  | an optional marker-less slot facing a verb its pattern's next token does not want is skipped, when skipping lets the pattern take its whole clause                                                                                                                                                                                                         | `maySkipVerbSlot` (`value-reading.ts`), from `matchTokenSequence` | #968                                   | `marker-less-optional-slot-verb.test.ts`, `view-transition-manner.test.ts`                  |
| C7  | a particle is the value: (a) before the pattern's next marker, with a particle on either side (tr `i i 2 artır`); ~~(b) before a run operator~~ (dropped by PR 99: C10 reads it); (c) right after the slot's marker, before an unmarked role (pl `ustaw do o 5`); (d) at its clause's end (es `incrementar a entonces`). After a value and before the verb it is that value's marker (`1s i bekle`). | `particleIsValue` (`value-reading.ts`)                            | (a) 64, (b) 67–99, (c) 84, (d) 81      | `particle-variable.test.ts`, `colliding-names.test.ts`, `wait-alternatives.test.ts`         |
| C8  | a structure keyword alone in a value slot is a variable: a role marker (tr `na`), a control word (es `si`), the copula (es `es`), a conjunction; so is a command verb (es `ir`), except in a command that takes a body (`tell #modal to show`), one that names an event (`trigger init`), and `empty`; so is an event name (`set input to "a"`, de `in input`), except in a command that names an event or a wait | `keywordIsVariable` (`value-reading.ts`) → `loneKeywordKind`       | 81; verbs 84; events P49               | `colliding-names.test.ts`, `tell-to.test.ts`, `keyword-named-variables.test.ts`             |
| C9  | a lone value token: `empty` is `null`, an article is the variable (a lone conjunction's reading, PR 59's, is C8's since PR 81, and PR 88 dropped it here)                                                                                                                                                                                   | `loneKeywordValue` (`value-reading.ts`), from `tokenToSemanticValue` | 59, 61, 75                          | `connective-operand.test.ts`, `null-empty-word.test.ts`, `article-variable.test.ts`         |
| C10 | in an operator run, a particle right after or before an operator is an operand (es `retornar a + b`)                                                                                                                                                                                                                                                       | `particleIsOperand` (`value-reading.ts`), from `tryConsumeRunOperand` | #1175                               | `en-reference-meaning.test.ts`                                                              |
| C11 | in an operator run, a command verb after `and`/`or` begins the next command (`set x to true and put 2 …`)                                                                                                                                                                                                                                                  | `namesCommand` (`value-reading.ts`), from `tryConsumeRunOperand`  | 44                                     | `value-operators.test.ts`                                                                   |
| C12 | in an operator run, a `not` word before a marker and its value is a variable (sw `weka si kwa #out`)                                                                                                                                                                                                                                                       | `notWordIsVariable` (`value-reading.ts`), from `tryConsumeRunOperand` | 84                                     | `colliding-names.test.ts`                                                                   |
| C13 | a value runs on through operands (a name the reader fused, `(si)`, among them), operators, possessive markers and expression words, to a marker the pattern owes, a marker of its command, or the clause's end, as far as the expression parser reads it whole                                                                                           | `valueTailEnds`, `continuesValue`, `isValueBoundary` (`utils/value-extent.ts`) | 53; fused names 103                    | `value-extent.test.ts`, `verified-render.test.ts`                                           |
| C14 | a conjunction where none can stand continues a value                                                                                                                                                                                                                                                                                                        | `continuesValue` → `isConnectiveOperand` (`utils/value-extent.ts`) | 59                                     | `connective-operand.test.ts`                                                                |
| C15 | the `in` after a copula continues a value (de/it `into` marker), and so do a particle after `of` (pl `w`), the `to` of `equal to`, and an of-marker's owner (a reference, `the type of event`, or a `.class`, es `de .w`); the word `a` (a type check's; es/it/pt `to`, tr's dative) never stops one                                                                                                                                                                | `stopsAt`, `continuesValue` → `isCopulaIn`, `isParticleAfterOf`, `endsEqualTo`, `isWordA`, `isReferenceAfterOf` (`utils/value-extent.ts`) | 69, 74, 94, 102, 109 | `copula-in.test.ts`, `operand-readings.test.ts`, `value-extent.test.ts`, `reference-owners.test.ts`                                             |
| C16 | where no marker bounds a value, it runs on through a possessive link only                                                                                                                                                                                                                                                                                  | `possessiveLinkEnds`, `longestWholeRun` (`utils/value-extent.ts`) | 83                                     | `possessive-tail-before-role.test.ts`                                                       |

**The join** (`joinExpressionTokens` → `expressionWordOf`, `parser/utils/expression-lexicon.ts`),
word by word:

| #   | Reads                                                                                                                                                                                                      | Where                                        | PR                    | Pinned by                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| J1  | a lone structure word, command verb or event name joined as a whole value is its surface (tr `eğer al`, if al); a role marker anywhere in an expression is too (tr `değil na`, de `length of aus`) | `loneKeywordKind`, shared with C8; `expressionWordOf` | 84; markers 104; events P49 | `colliding-names.test.ts`                                                                         |
| J2  | `equal to`'s `to` stays `to` (pl reads `to` as `it`)                                                                                                                                                      | `expressionWordOf`                           | 62                    | `connective-operand.test.ts`                                                                      |
| J3  | the `in` after a copula stays `in`                                                                                                                                                                         | `expressionWordOf`                           | 69                    | `copula-in.test.ts`                                                                               |
| J4  | a word with two senses takes one by where it stands: ar `هو`, hi `है`, th `เป็น`, sw `na`/`tupu`, qu `mana`, zh `没有`, tl `walang`/`may`, bn `আছে`, tr `var`, and each `empty` word after a copula; every reference is an operand there (`detail`, `window`, `document` since PR 109) | `AMBIGUOUS_SENSES`, `resolveAmbiguousSense`  | #731; 71, 72, 78      | `expression-lexicon.test.ts`, `and-word.test.ts`, `not-word.test.ts`, `null-empty-word.test.ts`   |
| J5  | a conjunction is an operand where it cannot join: after an operator, before one or a comparison word, in brackets, or first in the value (pl `i`, es `si y`, pl `i - 1`)                                    | `isConnectiveOperand` → `precedesOperand`, `followsOperand` (over `utils/operators.ts`) | 59; alone 81; first 104 | `connective-operand.test.ts`, `colliding-names.test.ts`                                           |
| J6  | a `<property> <of-marker>` chain reads to its selector owner                                                                                                                                               | `ofChainEnd`                                 | 58, 65                | `property-before-of.test.ts`, `possessive-chain.test.ts`                                          |

**The condition scan** (`SemanticParserImpl.tryParseConditionalBlock`, `semantic-parser.ts`):

| #   | Reads                                                                                                                                                                                         | Where            | PR                           | Pinned by                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| S1  | a condition's first `if` word opens no nested block (es `si si …`)                                                                                                                            | block collection | 84                           | `colliding-names.test.ts`                                                                          |
| S2  | after a copula the next word is its predicate, not a branch: a normalized copula always; ar `هو`, th `เป็น`, hi `है`/`नहीं`, qu `mana` only before a predicate                              | `copulaHoldsCondition` (`value-reading.ts`) | #396; `नहीं` 41, `mana` 78   | `multilingual-roadmap-fixes.test.ts`, `condition-words.test.ts`, core `condition-copula-direct-path.test.ts` |
| S3  | a copula that is the condition's first word is a variable (es `si es poner …`); ~~a leading negation keeps its operand unless a command verb follows~~ (dropped by PR 104: tr `if yok`)       | `copulaHoldsCondition` (`value-reading.ts`) | 84; negation half 84–104     | `colliding-names.test.ts`                                                                          |

**What they share.** Four sub-predicates recur. Since PR 87 each has one definition, on the
`SlotContext` a capture builds once, at the token its value starts at (`value-reading.ts`):

- `nextIsMarker`, _the token after this one is the pattern's next marker_: C4 (on its own, and
  inside `verbStandsAlone`), C5 (`verbStandsAlone`), C7(a), and C2 (on a slot built at the
  article, before `skipNoiseWords` skips it);
- `clauseEndsAfter`, _the clause ends after this token_: C4, C5 (`verbStandsAlone`), C7(d);
- `operatorFollows`, _a run operator follows_: C7(b), until PR 99 dropped it; C10 and C12, which
  read an operator run's stream, not a slot, call the same `isRunOperator`. C1 tests the binary operators, which have no
  `mod` (a difference kept explicit, not unified; PR 89 names both sets in `utils/operators.ts`);
- `afterLiteral`, _the slot follows a literal the pattern matched_: C4, C5, C7(c).

Out of scope: the event-role guards (they read an event NAME, not a value), and the shapes the
expression matchers assemble.


## Name collisions: the policy (decided 2026-09-28/29)

A translation writes a variable verbatim, so a variable spelled like a structure word of the target
language (es `si`, pl `w`, tr `al`) reaches its reader as the word. Three answers, all in force:

- **A — parser inference by position** (the tables above). **Frozen**: no new per-name rules.
- **B — the verified render** writes a colliding variable in parentheses (`(si)`) where the plain render
  would be misread, and only there.
- **C — the diagnostic** reports a collision in hand-written text, with a rename.

**What shipped (PR 97): C, the diagnostic, either way.** semantic's `name-collisions.ts` exports
`nameCollision(name, language)` (the detection above) and `findNameCollisions(code, language)`:
the variables a program's parse reads that collide in its own language, where the parse reads
each as the variable, and a rename. An occurrence is the variable when an unambiguous name written
there, and in the places already taken, leaves the program's reading unchanged — its English and
the input it leaves unconsumed (the English cannot show a dropped token) — so a rename of those
places keeps the program's meaning, and the es `y` of `si a y b` (if a and b) or a tr accusative
`i` after a variable `i` is left alone. The rename collides with nothing and is unused in the code;
a digit splits a word in tr and qu, so it is checked, not assumed (tr `i` → `iValue`). The
language server warns at each place (`name-collision`), with one quick fix renaming all of them;
MCP `validate_hyperscript` warns (`NAME_COLLISION`). The value matrix now derives its colliding
names from `nameCollision`, which found one it lacked, fr `ou` (`or`): its six cells pass every
lane. Not findable: a pronoun collision in the code's own language (the parse reads the
pronoun), and English, which reports nothing. A **translation** finds one since PR 116 (the
after-113 handoff, item 3): `findTranslationCollisions(code, from, to)` returns each variable of
the source that the target reads as a value word — a pronoun (tl `ako` is `me`, it `io`, fr `je`)
or another reference (es `objetivo` is `target`) — where the parse of the source reads it as the
variable, with a rename that reads as a plain name in both languages (tr splits `ben1` at its
digit, so `ben` gets `benValue`). No spelling tells the two apart (a value word in parentheses is
still the value), so the rename is the only fix; the compilation service's `translate`, and so MCP
`translate_code`, warns `NAME_COLLISION` beside the verification, which already scored such a
translation unfaithful without saying why. A structure collision is not reported: the verified
render writes `(si)` where the plain spelling would misread.


**A is frozen**: no new per-name parser rules. A collision newly found in rendered text goes to
the renderer (B, below); in hand-written text, to the diagnostic.

**Decided (2026-09-29): B, verified (PR 103).** The owner's call, taken as recommended: B's
parentheses only where the plain render would be misread. A stays (frozen), C stays, and B covers
what A cannot in rendered text, with no visible cost where A already reads:

- **The verified render** (`explicit/verified-render.ts`) is the public `render` (and so
  `translate`, the corpus writer, MCP `translate_code`, core's `MultilingualHyperscript`). It
  renders with each colliding variable in parentheses (`parenthesizeCollidingNames`, over every
  expression value: a variable, not a property, a method, a conversion's type or English
  vocabulary); if nothing was wrapped, that is the plain render. Otherwise it keeps the plain
  render when that reads as the source does (`readsAs`: the same English, and no input left bound
  to no role — the diagnostic's own notion of a reading), else the parenthesized one when that
  does, else the plain one.
- **The reader** fuses `(word)` into one identifier token where the word spells structure in the
  language (`registry.tokenize`, through `nameCollision`, which `name-collisions.ts` registers):
  adjacent, not after a callee, never in English, and never a VALUE word (`value-words.ts`: the
  references and literals, `me`, `target`, `window`, `true`, `null`, `empty`, …, which are still
  that value in parentheses — es `(objetivo)` is `(target)`; a variable spelled like one is a
  pronoun collision now, like `me`). A plain `(x)` stays three tokens: fusing every name broke
  hand-written `length of (x)`, which main reads. The value extent runs through a fused name
  (C13), which answers the `of` owner: `length of (si)` reads.
- **The three open questions**, answered by the verification rather than by rules: an `of` owner
  accepts `(name)` now, and where a position still does not, the plain render stands; `measure y`
  and an article-only collision (`a + b`) read right plain, so they are never parenthesized.

**The writer side of a variable (P49, 2026-10-06).** A translation writes a variable as spelled;
the renderer localized it anyway where the value lexicon had its word, so `set when to 1` wrote es
`cuando` and read back a variable named `cuando`, and bn wrote `increment i by সূচক` (was P28). A
variable — an English identifier, or a keyword C8 reads as one — is now written in the language's
own word only where that word, read alone, is the same value (`localizedName`, `renderer.ts`: es
`ello` for `it`); otherwise as spelled, alone and as an operand (`expressionVariables`). A word
that reads right alone can still fuse with its neighbours (vi `đặt` + `giá trị` is `set`), so the
verified render re-reads a render that localized a variable and spells it where the plain render
misreads. `isEnglishKeyword` (`name-collisions.ts`) no longer counts such a keyword as vocabulary,
so it is parenthesized where it collides (fr `(change)`, the reactive `changes` word there). The
value matrix runs these names as `KEYWORD_NAMES`; `if` and `end`, which open and close blocks in
every reader, are not in it yet (OPEN_ITEMS P53).
