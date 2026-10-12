# Hand-written inputs

One file per language, `<lang>.json`, holding hyperscript a native speaker wrote from the
English task descriptions in `docs-internal/multilingual/HAND_WRITTEN_INPUT.md` (the same
tasks as `src/multilingual/hand-written-input.tasks.json`), without seeing LokaScript's own
renders:

```json
[
  { "task": "t01", "source": "…what they wrote, in their language…", "writer": "initials" }
]
```

Never put a render of ours here. The gate (`hand-written-input.test.ts`) runs each input as
written on the engine with the adapter, against upstream running the English reference, and
reports accepted / refused / silent per task and language. With no files it reports
"no inputs yet".
