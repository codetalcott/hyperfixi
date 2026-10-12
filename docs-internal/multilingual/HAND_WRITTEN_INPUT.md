# Hand-written input: the writer's page

LokaScript translates hyperscript into 24 languages, and every gate so far reads what
LokaScript itself writes. This page collects the other half: hyperscript a native speaker
writes from an English description, **without seeing LokaScript's renders**. The gate
(`packages/testing-framework/src/multilingual/hand-written-input.test.ts`) runs each input
as written on the engine with the adapter, against upstream `_hyperscript` running the
English reference, and reports per task and language whether the input was **accepted**
(ran as the reference does), **refused** (the translator told the writer it could not read
it) or **silent** (it ran, or was rejected, with another result and no word to the writer).
Silent is the verdict that matters: it is a reader bug.

The same page lives in the review packet (a private Artifact the owner shares; its Write tab
saves inputs to the packet's store, from which they are exported here). Recruiting writers is
the owner's job; this file is what a writer reads.

## For the writer

Each task below describes what a button on a web page should do. Write the hyperscript in
your language, the way you would naturally say it, using the words in your language's list
(the packet shows it; it is `keywords` in `packages/semantic/src/generators/profiles/<lang>.ts`).
There are no wrong answers. If a task makes no sense to you, say so instead of guessing.

One English example, so you know the shape: `on click toggle .active on me` means "when
clicked, toggle the class `active` on this element". Class names (`.active`), ids (`#out`),
variables (`$n`) and quoted text stay as they are in every language.

Do the writing before reading any of LokaScript's own output. Once you have seen how it
writes a handler, you will write it that way too, and the gate would then measure LokaScript
against itself.

## The tasks

| id | what the page should do |
| --- | --- |
| t01 | When the button is clicked, toggle the class "active" on it. |
| t02 | When the button is clicked, put the text Saved into the element with id out. |
| t03 | When the button is clicked, hide the element with id panel. |
| t04 | When the button is clicked, add the class "open" to the element with id menu, then remove its class "closed". |
| t05 | When the button is clicked, fetch /api/greeting and put the result into the element with id out. |
| t06 | When the button is clicked: if it has the class "on", remove that class; otherwise add it. |
| t07 | When the button is clicked, append the text "x" to the element with id out three times. |
| t08 | When the button is clicked, send a custom event named refresh to the element with id list, then add the class "sent" to the button. |
| t09 | When the button is clicked, set the variable $n to 5 and put it into the element with id out. |
| t10 | When the button is clicked, increase the variable $count by one and put it into the element with id out. |
| t11 | Define a behavior named Hider that hides the element when it is clicked (the page installs it on the button with: install Hider). |
| t12 | When the input receives input, put its value into the element with id out. |
| t13 | When the button is clicked, put the value of the input with id field into the element with id out. |
| t14 | When the button is clicked, add the class "sel" to the first list item inside the element with id list. |
| t15 | When the button is clicked, set its attribute aria-expanded to "true". |
| t16 | When the button is clicked, put the text "x" at the end of the element with id out. |
| t17 | When the button is clicked, for every element with the class "item", add the class "seen" to it. |
| t18 | When the button is clicked, if there is no element with class "item" inside the element with id list, put the text "empty" into the element with id out. |
| t19 | When the button is clicked, take the class "selected" from whichever element with class "tab" has it, and give it to the button. |
| t20 | When the button is clicked, remove the button. |

Each task's English reference, fixture and event are in
`packages/testing-framework/src/multilingual/hand-written-input.tasks.json`. The writer never
sees the reference.

## The input files

One file per language in `packages/testing-framework/hand-written-inputs/<lang>.json`:

```json
[
  { "task": "t01", "source": "…what they wrote, in their language…", "writer": "initials" }
]
```

Several writers may share a file (one row per writer and task). An empty or missing file is
"no inputs yet". **Never seed a file with a render of ours.**

## Running it

```bash
cd packages/testing-framework
npx vitest run src/multilingual/hand-written-input.test.ts
```

The test prints the report (references, then per language: accepted / refused / silent, with
each non-accepted input and, for a silent one, what it did against what the reference does)
and fails on a silent input, on an input naming no task, and on a reference that upstream and
the engine do not run alike. It reuses the direct-path shapes machinery
(`direct-path-shapes.ts`: `initDirectPathHosts().runWritten`).

## What to do with a verdict

- **accepted**: the reader takes that writer's form. If it is not a form the renderer writes,
  it is a candidate for the renderer (NATIVE_REVIEW_NEEDED.md) and for a reader test that pins it.
- **refused**: the writer was told. Decide whether the form should read (a vocabulary or
  pattern question, OPEN_ITEMS) and record it.
- **silent**: a reader bug, loud or fix. The lossy checks (`semantic/src/explicit/lossy.ts`)
  missed it; say which one should have caught it.
